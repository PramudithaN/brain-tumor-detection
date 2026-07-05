import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export const Footer: React.FC = () => {
  return (
    <Box component="footer" sx={{ py: 4, px: 2, mt: 'auto', backgroundColor: '#15171A', borderTop: '1px solid #2A2D31' }}>
      <Container maxWidth="lg">
        {/* Medical Disclaimer Banner */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, p: 2.5, pl: 3, borderLeft: '3px solid #FFB238', borderRadius: '0 4px 4px 0', backgroundColor: '#1C1F23' }}>
          <WarningAmberIcon sx={{ color: '#FFB238', flexShrink: 0, mt: 0.2 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#FFB238', fontFamily: '"Space Grotesk", sans-serif' }}>
              Strict Medical Disclaimer
            </Typography>
            <Typography variant="caption" sx={{ lineHeight: 1.5, color: '#9C9FA4', display: 'block' }}>
              This portal is an AI-powered educational and research tool and does not constitute medical advice, 
              diagnosis, or clinical judgment. The predictions and reports generated are not verified by licensed medical professionals. 
              Always consult a qualified doctor or radiologist for official clinical interpretation of MRI scans or diagnostic imaging.
            </Typography>
          </Box>
        </Box>
        
        {/* Credits */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" sx={{ color: '#6B6E73', fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.8rem' }}>
            &copy; {new Date().getFullYear()} NeuroScanAI. All rights reserved.
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B6E73', fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.8rem' }}>
            Diagnostic Console Instrumentation
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
