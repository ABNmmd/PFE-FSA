import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaSpinner, FaCheckCircle, FaSearch } from 'react-icons/fa';
import { BsFiletypeTxt, BsFiletypePdf, BsFiletypeDocx, BsFiletypePptx } from 'react-icons/bs';
import { useDocuments } from '../context/DocumentContext';
import { useReports } from '../context/ReportContext';
import { useToast } from '../context/ToastContext';

function GeneralPlagiarismCheck() {
  const { documents, loading: loadingDocuments, fetchDocuments } = useDocuments();
  const { checkDocumentPlagiarism, getAvailableSources, availableSources } = useReports();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedDocument, setSelectedDocument] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSources, setSelectedSources] = useState(['user_documents', 'web']);
  const [sensitivity, setSensitivity] = useState('medium');
  const [method, setMethod] = useState('embeddings');
  // Helper for slider sensitivity mapping
  const sensitivityLabels = ['low', 'medium', 'high'];
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

  // Helper to choose file icon based on extension, matching FilesManager
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'txt': return <BsFiletypeTxt className="text-2xl text-gray-600 mb-2" />;
      case 'pdf': return <BsFiletypePdf className="text-2xl text-red-600 mb-2" />;
      case 'doc':
      case 'docx': return <BsFiletypeDocx className="text-2xl text-blue-600 mb-2" />;
      case 'ppt':
      case 'pptx': return <BsFiletypePptx className="text-2xl text-orange-600 mb-2" />;
      default: return <BsFiletypeTxt className="text-2xl text-gray-400 mb-2" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Check Document For Plagiarism</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-8">
        {/* Document Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">1. Select Document</h2>
          {/* Search filter for documents */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {loadingDocuments ? (
            <div className="flex items-center space-x-2 text-gray-500">
              <FaSpinner className="animate-spin" />
              <span>Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded flex items-start">
              <FaExclamationTriangle className="mt-1 mr-2" />
              <p>No documents available. Please upload first.</p>
            </div>
          ) : (
            // Scrollable container with filtered docs
            <div className="max-h-80 overflow-y-auto w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 px-4 py-1">
                {documents
                  .filter(doc => doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(doc => (
                  <div
                    key={doc.file_id}
                    onClick={() => setSelectedDocument(doc.file_id)}
                    className={`relative p-3 flex bg-white border rounded-lg cursor-pointer max-w-xs w-full transition-transform duration-200 ease-out ${selectedDocument === doc.file_id ? 'border-2 border-blue-600 bg-blue-50 scale-103 shadow-xl' : 'border-gray-200 hover:shadow-md hover:scale-105'}`}
                  >
                    {/* Check badge */}
                    {selectedDocument === doc.file_id && (
                      <span className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-1">
                        <FaCheckCircle className="w-4 h-4" />
                      </span>
                    )}
                    {/* File type icon */}
                    <div className="flex justify-center">
                      {getFileIcon(doc.file_name)}
                    </div>
                    <h3
                      className="font-medium ml-2 max-w-[200px] truncate"
                      title={doc.file_name}
                    >
                      {doc.file_name}
                    </h3>
                  </div>
                ))}
                {documents.filter(doc => doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                  <p className="text-center text-gray-500 py-4">No documents match your search.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sources Pills */}
        <div>
          <h2 className="text-lg font-semibold mb-4">2. Sources to Check Against</h2>
          {loadingSources ? (
            <div className="flex items-center space-x-2 text-gray-500">
              <FaSpinner className="animate-spin" />
              <span>Loading sources...</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableSources.map(source => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => source.enabled && handleSourceToggle(source.id)}
                  disabled={!source.enabled}
                  title={source.description}
                  className={`px-4 py-1 rounded-full border transition cursor-pointer ${selectedSources.includes(source.id) ? 'bg-green-200 border-green-400' : 'border-gray-300 hover:bg-gray-100'} ${!source.enabled && 'opacity-50 cursor-not-allowed'}`}
                >
                  {source.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sensitivity Slider */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">3. Detection Sensitivity</label>
            <input
              type="range"
              min="1"
              max="3"
              value={sensitivityLabels.indexOf(sensitivity) + 1}
              onChange={e => setSensitivity(sensitivityLabels[e.target.value - 1])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
          {/* Method Buttons */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">4. Detection Method</label>
            <div className="flex gap-4">
              {['embeddings', 'tfidf'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex-1 p-3 border rounded-lg text-center transition cursor-pointer ${method === m ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                >
                  {m === 'embeddings' ? 'AI Embeddings' : 'TF-IDF'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 cursor-pointer flex items-center disabled:opacity-50"
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
  );
}

export default GeneralPlagiarismCheck;
