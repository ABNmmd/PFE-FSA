import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const DocumentContext = createContext();

export const DocumentProvider = ({ children }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token, connectedToDrive, setMessage } = useAuth();
  const { showToast, showLoading, hideToast, showDownloadProgress } = useToast();

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
      const response = await api.get('/document/list');
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setError('Failed to load your documents. Please try again.');
      showToast("Failed to load your documents", 'error');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file) => {
    if (!token || !connectedToDrive) {
      setError('You must be connected to Google Drive to upload documents');
      showToast('You must be connected to Google Drive to upload documents', 'error');
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
      showToast("File uploaded successfully!", 'success');
      
      return response.data;
    } catch (error) {
      console.error('Failed to upload document:', error);
      setError('Failed to upload document. Please try again.');
      showToast("Failed to upload document", 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadMultipleDocuments = async (files) => {
    if (!token || !connectedToDrive) {
      setError('You must be connected to Google Drive to upload documents');
      showToast('You must be connected to Google Drive to upload documents', 'error');
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
      showToast(`${uploadedFiles.length} files uploaded successfully!`, 'success');
      
      return uploadedFiles;
    } catch (error) {
      console.error('Failed to upload documents:', error);
      setError('Failed to upload some documents. Please try again.');
      showToast("Failed to upload some documents", 'error');
      return uploadedFiles;
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (fileId, fileName) => {
    if (!token || !connectedToDrive) {
      setError('You must be connected to Google Drive to download documents');
      showToast('You must be connected to Google Drive to download', 'error');
      return false;
    }

    showToast(`Preparing to download ${fileName}...`, 'loading');

    try {
      const response = await api.get(`/document/download/${fileId}`, {
      
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          showDownloadProgress(`Downloading ${fileName}...`, percentCompleted);
        }
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
      
      showToast(`${fileName} downloaded successfully!`, 'success');
      return true;
    } catch (error) {
      console.error('Failed to download document:', error);
      setError('Failed to download document. Please try again.');
      showToast(`Failed to download ${fileName}`, 'error');
      return false;
    }
  };

  const getFileContent = async (fileId, fileType) => {
    if (!token || !connectedToDrive) {
      setError('You must be connected to Google Drive to view files');
      showToast('You must be connected to Google Drive to view files', 'error');
      return null;
    }

    try {
      // For text files, fetch content directly
      if (fileType === 'txt') {
        const response = await api.get(`/document/content/${fileId}`);
        return response.data.content;
      }
      
      // For PDFs, get a data URL
      else if (fileType === 'pdf') {
        const response = await api.get(`/document/download/${fileId}`, {
          responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
      }
      
      // For other file types, return null (preview not supported)
      return null;
    } catch (error) {
      console.error('Failed to get file content:', error);
      setError('Failed to get file content. Please try again.');
      showToast(`Failed to get file content`, 'error');
      return null;
    }
  };

  const deleteDocument = async (fileId, fileName) => {
    if (!token || !connectedToDrive) {
      setError('You must be connected to Google Drive to delete documents');
      showToast('You must be connected to Google Drive to delete documents', 'error');
      return false;
    }

    showToast(`Deleting ${fileName}...`, 'loading');

    try {
      await api.delete(`/document/${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Refresh the documents list after deletion
      await fetchDocuments();
      showToast(`${fileName} has been deleted`, 'success');
      return true;
    } catch (error) {
      console.error('Failed to delete document:', error);
      setError('Failed to delete document. Please try again.');
      showToast(`Failed to delete ${fileName}`, 'error');
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
      downloadDocument,
      getFileContent,
      deleteDocument
    }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => useContext(DocumentContext);
