import { supabase } from './supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Helper to get the auth headers if user is logged in.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  
  if (token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  return {};
}

export interface PredictionResult {
  prediction_label: string;
  confidence: number;
  model_version: string;
  saved_to_history: boolean;
  record?: {
    id: string;
    image_path: string;
    prediction_label: string;
    confidence: number;
    model_version: string;
    created_at: string;
    signed_url?: string;
  };
  save_error?: string;
}

export interface ScanRecord {
  id: string;
  user_id: string;
  image_path: string;
  prediction_label: string;
  confidence: number;
  model_version: string;
  created_at: string;
  signed_url?: string;
}

export const apiService = {
  /**
   * Upload MRI scan for prediction.
   * If logged in, sends JWT token automatically.
   */
  async predict(file: File): Promise<PredictionResult> {
    const formData = new FormData();
    formData.append('file', file);

    const authHeaders = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        ...authHeaders
      },
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Prediction failed. Please try again.');
    }

    return response.json();
  },

  /**
   * Fetch scan history for the logged-in user.
   */
  async getHistory(): Promise<ScanRecord[]> {
    const authHeaders = await getAuthHeaders();
    
    if (Object.keys(authHeaders).length === 0) {
      throw new Error('User is not authenticated.');
    }

    const response = await fetch(`${API_BASE_URL}/api/history`, {
      method: 'GET',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to fetch history.');
    }

    const data = await response.json();
    return data.records || [];
  },

  /**
   * Delete a scan record.
   */
  async deleteRecord(recordId: string): Promise<void> {
    const authHeaders = await getAuthHeaders();
    
    if (Object.keys(authHeaders).length === 0) {
      throw new Error('User is not authenticated.');
    }

    const response = await fetch(`${API_BASE_URL}/api/history/${recordId}`, {
      method: 'DELETE',
      headers: {
        ...authHeaders
      }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to delete scan record.');
    }
  }
};
