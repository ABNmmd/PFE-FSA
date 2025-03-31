import React, { createContext, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ message, type, duration });
  };

  const showLoading = (message) => {
    setToast({ message, type: 'loading' });
  };

  const showDownloadProgress = (message, progress) => {
    setDownloadProgress(progress);
    setToast({ 
      message, 
      type: 'progress', 
      showProgress: true, 
      progress 
    });
  };

  const hideToast = () => {
    setToast(null);
    setDownloadProgress(0);
  };

  return (
    <ToastContext.Provider 
      value={{ 
        showToast, 
        hideToast, 
        showLoading, 
        showDownloadProgress,
        downloadProgress,
        setDownloadProgress
      }}
    >
      {children}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
          autoCloseTime={toast.duration} 
          showProgress={toast.showProgress}
          progress={downloadProgress}
        />
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
