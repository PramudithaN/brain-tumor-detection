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

  // Determine if result indicates a tumor is detected
  const isTumorDetected = result && result.prediction_label !== 'No Tumor';

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Introduction Hero */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 1.5, letterSpacing: '-0.5px' }}>
          Clinical Brain MRI Scan Analyzer
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 650, mx: 'auto', mb: 2 }}>
          Upload high-resolution horizontal, sagittal, or coronal T1/T2-weighted brain MRI images to classify and locate possible abnormalities.
        </Typography>
        {!user && (
          <Alert severity="info" sx={{ display: 'inline-flex', textAlign: 'left', borderRadius: 2 }}>
            <Box>
              Running in <strong>Guest Mode</strong>. Your scans and results will not be saved. 
              <Button color="primary" size="small" onClick={() => navigate('/login')} sx={{ ml: 1, fontWeight: 700 }}>
                Sign in to save history
              </Button>
            </Box>
          </Alert>
        )}
      </Box>

      <Grid container spacing={4}>
        {/* Left Side: Upload Panel */}
        <Grid size={{ xs: 12, md: result ? 6 : 8 }} sx={{ mx: 'auto', transition: 'all 0.3s ease-in-out' }}>
          <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
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
                    borderColor: dragOver ? 'primary.main' : '#CBD5E1',
                    borderRadius: 3,
                    backgroundColor: dragOver ? 'rgba(15, 102, 116, 0.04)' : '#F8FAFC',
                    p: 6,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease-in-out',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(15, 102, 116, 0.02)',
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
                  <CloudUploadIcon color="primary" sx={{ fontSize: 56, mb: 2 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Drag & drop your MRI image here
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Supports JPEG, PNG up to 10MB
                  </Typography>
                  <Button variant="outlined" color="primary" size="small">
                    Browse Files
                  </Button>
                </Box>
              ) : (
                <Box>
                  {/* Preview Container */}
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      position: 'relative',
                      backgroundColor: '#000000',
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
                    
                    {/* Floating File Info */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(30, 41, 59, 0.75)',
                        backdropFilter: 'blur(4px)',
                        color: '#ffffff',
                        px: 2,
                        py: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {file?.name}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8, flexShrink: 0 }}>
                        {file && (file.size / (1024 * 1024)).toFixed(2)} MB
                      </Typography>
                    </Box>
                  </Paper>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={handleClear}
                      disabled={loading}
                      startIcon={<DeleteIcon />}
                      sx={{ borderColor: '#CBD5E1', color: 'text.secondary', flex: 1 }}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"  // Coral CTA for accent
                      onClick={handleAnalyze}
                      disabled={loading}
                      endIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <ArrowForwardIcon />}
                      sx={{ flex: 2, py: 1.2 }}
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
            <Card sx={{ borderRadius: 3, borderLeft: '6px solid', borderLeftColor: isTumorDetected ? 'secondary.main' : 'primary.main', height: '100%' }}>
              <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Analysis Report
                </Typography>

                {/* Primary Result Headline */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 4 }}>
                  {isTumorDetected ? (
                    <WarningIcon sx={{ color: 'secondary.main', fontSize: 44, mt: 0.5 }} />
                  ) : (
                    <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 44, mt: 0.5 }} />
                  )}
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                      Diagnostic Classification
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: isTumorDetected ? 'secondary.main' : 'primary.main', my: 0.5 }}>
                      {result.prediction_label} Detected
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inference Engine: {result.model_version}
                    </Typography>
                  </Box>
                </Box>

                {/* Confidence Score Representation */}
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Classification Confidence
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {(result.confidence * 100).toFixed(2)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={result.confidence * 100}
                    color={isTumorDetected ? "secondary" : "primary"}
                    sx={{ height: 10, borderRadius: 5, backgroundColor: '#E2E8F0' }}
                  />
                </Box>

                {/* DB Sync Status */}
                <Box sx={{ mt: 'auto', p: 2, borderRadius: 2, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <InfoIcon color="primary" fontSize="small" />
                  <Typography variant="caption" color="text.secondary">
                    {result.saved_to_history ? (
                      <span>This scan and report have been automatically saved to your cloud <strong>History</strong>.</span>
                    ) : (
                      <span>In guest mode. Report is transient and will not be saved. <Button size="small" onClick={() => navigate('/login')} sx={{ p: 0, minWidth: 'auto', textTransform: 'none', fontWeight: 700 }}>Sign in</Button> to persist files.</span>
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
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
          Understanding MRI AI Classification
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                <HelpIcon color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  What is Glioma?
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Gliomas are tumors that start in the glial cells of the brain or spine. They are the most common type of primary brain tumor.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                <HelpIcon color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  What is Meningioma?
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                A meningioma is a tumor that arises from the meninges — the membranes surrounding the brain and spinal cord. Most are non-cancerous.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                <HelpIcon color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  What is Pituitary?
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Pituitary tumors are abnormal growths that develop in the pituitary gland at the base of the brain. Most pituitary tumors are benign.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};
