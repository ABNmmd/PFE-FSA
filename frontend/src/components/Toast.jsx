import React, { useEffect } from 'react';
import { FaSpinner, FaCheck, FaExclamationTriangle, FaFileDownload } from 'react-icons/fa';

function Toast({ message, type = 'info', onClose, autoCloseTime = 3000, showProgress = false, progress = 0 }) {
  useEffect(() => {
    if (type !== 'loading' && type !== 'progress') {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseTime);
      
      return () => clearTimeout(timer);
    }
  }, [message, onClose, autoCloseTime, type]);

  const getToastStyles = () => {
    switch(type) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'loading':
      case 'progress':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'success':
        return <FaCheck className="text-green-500" />;
      case 'error':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'loading':
        return <FaSpinner className="animate-spin text-blue-500" />;
      case 'progress':
        return <FaFileDownload className="text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 max-w-md ${getToastStyles()} border-l-4 p-4 rounded shadow-md flex items-center`}>
      <div className="mr-3">
        {getIcon()}
      </div>
      <div className="flex-grow mr-2">
        <p className="font-medium">{message}</p>
        {showProgress && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
      {type !== 'loading' && (
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          &times;
        </button>
      )}
    </div>
  );
}

export default Toast;
