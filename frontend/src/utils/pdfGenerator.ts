import { jsPDF } from 'jspdf';

export interface PDFReportData {
  id?: string;
  email?: string;
  prediction_label: string;
  confidence: number;
  model_version: string;
  created_at: string;
  imageUrl: string | null; // Can be a local base64 preview or remote URL
}

// Convert image URL/blob/base64 to a standard Base64 DataURL for PDF embedding
const getBase64Image = async (url: string): Promise<string> => {
  if (url.startsWith('data:image')) {
    return url;
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        reject(new Error('Failed to create canvas context'));
      }
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for PDF embedding'));
    };
    img.src = url;
  });
};

export const downloadPDFReport = async (data: PDFReportData): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const getClassificationColor = (label: string): [number, number, number] => {
    switch (label) {
      case 'Glioma': return [255, 90, 70]; // #FF5A46 (Red)
      case 'Meningioma': return [255, 178, 56]; // #FFB238 (Amber)
      case 'Pituitary': return [92, 200, 255]; // #5CC8FF (Cyan)
      case 'No Tumor':
      case 'No tumor detected':
        return [74, 222, 156]; // #4ADE9C (Green)
      default: return [92, 200, 255];
    }
  };

  const getClassificationDescription = (label: string): string => {
    switch (label) {
      case 'Glioma':
        return 'Gliomas are primary brain tumors that originate in the glial cells (the supportive cells of the brain). Depending on their grade, they can be slow-growing or highly aggressive and invasive. They require prompt evaluation by an oncologist and neurosurgeon.';
      case 'Meningioma':
        return 'Meningiomas arise from the meninges—the protective membranes surrounding the brain and spinal cord. The majority of meningiomas are slow-growing and benign, though they can cause neurological symptoms if they press on nearby brain tissue.';
      case 'Pituitary':
        return 'Pituitary tumors develop in the pituitary gland at the base of the brain, which regulates the body\'s hormonal balance. Most are non-cancerous adenomas, but they can affect hormone production or cause vision issues by pressing on the optic nerve.';
      case 'No Tumor':
      case 'No tumor detected':
        return 'The machine learning analysis indicates no visible signs of Glioma, Meningioma, or Pituitary tumor tissue in the uploaded brain MRI scan. This represents a normal test screening result.';
      default:
        return 'Undetermined classification details. Please verify scan formatting.';
    }
  };

  const statusColor = getClassificationColor(data.prediction_label);
  const formattedDate = new Date(data.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // --- 1. Header (Brand Logo format) ---
  // Background style
  doc.setFillColor(15, 17, 20); // Dark background header bar
  doc.rect(0, 0, 210, 35, 'F');
  
  // Brand Logo: "NeuroScan" (White) "AI" (Cyan)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(242, 241, 237); // White
  doc.text('NeuroScan', 20, 22);
  
  // Measure width of 'NeuroScan' to align 'AI'
  const textWidth = doc.getTextWidth('NeuroScan');
  doc.setTextColor(92, 200, 255); // Cyan color (#5CC8FF)
  doc.text('AI', 20 + textWidth + 1, 22);

  // Subtitle / Document Type
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(156, 159, 164); // Muted gray
  doc.text('CLINICAL MRI SCAN INFECTIOUS & TUMOR ANALYSIS REPORT', 20, 28);
  
  // Decorative Color Bar (cyan/orange gradient color line)
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(0, 35, 210, 2, 'F');

  // --- 2. Report Metadata ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(10, 11, 13);
  doc.text('METADATA ANALYSIS REPORT', 20, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(70, 75, 80);
  
  // Left column
  doc.text(`Patient Ref: ${data.email || 'Guest Mode (Anonymous Scan)'}`, 20, 58);
  doc.text(`Record ID: ${data.id || 'N/A (unsaved)'}`, 20, 64);
  doc.text(`Processed Date: ${formattedDate}`, 20, 70);

  // Right column
  doc.text(`Inference Engine: ${data.model_version}`, 120, 58);
  doc.text(`Format: High-Resolution T1/T2 MRI`, 120, 64);
  doc.text(`Status: Completed`, 120, 70);

  // Divider Line
  doc.setDrawColor(220, 222, 225);
  doc.setLineWidth(0.5);
  doc.line(20, 76, 190, 76);

  // --- 3. Abnormality Findings & Image Preview ---
  let nextY = 86;

  // Render MRI image preview if available
  if (data.imageUrl) {
    try {
      const base64Img = await getBase64Image(data.imageUrl);
      
      // Draw border
      doc.setDrawColor(42, 45, 49);
      doc.setFillColor(0, 0, 0);
      doc.rect(20, 86, 75, 75, 'FD');
      
      // Embed image inside border
      doc.addImage(base64Img, 'JPEG', 21, 87, 73, 73);
      
      // Shift metadata right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(10, 11, 13);
      doc.text('DIAGNOSTIC FINDINGS', 105, 90);
      
      // Classification Box
      doc.setFillColor(245, 246, 248);
      doc.rect(105, 96, 85, 24, 'F');
      
      // Small Status Dot
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.circle(112, 108, 2, 'F');
      
      // Result Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(data.prediction_label === 'No Tumor' ? 'No Tumor Detected' : `${data.prediction_label} Tumor`, 118, 110);
      
      // Confidence Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(10, 11, 13);
      doc.text('Classification Confidence:', 105, 130);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(`${(data.confidence * 100).toFixed(2)}%`, 105, 138);

      // Confidence bar container
      doc.setFillColor(230, 232, 235);
      doc.rect(105, 142, 85, 3, 'F');
      
      // Confidence bar filled
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.rect(105, 142, 85 * data.confidence, 3, 'F');

      nextY = 175;
    } catch (e) {
      console.warn("Could not embed image, drawing text layout instead:", e);
    }
  }

  // If image was not drawn, render full-width text findings
  if (nextY === 86) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(10, 11, 13);
    doc.text('DIAGNOSTIC FINDINGS', 20, 86);
    
    // Result details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`${data.prediction_label === 'No Tumor' ? 'No Tumor Detected' : `${data.prediction_label} Tumor`} (${(data.confidence * 100).toFixed(2)}% Confidence)`, 20, 96);
    
    nextY = 110;
  }

  // --- 4. Description Summary ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(10, 11, 13);
  doc.text('CLASSIFICATION OVERVIEW', 20, nextY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(70, 75, 80);
  
  // Word wrap description text
  const splitDescription = doc.splitTextToSize(getClassificationDescription(data.prediction_label), 170);
  doc.text(splitDescription, 20, nextY + 6);

  // --- 5. Medical Disclaimer ---
  const disclaimerY = 245;
  
  // Background Box
  doc.setFillColor(254, 242, 242); // Light red box for notice
  doc.rect(20, disclaimerY, 170, 24, 'F');
  
  // Border left
  doc.setFillColor(239, 68, 68); // Darker red highlight
  doc.rect(20, disclaimerY, 2, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(153, 27, 27); // Dark red text
  doc.text('IMPORTANT CLINICAL DISCLAIMER:', 25, disclaimerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(153, 27, 27);
  
  const disclaimerText = 'This report is generated automatically by an artificial intelligence image recognition model for informational and screening support purposes only. It does not constitute a formal diagnosis, medical advice, or therapeutic guide. Results should be verified and confirmed by a certified radiologist or neuro-clinical medical professional before initiating any treatment plans.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, 160);
  doc.text(splitDisclaimer, 25, disclaimerY + 12);

  // --- 6. Footer ---
  doc.setDrawColor(220, 222, 225);
  doc.setLineWidth(0.5);
  doc.line(20, 280, 190, 280);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 159, 164);
  
  // Footer text
  doc.text('NeuroScanAI Clinical Portal • Analysis Report Export', 20, 286);
  
  // Page number
  doc.text('Page 1 of 1', 174, 286);

  // Save the PDF file
  const sanitizeFilename = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '-');
  };
  const filename = `neuroscan-report-${sanitizeFilename(data.prediction_label)}-${Date.now().toString().slice(-6)}.pdf`;
  doc.save(filename);
};
