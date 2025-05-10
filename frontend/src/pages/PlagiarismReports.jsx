import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import ReportCard from '../components/ReportCard';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';
import { FaPlus, FaSearch, FaFilter, FaSort, FaFileAlt, FaExchangeAlt } from 'react-icons/fa';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

function PlagiarismReports() {
  const { reports, loading, pagination, fetchReports, deleteReport, changePage } = useReports();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [pagination.page]);

  const handleDeleteReport = (report) => {
    setDeleteTarget(report);
  };

  const confirmDeleteReport = async (report) => {
    setDeleteLoading(true);
    try {
      await deleteReport(report.id);
      showToast('Report deleted successfully', 'success');
      setDeleteTarget(null);
    } catch (error) {
      showToast('Failed to delete report', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDeleteReport = () => {
    setDeleteTarget(null);
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
            <FaSearch className="mr-2" /> Check Plagiarism
          </Link>
          <Link to="/dashboard/compare" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center">
            <FaExchangeAlt className="mr-2" /> Compare Documents
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search reports..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          {/* Filters & Sort Pills */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Type:</span>
              {['all','comparison','general'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-full text-sm transition cursor-pointer ${filterType===type ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {type==='all'?'All': type==='comparison'?'Comparison':'General'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Method:</span>
              {['all','embeddings','tfidf'].map(m => (
                <button
                  key={m}
                  onClick={() => setFilterMethod(m)}
                  className={`px-3 py-1 rounded-full text-sm transition cursor-pointer ${filterMethod===m ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {m==='all'?'All': m==='embeddings'?'Embeddings':'TF-IDF'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort:</span>
              {[{id:'date-desc',label:'Newest'},{id:'date-asc',label:'Oldest'},{id:'similarity-desc',label:'High Sim'},{id:'similarity-asc',label:'Low Sim'}].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {const [by,order]=opt.id.split('-'); setSortBy(by); setSortOrder(order);}}
                  className={`px-3 py-1 rounded-full text-sm transition cursor-pointer ${sortBy+'-'+sortOrder===opt.id ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Clear Filters */}
            {(searchTerm||filterType!=='all'||filterMethod!=='all'||sortBy!=='date'||sortOrder!=='desc') && (
              <button
                onClick={() => {setSearchTerm(''); setFilterType('all'); setFilterMethod('all'); setSortBy('date'); setSortOrder('desc');}}
                className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-sm hover:bg-red-200 transition cursor-pointer"
              >Clear All</button>
            )}
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

      <ConfirmDeleteModal
        item={deleteTarget}
        onConfirm={confirmDeleteReport}
        onCancel={cancelDeleteReport}
        loading={deleteLoading}
      />

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
