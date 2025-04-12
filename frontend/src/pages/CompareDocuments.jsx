import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExchangeAlt, FaCheckCircle, FaTimesCircle, FaUpload } from 'react-icons/fa';
import { DiCodeBadge } from 'react-icons/di';
import Dropzone from '../components/Dropzone';
import { useDocuments } from '../context/DocumentContext';
import { useReports } from '../context/ReportContext';
import { useToast } from '../context/ToastContext';

function CompareDocuments() {
  const [selectedFiles, setSelectedFiles] = useState([null, null]);
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [detectionMethod, setDetectionMethod] = useState("tfidf"); // Default method
  const { documents, uploadMultipleDocuments } = useDocuments();
  const { compareDocuments } = useReports();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // When documents are loaded, update the loading state
    if (documents.length > 0) {
      setDocsLoading(false);
    }
  }, [documents]);

  const handleFileSelect = (index, fileId) => {
    const newSelectedFiles = [...selectedFiles];
    newSelectedFiles[index] = fileId;
    setSelectedFiles(newSelectedFiles);
  };

  const handleCompare = async () => {
    if (!selectedFiles[0] || !selectedFiles[1]) {
      showToast('Please select two documents to compare', 'error');
      return;
    }

    if (selectedFiles[0] === selectedFiles[1]) {
      showToast('Please select different documents to compare', 'error');
      return;
    }

    setLoading(true);
    showToast('Comparing documents...', 'loading');

    try {
      // Pass the selected method to compareDocuments
      const result = await compareDocuments(selectedFiles[0], selectedFiles[1], detectionMethod);
      if (result) {
        // Just navigate to the reports page instead of to the specific report
        navigate('/dashboard/reports');
        showToast('Plagiarism check started. You will be notified when it completes.', 'success');
      }
    } catch (error) {
      console.error('Error comparing documents:', error);
      showToast('Failed to start comparison', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedDocument = (index) => {
    if (!selectedFiles[index]) return null;
    return documents.find(doc => doc.file_id === selectedFiles[index] || doc._id === selectedFiles[index]);
  };

  const handleFileUpload = async (files) => {
    await uploadMultipleDocuments(files);
    setShowUpload(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Compare Documents</h1>
        <button 
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center cursor-pointer"
        >
          <FaUpload className="mr-2" /> Upload New Document
        </button>
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-1/2 max-w-xl">
            <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
            <Dropzone onFileUpload={handleFileUpload} />
            <div className="flex justify-end mt-4">
              <button 
                onClick={() => setShowUpload(false)} 
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Documents to Compare</h2>
        
        {docsLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-gray-600">Loading documents...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">Document {index + 1}</h3>
                <select 
                  className="w-full p-2 border border-gray-300 rounded"
                  value={selectedFiles[index] || ''}
                  onChange={(e) => handleFileSelect(index, e.target.value)}
                >
                  <option value="">Select a document</option>
                  {documents.map((doc) => (
                    <option key={doc._id || doc.file_id} value={doc.file_id || doc._id}>
                      {doc.file_name}
                    </option>
                  ))}
                </select>
                
                {getSelectedDocument(index) && (
                  <div className="mt-4 bg-gray-50 p-3 rounded">
                    <p className="font-medium">{getSelectedDocument(index).file_name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Type: {getSelectedDocument(index).file_type?.toUpperCase() || 'Unknown'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-6 border-t pt-4">
          <h3 className="font-medium mb-2">Detection Method</h3>
          <div className="flex space-x-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="detectionMethod"
                value="tfidf"
                checked={detectionMethod === "tfidf"}
                onChange={() => setDetectionMethod("tfidf")}
                className="mr-2"
              />
              <span>TF-IDF (Faster)</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="detectionMethod"
                value="embeddings"
                checked={detectionMethod === "embeddings"}
                onChange={() => setDetectionMethod("embeddings")}
                className="mr-2"
              />
              <span>Neural Embeddings (More accurate)</span>
            </label>
          </div>
        </div>
        
        <div className="flex justify-center mt-6">
          <button
            onClick={handleCompare}
            disabled={loading || !selectedFiles[0] || !selectedFiles[1] || docsLoading}
            className={`
              px-6 py-3 rounded-md flex items-center
              ${(docsLoading || !selectedFiles[0] || !selectedFiles[1])
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'}
            `}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <FaExchangeAlt className="mr-2" />
                Compare Documents
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompareDocuments;
