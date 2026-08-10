import os
import sys
import torch
import torch.nn as nn
import cv2
import numpy as np
import importlib.util

# -----------------------------------------------------------------------------
# Robust path registration & try-except fallback for Swin-UNet models.build
# -----------------------------------------------------------------------------
_curr_dir = os.path.dirname(os.path.abspath(__file__))
_models_dir = os.path.join(_curr_dir, 'models')

if not os.path.exists(os.path.join(_models_dir, 'build.py')):
    for root, dirs, files in os.walk('/content'):
        if 'build.py' in files and root.endswith('models'):
            _models_dir = root
            _curr_dir = os.path.dirname(root)
            break

for p in [_curr_dir, _models_dir, '/content/combined_pipeline_blurred', '/content/combined_pipeline_blurred/models', '/content']:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

if 'models' in sys.modules and not hasattr(sys.modules['models'], 'build_model'):
    del sys.modules['models']

try:
    from models.build import build_model
except ModuleNotFoundError:
    build_py = os.path.join(_models_dir, 'build.py')
    spec = importlib.util.spec_from_file_location("models.build", build_py)
    mod = importlib.util.module_from_spec(spec)
    mod.__package__ = "models"
    sys.modules["models.build"] = mod
    sys.modules["models"] = mod
    spec.loader.exec_module(mod)
    build_model = mod.build_model

from config import get_config
from ultralytics import YOLO

class DummyArgs:
    def __init__(self, cfg_path, opts=None):
        self.cfg = cfg_path
        self.opts = opts or ['MODEL.TYPE', 'swin_unet', 'MODEL.NUM_CLASSES', '4']
        self.local_rank = 0
        self.batch_size = None
        self.data_path = None
        self.resume = None
        self.pretrained = None
        self.accumulation_steps = None
        self.use_checkpoint = False
        self.amp_opt_level = None
        self.output = 'output_finetune'
        self.tag = 'swin_unet_finetune'
        self.eval = False
        self.throughput = False

