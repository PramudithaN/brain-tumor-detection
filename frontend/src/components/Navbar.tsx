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
    <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          {/* Logo Section */}
          <Box component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'primary.main', gap: 1 }}>
            <PsychologyIcon sx={{ fontSize: 32 }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
              NeuroScan<Box component="span" sx={{ color: 'secondary.main' }}>AI</Box>
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              component={RouterLink}
              to="/"
              variant="text"
              color="inherit"
              sx={{ color: 'text.primary', fontWeight: 500 }}
            >
              Analyze Scan
            </Button>
            
            {user && (
              <Button
                component={RouterLink}
                to="/history"
                variant="text"
                color="inherit"
                startIcon={<HistoryIcon />}
                sx={{ color: 'text.primary', fontWeight: 500 }}
              >
                History
              </Button>
            )}

            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 500, color: 'text.secondary' }}>
                  {user.email}
                </Typography>
                <Button
                  onClick={handleLogout}
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<LogoutIcon />}
                >
                  Logout
                </Button>
              </Box>
            ) : (
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                color="primary"
                size="small"
                startIcon={<LoginIcon />}
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
