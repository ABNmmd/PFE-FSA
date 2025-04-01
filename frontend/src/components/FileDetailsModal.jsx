import React, { useState, useEffect } from 'react';
import {
  FaRegFilePdf, FaRegFileWord, FaRegFileAlt, FaRegFilePowerpoint,
  FaDownload, FaTimes, FaCalendarAlt, FaFileAlt
} from 'react-icons/fa';
import { BsInfoCircle, BsArrowRightSquare } from 'react-icons/bs';
import { MdDocumentScanner } from 'react-icons/md';
import { Link } from 'react-router-dom';
import { useDocuments } from '../context/DocumentContext';

function FileDetailsModal({ file, onClose, onDownload }) {
  const [activeTab, setActiveTab] = useState('info');
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const { getFileContent } = useDocuments();

  useEffect(() => {
    const fetchFileContent = async () => {
      if (file && activeTab === 'preview') {
        setLoading(true);
        try {
          const content = await getFileContent(file.file_id, file.file_type);
          setFileContent(content);
        } catch (error) {
          console.error('Failed to fetch file content:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFileContent();
  }, [file, activeTab, getFileContent]);

  if (!file) return null;

  const getFileIcon = () => {
    switch (file.file_type?.toLowerCase()) {
      case 'pdf':
        return <FaRegFilePdf className="text-5xl text-red-500" />;
      case 'docx':
        return <FaRegFileWord className="text-5xl text-blue-600" />;
      case 'pptx':
        return <FaRegFilePowerpoint className="text-5xl text-orange-500" />;
      default:
        return <FaRegFileAlt className="text-5xl text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!fileContent) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <FaFileAlt className="text-4xl mb-4" />
          <p>Preview not available for this file type</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => onDownload(file)}
          >
            <FaDownload className="inline mr-2" /> Download to view
          </button>
        </div>
      );
    }

    // If we have file content, render it based on file type
    switch (file.file_type?.toLowerCase()) {
      case 'txt':
        return (
          <div className="bg-gray-50 p-4 rounded border border-gray-200 h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono text-sm">{fileContent}</pre>
          </div>
        );
      case 'pdf':
        return (
          <div className="h-96">
            <iframe 
              src={fileContent} 
              title={file.file_name}
              className="w-full h-full border-0"
            />
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FaFileAlt className="text-4xl mb-4" />
            <p>Preview not available for this file type</p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => onDownload(file)}
            >
              <FaDownload className="inline mr-2" /> Download to view
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl transform transition-all">
        <div className="flex justify-between items-center border-b p-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            {getFileIcon()}
            <span className="ml-4 truncate">{file.file_name}</span>
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            onClick={onClose}
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex">
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'info'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('info')}
            >
              <BsInfoCircle className="inline mr-2" /> File Information
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'preview'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('preview')}
            >
              <FaFileAlt className="inline mr-2" /> Preview
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'plagiarism'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('plagiarism')}
            >
              <MdDocumentScanner className="inline mr-2" /> Plagiarism Analysis
            </button>
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">File Details</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2">
                      <span className="text-gray-600">File Name:</span>
                      <span className="font-medium truncate">{file.file_name}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-gray-600">File Type:</span>
                      <span className="font-medium">{file.file_type?.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-gray-600">File Size:</span>
                      <span className="font-medium">{formatFileSize(file.file_size)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-gray-600">MIME Type:</span>
                      <span className="font-medium">{file.mime_type || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Upload Information</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2">
                      <span className="text-gray-600">Uploaded:</span>
                      <span className="font-medium">
                        <FaCalendarAlt className="inline mr-1 text-gray-400" /> 
                        {formatDate(file.uploaded_at)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-gray-600">File ID:</span>
                      <span className="font-medium text-xs text-gray-500 truncate">{file.file_id}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-gray-600">Description:</span>
                      <span className="font-medium">{file.description || 'No description'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center"
                  onClick={() => onDownload(file)}
                >
                  <FaDownload className="mr-2" /> Download File
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preview' && renderPreview()}

          {activeTab === 'plagiarism' && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <MdDocumentScanner className="text-4xl mb-4" />
              <p className="text-lg">No plagiarism analysis available yet</p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                  Run Plagiarism Check
                </button>
                <Link 
                  to={`/dashboard/reports/${file.file_id}`} 
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center"
                >
                  <BsArrowRightSquare className="mr-2" /> View Full Report
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileDetailsModal;
