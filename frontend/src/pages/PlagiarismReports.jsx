import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import ReportCard from '../components/ReportCard';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';
import { FaPlus, FaSearch, FaFilter, FaSort, FaFileAlt, FaExchangeAlt } from 'react-icons/fa';

function PlagiarismReports() {
  const { reports, loading, pagination, fetchReports, deleteReport, changePage } = useReports();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReports();
  }, [pagination.page]);

  const handleDeleteReport = async (report) => {
    // Use the report name from the backend
    const reportName = report.name || "this report";
        
    if (window.confirm(`Are you sure you want to delete "${reportName}"?`)) {
      setIsDeleting(true);
      try {
        await deleteReport(report.id);
        showToast('Report deleted successfully', 'success');
      } catch (error) {
        showToast('Failed to delete report', 'error');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDownloadReport = (report) => {
    // This will be implemented later
    showToast('Download feature coming soon', 'info');
  };

  const handlePageChange = (page) => {
    changePage(page);
  };

  // Filter and sort reports
  const filteredReports = reports.filter(report => {
    // Filter by report type
    if (filterType !== 'all' && report.report_type !== filterType) return false;
    
    // Filter by detection method
    if (filterMethod !== 'all' && report.detection_method !== filterMethod) return false;
    
    // Search by name or document name
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const reportName = (report.name || '').toLowerCase();
      const doc1Name = (report.document1?.name || '').toLowerCase();
      const doc2Name = (report.document2?.name || '').toLowerCase();
      
      return reportName.includes(term) || 
             doc1Name.includes(term) || 
             doc2Name.includes(term);
    }
    
    return true;
  });
  
  // Sort the filtered reports
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortBy === 'date') {
      return sortOrder === 'asc' 
        ? new Date(a.created_at) - new Date(b.created_at)
        : new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === 'similarity') {
      const scoreA = a.similarity_score || 0;
      const scoreB = b.similarity_score || 0;
      return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    }
    return 0;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Plagiarism Reports</h1>
        <div className="flex space-x-3">
          <Link to="/dashboard/plagiarism" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center">
            <FaSearch className="mr-2" /> Check Document
          </Link>
          <Link to="/dashboard/compare" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center">
            <FaExchangeAlt className="mr-2" /> Compare Documents
          </Link>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-9 pr-4 py-2 border rounded-lg w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Type:</label>
              <select 
                className="border rounded p-1.5"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="comparison">Comparison</option>
                <option value="general">General Check</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Method:</label>
              <select 
                className="border rounded p-1.5"
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
              >
                <option value="all">All Methods</option>
                <option value="embeddings">AI Embeddings</option>
                <option value="tfidf">TF-IDF</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Sort:</label>
              <select 
                className="border rounded p-1.5"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="similarity-desc">Highest Similarity</option>
                <option value="similarity-asc">Lowest Similarity</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      ) : sortedReports.length > 0 ? (
        <div className="space-y-4">
          {sortedReports.map(report => (
            <ReportCard 
              key={report.id} 
              report={report} 
              onDelete={handleDeleteReport} 
              onDownload={handleDownloadReport} 
            />
          ))}
          
          {pagination.pages > 1 && (
            <Pagination 
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <p className="text-gray-600 mb-4">
            {searchTerm || filterType !== 'all' || filterMethod !== 'all'
              ? "No reports match your current filters."
              : "You don't have any plagiarism reports yet."}
          </p>
          
          {searchTerm || filterType !== 'all' || filterMethod !== 'all' ? (
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterMethod('all');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Clear Filters
            </button>
          ) : (
            <div className="flex justify-center space-x-4">
              <Link to="/dashboard/plagiarism" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center">
                <FaSearch className="mr-2" /> Check Document
              </Link>
              <Link to="/dashboard/compare" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center">
                <FaExchangeAlt className="mr-2" /> Compare Documents
              </Link>
            </div>
          )}
        </div>
      )}

      {isDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
            <span>Deleting report...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlagiarismReports;
