import { jsPDF } from 'jspdf';

export interface PDFReportData {
  id?: string;
  email?: string;
  prediction_label: string;
  confidence: number;
  model_version: string;
  created_at: string;
  imageUrl: string | null; // Can be a local base64 preview or remote URL
  explanation_text?: string;
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

export const generatePDFDoc = async (data: PDFReportData): Promise<jsPDF> => {
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
      case 'Unrecognized Tumor': return [245, 158, 11]; // #F59E0B (Amber/Warning)
      case 'No Tumor':
      case 'No tumor detected':
        return [74, 222, 156]; // #4ADE9C (Green)
      default: return [92, 200, 255];
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

  // --- 1. Header (Compact Dark Brand Logo Bar) ---
  doc.setFillColor(15, 17, 20); // Dark background header bar
  doc.rect(0, 0, 210, 22, 'F');
  
  // Brand Logo: "NeuroScan" (White) "AI" (Cyan)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(242, 241, 237); // White
  doc.text('NeuroScan', 20, 14);
  
  const textWidth = doc.getTextWidth('NeuroScan');
  doc.setTextColor(92, 200, 255); // Cyan color
  doc.text('AI', 20 + textWidth + 1, 14);

  // Subtitle / Document Type (Right-aligned inside dark header)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(156, 159, 164); // Muted gray
  doc.text('CLINICAL MRI DIAGNOSIS & INSIGHTS REPORT', 122, 13);
  
  // Decorative Color Bar
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.rect(0, 22, 210, 2, 'F');

  // --- 2. Report Metadata (Starts at Y=30) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(10, 11, 13);
  doc.text('METADATA ANALYSIS REPORT', 20, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 75, 80);
  
  // Left column
  doc.text(`Patient Ref: ${data.email || 'Guest Mode (Anonymous Scan)'}`, 20, 38);
  doc.text(`Record ID: ${data.id || 'N/A (unsaved)'}`, 20, 43);
  doc.text(`Processed Date: ${formattedDate}`, 20, 48);

  // Right column
  doc.text(`Inference Engine: ${data.model_version}`, 120, 38);
  doc.text(`Format: High-Resolution T1/T2 MRI`, 120, 43);
  doc.text(`Status: Completed`, 120, 48);

  // Divider Line
  doc.setDrawColor(220, 222, 225);
  doc.setLineWidth(0.4);
  doc.line(20, 52, 190, 52);

  // --- 3. Abnormality Findings & Image Preview (Starts at Y=56) ---
  let nextY = 56;

  if (data.imageUrl) {
    try {
      const base64Img = await getBase64Image(data.imageUrl);
      
      // Draw border for image
      doc.setDrawColor(42, 45, 49);
      doc.setFillColor(0, 0, 0);
      doc.rect(20, 56, 45, 45, 'FD');
      
      // Embed image inside border
      doc.addImage(base64Img, 'JPEG', 21, 57, 43, 43);
      
      // Shift metadata right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(10, 11, 13);
      doc.text('DIAGNOSTIC FINDINGS', 75, 60);
      
      // Classification Box
      doc.setFillColor(245, 246, 248);
      doc.rect(75, 64, 115, 14, 'F');
      
      // Small Status Dot
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.circle(81, 71, 1.8, 'F');
      
      // Result Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(data.prediction_label === 'No Tumor' ? 'No Tumor Detected' : `${data.prediction_label} Tumor`, 86, 74);
      
      // Confidence Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(10, 11, 13);
      doc.text(`Classification Confidence: ${(data.confidence * 100).toFixed(2)}%`, 75, 87);
      
      // Confidence bar container
      doc.setFillColor(230, 232, 235);
      doc.rect(75, 92, 115, 2.5, 'F');
      
      // Confidence bar filled
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.rect(75, 92, 115 * data.confidence, 2.5, 'F');

      nextY = 107;
    } catch (e) {
      console.warn("Could not embed image, drawing text layout instead:", e);
    }
  }

  // If image was not drawn, render full-width text findings
  if (nextY === 56) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(10, 11, 13);
    doc.text('DIAGNOSTIC FINDINGS', 20, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`${data.prediction_label === 'No Tumor' ? 'No Tumor Detected' : `${data.prediction_label} Tumor`} (${(data.confidence * 100).toFixed(2)}% Confidence)`, 20, 64);
    
    nextY = 74;
  }

  // Divider Line before XAI
  doc.setDrawColor(220, 222, 225);
  doc.setLineWidth(0.4);
  doc.line(20, nextY, 190, nextY);

