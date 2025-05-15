import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ReportContext = createContext();

export const ReportProvider = ({ children }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 8,
    total: 0,
    pages: 0
  });
  const [availableSources, setAvailableSources] = useState([]);
  
  const { token } = useAuth();
  const { showToast } = useToast();

  const fetchReports = useCallback(async (showLoading = true) => {
    if (!token) return;
    
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await api.get(`/report/list?page=${pagination.page}&per_page=${pagination.perPage}`);
      
      setReports(response.data.reports);
      setPagination({
        page: response.data.page,
        perPage: response.data.per_page,
        total: response.data.total,
        pages: response.data.pages
      });
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      setError('Failed to load your reports. Please try again.');
      if (showLoading) {
        showToast('Failed to load your plagiarism reports', 'error');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [token, pagination.page, pagination.perPage, showToast, setLoading, setError, setReports, setPagination]);

  useEffect(() => {
    if (token) {
      fetchReports();
    }
  }, [token, fetchReports]);

  const getReport = useCallback(async (reportId) => {
    if (!token) return null;
    
    // Validate reportId
    if (!reportId || reportId === 'undefined') {
      showToast('Invalid report ID', 'error');
      return null;
    }
    
    setLoading(true);
    
    try {
      const response = await api.get(`/report/${reportId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch report ${reportId}:`, error);
      showToast('Failed to load plagiarism report', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, showToast, setLoading]);

  const compareDocuments = useCallback(async (doc1Id, doc2Id, method = "tfidf") => {
    if (!token) return null;
    
    setLoading(true);
    
    try {
      const response = await api.post('/report/compare', 
        { 
          doc1_id: doc1Id, 
          doc2_id: doc2Id,
          method: method  // Include detection method
        },
        { 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      showToast('Plagiarism check started', 'success');
      await fetchReports(); // Refresh the reports list
      return response.data;
    } catch (error) {
      console.error('Failed to start plagiarism check:', error);
      
      // Check for specific error types
      if (error.response) {
        // If we get an error response from the server
        if (error.response.status === 500 && 
            error.response.data && 
            error.response.data.message && 
            error.response.data.message.includes('credentials.json')) {
          showToast('Failed to access Google Drive: Missing credentials file on the server', 'error');
        } else {
          showToast(`Failed to start plagiarism check: ${error.response.data?.message || 'Unknown error'}`, 'error');
        }
      } else {
        showToast('Failed to start plagiarism check. Please try again later.', 'error');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, showToast, setLoading, fetchReports]);

  const deleteReport = useCallback(async (reportId) => {
    if (!token) return false;
    
    try {
      await api.delete(`/report/${reportId}`);
      
      showToast('Report deleted successfully', 'success');
      await fetchReports(); // Refresh the reports list
      return true;
    } catch (error) {
      console.error(`Failed to delete report ${reportId}:`, error);
      showToast('Failed to delete report', 'error');
      return false;
    }
  }, [token, showToast, fetchReports]);

  const getDocumentReports = useCallback(async (documentId) => {
    if (!token) return [];
    
    setLoading(true);
    
    try {
      const response = await api.get(`/report/document/${documentId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch reports for document ${documentId}:`, error);
      showToast('Failed to load document reports', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, showToast, setLoading]);

  const changePage = useCallback((newPage) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  }, [pagination.pages, setPagination]); // Added pagination.pages to dependencies

  // General plagiarism check methods
  const checkDocumentPlagiarism = useCallback(async (documentId, options = {}) => {
    try {
      const response = await api.post('/report/check', {
        document_id: documentId,
        sources: options.sources || ['user_documents', 'web'],
        sensitivity: options.sensitivity || 'medium',
        method: options.method || 'embeddings'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error checking document plagiarism:', error);
      throw error;
    }
  }, [token]);
  
  const getCheckStatus = useCallback(async (reportId) => {
    try {
      const response = await api.get(`/report/check/status/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting check status:', error);
      throw error;
    }
  }, [token]);
  
  const getAvailableSources = useCallback(async () => {
    try {
      const response = await api.get('/report/sources');
      setAvailableSources(response.data.sources);
      return response.data.sources;
    } catch (error) {
      console.error('Error getting available sources:', error);
      return [];
    }
  }, [token, setAvailableSources]);

  // Download a report as PDF file
  const downloadReport = useCallback(async (reportId, defaultName) => {
    if (!token) return;
    try {
      const response = await api.get(`/report/${reportId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      // Determine filename from content-disposition header
      const disposition = response.headers['content-disposition'];
      let filename = `${defaultName || reportId}.pdf`;
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      
      // Create a blob URL for the PDF file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Create a link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename); // Set the file name
      
      // Append to the document body
      document.body.appendChild(link);
      
      // Programmatically click the link to trigger the download
      link.click();
      
      // Clean up and remove the link
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast('Failed to download report', 'error');
    }
  }, [token, showToast]);

  return (
    <ReportContext.Provider value={{
      reports,
      loading,
      error,
      pagination,
      availableSources,
      fetchReports,
      getReport,
      compareDocuments,
      deleteReport,
      getDocumentReports,
      changePage,
      checkDocumentPlagiarism,
      getCheckStatus,
      getAvailableSources,
      downloadReport
    }}>
      {children}
    </ReportContext.Provider>
  );
};

export const useReports = () => useContext(ReportContext);
