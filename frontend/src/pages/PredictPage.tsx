import React, { useState, useRef } from 'react';
import { Container, Grid, Card, CardContent, Typography, Button, Box, CircularProgress, Alert, Paper, LinearProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HelpIcon from '@mui/icons-material/Help';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { apiService } from '../apiService';
import type { PredictionResult } from '../apiService';

interface PredictPageProps {
  user: User | null;
}

export const PredictPage: React.FC<PredictPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const processFile = (selectedFile: File) => {
    setError(null);
    setResult(null);

    // Client-side validation
    // 1. File Type Check
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Unsupported file type. Please upload a JPEG or PNG image.');
      return;
    }

    // 2. File Size Check (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File size too large. MRI scans must be under 10MB.');
      return;
    }

    setFile(selectedFile);
    
    // Create image preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setFile(null);
    setImagePreview(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    try {
      const res = await apiService.predict(file);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'An error occurred during image processing.');
    } finally {
      setLoading(false);
    }
  };

  const getClassificationColor = (label: string) => {
    switch (label) {
      case 'Glioma': return '#FF5A46';       // --heat-red
      case 'Meningioma': return '#FFB238';   // --heat-amber
      case 'Pituitary': return '#5CC8FF';    // --signal-cyan
      case 'No Tumor':
      case 'No tumor detected':
        return '#4ADE9C';                    // --clear-mint
      default: return '#5CC8FF';
    }
  };

  // Determine if result indicates a tumor is detected
  const isTumorDetected = result && result.prediction_label !== 'No Tumor';

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Introduction Hero */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h1" sx={{ mb: 1.5 }}>
          Clinical Brain MRI Scan Analyzer
        </Typography>
        <Typography variant="body1" sx={{ color: '#9C9FA4', maxWidth: 650, mx: 'auto', mb: 2 }}>
          Upload high-resolution horizontal, sagittal, or coronal T1/T2-weighted brain MRI images to classify and locate possible abnormalities.
        </Typography>
        {!user && (
          <Box sx={{
            display: 'inline-flex',
            textAlign: 'left',
            p: 2,
            pl: 3,
            borderLeft: '3px solid #5CC8FF', // var(--signal-cyan)
            backgroundColor: '#1C1F23',      // var(--surface-raised)
            borderRadius: '0 12px 12px 0',
            mt: 2
          }}>
            <Typography variant="body2" sx={{ color: '#F2F1ED' }}>
              Running in <strong>Guest Mode</strong>. Your scans and results will not be saved. 
              <Button color="info" size="small" onClick={() => navigate('/login')} sx={{ ml: 1.5, p: 0, minWidth: 'auto', textTransform: 'none', fontWeight: 700, color: '#5CC8FF', '&:hover': { textDecoration: 'underline' } }}>
                Sign in to save history
              </Button>
            </Typography>
          </Box>
        )}
      </Box>

      <Grid container spacing={4}>
        {/* Left Side: Upload Panel */}
        <Grid size={{ xs: 12, md: result ? 6 : 8 }} sx={{ mx: 'auto', transition: 'all 0.3s ease-in-out' }}>
          <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h2" sx={{ mb: 2 }}>
                Upload MRI Scan
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

              {/* Upload Dropzone */}
              {!imagePreview ? (
                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleBrowseClick}
                  sx={{
                    border: '2px dashed',
                    borderColor: dragOver ? '#5CC8FF' : '#2A2D31',
                    borderRadius: 3,
                    backgroundColor: dragOver ? 'rgba(92, 200, 255, 0.08)' : '#15171A',
                    p: 6,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease-in-out',
                    '&:hover': {
                      borderColor: '#5CC8FF',
                      backgroundColor: '#1C1F23',
                    }
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept=".jpg,.jpeg,.png"
                  />
                  <CloudUploadIcon sx={{ color: '#5CC8FF', fontSize: 56, mb: 2 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5, fontFamily: '"Space Grotesk", sans-serif' }}>
                    Drag & drop your MRI image here
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9C9FA4', mb: 2 }}>
                    Supports JPEG, PNG up to 10MB
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="small"
                    sx={{ 
                      backgroundColor: '#1C1F23', 
                      border: '1px solid #3D4147',
                      color: '#F2F1ED',
                      '&:hover': {
                        backgroundColor: '#2A2D31',
                        borderColor: '#5CC8FF'
                      }
                    }}
                  >
                    Browse Files
                  </Button>
                </Box>
              ) : (
                <Box>
                  {/* Preview Container */}
                  <Paper
                    variant="outlined"
                    className="scan-container"
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      position: 'relative',
                      backgroundColor: '#000000',
                      border: '1px solid #2A2D31',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 320,
                      mb: 3
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="MRI Scan Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                    
                    {loading && <Box className="scan-line" />}
                    
                    {/* Floating File Info */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(21, 23, 26, 0.85)',
                        borderTop: '1px solid #2A2D31',
                        color: '#F2F1ED',
                        px: 2,
                        py: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {file?.name}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Mono", monospace', opacity: 0.8, flexShrink: 0 }}>
                        {file && (file.size / (1024 * 1024)).toFixed(2)} MB
                      </Typography>
                    </Box>
                  </Paper>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleClear}
                      disabled={loading}
                      startIcon={<DeleteIcon />}
                      sx={{ 
                        backgroundColor: '#1C1F23', 
                        border: '1px solid #3D4147',
                        color: '#9C9FA4',
                        flex: 1,
                        '&:hover': {
                          backgroundColor: '#2A2D31',
                          color: '#F2F1ED'
                        }
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleAnalyze}
                      disabled={loading}
                      endIcon={loading ? <CircularProgress size={20} sx={{ color: '#0A0B0D' }} /> : <ArrowForwardIcon />}
                      sx={{ 
                        flex: 2, 
                        py: 1.2,
                        background: 'linear-gradient(135deg, #FF5A46 0%, #FFB238 100%)',
                        color: '#0A0B0D',
                        fontWeight: 700,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #FF705E 0%, #FFC154 100%)',
                        },
                        '&.Mui-disabled': {
                          background: '#1C1F23',
                          color: '#6B6E73',
                          border: '1px solid #2A2D31'
                        }
                      }}
                    >
                      {loading ? 'Analyzing Scan...' : 'Analyze MRI Scan'}
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Prediction Result Panel (only visible when prediction is complete) */}
        {result && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 3, borderLeft: '6px solid', borderLeftColor: getClassificationColor(result.prediction_label), height: '100%' }}>
              <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h2" sx={{ mb: 3 }}>
                  Analysis Report
                </Typography>

                {/* Primary Result Headline */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      backgroundColor: getClassificationColor(result.prediction_label), 
                      boxShadow: `0 0 10px 2px ${getClassificationColor(result.prediction_label)}` 
                    }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: '"IBM Plex Mono", monospace', 
                        fontWeight: 600, 
                        color: getClassificationColor(result.prediction_label), 
                        letterSpacing: '0.08em', 
                        textTransform: 'uppercase' 
                      }}
                    >
                      {result.prediction_label === 'No Tumor' ? 'No Tumor Detected' : 'Abnormal Tissue Detected'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5 }}>
                      {result.prediction_label === 'No Tumor' ? 'Benign Scan' : `${result.prediction_label} Tumor`}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6B6E73', fontFamily: '"IBM Plex Mono", monospace', mt: 1 }}>
                      Inference Engine: {result.model_version}
                    </Typography>
                  </Box>
                </Box>

                {/* Radial Scan Gauge for Confidence */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4, mt: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 3, color: '#9C9FA4', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                    Classification Confidence
                  </Typography>
                  <Box sx={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CircularProgress
                      variant="determinate"
                      value={100}
                      size={140}
                      thickness={2}
                      sx={{ color: '#2A2D31' }}
                    />
                    <CircularProgress
                      variant="determinate"
                      value={result.confidence * 100}
                      size={140}
                      thickness={2.5}
                      sx={{
                        color: getClassificationColor(result.prediction_label),
                        position: 'absolute',
                        left: 0,
                        '& .MuiCircularProgress-circle': {
                          strokeLinecap: 'round',
                        },
                      }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography
                        variant="h4"
                        component="div"
                        sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600, color: '#F2F1ED' }}
                      >
                        {(result.confidence * 100).toFixed(1)}%
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: '#6B6E73', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 600, mt: 0.5, letterSpacing: '0.05em' }}
                      >
                        Confidence
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* DB Sync Status */}
                <Box sx={{ mt: 'auto', p: 2, borderRadius: 1.5, backgroundColor: '#1C1F23', border: '1px solid #2A2D31', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#5CC8FF' }} />
                  <Typography variant="caption" sx={{ color: '#9C9FA4' }}>
                    {result.saved_to_history ? (
                      <span>This scan and report have been automatically saved to your cloud <strong>History</strong>.</span>
                    ) : (
                      <span>In guest mode. Report is transient and will not be saved. <Button size="small" onClick={() => navigate('/login')} sx={{ p: 0, minWidth: 'auto', textTransform: 'none', fontWeight: 700, color: '#5CC8FF', '&:hover': { textDecoration: 'underline' } }}>Sign in</Button> to persist files.</span>
                    )}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Frequently Asked Questions / Explanation */}
      <Box sx={{ mt: 8 }}>
        <Typography variant="h2" sx={{ mb: 3, textAlign: 'center' }}>
          Understanding MRI AI Classification
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%', backgroundColor: '#15171A', borderColor: '#2A2D31' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, fontFamily: '"Space Grotesk", sans-serif', color: '#F2F1ED' }}>
                What is Glioma?
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#9C9FA4' }}>
                Gliomas are tumors that start in the glial cells of the brain or spine. They are the most common type of primary brain tumor.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%', backgroundColor: '#15171A', borderColor: '#2A2D31' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, fontFamily: '"Space Grotesk", sans-serif', color: '#F2F1ED' }}>
                What is Meningioma?
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#9C9FA4' }}>
                A meningioma is a tumor that arises from the meninges - the membranes surrounding the brain and spinal cord. Most are non-cancerous.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%', backgroundColor: '#15171A', borderColor: '#2A2D31' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, fontFamily: '"Space Grotesk", sans-serif', color: '#F2F1ED' }}>
                What is Pituitary?
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#9C9FA4' }}>
                Pituitary tumors are abnormal growths that develop in the pituitary gland at the base of the brain. Most pituitary tumors are benign.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};