  // --- 4. Explainable AI (XAI) Reports (Starts at Y=nextY + 5) ---
  let xaiY = nextY + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(10, 11, 13);
  doc.text('EXPLAINABLE AI (XAI) ASSISTANCE INSIGHTS', 20, xaiY);
  
  xaiY += 5;
  
  const text = data.explanation_text || '';
  const clinicianMarker = 'FOR RADIOLOGISTS & CLINICIANS:';
  const patientMarker = 'FOR PATIENTS & FAMILIES:';
  
  const cleanTextForPDF = (t: string) => {
    return t
      .replace(/•/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Strip all non-ASCII characters (including emojis and zero-width joiners)
      .trim();
  };
  
  let clinicianText = '';
  let patientText = '';
  
  if (text.includes(clinicianMarker) && text.includes(patientMarker)) {
    const parts = text.split(patientMarker);
    clinicianText = cleanTextForPDF(parts[0].replace(clinicianMarker, '').replace(/={3,}/g, ''));
    patientText = cleanTextForPDF(parts[1].replace(/={3,}/g, ''));
  } else {
    clinicianText = cleanTextForPDF(text.replace(/={3,}/g, ''));
  }

  // Draw Clinician Card (Dynamic Height)
  if (clinicianText) {
    const splitClinician = doc.splitTextToSize(clinicianText, 158);
    const clinicianLinesHeight = splitClinician.length * 4.2;
    const cardHeight = clinicianLinesHeight + 11;
    
    doc.setFillColor(244, 248, 253); // Light blue card
    doc.rect(20, xaiY, 170, cardHeight, 'F');
    
    // Border left (blue accent line)
    doc.setFillColor(59, 130, 246);
    doc.rect(20, xaiY, 1.8, cardHeight, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138); // Dark blue text
    doc.text('CLINICAL & RADIOLOGICAL ASSISTANCE', 25, xaiY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(splitClinician, 25, xaiY + 10);
    
    xaiY += cardHeight + 5;
  }
  
  // Draw Patient Card (Dynamic Height)
  if (patientText) {
    const splitPatient = doc.splitTextToSize(patientText, 158);
    const patientLinesHeight = splitPatient.length * 4.2;
    const cardHeight = patientLinesHeight + 11;
    
    doc.setFillColor(240, 253, 244); // Light green card
    doc.rect(20, xaiY, 170, cardHeight, 'F');
    
    // Border left (green accent line)
    doc.setFillColor(34, 197, 94);
    doc.rect(20, xaiY, 1.8, cardHeight, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 83, 45); // Dark green text
    doc.text('PATIENT & FAMILY GUIDANCE', 25, xaiY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(splitPatient, 25, xaiY + 10);
    
    xaiY += cardHeight + 5;
  }

  // --- 5. Medical Disclaimer ---
  const disclaimerY = 238;
  
  // Background Box
  doc.setFillColor(254, 242, 242); // Light red box for notice
  doc.rect(20, disclaimerY, 170, 26, 'F');
  
  // Border left
  doc.setFillColor(239, 68, 68); // Darker red highlight
  doc.rect(20, disclaimerY, 1.8, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27); // Dark red text
  doc.text('IMPORTANT CLINICAL DISCLAIMER:', 25, disclaimerY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  
  const disclaimerText = 'This report is generated automatically by an artificial intelligence image recognition model for informational and screening support purposes only. It does not constitute a formal diagnosis, medical advice, or therapeutic guide. Results should be verified and confirmed by a certified radiologist or neuro-clinical medical professional before initiating any treatment plans.';
  const splitDisclaimer = doc.splitTextToSize(disclaimerText, 160);
  doc.text(splitDisclaimer, 25, disclaimerY + 11);

  // --- 6. Footer ---
  doc.setDrawColor(220, 222, 225);
  doc.setLineWidth(0.4);
  doc.line(20, 280, 190, 280);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(156, 159, 164);
  
  doc.text('NeuroScanAI Clinical Portal • Analysis Report Export', 20, 286);
  doc.text('Page 1 of 1', 174, 286);

  return doc;
};

export const downloadPDFReport = async (data: PDFReportData): Promise<void> => {
  const doc = await generatePDFDoc(data);
  const sanitizeFilename = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '-');
  };
  const filename = `neuroscan-report-${sanitizeFilename(data.prediction_label)}-${Date.now().toString().slice(-6)}.pdf`;
  doc.save(filename);
};
