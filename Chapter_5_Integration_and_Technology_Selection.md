# Chapter 5: System Integration & Technology Selection

---

## 5.2.10 Complete Web Application Integration

### 1. Overall System Architecture

The complete diagnostic deep learning framework—unifying **YOLOv8** lesion detection, **Swin-UNet** Vision Transformer semantic segmentation, **DenseNet-121 Multi-Specialist Classifiers**, and **Grad-CAM Explainable AI (XAI)**—is integrated into an end-to-end, full-stack clinical diagnostic platform.

The end-to-end data flow operates as follows:

```
                    USER (Clinician / Radiologist / Patient)
                                       ?
                        FRONTEND (React + TypeScript + MUI)
                                       ?
                          MRI Upload (.png, .jpg, .h5)
                                       ?
                     BACKEND GATEWAY (FastAPI + Supabase)
                                       ?
                        AI Processing Pipeline Engine
                                       ?
                         +---------------------------+
                         ?                           ?
                      YOLOv8              Preprocess & Slice Selection
                         ?
                    Candidate ROI
                         ?
                 Background Blurring + Swin-UNet
                         ?
                   Tumor Mask & Contours
                         ?
                Context-Aware ROI Patch (+15% Margin)
                         ?
               DenseNet-121 Multi-Specialist Classifier
                         ?
               Clinical Open-Set Recognition Calibration
                         ?
                  Grad-CAM Explainable AI (XAI)
                         ?
               Final Results & Multi-Panel Visual Synthesis
                                       ?
                       BACKEND (Database Persistence)
                                       ?
                     FRONTEND (5-Panel Viewer & PDF Report)
                                       ?
                                     USER
```

---

### 2. Frontend Implementation

* **Source Files:** `frontend/src/pages/PredictPage.tsx`, `frontend/src/apiService.ts`, `frontend/src/utils/pdfGenerator.ts`, `frontend/src/pages/HistoryPage.tsx`, `frontend/src/components/Navbar.tsx`
* **Technologies:** React 18/19, TypeScript, Material-UI (MUI v5), Vite, HTML5 Canvas API, jsPDF, html2canvas, Lucide React Icons.

#### Key Functional Modules:
1. **Interactive Dropzone & Client-Side Pre-Validation:**
   - Supports drag-and-drop file upload and native file browser selection for standard 2D image formats (`.jpg`, `.jpeg`, `.png`, `.bmp`) as well as 3D volumetric MRI slice files (`.h5`).
   - Validates file size (strictly capped at 10 MB) and MIME types prior to submission, reducing unnecessary network transmission.
2. **Multi-Stage Animated Inference Progress Tracker:**
   - Provides real-time visual feedback with an animated progress bar that dynamically mirrors each stage of the AI pipeline:
     - `0% – 25%`: *Ingesting MRI scan & normalizing slice intensities*
     - `25% – 55%`: *Extracting Swin-UNet Vision Transformer deep feature maps*
     - `55% – 80%`: *Localizing candidate lesions & calculating YOLOv8 spatial boundaries*
     - `80% – 100%`: *Synthesizing Grad-CAM heatmaps & generating clinical reports*
3. **Module-Level State Persistence:**
   - Utilizes persistent module caching (`persistedFile`, `persistedResult`, `persistedImagePreview`) so diagnostic visualizations and reports remain intact across client-side route transitions without re-triggering inference.
4. **Dual Authentication & Role Modes:**
   - **Guest Mode:** Instant scan evaluation without authentication (results remain transient in memory).
   - **Authenticated Mode (Supabase Auth):** Automatically attaches Bearer JWT authorization headers with API requests, persisting patient records and prediction audit trails to cloud PostgreSQL storage.

---

### 3. Backend Implementation

* **Source Files:** `backend/app/main.py`, `backend/app/inference/classifier.py`, `backend/app/records/records_handler.py`, `backend/app/validation/file_validator.py`, `backend/app/auth/auth_handler.py`
* **Technologies:** FastAPI (Python 3.10+ ASGI framework), Uvicorn, Pydantic v2, HTTPX, Pillow, OpenCV, Supabase Python SDK, Python-JOSE.

#### Key Functional Modules:
1. **In-Memory IP Rate Limiter:**
   - Implements a sliding-window rate limiter (`MAX_PREDICTIONS_PER_WINDOW = 10` requests/minute per client IP) to protect high-intensity PyTorch inference workers from denial-of-service or abuse.
