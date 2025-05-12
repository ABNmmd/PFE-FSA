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
      const response = await api.get('/user/profile');
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
      const response = await api.get('/user/check-google-connection');
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

  const disconnectGoogleDrive = async () => {
    if (!token) return false;
    try {
      await api.post('/user/google/disconnect');
      setConnectedToDrive(false);
      return true;
    } catch (error) {
      console.error('Failed to disconnect Google Drive', error);
      return false;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.post('/user/update-profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchUserProfile();
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const updatePassword = async (passwordData) => {
    try {
      const response = await api.post('/user/change-password', passwordData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.user) {
        await fetchUserProfile();
      }
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
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
      disconnectGoogleDrive,
      connectedToDrive, 
      setConnectedToDrive, 
      message, 
      setMessage,
      checkGoogleDriveConnection,
      fetchUserProfile,
      updateProfile,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);