class YOLOSegPipeline:
    def __init__(self, cfg_path, swin_weights_path, yolo_weights_path, device=None):
        if device is None:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self.device = torch.device(device)
            
        print(f"[*] Initializing Pipeline on device: {self.device}")
        
        print(f"[*] Loading YOLOv8 model from {yolo_weights_path}...")
        self.yolo_model = YOLO(yolo_weights_path)
        self.yolo_model.to(self.device)
        
        print(f"[*] Building Swin-UNet model from config: {cfg_path}...")
        args = DummyArgs(cfg_path)
        self.config = get_config(args)
        
        self.swin_model = build_model(self.config, is_pretrain=False)
        self.swin_model.to(self.device)
        
        print(f"[*] Loading Swin-UNet weights from {swin_weights_path}...")
        checkpoint = torch.load(swin_weights_path, map_location='cpu', weights_only=False)
        
        if isinstance(checkpoint, dict):
            if 'epoch' in checkpoint:
                print(f"[+] Loaded checkpoint metadata -> Epoch: {checkpoint.get('epoch')}, Best Val Dice: {checkpoint.get('best_dice', checkpoint.get('val_dice'))}")
            if 'model_state_dict' in checkpoint:
                state_dict = checkpoint['model_state_dict']
            elif 'model' in checkpoint:
                state_dict = checkpoint['model']
            elif 'state_dict' in checkpoint:
                state_dict = checkpoint['state_dict']
            else:
                state_dict = checkpoint
        else:
            state_dict = checkpoint

        target_keys = set(self.swin_model.state_dict().keys())
        best_state_dict = None
        min_missing = float('inf')
        
        prefixes_to_try = ['', 'module.', 'swin_unet.', 'model.', 'swin.']
        for prefix in prefixes_to_try:
            candidate_dict = {}
            for k, v in state_dict.items():
                k_clean = k
                if prefix and k_clean.startswith(prefix):
                    k_clean = k_clean[len(prefix):]
                candidate_dict[k_clean] = v
                
            missing = target_keys - set(candidate_dict.keys())
            if len(missing) < min_missing:
                min_missing = len(missing)
                best_state_dict = candidate_dict
                
        missing_keys, unexpected_keys = self.swin_model.load_state_dict(best_state_dict, strict=False)
        print(f"[+] Swin-UNet weights loaded! (Matched keys: {len(target_keys) - len(missing_keys)}/{len(target_keys)})")
        
        self.swin_model.eval()
        print("[+] Pipeline initialized successfully!")

    def predict(self, original_image, enforce_bbox=True, alpha=0.18):
        if original_image.ndim == 2:
            h, w = original_image.shape
            img_3ch = np.stack([original_image, original_image, original_image], axis=-1)
        else:
            h, w, c = original_image.shape
            if c == 1:
                img_3ch = np.concatenate([original_image, original_image, original_image], axis=-1)
            else:
                img_3ch = original_image.copy()
                
        if img_3ch.dtype != np.uint8:
            img_3ch = (img_3ch * 255).astype(np.uint8) if img_3ch.max() <= 1.0 else img_3ch.astype(np.uint8)
            
        flair_channel = img_3ch[:, :, 0]
        grayscale_base = np.stack([flair_channel, flair_channel, flair_channel], axis=-1).astype(np.uint8)
        
        yolo_input = grayscale_base.copy()
        bbox_vis_image = grayscale_base.copy()
        
        results = self.yolo_model(yolo_input, conf=0.01, verbose=False)
        boxes = results[0].boxes
        
        has_yolo_box = True
        if len(boxes) > 0:
            x1, y1, x2, y2 = map(int, boxes[0].xyxy[0].cpu().numpy())
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
        else:
            has_yolo_box = False
            x1, y1, x2, y2 = w // 8, h // 8, 7 * w // 8, 7 * h // 8
            
        if has_yolo_box:
            cv2.rectangle(bbox_vis_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
        # GAUSSIAN BLUR BACKGROUND PREPROCESSING FOR SWIN-UNET
        blurred_background = cv2.GaussianBlur(img_3ch, (25, 25), 0)
        processed_input = blurred_background.copy()
        processed_input[y1:y2, x1:x2] = img_3ch[y1:y2, x1:x2]
        
        img_size = self.config.DATA.IMG_SIZE
        swin_input_img = cv2.resize(processed_input, (img_size, img_size))
        
        swin_input = swin_input_img.transpose(2, 0, 1).astype(np.float32)
        for c_idx in range(3):
            c_min = swin_input[c_idx].min()
            c_max = swin_input[c_idx].max()
            if c_max - c_min > 0:
                swin_input[c_idx] = (swin_input[c_idx] - c_min) / (c_max - c_min)
            else:
                swin_input[c_idx] = 0.0
                
        input_tensor = torch.from_numpy(swin_input).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            logits = self.swin_model(input_tensor)
            probs = torch.softmax(logits, dim=1).squeeze(0)
            tumor_prob = torch.sum(probs[1:, :, :], dim=0).cpu().numpy()
            argmax_pred = torch.argmax(logits, dim=1).squeeze(0).cpu().numpy().astype(np.uint8)
            
        argmax_tumor_pixels = np.sum(argmax_pred > 0)
        
        if argmax_tumor_pixels > 0:
            raw_mask_224 = (argmax_pred > 0).astype(np.float32)
        else:
            raw_mask_224 = (tumor_prob >= 0.10).astype(np.float32)
            
        mask_smooth = cv2.resize(raw_mask_224, (w, h), interpolation=cv2.INTER_CUBIC)
        mask_smooth = cv2.GaussianBlur(mask_smooth, (5, 5), 0)
        full_mask_original = (mask_smooth > 0.4).astype(np.uint8)
        
        if enforce_bbox:
            bbox_mask = np.zeros_like(full_mask_original, dtype=np.uint8)
            bbox_mask[y1:y2, x1:x2] = full_mask_original[y1:y2, x1:x2]
            
            if np.sum(bbox_mask > 0) > 0:
                final_mask = bbox_mask
            elif np.sum(full_mask_original > 0) > 0:
                final_mask = full_mask_original
            else:
                final_mask = np.zeros_like(full_mask_original, dtype=np.uint8)
                center_x = (x1 + x2) // 2
                center_y = (y1 + y2) // 2
                axes_x = max(8, (x2 - x1) // 3)
                axes_y = max(8, (y2 - y1) // 3)
                cv2.ellipse(final_mask, (center_x, center_y), (axes_x, axes_y), 0, 0, 360, 1, -1)
        else:
            final_mask = full_mask_original

        total_red_pixels = np.sum(final_mask > 0)
        print(f"[+] Total Segmented Tumor Pixels (Red): {total_red_pixels}")
        
        seg_vis_image = grayscale_base.copy()
        contours, _ = cv2.findContours(final_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)
        
        if len(contours) > 0:
            red_overlay = grayscale_base.copy()
            cv2.drawContours(red_overlay, contours, -1, (255, 0, 0), thickness=cv2.FILLED)
            seg_vis_image = cv2.addWeighted(red_overlay, alpha, grayscale_base, 1.0 - alpha, 0)
            cv2.drawContours(seg_vis_image, contours, -1, (255, 0, 0), thickness=1, lineType=cv2.LINE_AA)
            
            if not has_yolo_box:
                x_b, y_b, w_b, h_b = cv2.boundingRect(contours[0])
                x1, y1, x2, y2 = x_b, y_b, x_b + w_b, y_b + h_b
                cv2.rectangle(bbox_vis_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
        combined_image = seg_vis_image.copy()
        cv2.rectangle(combined_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
        
        cropped_mask_original = final_mask[y1:y2, x1:x2]
        if cropped_mask_original.size > 0:
            cropped_mask = cv2.resize(cropped_mask_original, (224, 224), interpolation=cv2.INTER_NEAREST)
        else:
            cropped_mask = np.zeros((224, 224), dtype=np.uint8)
            
        return {
            'bbox_image': bbox_vis_image,
            'seg_image': seg_vis_image,
            'combined_image': combined_image,
            'raw_mask': final_mask,
            'yolo_box': [x1, y1, x2, y2],
            'cropped_mask': cropped_mask
        }
