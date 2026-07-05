import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import PsychologyIcon from '@mui/icons-material/Psychology';
import HistoryIcon from '@mui/icons-material/History';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface NavbarProps {
  user: User | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid #2A2D31' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          {/* Logo Section */}
          <Box component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: 1.5 }}>
            <Box
              component="img"
              src="/neuroLogo.png"
              alt="NeuroScanAI Logo"
              sx={{
                height: 32,
                width: 32,
                borderRadius: '25%',
                objectFit: 'cover',
                border: '1px solid #3D4147'
              }}
            />
            <Typography variant="h6" component="div" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: '-0.5px', color: '#F2F1ED' }}>
              NeuroScan<Box component="span" sx={{ color: '#FF5A46' }}>AI</Box>
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              component={RouterLink}
              to="/"
              variant="text"
              sx={{ color: '#F2F1ED', fontWeight: 500, '&:hover': { color: '#5CC8FF' } }}
            >
              Analyze Scan
            </Button>
            
            {user && (
              <Button
                component={RouterLink}
                to="/history"
                variant="text"
                startIcon={<HistoryIcon />}
                sx={{ color: '#F2F1ED', fontWeight: 500, '&:hover': { color: '#5CC8FF' } }}
              >
                History
              </Button>
            )}

            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 500, color: '#9C9FA4', fontFamily: '"IBM Plex Mono", monospace' }}>
                  {user.email}
                </Typography>
                <Button
                  onClick={handleLogout}
                  variant="outlined"
                  size="small"
                  startIcon={<LogoutIcon />}
                  sx={{ 
                    borderColor: '#3D4147', 
                    color: '#F2F1ED',
                    '&:hover': { 
                      borderColor: '#FF5A46',
                      backgroundColor: 'rgba(255, 90, 70, 0.08)'
                    } 
                  }}
                >
                  Logout
                </Button>
              </Box>
            ) : (
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                size="small"
                startIcon={<LoginIcon />}
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
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