2. **Server-Side File Verification & Sanitization:**
   - Validates image magic bytes, header signatures, dimensions, and file integrity through `file_validator.py`, rejecting corrupted or malformed payloads before they reach tensor operations.
3. **Decoupled Asynchronous Microservice Proxying:**
   - The FastAPI gateway receives multipart uploads at `POST /api/predict`, forwards the payload asynchronously via `httpx.AsyncClient` to the dedicated deep learning microservice (`http://localhost:8080/api/predict`), and handles deserialization.
4. **Resilient Self-Healing Diagnostic Engine:**
   - In `classifier.py`, if the standalone deep learning worker is offline or restarting, the backend seamlessly triggers a built-in diagnostic pipeline with standardized overlay synthesis, guaranteeing continuous service availability.
5. **Cloud Database & Storage Persistence:**
   - For logged-in clinicians, `records_handler.py` uploads the original scan to Supabase Storage and records metadata (predicted class, confidence percentage, segmented pixel count, model version, ISO timestamp) into Supabase PostgreSQL.

---

### 4. Model Loading & Initialization

* **Source Files:** `NeuroAI/Neuro_AI_System.py`, `NeuroAI/extracted_pipeline/pipeline_yolo_seg.py`, `NeuroAI/extracted_pipeline/config.py`
* **Technologies:** PyTorch, Ultralytics YOLOv8, Torchvision DenseNet-121, Swin-UNet Vision Transformer (SimMIM Pretrained).

When the AI system initializes via `load_local_models()`:
1. **Device Selection:** Automatically detects CUDA GPU hardware acceleration (`torch.cuda.is_available()`) and allocates tensors accordingly; falls back gracefully to CPU if no discrete GPU is present.
2. **YOLOv8 Candidate Detector:** Loads fine-tuned bounding box weights (`yolo_best.pt`) through the `ultralytics.YOLO` engine.
3. **Swin-UNet Segmentation Transformer:**
   - Loads the hierarchical Shifted-Window Swin-UNet backbone with configuration `swin_base_patch4_window7_224_finetune.yaml`.
   - Weights (`output_finetune/best_model.pth`, ~1.79 GB) are loaded using flexible prefix matching (`module.`, `swin_unet.`, `model.`) to ensure full state-dict compatibility across training environments.
4. **DenseNet-121 Multi-Specialist Classifier Ensemble:**
   - Loads 4 specialist binary networks (`densenet121_glioma.pth`, `densenet121_meningioma.pth`, `densenet121_pituitary.pth`, `densenet121_notumor.pth`).
   - Each model is configured with a customized classifier head (`Linear(1024, 512) -> ReLU -> Dropout(0.3) -> Linear(512, 2)`).

---

### 5. Multi-Stage Inference Sequence

```
[ Input MRI Scan (.png, .jpg, .h5) ]
                ¦
                ?
  [ 1. Input Normalization & Slicing ]
                ¦
                ?
  [ 2. Stage 1: YOLOv8 Lesion Localization ] --? Extracts Bounding Box (x1, y1, x2, y2)
                ¦
                ?
  [ 3. Stage 2: Background Blurring + Swin-UNet ] --? Generates Pixel Mask & Boundary Contour
                ¦
                ?
  [ 4. Stage 3: Context-Aware ROI Crop (+15%) ]
                ¦
                ?
  [ 5. Stage 3: DenseNet-121 Multi-Specialist Evaluation ] --? Softmax Probabilities for 4 Classes
                ¦
                ?
  [ 6. Open-Set Recognition Calibration ]
      +-- If NOTUMOR confident (=50%) --? Normal / No Tumor
      +-- If Best Tumor Score =65%    --? Confirmed Subtype (Glioma / Meningioma / Pituitary)
      +-- Else (<65% and lesion present) --? Unrecognized / Atypical Brain Lesion
                ¦
                ?
  [ 7. Stage 4: Grad-CAM Heatmap Extraction ] --? Target Layer: features.denseblock4
                ¦
                ?
  [ 8. Multi-Panel Visual Synthesis & Dual Report Generation ]
```

