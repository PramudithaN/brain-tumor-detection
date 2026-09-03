# Brain Tumor Detection & Diagnostic System

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Material UI](https://img.shields.io/badge/Material_UI-007FFF?style=for-the-badge&logo=mui&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

> An end-to-end clinical brain MRI analysis platform combining deep learning pipelines (YOLOv8, Swin-UNet, DenseNet-121 ensemble, and Grad-CAM Explainable AI) with a FastAPI backend and React Material-UI frontend.

---

## Abstract

This system provides automated detection, pixel-level segmentation, classification, and explainable AI reporting for brain MRI scans. The system identifies three primary tumor types (Glioma, Meningioma, Pituitary) and distinguishes healthy brain tissue. Scans exhibiting abnormal focal lesions that do not meet standard subtype criteria are flagged as unrecognized/atypical lesions with actionable clinical recommendations.

---

## System Architecture

The project consists of three decoupled layers:

```text
[ Client Layer (React / Vite) ]
             |
             v  HTTP REST API
[ API Gateway & Application Server (FastAPI :8000) ]
             |
             v  Internal Proxy / Microservice
[ Deep Learning Inference Engine (NeuroAI / Flask :8080) ]
     ├── Stage 1: YOLOv8 (Lesion Bounding Box Detection)
     ├── Stage 2: Swin-UNet (Tumor Semantic Segmentation)
     ├── Stage 3: DenseNet-121 Multi-Specialist Ensemble (Subtype Classification)
     └── Stage 4: Grad-CAM Engine (Explainable AI & Dual Reports)
```

---

## Core Capabilities

- **Automated Tumor Detection**: Uses YOLOv8 to localize suspicious regions within axial FLAIR/T1/T2 MRI scans.
- **Pixel-Level Semantic Segmentation**: Employs Swin-UNet (Vision Transformer) with adaptive Otsu thresholding to compute precise tumor contours and calculate total segmented lesion area.
- **Multi-Specialist Classification**: Evaluates four specialist DenseNet-121 classifiers (Glioma, Meningioma, Pituitary, and Normal Tissue) with confidence scoring.
- **Explainable AI (XAI)**: Generates Grad-CAM activation heatmaps overlaid on the original scan alongside multi-panel diagnostic summaries.
- **Dual-Perspective Clinical Reporting**:
  - *Radiologist Assistance Report*: Technical analysis, anatomical margins, mass effect index, and recommended confirmatory MRI protocols.
  - *Patient and Family Guidance*: Accessible explanations and structured next steps.
- **Secure Authentication & Record Storage**: Integrated Supabase authentication (JWT verification) with PostgreSQL storage for patient scan history.
- **Server-Side File Validation & Rate Limiting**: Validates raw image magic bytes, enforces 10 MB file caps, and applies IP-based rate limiting.

---

## Technology Stack

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Material UI | Clinical web interface with interactive 5-panel viewer |
| **API Gateway** | FastAPI, Python 3.10+ | Authentication, rate limiting, request validation, database integration |
| **ML Engine** | PyTorch, torchvision, timm, Ultralytics | YOLOv8, Swin-UNet, DenseNet-121 specialists, Grad-CAM |
| **Database & Auth** | Supabase (PostgreSQL, Storage, Auth) | Scan record persistence and user session management |
| **Model Hub** | Hugging Face Model Hub | Automated remote model weight distribution |

---

## Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher (with npm)
- Git

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/PramudithaN/brain-tumor-detection.git
cd brain-tumor-detection
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### 4. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
MODEL_API_URL=http://localhost:8080/api/predict
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:8000
```

---

## Running the Application

### 1. Start the NeuroAI Inference Server

```bash
cd NeuroAI
python server.py
```
*The ML inference server runs on `http://127.0.0.1:8080`.*

### 2. Start the FastAPI Backend Gateway

```bash
cd backend
python -m uvicorn app.main:app --port 8000 --reload
```
*The API gateway runs on `http://127.0.0.1:8000` (API documentation at `/docs`).*

### 3. Start the Frontend Client

```bash
cd frontend
npm run dev
```
*Access the web interface at `http://localhost:5173`.*

---

## Project Directory Structure

```text
brain-tumor-detection/
├── backend/                        # FastAPI application server
│   ├── app/
│   │   ├── auth/                   # JWT authentication handler
│   │   ├── inference/              # ML classifier integration
│   │   ├── records/                # Database and storage handlers
│   │   ├── validation/             # Image file validation
│   │   └── main.py                 # Application entry point and routes
│   └── requirements.txt            # Backend dependencies
├── frontend/                       # React Material-UI frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # PredictPage, HistoryPage, LoginPage
│   │   ├── utils/                  # PDF report generator
│   │   └── apiService.ts           # HTTP client
│   └── package.json                # Frontend dependencies
├── NeuroAI/                        # Deep learning inference engine
│   ├── extracted_pipeline/         # Swin-UNet network architecture and configurations
│   ├── Neuro_AI_System.py          # Unified 4-stage inference pipeline
│   ├── server.py                   # Flask inference API server
│   └── app.py                      # Standalone Streamlit interface
├── scripts/                        # Automation and utility scripts
│   └── upload_to_huggingface.py    # Model weights upload utility
├── supabase/                       # Database schema and RLS policies
│   └── schema.sql
└── CONTRIBUTORS.md                 # Project contributors
```

---

## Contributors

- Pramuditha Nadun ([GitHub](https://github.com/PramudithaN))
- Githmi Senani ([GitHub](https://github.com/GithmiSenani))
