import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleDriveCallbackHandler = () => {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const message = urlParams.get('message');
  const { setConnectedToDrive, setMessage, checkGoogleDriveConnection } = useAuth();

  useEffect(() => {
    if (success === 'true') {
      setConnectedToDrive(true);
      // Refresh connection status from the server
      checkGoogleDriveConnection();
    } else {
      setConnectedToDrive(false);
    }
    
    if (message) {
      setMessage(message);
    }
    
    navigate('/dashboard');
  }, [success, setConnectedToDrive, message, navigate, setMessage, checkGoogleDriveConnection]);

  return (
    <div>
      <p>Processing Google Drive callback...</p>
    </div>
  );
};

export default GoogleDriveCallbackHandler;