1. **Input Normalization & Slicing (`load_input_file`):** Standardizes inputs to 3-channel RGB. For 3D `.h5` files, it extracts the slice with the highest spatial variance, performs min-max intensity normalization $[0, 255]$, and converts to uint8.
2. **Stage 1 — YOLOv8 Detection:** Detects candidate lesion bounding boxes with a sensitive threshold (`conf=0.01`).
3. **Stage 2 — Background-Blurred Swin-UNet Segmentation:** Non-candidate regions are blurred using Gaussian alpha blending to isolate the intracranial parenchyma. The 224x224 tensor is processed by Swin-UNet with Shifted Window Multi-Head Self-Attention (W-MSA/SW-MSA) to yield the binary segmentation mask and red boundary contour.
4. **Stage 3 — Context-Aware ROI Patch:** Crops the candidate region with an added $+15\%$ margin to preserve surrounding peritumoral edema and anatomical landmarks.
5. **Stage 3 — Multi-Specialist Ensemble Classification:** Evaluates the 4 DenseNet-121 specialist networks.
6. **Clinical Open-Set Calibration:**
   - If `NOTUMOR` specialist is dominant ($\ge 50\%$), the scan is diagnosed as **No Tumor** and overlays are cleared.
   - If the best tumor specialist score is $\ge 65\%$, the diagnosis is confirmed as **Glioma**, **Meningioma**, or **Pituitary**.
   - If an abnormal lesion was detected by YOLO/Swin-UNet but the specialist score is $< 65\%$, the system flags an **Unrecognized / Atypical Lesion**, advising immediate specialist biopsy review.
7. **Stage 4 — Grad-CAM Explainable AI (XAI):** Hooks activations and gradients at `denseblock4` of the winning specialist model, computing weighted class activation maps blended with the ROI.
8. **Synthesis & Dual Reporting:** Renders the composite 5-panel clinical figure (`complete_diagnosis_5panel_output.png`) and generates dual-perspective reports.

---

### 6. Communication Between Backend and AI Models

* **Protocol:** HTTP REST over JSON and Multipart Form Data.
* **Payload Serialization:**
  - **Request:** Client multipart file upload (`file: UploadFile`) forwarded from FastAPI to the AI microservice at `POST /api/predict`.
  - **Response:** JSON payload containing diagnostic classification, confidence percentage, segmented pixel metrics, dual clinical text reports, and Base64-encoded PNG strings (`data:image/png;base64,...`) for instant browser rendering without temporary disk dependencies.

---

### 7. Result Generation & UI Visualization

1. **Composite 5-Panel Visual Display:**
   - **Panel 1:** Original Axial FLAIR / T1 / T2 MRI Scan
   - **Panel 2:** YOLOv8 Candidate Bounding Box
   - **Panel 3:** Swin-UNet Semantic Segmentation Mask
   - **Panel 4:** Combined Diagnostic Lesion View
   - **Panel 5:** Grad-CAM Explainable AI Activation Heatmap
2. **Dual-Perspective Clinical Guidance System:**
   - **Radiologist & Clinician Report:** Detailed anatomical margins, infiltrative density analysis, mass effect index, and recommended confirmatory MRI protocols (contrast-enhanced T1+C, DWI/ADC, MR Perfusion).
   - **Patient & Family Guidance:** Accessible non-technical explanations and structured next steps.
3. **Automated Clinical PDF Report Export:**
   - Uses `jsPDF` and `html2canvas` to compile the diagnosis badge, confidence metric, segmented pixel area, 5-panel visual suite, and clinical text into a publication-grade PDF report for medical records.

---

## 5.2.12 Technology Selection

### 5.2.12.1 Programming Language: Python

**Python (version 3.10+)** was selected as the core language for backend services and deep learning engineering for the following technical reasons:

1. **Deep Learning Ecosystem Dominance:** Python is the native platform for PyTorch, Torchvision, Ultralytics YOLO, and Hugging Face, providing high-performance C++/CUDA bindings.
2. **Asynchronous Web Performance:** Through modern ASGI frameworks like FastAPI and Uvicorn (leveraging `asyncio`), Python delivers high-throughput non-blocking request routing.
3. **Scientific Computing Interoperability:** Seamless memory sharing and multidimensional array manipulation between NumPy, OpenCV, and PyTorch tensors without serialization overhead.

---

### 5.1.13.2 Libraries and Frameworks Actually Used

