import React from 'react';
import { Link } from 'react-router-dom';
import { FaEye, FaDownload, FaTrashAlt, FaFileAlt } from 'react-icons/fa';

function ReportCard({ report, onDelete, onDownload }) {
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Color based on score
  const getScoreColor = (score) => {
    if (score < 30) return 'text-emerald-600';
    if (score < 70) return 'text-amber-600';
    return 'text-red-600';
  };

  // Status badge
  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Completed</span>;
      case 'processing':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Processing</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Failed</span>;
      default: // pending
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Pending</span>;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FaFileAlt className="text-blue-500 text-xl" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {report.document1?.name || "Document 1"} vs {report.document2?.name || "Document 2"}
            </h3>
            <p className="text-sm text-gray-500">{formatDate(report.created_at)}</p>
            <div className="flex items-center mt-1">
              {getStatusBadge(report.status)}
              {report.status === 'completed' && (
                <span className={`ml-2 font-medium ${getScoreColor(report.similarity_score)}`}>
                  {(report.similarity_score || 0).toFixed(2)}% Match
                </span>
              )}
              {report.detection_method && (
                <span className="ml-2 text-xs text-gray-500">
                  Method: {report.detection_method.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Link to={`/dashboard/reports/${report.id}`} className="p-1 text-blue-600 hover:text-blue-800" title="View report">
            <FaEye />
          </Link>
          {report.status === 'completed' && (
            <button 
              className="p-1 text-green-600 hover:text-green-800"
              onClick={() => onDownload && onDownload(report)}
              title="Download report"
            >
              <FaDownload />
            </button>
          )}
          <button 
            className="p-1 text-red-600 hover:text-red-800"
            onClick={() => onDelete && onDelete(report)}
            title="Delete report"
          >
            <FaTrashAlt />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportCard;
