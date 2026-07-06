import React, { useState, useEffect } from 'react';
import { Container, Card, CardContent, TextField, Button, Typography, Box, Tabs, Tab, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useNotification } from '../components/NotificationContext';

interface LoginPageProps {
  user: User | null;
}

// Helper to SHA-256 hash the password on client-side for transmission obfuscation
const hashPassword = async (pwd: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(pwd);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export const LoginPage: React.FC<LoginPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [tabIndex, setTabIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password dialog states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleOpenResetDialog = () => {
    setResetDialogOpen(true);
    setResetEmail('');
    setResetError(null);
    setResetSuccess(null);
  };

  const handleCloseResetDialog = () => {
    setResetDialogOpen(false);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      if (!resetEmail) {
        throw new Error('Please enter your email address.');
      }

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetErr) throw resetErr;

      setResetSuccess('Password reset link sent! Please check your email.');
      showNotification('Password reset link sent!', 'success');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset link. Please try again.');
      showNotification(err.message || 'Failed to send reset link.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

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
      const hashedPassword = await hashPassword(password);

      if (tabIndex === 0) {
        // Log In
        const { error: logInError } = await supabase.auth.signInWithPassword({
          email,
          password: hashedPassword,
        });
        if (logInError) throw logInError;
        showNotification('Welcome back!', 'success');
        navigate('/');
      } else {
        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: hashedPassword,
          options: {
            emailRedirectTo: window.location.origin,
          },
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
              sx={{ mb: tabIndex === 0 ? 1 : 3 }}
            />

            {tabIndex === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={handleOpenResetDialog}
                  sx={{ textDecoration: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  Forgot Password?
                </Link>
              </Box>
            )}

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

      {/* Forgot Password Dialog */}
      <Dialog open={resetDialogOpen} onClose={handleCloseResetDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Reset Password</DialogTitle>
        <Box component="form" onSubmit={handleSendResetLink}>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Enter your email address and we'll send you a link to reset your password.
            </DialogContentText>
            
            {resetError && <Alert severity="error" sx={{ mb: 2 }}>{resetError}</Alert>}
            {resetSuccess && <Alert severity="success" sx={{ mb: 2 }}>{resetSuccess}</Alert>}

            <TextField
              autoFocus
              required
              margin="dense"
              id="reset-email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              disabled={resetLoading}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseResetDialog} color="inherit" disabled={resetLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={resetLoading}>
              {resetLoading ? <CircularProgress size={20} /> : 'Send Reset Link'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
};
