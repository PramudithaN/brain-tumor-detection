# 🚀 Deploying FastAPI Backend to Hugging Face Spaces

This guide walks you through deploying your FastAPI backend to your Hugging Face Space:
👉 **Space URL**: https://huggingface.co/spaces/PramudithaN/brain-tumor-backend

---

## 📋 Prerequisites
1. Install [Git](https://git-scm.com/) and [Git LFS](https://git-lfs.github.com/) (since machine learning models can be large files).
2. A Hugging Face account with a **User Access Token** (generate one under [Hugging Face Settings > Access Tokens](https://huggingface.co/settings/tokens) with `write` permission).

---

## 🛠️ Step-by-Step Deployment

### 1. Configure Git LFS (for large model files)
Run these commands in your terminal to initialize Git LFS:
```bash
git lfs install
```

### 2. Clone your Hugging Face Space Repository
Clone the repository into a separate temporary directory on your machine:
```bash
git clone https://huggingface.co/spaces/PramudithaN/brain-tumor-backend
cd brain-tumor-backend
```

### 3. Copy the Backend Files
Copy the following files/folders from your project's `backend/` directory directly into the root of the cloned `brain-tumor-backend/` folder:

* `app/` (the entire folder containing `main.py`, `inference/`, `auth/`, etc.)
* `requirements.txt`
* `Dockerfile`

Your cloned `brain-tumor-backend` folder structure should look like this:
```
brain-tumor-backend/
├── app/
│   ├── main.py
│   ├── auth/
│   ├── inference/
│   │   └── classifier.py
│   │   └── model.onnx  <-- (Place your ML model file here)
│   ├── records/
│   └── validation/
├── requirements.txt
└── Dockerfile
```

### 4. Place your ML Model File
If you have an ONNX model file (e.g., `model.onnx`), place it inside the `app/inference/` folder before pushing.
To ensure Git LFS tracks your model file, run this inside the `brain-tumor-backend` directory:
```bash
git lfs track "*.onnx"
git lfs track "*.keras"
git lfs track "*.h5"
```

### 5. Commit and Push to Hugging Face
Run these commands inside the `brain-tumor-backend` directory to deploy:
```bash
git add .
git commit -m "Deploy FastAPI Backend with ML Model"
git push
```
*Note: When prompted for your Git password, use the **Hugging Face Access Token** you generated in the prerequisites.*

---

## ⚙️ Environment Variables (Secrets)
Before the app can run successfully, go to your Space's settings page:
🔗 **Settings URL**: https://huggingface.co/spaces/PramudithaN/brain-tumor-backend/settings

Scroll down to **Variables and Secrets** and click **New Secret** to add these four environment variables:
1. `SUPABASE_URL`
2. `SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `SUPABASE_JWT_SECRET`

---

## 🔗 Update Frontend Configuration
Once the build completes and status shows **Running**, your live backend API will be available at:
👉 `https://pramudithan-brain-tumor-backend.hf.space`

Update the `VITE_API_URL` variable in your frontend `.env` file to this URL:
```env
VITE_API_URL=https://pramudithan-brain-tumor-backend.hf.space
```
