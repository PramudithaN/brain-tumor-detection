import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export const Footer: React.FC = () => {
  return (
    <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: '#fdfefe', borderTop: '1px solid #E2E8F0' }}>
      <Container maxWidth="lg">
        {/* Medical Disclaimer Banner */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, p: 2, border: '1px solid #FFE4E6', borderRadius: 2, backgroundColor: '#FFF5F5' }}>
          <WarningAmberIcon color="error" sx={{ flexShrink: 0, mt: 0.2 }} />
          <Box>
            <Typography variant="body2" color="error" sx={{ fontWeight: 600, mb: 0.5 }}>
              Strict Medical Disclaimer
            </Typography>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ lineHeight: 1.5 }}>
              This portal is an AI-powered educational and research tool and does not constitute medical advice, 
              diagnosis, or clinical judgment. The predictions and reports generated are not verified by licensed medical professionals. 
              Always consult a qualified doctor or radiologist for official clinical interpretation of MRI scans or diagnostic imaging.
            </Typography>
          </Box>
        </Box>
        
        {/* Credits */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            &copy; {new Date().getFullYear()} NeuroScanAI. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Developed for Final Year Research
            {/* <Link href="https://github.com/PramudithaN" target="_blank" rel="noopener" color="inherit" sx={{ fontWeight: 600 }}>Final Year Research</Link>. */}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
