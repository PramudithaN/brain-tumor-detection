import React, { useState, useEffect } from 'react';
import { Container, Card, CardContent, TextField, Button, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useNotification } from '../components/NotificationContext';

interface ResetPasswordPageProps {
  user: User | null;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monitor auth state changes to detect if user session recovery is active
  useEffect(() => {
    // If not authenticated (recovery sets a temporary session), redirect to login after a small delay
    // to give Supabase client time to parse the hash fragment from the URL.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Double check if we are redirected from a recovery link (hash contains access_token)
        const hasHash = window.location.hash.includes('access_token=');
        if (!hasHash) {
          showNotification('Invalid or expired password reset link. Please request a new one.', 'error');
          navigate('/login');
        }
      }
    };
    checkSession();
  }, [navigate, showNotification]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      showNotification('Your password has been successfully reset! You can now log in.', 'success');
      
      // Sign out to clear the recovery session so they can sign in normally
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
      showNotification(err.message || 'Failed to reset password.', 'error');
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
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4, py: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a new password for your account.
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleResetPassword} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="New Password"
              type="password"
              id="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              sx={{ py: 1.5 }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'primary.contrastText' }} />
              ) : (
                'Save New Password'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
