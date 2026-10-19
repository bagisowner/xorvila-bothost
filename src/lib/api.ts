import { ApiResponse } from '../types';

export const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('botcloud_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('botcloud_token', token);
  } else {
    localStorage.removeItem('botcloud_token');
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json();
    return data as ApiResponse<T>;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Failed to communicate with BotCloud server'
      }
    };
  }
}
