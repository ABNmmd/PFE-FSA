import React from 'react';
import { Link } from 'react-router-dom';
import { FaEye, FaDownload, FaTrashAlt, FaFileAlt, FaExchangeAlt, FaSearch } from 'react-icons/fa';

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

  // Get icon and color for report type
  const getReportTypeInfo = (reportType) => {
    if (reportType === 'general') {
      return {
        icon: <FaSearch className="mr-1" />,
        label: 'General Check',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      };
    } else {
      return {
        icon: <FaExchangeAlt className="mr-1" />,
        label: 'Comparison',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800'
      };
    }
  };

  // Get method display text and style
  const getMethodInfo = (method) => {
    if (method === 'embeddings') {
      return {
        label: 'AI Embeddings',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800'
      };
    } else {
      return {
        label: 'TF-IDF',
        bgColor: 'bg-indigo-100',
        textColor: 'text-indigo-800'
      };
    }
  };

  const typeInfo = getReportTypeInfo(report.report_type);
  const methodInfo = getMethodInfo(report.detection_method);

  return (
    <div className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FaFileAlt className="text-blue-500 text-xl" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {report.name || "Unnamed Report"}
            </h3>
            <p className="text-sm text-gray-500">{formatDate(report.created_at)}</p>
            
            {/* Report Type and Method Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 mb-1.5">
              <span className={`flex items-center px-2 py-1 text-xs font-medium rounded-full ${typeInfo.bgColor} ${typeInfo.textColor}`}>
                {typeInfo.icon} {typeInfo.label}
              </span>
              
              {report.detection_method && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${methodInfo.bgColor} ${methodInfo.textColor}`}>
                  {methodInfo.label}
                </span>
              )}
            </div>
            
            {/* Document Info */}
            {report.report_type === 'comparison' && report.document1 && report.document2 && (
              <p className="text-xs text-gray-600 mb-1.5">
                {report.document1.name} vs {report.document2.name}
              </p>
            )}
            
            {/* Status and Score */}
            <div className="flex items-center mt-1">
              {getStatusBadge(report.status)}
              {report.status === 'completed' && (
                <span className={`ml-2 font-medium ${getScoreColor(report.similarity_score)}`}>
                  {(report.similarity_score || 0).toFixed(2)}% Match
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
