import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Card, CardContent, CardMedia, Button, Box, CircularProgress, Alert, CardActions, IconButton, Dialog, DialogContent, DialogTitle, LinearProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { apiService } from '../apiService';
import type { ScanRecord } from '../apiService';

interface HistoryPageProps {
  user: User | null;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected record for popup modal preview
  const [selectedRecord, setSelectedRecord] = useState<ScanRecord | null>(null);

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      navigate('/login');
      return;
    }

    fetchHistory();
  }, [user, navigate]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getHistory();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch scan history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this scan record? This will permanently delete the image and result.')) {
      return;
    }
    
    try {
      await apiService.deleteRecord(recordId);
      setRecords(records.filter(r => r.id !== recordId));
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress size={50} color="primary" sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Retrieving scan archives...
        </Typography>
      </Container>
    );
  }

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

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/')} 
          sx={{ 
            color: '#F2F1ED', 
            backgroundColor: '#1C1F23', 
            border: '1px solid #3D4147',
            '&:hover': {
              backgroundColor: '#2A2D31',
              borderColor: '#5CC8FF'
            }
          }}
        >
          Back to Analyzer
        </Button>
      </Box>
      
      <Typography variant="h1" sx={{ mb: 1 }}>
        MRI Scan History
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: '#9C9FA4' }}>
        Review your past clinical scan reports, classification confidences, and uploaded neuro-imaging records.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}

      {records.length === 0 ? (
        <Card variant="outlined" sx={{ py: 8, px: 2, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed', borderColor: '#2A2D31', backgroundColor: '#15171A' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CalendarTodayIcon sx={{ fontSize: 50, color: '#6B6E73' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#F2F1ED', fontFamily: '"Space Grotesk", sans-serif' }}>
              No scan history found
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: 400, mb: 1, color: '#9C9FA4' }}>
              You haven't analyzed any MRI scans under this account yet. Go back to the dashboard to run your first report.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => navigate('/')}
              sx={{ 
                background: 'linear-gradient(135deg, #FF5A46 0%, #FFB238 100%)',
                color: '#0A0B0D',
                fontWeight: 700,
                '&:hover': {
                  background: 'linear-gradient(135deg, #FF705E 0%, #FFC154 100%)',
                }
              }}
            >
              Start MRI Analysis
            </Button>
          </Box>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {records.map((record) => {
            const cardColor = getClassificationColor(record.prediction_label);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={record.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, border: '1px solid #2A2D31', backgroundColor: '#15171A' }}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={record.signed_url || 'https://placehold.co/600x400/000/fff?text=MRI+Scan'}
                    alt="Brain MRI scan"
                    sx={{ backgroundColor: '#000000', objectFit: 'contain' }}
                  />
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    {/* Class badge */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cardColor, boxShadow: `0 0 6px ${cardColor}` }} />
                        <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600, color: cardColor, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          {record.prediction_label}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.75rem', color: '#F2F1ED', fontWeight: 500 }}>
                        {(record.confidence * 100).toFixed(1)}%
                      </Typography>
                    </Box>

                    {/* Date */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <CalendarTodayIcon sx={{ fontSize: 16, color: '#6B6E73' }} />
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#9C9FA4', fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.85rem' }}>
                        {formatDate(record.created_at)}
                      </Typography>
                    </Box>

                    <Typography variant="caption" sx={{ display: 'block', color: '#6B6E73', fontFamily: '"IBM Plex Mono", monospace' }}>
                      Engine: {record.model_version}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ px: 3, pb: 3, pt: 0, justifyContent: 'space-between' }}>
                    <IconButton size="small" onClick={() => handleDelete(record.id)} sx={{ color: '#FF5A46', '&:hover': { backgroundColor: 'rgba(255, 90, 70, 0.08)' } }}>
                      <DeleteIcon />
                    </IconButton>
                    <Button
                      size="small"
                      startIcon={<ZoomInIcon />}
                      onClick={() => setSelectedRecord(record)}
                      variant="contained"
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
                      View Report
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Record Preview Modal Dialog */}
      <Dialog 
        open={selectedRecord !== null} 
        onClose={() => setSelectedRecord(null)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#15171A',
            border: '1px solid #2A2D31',
            borderRadius: 3,
            backgroundImage: 'none'
          }
        }}
      >
        {selectedRecord && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #2A2D31' }}>
              <Typography variant="h2" sx={{ fontSize: '1.25rem' }}>
                Scan Analysis Report
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: '"IBM Plex Mono", monospace', color: '#6B6E73' }}>
                ID: {selectedRecord.id.substring(0, 8)}...
              </Typography>
            </DialogTitle>
            
            <DialogContent sx={{ p: 4, pt: 3 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ width: '100%', height: 320, backgroundColor: '#000000', borderRadius: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2A2D31' }}>
                    <img
                      src={selectedRecord.signed_url || 'https://placehold.co/600x400/000/fff?text=MRI+Scan'}
                      alt="MRI Scan Detail"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </Box>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
                      <Box sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        mt: 0.8,
                        backgroundColor: getClassificationColor(selectedRecord.prediction_label), 
                        boxShadow: `0 0 8px 1px ${getClassificationColor(selectedRecord.prediction_label)}` 
                      }} />
                      <Box>
                        <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: '#6B6E73', letterSpacing: '0.05em' }}>
                          Diagnostic Classification
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: getClassificationColor(selectedRecord.prediction_label) }}>
                          {selectedRecord.prediction_label === 'No Tumor' ? 'No Tumor Detected' : `${selectedRecord.prediction_label} Detected`}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Radial Scan Gauge for Confidence inside Dialog */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, mb: 1.5, color: '#9C9FA4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Classification Confidence
                      </Typography>
                      <Box sx={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress variant="determinate" value={100} size={110} thickness={2} sx={{ color: '#2A2D31' }} />
                        <CircularProgress variant="determinate" value={selectedRecord.confidence * 100} size={110} thickness={2.5} sx={{ color: getClassificationColor(selectedRecord.prediction_label), position: 'absolute', left: 0, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
                        <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="h5" sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600, color: '#F2F1ED' }}>
                            {(selectedRecord.confidence * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1, color: '#9C9FA4' }}>
                      <strong>Analyzed on:</strong> <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>{formatDate(selectedRecord.created_at)}</span>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, color: '#9C9FA4' }}>
                      <strong>Model Version:</strong> <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>{selectedRecord.model_version}</span>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1, color: '#9C9FA4', wordBreak: 'break-all' }}>
                      <strong>Storage Path:</strong> <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.8rem' }}>{selectedRecord.image_path}</span>
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      fullWidth 
                      onClick={() => handleDelete(selectedRecord.id)}
                      sx={{
                        borderColor: '#3D4147',
                        color: '#FF5A46',
                        '&:hover': {
                          borderColor: '#FF5A46',
                          backgroundColor: 'rgba(255, 90, 70, 0.08)'
                        }
                      }}
                    >
                      Delete Record
                    </Button>
                    <Button 
                      variant="contained" 
                      fullWidth 
                      onClick={() => setSelectedRecord(null)}
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
                      Close Preview
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Container>
  );
};
