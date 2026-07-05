# brain-tumor-detection

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Material UI](https://img.shields.io/badge/Material_UI-007FFF?style=for-the-badge&logo=mui&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

> A clinical brain MRI scan classifier utilizing FastAPI and React + Material UI to classify and locate brain tumors.

---

## 📸 Preview

*No preview screenshots available yet in assets/ or public/ directories.*

---

## 📖 About This Project

This project implements a web-based clinical portal that enables users to upload brain MRI scans and get ML-generated tumor predictions. It provides two key usage modes: **Guest mode** for anonymous, instant predictions without data retention, and **Logged-in mode** which securely saves scans and classification records to the user's history using Supabase. The modular monolith design separates auth, validation, inference, and database CRUD on the backend, making it straightforward to scale and adapt.

---

## ✨ Features

- 🧠 **Clinical MRI Classification** - Detects and classifies MRI scans into four classes: Glioma, Meningioma, Pituitary, or No Tumor.
- 🚀 **High-Speed Inference** - Employs a loaded-in-process classifier with a smart local mock-mode fallback if no pretrained weights are present.
- 🎨 **Modern Medical UI** - Features a responsive Material UI design leveraging clinical teal-blue and coral colors.
- 🔐 **Secure Session Auth** - Supports user logins and registration via Supabase Auth with JWT verification at the backend level.
- 📂 **Cloud History Storage** - Uploads MRI images to Supabase Storage and records scan metadata to PostgreSQL.
- 🛡️ **Robust Server Validation** - Verifies file sizes (under 10MB), checks MIME types from raw image bytes, and uses IP-based rate limits.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [FastAPI v0.111.0](https://fastapi.tiangolo.com/) |
| UI Components | [Material UI v6](https://mui.com/) |
| Styling | [Vanilla CSS](https://www.w3.org/Style/CSS/) |
| Language | [TypeScript / Python](https://www.typescriptlang.org/) |
| Database | [Supabase Postgres](https://supabase.com/) |
| Storage | [Supabase Storage](https://supabase.com/storage) |

---

## 📋 Prerequisites

- **Python 3.10 or higher**
- [Node.js](https://nodejs.org/) **v18 or higher**
- [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/)

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/PramudithaN/brain-tumor-detection.git
cd brain-tumor-detection
```

### 2. Install dependencies

For the backend:
```bash
cd backend
python -m venv venv
# On Windows
.\venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
pip install -r requirements.txt
```

For the frontend:
```bash
cd ../frontend
npm install
```

### 3. Set up environment variables

Create a `.env` file in the `backend/` directory:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:8000
```

### 4. Set up database schema

Run the SQL queries in `supabase/schema.sql` inside the Supabase SQL editor to create the `scan_records` table and establish Row-Level Security (RLS) policies.

### 5. Start the development servers

Start the backend:
```bash
cd backend
# With venv active
uvicorn app.main:app --reload --port 8000
```

Start the frontend:
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Available Scripts

### Backend Scripts
| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload` | Starts the FastAPI hot-reload server |

### Frontend Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Runs the Vite development server |
| `npm run build` | Builds the production package |
| `npm run lint` | Lints the code using oxlint |
| `npm run preview` | Runs a local preview of the production build |

---

## 📁 Project Structure

```
brain-tumor-detection/
├── backend/                   # FastAPI backend source
│   ├── app/                   # App code modules
│   │   ├── auth/              # JWT validation rules
│   │   ├── validation/        # Raw byte verification and size limits
│   │   ├── inference/         # Prediction classifier and mock-mode
│   │   ├── records/           # Database CRUD & storage handlers
│   │   └── main.py            # API routes and CORS configuration
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Backend environment variables
├── frontend/                  # React Vite client workspace
│   ├── src/                   # React TypeScript source files
│   │   ├── components/        # Reusable view pieces (Navbar, Footer)
│   │   ├── pages/             # Page views (PredictPage, HistoryPage, LoginPage)
│   │   ├── theme.ts           # Material UI style provider
│   │   ├── apiService.ts      # Client HTTP API client
│   │   └── main.tsx           # Dom renderer and mount point
│   ├── package.json           # Frontend dependency manifest
│   └── .env.example           # Client configuration variables
├── supabase/                  # Database migration configuration
│   └── schema.sql             # Table design and RLS statements
└── brain-tumor-detection-architecture.md  # Original implementation plan
```

---

## 🙋‍♂️ Connect with Me

- **GitHub**: [github.com/PramudithaN](https://github.com/PramudithaN)
- **LinkedIn**: [linkedin.com/in/pramuditha-nadun-612b1b204](https://linkedin.com/in/pramuditha-nadun-612b1b204)
- **Email**: pramudithanadun@gmail.com

---

*Developed with ❤️ by Pramuditha Nadun.*
