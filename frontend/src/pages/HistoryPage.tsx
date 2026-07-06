import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Card, CardContent, Button, Box, CircularProgress, Alert, IconButton, Dialog, DialogContent, DialogTitle, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { apiService } from '../apiService';
import type { ScanRecord } from '../apiService';
import { useNotification } from '../components/NotificationContext';

interface HistoryPageProps {
  user: User | null;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLabel, setFilterLabel] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  
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
      showNotification(err.message || 'Failed to fetch scan history.', 'error');
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
      showNotification('Scan record deleted successfully.', 'success');
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete record.', 'error');
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

  const filteredRecords = records
    .filter((record) => {
      const matchesSearch = 
        record.prediction_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.model_version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(record.created_at).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLabel = filterLabel === 'All' || record.prediction_label === filterLabel;
      
      return matchesSearch && matchesLabel;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'confidence') {
        return b.confidence - a.confidence;
      }
      return 0;
    });

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
        <>
          {/* Search and Filters */}
          <Box sx={{ 
            mb: 4, 
            p: 2.5, 
            borderRadius: 3, 
            backgroundColor: '#15171A', 
            border: '1px solid #2A2D31',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: 'center'
          }}>
            <TextField
              placeholder="Search by label, date, or engine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              fullWidth
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#6B6E73', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }
              }}
              sx={{
                flexGrow: 3,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#0A0B0D',
                  '& fieldset': { borderColor: '#2A2D31' },
                  '&:hover fieldset': { borderColor: '#3D4147' },
                  '&.Mui-focused fieldset': { borderColor: '#5CC8FF' },
                }
              }}
            />

            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 }, flexGrow: 1 }}>
              <InputLabel id="filter-label-select-label" sx={{ color: '#9C9FA4', fontSize: '0.85rem' }}>Diagnosis</InputLabel>
              <Select
                labelId="filter-label-select-label"
                id="filter-label-select"
                value={filterLabel}
                label="Diagnosis"
                onChange={(e) => setFilterLabel(e.target.value)}
                sx={{
                  backgroundColor: '#0A0B0D',
                  color: '#F2F1ED',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2A2D31' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3D4147' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5CC8FF' },
                }}
              >
                <MenuItem value="All">All Diagnosis</MenuItem>
                <MenuItem value="No Tumor">No Tumor</MenuItem>
                <MenuItem value="Glioma">Glioma</MenuItem>
                <MenuItem value="Meningioma">Meningioma</MenuItem>
                <MenuItem value="Pituitary">Pituitary</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 }, flexGrow: 1 }}>
              <InputLabel id="sort-select-label" sx={{ color: '#9C9FA4', fontSize: '0.85rem' }}>Sort By</InputLabel>
              <Select
                labelId="sort-select-label"
                id="sort-select"
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
                sx={{
                  backgroundColor: '#0A0B0D',
                  color: '#F2F1ED',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2A2D31' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#3D4147' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5CC8FF' },
                }}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
                <MenuItem value="confidence">Highest Confidence</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {filteredRecords.length === 0 ? (
            <Card variant="outlined" sx={{ py: 6, px: 2, textAlign: 'center', borderRadius: 3, borderColor: '#2A2D31', backgroundColor: '#15171A' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CalendarTodayIcon sx={{ fontSize: 40, color: '#6B6E73' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#F2F1ED', fontFamily: '"Space Grotesk", sans-serif' }}>
                  No matching records found
                </Typography>
                <Typography variant="body2" sx={{ maxWidth: 400, color: '#9C9FA4' }}>
                  Try adjusting your search query or filters to find what you are looking for.
                </Typography>
                <Button size="small" variant="text" onClick={() => { setSearchTerm(''); setFilterLabel('All'); }} sx={{ color: '#5CC8FF', fontWeight: 600 }}>
                  Reset Filters
                </Button>
              </Box>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredRecords.map((record) => {
                const statusColor = getClassificationColor(record.prediction_label);
                return (
                  <Card 
                    key={record.id}
                    sx={{ 
                      borderRadius: 3, 
                      border: '1px solid #2A2D31', 
                      backgroundColor: '#15171A',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        borderColor: '#3D4147',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 3 }}>
                      
                      {/* Thumbnail and Title info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexGrow: 1, width: { xs: '100%', md: 'auto' } }}>
                        {/* MRI Thumbnail */}
                        <Box 
                          sx={{ 
                            width: 72, 
                            height: 72, 
                            borderRadius: 2, 
                            overflow: 'hidden', 
                            flexShrink: 0,
                            backgroundColor: '#000000',
                            border: '1px solid #2A2D31',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <img 
                            src={record.signed_url || 'https://placehold.co/100/000/fff?text=MRI'} 
                            alt="Brain MRI Thumbnail" 
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </Box>
                        
                        {/* Diagnosis & Model details */}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, m: 0, fontSize: '1.1rem', color: '#F2F1ED' }}>
                              {record.prediction_label === 'No Tumor' ? 'No Tumor Detected' : `${record.prediction_label} Tumor`}
                            </Typography>
                            
                            {/* Status Chip */}
                            <Box sx={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 1, 
                              px: 1.5, 
                              py: 0.25, 
                              borderRadius: '12px',
                              border: '1px solid',
                              borderColor: `rgba(${statusColor === '#FF5A46' ? '255, 90, 70' : statusColor === '#FFB238' ? '255, 178, 56' : statusColor === '#4ADE9C' ? '74, 222, 156' : '92, 200, 255'}, 0.2)`,
                              backgroundColor: `rgba(${statusColor === '#FF5A46' ? '255, 90, 70' : statusColor === '#FFB238' ? '255, 178, 56' : statusColor === '#4ADE9C' ? '74, 222, 156' : '92, 200, 255'}, 0.05)`,
                            }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColor }} />
                              <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600, color: statusColor, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {record.prediction_label}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#9C9FA4', fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.75rem' }}>
                              <CalendarTodayIcon sx={{ fontSize: 13, color: '#6B6E73' }} />
                              {formatDate(record.created_at)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6B6E73', fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.75rem' }}>
                              Engine: {record.model_version}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      {/* Confidence and Actions */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}>
                        {/* Confidence Meter */}
                        <Box sx={{ textAlign: { xs: 'left', md: 'right' }, minWidth: 100 }}>
                          <Typography variant="caption" sx={{ color: '#6B6E73', textTransform: 'uppercase', fontWeight: 600, display: 'block', fontSize: '0.65rem', mb: 0.5 }}>
                            Confidence
                          </Typography>
                          <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, fontSize: '1.15rem', color: statusColor }}>
                            {(record.confidence * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                        
                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="medium" 
                            onClick={() => handleDelete(record.id)} 
                            sx={{ 
                              color: '#FF5A46', 
                              border: '1px solid rgba(255, 90, 70, 0.1)',
                              borderRadius: 2,
                              '&:hover': { 
                                backgroundColor: 'rgba(255, 90, 70, 0.08)',
                                borderColor: '#FF5A46'
                              } 
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                          <Button
                            size="medium"
                            startIcon={<ZoomInIcon />}
                            onClick={() => setSelectedRecord(record)}
                            variant="contained"
                            sx={{ 
                              backgroundColor: '#1C1F23', 
                              border: '1px solid #3D4147',
                              color: '#F2F1ED',
                              borderRadius: 2,
                              px: 2,
                              textTransform: 'none',
                              fontWeight: 600,
                              '&:hover': {
                                backgroundColor: '#2A2D31',
                                borderColor: '#5CC8FF'
                              }
                            }}
                          >
                            Report
                          </Button>
                        </Box>
                      </Box>
                      
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </>
      )}

      {/* Record Preview Modal Dialog */}
      <Dialog 
        open={selectedRecord !== null} 
        onClose={() => setSelectedRecord(null)} 
        maxWidth="md" 
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
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
