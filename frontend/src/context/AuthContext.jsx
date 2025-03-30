import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectedToDrive, setConnectedToDrive] = useState(() => {
    const storedState = localStorage.getItem('googleDriveConnected');
    return storedState === null ? false : storedState === 'true';
  });

  // state for the message from the backend
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // const response = await api.get('/user/profile', { headers: { Authorization: `Bearer ${token}` } });
          // setUser(response.data);
        } catch (error) {
          console.error('Failed to load user', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await api.post('/user/login', credentials);
      if (response.data.token) {
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
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
    localStorage.removeItem('token');
  };

  const connectGoogleDrive = () => {
    const googleOAuthURL = `${api.defaults.baseURL}/user/google/login`;
    window.location.href = googleOAuthURL;
  };

  
  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, connectGoogleDrive, connectedToDrive, setConnectedToDrive, message, setMessage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);