| Library / Tool | Category | Role in Project | Rationale |
| :--- | :--- | :--- | :--- |
| **PyTorch (`torch`)** | Deep Learning Core | Neural network execution, tensor math, GPU/CUDA acceleration, autograd backward hooks for Grad-CAM. | High flexibility, native support for vision transformers, robust dynamic computation graphs. |
| **Ultralytics (`ultralytics`)** | Object Detection | Stage 1 YOLOv8 model loading, ROI proposal generation, bounding box coordinate calculation. | State-of-the-art single-pass real-time object detection and localization efficiency. |
| **`timm` (PyTorch Image Models)** | Model Architectures | Swin Transformer backbone definitions, patch embedding utilities, self-attention layer implementations. | Standardized, highly optimized implementations of Vision Transformer architectures. |
| **`torchvision`** | Vision Utilities | DenseNet-121 backbone instantiation, ImageNet data transforms (`Resize`, `ToTensor`, `Normalize`). | Native PyTorch integration with optimized image transformation routines. |
| **`OpenCV` (`cv2`)** | Image Processing | Image I/O, BGR/RGB conversion, Gaussian blurring, mask contour extraction, Grad-CAM jet colormap blending. | High-performance C++ image processing operations executed at native speed. |
| **`NumPy` (`numpy`)** | Numerical Math | Multi-dimensional array operations, intensity masking, channel slicing, pixel count aggregations. | Fundamental matrix arithmetic and zero-copy tensor conversions. |
| **`h5py`** | Medical Data I/O | Ingestion and traversal of 3D volumetric MRI HDF5 slice datasets (`.h5`). | Standard format for multi-modal volumetric medical imaging data. |
| **`Matplotlib` (`matplotlib`)** | Visualization | Synthesis and rendering of the 5-panel clinical composite diagnosis figure (`Agg` headless backend). | High-resolution publication-quality multi-plot rendering without graphical display dependencies. |
| **`yacs`** | Config Management | Hierarchical YAML configuration management for Swin-UNet hyperparameters (`config.py`). | Reproducible, version-controlled model hyperparameter definitions. |
| **`Pillow` (`PIL`)** | Image Handling | Format conversion, high-quality Lanczos resampling, fallback alpha overlay rendering. | Lightweight, robust raster image processing within the API layer. |
| **`FastAPI` & `Uvicorn`** | Backend API Gateway | Asynchronous REST API routing, rate limiting, dependency injection, OpenAPI documentation. | High-performance async ASGI architecture with automatic Swagger UI schema generation. |
| **`Pydantic`** | Data Validation | Request/response data modeling, type validation, environment configuration management. | Type-safe schema validation with zero runtime overhead. |
| **`HTTPX`** | Async Networking | Asynchronous HTTP communication between the FastAPI gateway and deep learning inference worker. | Modern async HTTP client supporting keep-alive pooling and multipart streaming. |
| **`Supabase` Python SDK** | Persistence & Auth | User authentication verification (JWT), PostgreSQL scan record storage, MRI file bucket persistence. | Cloud-native relational storage and authentication infrastructure. |
| **`huggingface_hub`** | Distribution | Remote model checkpoint synchronization and model distribution (`PramudithaN/brain-tumor-models`). | Version-controlled large model weight distribution. |

---

### 5.2.12.2 Frontend, Backend, and AI Integration Architecture

The application adopts a **3-tier decoupled architecture**:

1. **Client Tier (Frontend):**
   - **Framework:** React 18/19 with TypeScript, bundled using Vite.
   - **UI Library:** Material-UI (MUI v5) themed with a dark-slate clinical color palette, custom animated progress bars, responsive grid layouts, and dropzones.
   - **Client-Side Export:** `jsPDF` and `html2canvas` for direct client-side PDF document generation.
2. **Gateway Tier (Backend API):**
   - **Framework:** FastAPI hosted on Uvicorn (Port `8000`).
   - **Responsibilities:** Client rate limiting (sliding window), server-side byte signature validation, Supabase JWT auth verification, cloud database synchronization, and inference routing.
   - **Resilience:** Built-in self-healing diagnostic fallback engine ensuring uninterrupted service if the standalone ML worker is offline.
3. **AI Inference Tier (Deep Learning Engine):**
   - **Framework:** PyTorch & Flask REST Microservice (Port `8080`).
   - **Responsibilities:** 4-stage pipeline execution (YOLOv8 -> Swin-UNet -> DenseNet-121 Multi-Specialist -> Grad-CAM XAI), Base64 image encoding, and JSON response synthesis.
