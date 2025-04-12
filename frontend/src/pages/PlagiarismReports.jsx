import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import ReportCard from '../components/ReportCard';
import { useToast } from '../context/ToastContext';
import Pagination from '../components/Pagination';

function PlagiarismReports() {
  const { reports, loading, pagination, fetchReports, deleteReport, changePage } = useReports();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [pagination.page]);

  const handleDeleteReport = async (report) => {
    if (window.confirm(`Are you sure you want to delete this report between "${report.document1?.name}" and "${report.document2?.name}"?`)) {
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Plagiarism Reports</h1>
        <Link to="/dashboard/compare" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          New Comparison
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map(report => (
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
          <p className="text-gray-600 mb-4">You don't have any plagiarism reports yet.</p>
          <Link to="/dashboard/compare" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Compare Documents
          </Link>
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
