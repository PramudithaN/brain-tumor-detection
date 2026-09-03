import os
import sys
import tempfile
import cv2
import numpy as np
import streamlit as st
from PIL import Image

# -----------------------------------------------------------------------------
# Page Configuration & Styling
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="Neuro AI — Brain MRI Diagnosis System",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for rich modern medical UI
st.markdown("""
<style>
    .main-header {
        font-size: 2.3rem;
        font-weight: 800;
        color: #1E3A8A;
        text-align: center;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #4B5563;
        text-align: center;
        margin-bottom: 1.8rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%);
        border-radius: 12px;
        padding: 1.2rem;
        text-align: center;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .prediction-badge {
        font-size: 1.8rem;
        font-weight: 800;
        color: #D97706;
    }
    .report-box-radio {
        background-color: #EFF6FF;
        border-left: 5px solid #2563EB;
        padding: 1.2rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }
    .report-box-patient {
        background-color: #F0FDF4;
        border-left: 5px solid #16A34A;
        padding: 1.2rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Setup Local Import Paths
# -----------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from Neuro_AI_System import run_diagnosis, load_local_models, load_input_file, CLINICAL_EXPLANATIONS

# -----------------------------------------------------------------------------
# Sidebar Configuration
# -----------------------------------------------------------------------------
with st.sidebar:
    st.image("https://img.icons8.com/color/96/brain.png", width=70)
    st.title("🧠 Neuro AI System")
    st.markdown("**Multi-Stage Deep Learning Pipeline**")
    st.markdown("• **Stage 1**: YOLOv8 Bounding Box")
    st.markdown("• **Stage 2**: Swin-UNet Background Blur")
    st.markdown("• **Stage 3**: DenseNet-121 Multi-Specialist")
    st.markdown("• **Stage 4**: Grad-CAM Explainable AI (XAI)")
    st.divider()
    st.info("💡 **Instructions**:\nUpload an MRI image (`.jpg`, `.png`, `.h5`) from your PC or phone, or select a sample image below to run the AI diagnosis.")

# -----------------------------------------------------------------------------
# Main Header
# -----------------------------------------------------------------------------
st.markdown('<div class="main-header">🧠 Neuro AI Diagnostic & Explainable System</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Automated Brain Tumor Detection, Segmentation & Dual-Perspective Clinical Guidance</div>', unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# Image Selection / File Uploader
# -----------------------------------------------------------------------------
st.subheader("📂 1. Select or Upload Patient MRI Scan")

col_upload, col_samples = st.columns([2, 1])

uploaded_file = None
selected_sample_path = None

with col_upload:
    uploaded_file = st.file_uploader(
        "Choose an MRI image file from your PC or Phone",
        type=["jpg", "jpeg", "png", "bmp", "h5"],
        help="Supports 2D images (.jpg, .png, .bmp) and 3D MRI slices (.h5)"
    )

with col_samples:
    def get_sample_p(cls, fn):
        candidates = [
            os.path.join(BASE_DIR, 'dataset_c', 'dataset_c', 'test', cls, fn),
            os.path.join(BASE_DIR, 'dataset_c', 'test', cls, fn),
            os.path.join(os.path.expanduser('~'), 'Downloads', 'dataset_c', 'test', cls, fn)
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
        # Fallback to first image in folder
        for b in [os.path.join(BASE_DIR, 'dataset_c', 'dataset_c', 'test', cls),
                  os.path.join(BASE_DIR, 'dataset_c', 'test', cls)]:
            if os.path.exists(b):
                fl = [f for f in os.listdir(b) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
                if fl: return os.path.join(b, fl[0])
        return None

    sample_dir_glioma = get_sample_p('glioma', 'Te-glTr_0000.jpg')
    sample_dir_mening = get_sample_p('meningioma', 'Te-me_0012.jpg')
    sample_dir_pituit = get_sample_p('pituitary', 'Te-pi_0014.jpg')
    sample_dir_notum  = get_sample_p('notumor', 'Te-noTr_0000.jpg')

    if st.button("🔴 Sample Glioma", use_container_width=True):
        selected_sample_path = sample_dir_glioma
    if st.button("🟢 Sample Meningioma", use_container_width=True):
        selected_sample_path = sample_dir_mening
    if st.button("🟣 Sample Pituitary", use_container_width=True):
        selected_sample_path = sample_dir_pituit
    if st.button("⚪ Sample No Tumor", use_container_width=True):
        selected_sample_path = sample_dir_notum

# Determine target file path
target_file_path = None

if uploaded_file is not None:
    temp_dir = tempfile.mkdtemp()
    target_file_path = os.path.join(temp_dir, uploaded_file.name)
    with open(target_file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
elif selected_sample_path is not None and os.path.exists(selected_sample_path):
    target_file_path = selected_sample_path

# -----------------------------------------------------------------------------
# Execution & Display Section
# -----------------------------------------------------------------------------
if target_file_path:
    st.success(f"Selected MRI Scan: `{os.path.basename(target_file_path)}`")
    
    if st.button("🚀 Run Neuro AI Diagnosis", type="primary", use_container_width=True):
        with st.spinner("Processing MRI through YOLOv8, Swin-UNet, DenseNet-121 & Grad-CAM XAI Engine..."):
            output_dir = BASE_DIR
            diag_res = run_diagnosis(target_file_path, output_dir)
            
        st.toast("Diagnosis Complete! Results updated below.", icon="✅")

        # Load generated output images
        bbox_path = os.path.join(output_dir, 'complete_test_bbox_output.png')
        seg_path = os.path.join(output_dir, 'complete_test_seg_output.png')
        combined_path = os.path.join(output_dir, 'complete_test_combined_output.png')
        five_panel_path = os.path.join(output_dir, 'complete_diagnosis_5panel_output.png')

        pred_cls = diag_res.get('pred_class', 'UNKNOWN')
        conf_val = diag_res.get('conf_percent', 0.0)
        explanation_text = CLINICAL_EXPLANATIONS.get(pred_cls, '')

        # Prominent Result Status Banner
        if pred_cls == 'UNRECOGNIZED_TUMOR':
            st.error(f"🚨 **UNRECOGNIZED / ATYPICAL TUMOR DETECTED** — An abnormal brain lesion was segmented, but it does NOT match the 3 standard trained tumor types (Glioma, Meningioma, Pituitary) with ≥65% certainty (Peak match: {conf_val:.1f}%). Please consult a neurosurgeon or doctor for surgical biopsy.")
        elif pred_cls == 'NOTUMOR':
            st.success(f"🟢 **HEALTHY BRAIN TISSUE (NO TUMOR)** — High Confidence Normal Scan ({conf_val:.1f}%).")
        else:
            st.info(f"🔍 **DIAGNOSIS: {pred_cls}** — Detection & Classification Confidence: {conf_val:.1f}%.")

        # ---------------------------------------------------------------------
        # Tabbed Results Layout
        # ---------------------------------------------------------------------
        tab1, tab2, tab3, tab4 = st.tabs([
            "📊 Executive Summary & 5-Panel Display",
            "📸 Stage-by-Stage Images",
            "👨‍⚕️ Radiologist Assistance Report",
            "👤 Patient & Family Guidance"
        ])

        with tab1:
            st.markdown("### 🔍 5-Panel Clinical & Explainable AI Visual Summary")
            if os.path.exists(five_panel_path):
                st.image(five_panel_path, use_container_width=True)

        with tab2:
            st.markdown("### 📸 High-Resolution Pipeline Stage Outputs")
            c1, c2, c3 = st.columns(3)
            with c1:
                st.markdown("**Stage 1: YOLOv8 Bounding Box**")
                if os.path.exists(bbox_path):
                    st.image(bbox_path, use_container_width=True)
            with c2:
                st.markdown("**Stage 2: Swin-UNet Red Outline**")
                if os.path.exists(seg_path):
                    st.image(seg_path, use_container_width=True)
            with c3:
                st.markdown("**Stage 3: Combined Blurred Background**")
                if os.path.exists(combined_path):
                    st.image(combined_path, use_container_width=True)

        with tab3:
            st.markdown("### 👨‍⚕️ XAI Technical Report for Radiologists & Clinicians")
            st.markdown(f"""
            <div class="report-box-radio">
                <pre style="white-space: pre-wrap; font-family: inherit; font-size: 0.95rem; line-height: 1.6;">{explanation_text}</pre>
            </div>
            """, unsafe_allow_html=True)

        with tab4:
            st.markdown("### 👤 Plain-Language Guide for Patients & Families")
            st.markdown(f"""
            <div class="report-box-patient">
                <pre style="white-space: pre-wrap; font-family: inherit; font-size: 0.95rem; line-height: 1.6;">{explanation_text}</pre>
            </div>
            """, unsafe_allow_html=True)
else:
    st.info("👆 Please upload an MRI image from your device or click a sample button above to begin.")
