# 🧠 Neuro AI Diagnostic Backend System

This directory contains the standalone backend REST API server, core AI diagnostic pipeline, network architecture code, and trained neural network model weights for the **Neuro AI Brain MRI Diagnosis System**.

---

## 📁 File & Folder Breakdown

### 1. 🌐 API Server & Gateway
* **`server.py`**
  * **Role:** Flask REST API Server.
  * **Description:** Acts as the communication bridge between any frontend application (React, Vue, HTML/JS, or Mobile App) and the backend AI pipeline.
  * **Endpoints:**
    * `POST /api/predict`: Accepts MRI image uploads (`.jpg`, `.png`, `.h5`), runs the full AI pipeline, and returns JSON output containing diagnostic classification, confidence percentage, pixel count, clinical reports, and Base64-encoded result images (`bbox`, `seg`, `combined`, `five_panel`).
    * `GET /api/samples`: Returns available sample MRI images for frontend testing.

---

### 2. 🧠 Core AI Pipeline Engine
* **`Neuro_AI_System.py`**
  * **Role:** Multi-Stage AI Diagnostic Pipeline Coordinator.
  * **Description:** Manages image pre-processing, model inference, Grad-CAM XAI heatmap generation, and clinical text report generation across 4 distinct stages:
    1. **Stage 1 (YOLOv8)**: Detects tumor region and computes bounding box coordinates.
    2. **Stage 2 (Swin-UNet)**: Segments precise tumor boundary contour (red outline).
    3. **Stage 3 (DenseNet-121 Multi-Specialist)**: Blurs non-tumor background tissue and evaluates 4 specialist classifiers to determine tumor type and confidence score.
    4. **Stage 4 (Grad-CAM XAI)**: Generates explainable heatmap overlays and constructs a composite 5-panel diagnostic summary (`complete_diagnosis_5panel_output.png`).

---

### 3. ⚙️ Swin-UNet Architecture Package
* **`extracted_pipeline/`** *(Directory)*
  * **Role:** Swin-UNet Vision Transformer Codebase.
  * **Description:** Contains the network architecture code required to build and execute the Swin-UNet segmentation model.
  * **Key Components:**
    * `pipeline_yolo_seg.py`: Orchestrates YOLO object detection and Swin-UNet segmentation into a unified workflow.
    * `config.py`: YACS configuration node for model hyperparameters (224x224 input size, 4 target classes).
    * `configs/swin_base_patch4_window7_224_finetune.yaml`: Model configuration YAML.
    * `models/`: PyTorch modules (`swin_unet.py`, `swin_transformer.py`, `build.py`) implementing Shifted Window Multi-Head Self-Attention (W-MSA/SW-MSA) layers.

---

### 4. 📦 Trained Model Weights (6 Files)

| Model File | Location | Approx. Size | Stage & Description |
| :--- | :--- | :--- | :--- |
| **`yolo_best.pt`** | Root | ~22.5 MB | **Stage 1**: YOLOv8 Bounding Box Detection Model |
| **`best_model.pth`** | `output_finetune/` | ~1.79 GB | **Stage 2 & 3**: Swin-UNet Vision Transformer Segmentation Model |
| **`densenet121_glioma.pth`** | Root | ~30.5 MB | **Stage 3**: DenseNet-121 Glioma Specialist Classifier |
| **`densenet121_meningioma.pth`** | Root | ~30.5 MB | **Stage 3**: DenseNet-121 Meningioma Specialist Classifier |
| **`densenet121_pituitary.pth`** | Root | ~30.5 MB | **Stage 3**: DenseNet-121 Pituitary Specialist Classifier |
| **`densenet121_notumor.pth`** | Root | ~30.5 MB | **Stage 3**: DenseNet-121 No-Tumor Specialist Classifier |

---

## 📊 End-to-End Execution Flow

```text
[ Frontend Uploads MRI Scan ]
             │
             ▼
      [ server.py ] (Receives HTTP POST request)
             │
             ▼
  [ Neuro_AI_System.py ] (Executes Diagnostic Pipeline)
             │
             ├──► 1. yolo_best.pt (Finds Bounding Box)
             ├──► 2. output_finetune/best_model.pth + extracted_pipeline/ (Segments Tumor)
             ├──► 3. 4x densenet121_*.pth (Classifies Tumor Type & Confidence)
             └──► 4. Generates Heatmaps & 5-Panel Visual Display
             │
             ▼
      [ server.py ] (Converts Output Images to Base64 & Builds JSON Response)
             │
             ▼
[ Frontend Displays Diagnosis & Visuals ]
```

---

## 🚀 How to Run the Server

To start the backend REST API server for your new frontend:

```bash
# 1. Navigate to this directory
cd C:\Users\githmis\Desktop\NeuroAI

# 2. Start the API server
python server.py
```

The server will initialize on **`http://127.0.0.1:8080`**.

---

## 🔌 API Quick Reference

### **`POST /api/predict`**
* **Headers:** `Content-Type: multipart/form-data`
* **Body:** `file` (File object) or `sample_id` (string: `"glioma"`, `"meningioma"`, `"pituitary"`, `"notumor"`)
* **Response JSON Example:**
```json
{
  "status": "success",
  "filename": "mri_scan.jpg",
  "pred_class": "MENINGIOMA",
  "conf_percent": 96.85,
  "segmented_pixels": 4520,
  "explanation_text": "...",
  "images": {
    "bbox": "data:image/png;base64,...",
    "seg": "data:image/png;base64,...",
    "combined": "data:image/png;base64,...",
    "five_panel": "data:image/png;base64,..."
  }
}
```
