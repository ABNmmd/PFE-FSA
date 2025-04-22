import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    if (token) {
      fetchReports();
    }
  }, [token, pagination.page, pagination.perPage]);

  const fetchReports = async (showLoading = true) => {
    if (!token) return;
    
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const response = await api.get(`/report/list?page=${pagination.page}&per_page=${pagination.perPage}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
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
  };

  const getReport = async (reportId) => {
    if (!token) return null;
    
    // Validate reportId
    if (!reportId || reportId === 'undefined') {
      showToast('Invalid report ID', 'error');
      return null;
    }
    
    setLoading(true);
    
    try {
      const response = await api.get(`/report/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch report ${reportId}:`, error);
      showToast('Failed to load plagiarism report', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const compareDocuments = async (doc1Id, doc2Id, method = "tfidf") => {
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
  };

  const deleteReport = async (reportId) => {
    if (!token) return false;
    
    try {
      await api.delete(`/report/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast('Report deleted successfully', 'success');
      await fetchReports(); // Refresh the reports list
      return true;
    } catch (error) {
      console.error(`Failed to delete report ${reportId}:`, error);
      showToast('Failed to delete report', 'error');
      return false;
    }
  };

  const getDocumentReports = async (documentId) => {
    if (!token) return [];
    
    setLoading(true);
    
    try {
      const response = await api.get(`/report/document/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch reports for document ${documentId}:`, error);
      showToast('Failed to load document reports', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const changePage = (newPage) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // General plagiarism check methods
  const checkDocumentPlagiarism = async (documentId, options = {}) => {
    try {
      const response = await api.post('/report/check', {
        document_id: documentId,
        sources: options.sources || ['user_documents', 'web'],
        sensitivity: options.sensitivity || 'medium',
        method: options.method || 'embeddings'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error checking document plagiarism:', error);
      throw error;
    }
  };
  
  const getCheckStatus = async (reportId) => {
    try {
      const response = await api.get(`/report/check/status/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting check status:', error);
      throw error;
    }
  };
  
  const getAvailableSources = async () => {
    try {
      const response = await api.get('/report/sources', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableSources(response.data.sources);
      return response.data.sources;
    } catch (error) {
      console.error('Error getting available sources:', error);
      return [];
    }
  };

  return (
    <ReportContext.Provider value={{
      reports,
      loading,
      error,
      pagination,
      fetchReports,
      getReport,
      compareDocuments,
      deleteReport,
      getDocumentReports,
      changePage,
      availableSources,
      checkDocumentPlagiarism,
      getCheckStatus,
      getAvailableSources
    }}>
      {children}
    </ReportContext.Provider>
  );
};

export const useReports = () => useContext(ReportContext);
