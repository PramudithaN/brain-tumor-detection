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

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} color="inherit">
          Back to Analyzer
        </Button>
      </Box>
      
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px' }}>
        MRI Scan History
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Review your past clinical scan reports, classification confidences, and uploaded neuro-imaging records.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}

      {records.length === 0 ? (
        <Card variant="outlined" sx={{ py: 8, px: 2, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CalendarTodayIcon sx={{ fontSize: 50, color: 'text.secondary', opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
              No scan history found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 1 }}>
              You haven't analyzed any MRI scans under this account yet. Go back to the dashboard to run your first report.
            </Typography>
            <Button variant="contained" color="primary" onClick={() => navigate('/')}>
              Start MRI Analysis
            </Button>
          </Box>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {records.map((record) => {
            const hasTumor = record.prediction_label !== 'No Tumor';
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={record.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
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
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          backgroundColor: hasTumor ? 'rgba(232, 89, 60, 0.08)' : 'rgba(15, 102, 116, 0.08)',
                          color: hasTumor ? 'secondary.main' : 'primary.main',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase'
                        }}
                      >
                        {record.prediction_label}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {(record.confidence * 100).toFixed(1)}% conf.
                      </Typography>
                    </Box>

                    {/* Date */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {formatDate(record.created_at)}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Model: {record.model_version}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'space-between' }}>
                    <IconButton size="small" onClick={() => handleDelete(record.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                    <Button
                      size="small"
                      startIcon={<ZoomInIcon />}
                      onClick={() => setSelectedRecord(record)}
                      variant="outlined"
                      sx={{ borderRadius: 2 }}
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
      <Dialog open={selectedRecord !== null} onClose={() => setSelectedRecord(null)} maxWidth="md" fullWidth sx={{ borderRadius: 3 }}>
        {selectedRecord && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Scan Analysis Report
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {selectedRecord.id.substring(0, 8)}...
              </Typography>
            </DialogTitle>
            
            <DialogContent sx={{ p: 4, pt: 0 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ width: '100%', height: 320, backgroundColor: '#000000', borderRadius: 3, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                      {selectedRecord.prediction_label !== 'No Tumor' ? (
                        <WarningIcon sx={{ color: 'secondary.main', fontSize: 32, mt: 0.3 }} />
                      ) : (
                        <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 32, mt: 0.3 }} />
                      )}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                          Classification
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: selectedRecord.prediction_label !== 'No Tumor' ? 'secondary.main' : 'primary.main' }}>
                          {selectedRecord.prediction_label} Detected
                        </Typography>
                      </Box>
                    </Box>

                    {/* Progress Bar Confidence */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Confidence Score
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {(selectedRecord.confidence * 100).toFixed(2)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={selectedRecord.confidence * 100}
                        color={selectedRecord.prediction_label !== 'No Tumor' ? "secondary" : "primary"}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Analyzed on:</strong> {formatDate(selectedRecord.created_at)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Model Version:</strong> {selectedRecord.model_version}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Storage Path:</strong> {selectedRecord.image_path}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                    <Button variant="outlined" color="error" fullWidth onClick={() => handleDelete(selectedRecord.id)}>
                      Delete Record
                    </Button>
                    <Button variant="contained" color="primary" fullWidth onClick={() => setSelectedRecord(null)}>
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
