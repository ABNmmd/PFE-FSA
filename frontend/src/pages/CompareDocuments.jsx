import React, { useState, useEffect } from 'react';
import { FaExchangeAlt, FaCheckCircle, FaTimesCircle, FaUpload } from 'react-icons/fa';
import { DiCodeBadge } from 'react-icons/di';
import Dropzone from '../components/Dropzone';
import { useDocuments } from '../context/DocumentContext';
import { useToast } from '../context/ToastContext';

function CompareDocuments() {
  const [selectedFiles, setSelectedFiles] = useState([null, null]);
  const [compareResult, setCompareResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { documents, uploadMultipleDocuments } = useDocuments();
  const { showToast } = useToast();

  useEffect(() => {
    // Simulate loading documents list
    const loadDocs = async () => {
      setDocsLoading(true);
      setTimeout(() => {
        setDocsLoading(false);
      }, 1000);
    };

    loadDocs();
  }, []);

  const handleFileSelect = (index, fileId) => {
    const newSelectedFiles = [...selectedFiles];
    newSelectedFiles[index] = fileId;
    setSelectedFiles(newSelectedFiles);
    setCompareResult(null); // Reset results when selection changes
  };

  const handleCompare = () => {
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

    // Simulate API call for document comparison
    setTimeout(() => {
      setCompareResult({
        similarity: 42,
        comparedAt: new Date().toISOString(),
        matches: [
          {
            id: 1,
            text1: "The quick brown fox jumps over the lazy dog",
            text2: "The quick brown fox jumps over the lazy dog",
            similarity: 100,
            lineNumber1: 12,
            lineNumber2: 15
          },
          {
            id: 2,
            text1: "Lorem ipsum dolor sit amet",
            text2: "Lorem ipsum dolor amet sit",
            similarity: 85,
            lineNumber1: 24,
            lineNumber2: 30
          },
          {
            id: 3,
            text1: "Programming languages use various paradigms",
            text2: "Various paradigms are used in programming languages",
            similarity: 70,
            lineNumber1: 36,
            lineNumber2: 42
          }
        ]
      });
      setLoading(false);
      showToast('Documents compared successfully', 'success');
    }, 2000);
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
                Comparing...
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

      {compareResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Comparison Results</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center border-4" style={{
                  borderColor: compareResult.similarity < 30 ? '#10B981' : compareResult.similarity < 70 ? '#F59E0B' : '#EF4444',
                  color: compareResult.similarity < 30 ? '#10B981' : compareResult.similarity < 70 ? '#F59E0B' : '#EF4444'
                }}>
                  <span className="text-2xl font-bold">{compareResult.similarity}%</span>
                </div>
                <p className="mt-2 font-medium">Similarity</p>
              </div>
              
              <div className="text-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center border-4" style={{
                  borderColor: compareResult.similarity < 30 ? '#10B981' : compareResult.similarity < 70 ? '#F59E0B' : '#EF4444',
                  color: compareResult.similarity < 30 ? '#10B981' : compareResult.similarity < 70 ? '#F59E0B' : '#EF4444'
                }}>
                  <span className="text-2xl font-bold">{100 - compareResult.similarity}%</span>
                </div>
                <p className="mt-2 font-medium">Difference</p>
              </div>
            </div>
            
            <p className="text-center mt-4 text-gray-700">
              Compared on {new Date(compareResult.comparedAt).toLocaleString()}
            </p>
          </div>
          
          <h3 className="font-semibold mb-4">Matching Content</h3>
          <div className="space-y-4">
            {compareResult.matches.map(match => (
              <div key={match.id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Similarity: {match.similarity}%</span>
                  <span className="text-sm text-gray-500">
                    Line {match.lineNumber1} vs Line {match.lineNumber2}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600 mb-1">Document 1:</p>
                    <p className="font-mono text-sm">{match.text1}</p>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                    <p className="text-sm text-gray-600 mb-1">Document 2:</p>
                    <p className="font-mono text-sm">{match.text2}</p>
                  </div>
                </div>
                
                <div className="flex items-center mt-3">
                  <DiCodeBadge className="text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">
                    {match.similarity === 100 ? (
                      <span className="text-red-500 flex items-center">
                        <FaTimesCircle className="mr-1" /> Exact match
                      </span>
                    ) : match.similarity > 80 ? (
                      <span className="text-orange-500 flex items-center">
                        <FaTimesCircle className="mr-1" /> High similarity
                      </span>
                    ) : (
                      <span className="text-green-500 flex items-center">
                        <FaCheckCircle className="mr-1" /> Acceptable similarity
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CompareDocuments;
