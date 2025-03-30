import React, { use, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleDriveCallbackHandler = () => {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const message = urlParams.get('message');
  const { setConnectedToDrive, setMessage } = useAuth()

  useEffect(() => {
    if (success === 'true') {
      localStorage.setItem('googleDriveConnected', 'true');
      setConnectedToDrive(true)
    } else {
      localStorage.removeItem('googleDriveConnected');
      setConnectedToDrive(false)
    }
    if (message) {
      setMessage(message);
    }
    navigate('/dashboard');
  }, [success, setConnectedToDrive, message, navigate, setMessage]);


  return (
    <div>
      {/* This component will redirect immediately, so no content is needed here */}
      <p>Processing Google Drive callback...</p>
    </div>
  );
};

export default GoogleDriveCallbackHandler;
