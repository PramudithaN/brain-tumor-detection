import os
import logging
import httpx
from typing import Dict, Any

logger = logging.getLogger("app.inference")

class BrainTumorClassifier:
    def __init__(self):
        # Read the ML model API URL from environment variables, defaulting to local Flask server
        self.model_api_url = os.getenv("MODEL_API_URL", "http://localhost:8080/api/predict")
        self.model_version = "NeuroAI-RemoteAPI-v2.0"
        self.is_mock = False
        logger.info(f"Initialized BrainTumorClassifier calling API at: {self.model_api_url}")

    def predict(self, image_bytes: bytes, filename: str = "mri_scan.png") -> Dict[str, Any]:
        """
        Calls the external Flask ML API server to get prediction, overlays, and explanation.
        """
        logger.info(f"Sending prediction request to remote model API: {self.model_api_url}")
        
        try:
            # Prepare file payload
            files = {
                "file": (filename, image_bytes, "image/png")
            }
            
            # Send synchronous POST request using httpx
            with httpx.Client(timeout=60.0) as client:
                response = client.post(self.model_api_url, files=files)
                
            if response.status_code != 200:
                logger.error(f"Remote model API returned status {response.status_code}: {response.text}")
                raise Exception(f"Model API error: Status code {response.status_code}")
                
            result = response.json()
            
            if result.get("status") != "success":
                raise Exception(f"Model API returned failure: {result.get('message', 'Unknown error')}")
                
            pred_class_raw = result.get("pred_class", "NOTUMOR")
            
            # Normalize class names to match frontend expectations
            class_mapping = {
                'GLIOMA': 'Glioma',
                'MENINGIOMA': 'Meningioma',
                'PITUITARY': 'Pituitary',
                'NOTUMOR': 'No Tumor',
                'UNRECOGNIZED_TUMOR': 'Unrecognized Tumor'
            }
            prediction_label = class_mapping.get(pred_class_raw, 'Unrecognized Tumor' if pred_class_raw == 'UNRECOGNIZED_TUMOR' else 'No Tumor')
            
            confidence = result.get("conf_percent", 0.0) / 100.0
            segmented_pixels = int(result.get("segmented_pixels", 0))
            explanation_text = result.get("explanation_text", "")
            images = result.get("images", {})
            
            return {
                "prediction_label": prediction_label,
                "confidence": confidence,
                "model_version": self.model_version,
                "segmented_pixels": segmented_pixels,
                "explanation_text": explanation_text,
                "images": {
                    "bbox": images.get("bbox"),
                    "seg": images.get("seg"),
                    "combined": images.get("combined"),
                    "five_panel": images.get("five_panel")
                }
            }
            
        except Exception as e:
            logger.error(f"Error calling remote model API: {e}")
            raise Exception(f"Failed to fetch prediction from model API: {str(e)}")

# Singleton classifier instance
classifier = BrainTumorClassifier()
