import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaFilePdf, FaEye, FaDownload, FaTrashAlt } from 'react-icons/fa';
import { useDocuments } from '../context/DocumentContext';
import { useToast } from '../context/ToastContext';

function PlagiarismReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { documents } = useDocuments();
  const { showToast } = useToast();

  useEffect(() => {
    // Simulate fetching reports
    const fetchReports = async () => {
      setLoading(true);
      try {
        // This would be an API call in a real app
        // For now, we'll create dummy data based on the documents
        setTimeout(() => {
          const dummyReports = documents.slice(0, 3).map(doc => ({
            id: 'report-' + doc._id || doc.file_id,
            fileId: doc.file_id,
            fileName: doc.file_name,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
            plagiarismScore: Math.floor(Math.random() * 100),
            status: 'completed'
          }));
          
          setReports(dummyReports);
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Error fetching reports:', error);
        showToast('Failed to load reports', 'error');
        setLoading(false);
      }
    };

    fetchReports();
  }, [documents, showToast]);

  const getScoreColor = (score) => {
    if (score < 30) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Plagiarism Reports</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      ) : reports.length > 0 ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FaFilePdf className="text-red-500 text-lg" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{report.fileName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{new Date(report.createdAt).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-500">{new Date(report.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getScoreColor(report.plagiarismScore)} bg-opacity-10`}>
                      {report.plagiarismScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link to={`/dashboard/reports/${report.fileId}`} className="text-blue-600 hover:text-blue-900 p-1 flex items-center">
                        <FaEye title="View report" />
                      </Link>
                      <button className="text-green-600 hover:text-green-900 p-1 flex items-center">
                        <FaDownload title="Download report" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 p-1 flex items-center">
                        <FaTrashAlt title="Delete report" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">No plagiarism reports yet.</p>
          <Link to="/dashboard/compare" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Create Your First Plagiarism Report
          </Link>
        </div>
      )}
    </div>
  );
}

export default PlagiarismReports;
