import React, { useState, useEffect } from 'react';
import { Container, Card, CardContent, TextField, Button, Typography, Box, Tabs, Tab, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useNotification } from '../components/NotificationContext';

interface LoginPageProps {
  user: User | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [tabIndex, setTabIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, redirect to main page
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleTabChange = (_event: React.SyntheticEvent, newIndex: number) => {
    setTabIndex(newIndex);
    setError(null);
    setSuccessMsg(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (tabIndex === 0) {
        // Log In
        const { error: logInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (logInError) throw logInError;
        showNotification('Welcome back!', 'success');
        navigate('/');
      } else {
        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        
        // Supabase behavior check: is email confirmation required?
        if (data.session) {
          showNotification('Account created and logged in!', 'success');
          navigate('/');
        } else {
          const successStr = 'Registration successful! Please check your email to confirm your account.';
          setSuccessMsg(successStr);
          showNotification(successStr, 'success');
          setEmail('');
          setPassword('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please check your credentials.');
      const severity = err.code === 'weak_password' ? 'warning' : 'error';
      showNotification(err.message || 'An unexpected error occurred.', severity);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <Box
          component="img"
          src="/neuroLogo.png"
          alt="NeuroScanAI Logo"
          sx={{
            height: 48,
            width: 48,
            borderRadius: '25%',
            objectFit: 'cover',
            border: '1px solid #3D4147'
          }}
        />
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
          NeuroScan<Box component="span" sx={{ color: 'secondary.main' }}>AI</Box>
        </Typography>
      </Box>

      <Card sx={{ width: '100%', borderRadius: 3 }}>
        <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth" textColor="primary" indicatorColor="primary">
          <Tab label="Sign In" sx={{ py: 2, fontWeight: 600 }} />
          <Tab label="Register" sx={{ py: 2, fontWeight: 600 }} />
        </Tabs>
        
        <CardContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {successMsg && <Alert severity="success" sx={{ mb: 3 }}>{successMsg}</Alert>}

          <Box component="form" onSubmit={handleAuth} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ py: 1.5, position: 'relative' }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'primary.contrastText' }} />
              ) : (
                tabIndex === 0 ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
      
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button onClick={() => navigate('/')} color="inherit" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          Cancel & Use Guest Mode
        </Button>
      </Box>
    </Container>
  );
};
