import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectedToDrive, setConnectedToDrive] = useState(false);

  // state for the message from the backend
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Fetch user profile information
          await fetchUserProfile();
          // Check if user has Google credentials
          await checkGoogleDriveConnection();
        } catch (error) {
          console.error('Failed to load user', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const fetchUserProfile = async () => {
    if (!token) return null;
    
    try {
      const response = await api.get('/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user profile', error);
      return null;
    }
  };

  const checkGoogleDriveConnection = async () => {
    if (!token) return;
    
    try {
      const response = await api.get('/user/check-google-connection', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnectedToDrive(response.data.connected);
      return response.data.connected;
    } catch (error) {
      console.error('Failed to check Google Drive connection', error);
      setConnectedToDrive(false);
      return false;
    }
  };

  const login = async (credentials) => {
    try {
      const response = await api.post('/user/login', credentials);
      if (response.data.token) {
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        // Fetch user profile after login
        await fetchUserProfile();
        // Check Google Drive connection after login
        await checkGoogleDriveConnection();
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data) => {
    try {
      const response = await api.post('/user/register', data);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setConnectedToDrive(false);
    localStorage.removeItem('token');
  };

  const connectGoogleDrive = () => {
    const googleOAuthURL = `${api.defaults.baseURL}/user/google/login`;
    window.location.href = googleOAuthURL;
  };

  
  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      connectGoogleDrive, 
      connectedToDrive, 
      setConnectedToDrive, 
      message, 
      setMessage,
      checkGoogleDriveConnection,
      fetchUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);