import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const DocumentContext = createContext();

export const DocumentProvider = ({ children }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token, connectedToDrive, setMessage } = useAuth();

  useEffect(() => {
    if (token && connectedToDrive) {
      fetchDocuments();
    }
  }, [token, connectedToDrive]);

  const fetchDocuments = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/document/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setError('Failed to load your documents. Please try again.');
      setMessage("Failed to load your documents");
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file) => {
    if (!token || !connectedToDrive) {
      setError('You must be connected to Google Drive to upload documents');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/document/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh the documents list after upload
      await fetchDocuments();
      setMessage("File uploaded successfully!");
      
      return response.data;
    } catch (error) {
      console.error('Failed to upload document:', error);
      setError('Failed to upload document. Please try again.');
      setMessage("Failed to upload document");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadMultipleDocuments = async (files) => {
    if (!token || !connectedToDrive) {
      setError('You must be connected to Google Drive to upload documents');
      return [];
    }

    setLoading(true);
    setError(null);
    const uploadedFiles = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post('/document/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
        
        uploadedFiles.push(response.data);
      }
      
      // Refresh the documents list after uploads
      await fetchDocuments();
      setMessage(`${uploadedFiles.length} files uploaded successfully!`);
      
      return uploadedFiles;
    } catch (error) {
      console.error('Failed to upload documents:', error);
      setError('Failed to upload some documents. Please try again.');
      setMessage("Failed to upload some documents");
      return uploadedFiles;
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (fileId, fileName) => {
    if (!token || !connectedToDrive) {
      setError('You must be connected to Google Drive to download documents');
      return false;
    }

    try {
      const response = await api.get(`/document/download/${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob' // Important: specify responseType as blob
      });
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      return true;
    } catch (error) {
      console.error('Failed to download document:', error);
      setError('Failed to download document. Please try again.');
      setMessage("Failed to download document");
      return false;
    }
  };

  const getDocumentCount = () => {
    return documents.length;
  };

  return (
    <DocumentContext.Provider value={{
      documents,
      loading,
      error,
      fetchDocuments,
      uploadDocument,
      uploadMultipleDocuments,
      getDocumentCount,
      downloadDocument
    }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => useContext(DocumentContext);
