import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaSpinner, FaCheckCircle, FaSearch } from 'react-icons/fa';
import { useDocuments } from '../context/DocumentContext';
import { useReports } from '../context/ReportContext';
import { useToast } from '../context/ToastContext';

function GeneralPlagiarismCheck() {
  const { documents, loading: loadingDocuments, fetchDocuments } = useDocuments();
  const { checkDocumentPlagiarism, getAvailableSources, availableSources } = useReports();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedDocument, setSelectedDocument] = useState('');
  const [selectedSources, setSelectedSources] = useState(['user_documents', 'web']);
  const [sensitivity, setSensitivity] = useState('medium');
  const [method, setMethod] = useState('embeddings');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSources, setLoadingSources] = useState(true);

  useEffect(() => {
    fetchDocuments();
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoadingSources(true);
    try {
      await getAvailableSources();
    } catch (error) {
      console.error('Error loading sources:', error);
    } finally {
      setLoadingSources(false);
    }
  };

  const handleSourceToggle = (sourceId) => {
    if (selectedSources.includes(sourceId)) {
      // Don't allow removing the last source
      if (selectedSources.length > 1) {
        setSelectedSources(selectedSources.filter(id => id !== sourceId));
      }
    } else {
      setSelectedSources([...selectedSources, sourceId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDocument) {
      showToast('Please select a document', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await checkDocumentPlagiarism(selectedDocument, {
        sources: selectedSources,
        sensitivity,
        method
      });
      
      showToast('Plagiarism check started', 'success');
      navigate(`/dashboard/reports`);
    } catch (error) {
      console.error('Error submitting plagiarism check:', error);
      showToast('Failed to start plagiarism check', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Check Document For Plagiarism</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Document to Check
            </label>
            
            {loadingDocuments ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <FaSpinner className="animate-spin" />
                <span>Loading documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-4 bg-yellow-50 text-yellow-700 rounded flex items-start">
                <FaExclamationTriangle className="mt-1 mr-2 flex-shrink-0" />
                <p>You don't have any documents yet. Upload documents first to perform plagiarism checks.</p>
              </div>
            ) : (
              <select
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDocument}
                onChange={(e) => setSelectedDocument(e.target.value)}
                required
              >
                <option value="">Select a document</option>
                {documents.map(doc => (
                  <option key={doc.file_id} value={doc.file_id}>
                    {doc.file_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Sources to Check Against
            </label>
            
            {loadingSources ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <FaSpinner className="animate-spin" />
                <span>Loading available sources...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {availableSources.map(source => (
                  <div key={source.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`source-${source.id}`}
                      checked={selectedSources.includes(source.id)}
                      onChange={() => source.enabled && handleSourceToggle(source.id)}
                      className="mr-2"
                      disabled={!source.enabled}
                    />
                    <label htmlFor={`source-${source.id}`} className={`${!source.enabled ? 'text-gray-400' : ''}`}>
                      {source.name}
                      <span className="text-xs text-gray-500 ml-2">{source.description}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Detection Sensitivity
              </label>
              <select
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value)}
              >
                <option value="low">Low (Only exact matches)</option>
                <option value="medium">Medium (Recommended)</option>
                <option value="high">High (More sensitive, may include false positives)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Detection Method
              </label>
              <select
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="embeddings">AI Embeddings (Better for understanding)</option>
                <option value="tfidf">TF-IDF (Faster, focuses on keyword matches)</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center"
              disabled={isSubmitting || loadingDocuments || !selectedDocument}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Starting Check...
                </>
              ) : (
                <>
                  <FaSearch className="mr-2" />
                  Check for Plagiarism
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GeneralPlagiarismCheck;
