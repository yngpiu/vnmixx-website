import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

/**
 * Axios instance configured for the API.
 * - withCredentials: sends HttpOnly cookies (refresh token) on every request.
 * - Authorization header is injected via interceptor from Zustand auth store.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});
