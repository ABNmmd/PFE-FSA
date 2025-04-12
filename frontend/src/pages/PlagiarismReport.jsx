import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaDownload, FaSearch, FaClipboard } from 'react-icons/fa';
import { useDocuments } from '../context/DocumentContext';
import { useReports } from '../context/ReportContext';
import { useToast } from '../context/ToastContext';

function PlagiarismReport() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getReport } = useReports();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const pollTimerRef = useRef(null);
  const pollCountRef = useRef(0);

  // Clear any existing timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadReport = async () => {
      
      try {
        setLoading(true);
        const reportData = await getReport(reportId);
        
        if (reportData) {
          setReport(reportData);
        } else {
          navigate('/dashboard/reports');
        }
      } catch (error) {
        console.error('Error loading plagiarism report:', error);
        showToast('Failed to load plagiarism report', 'error');
        navigate('/dashboard/reports');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
    
    // Clear timer on effect cleanup
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [reportId,]);

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Text copied to clipboard!', 'success', 1500);
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy text', 'error');
      });
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <Link to="/dashboard/reports" className="mr-4 text-blue-600 hover:text-blue-800">
          <FaArrowLeft className="text-xl" />
        </Link>
        <h1 className="text-2xl font-bold">Plagiarism Report</h1>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading plagiarism report...</p>
        </div>
      ) : report ? (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {report.document1?.name || "Document 1"} vs {report.document2?.name || "Document 2"}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Analyzed on {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center">
                  <FaDownload className="mr-2" /> Download Report
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-center">
                <div className="w-32 h-32 rounded-full flex items-center justify-center border-8" style={{
                  borderColor: report.similarity_score < 30 ? '#10B981' : report.similarity_score < 70 ? '#F59E0B' : '#EF4444',
                  color: report.similarity_score < 30 ? '#10B981' : report.similarity_score < 70 ? '#F59E0B' : '#EF4444'
                }}>
                  <span className="text-3xl font-bold">{(report.similarity_score || 0).toFixed(2)}%</span>
                </div>
              </div>
              <p className="text-center mt-4 font-medium">
                {!report.similarity_score ? 'Analysis in progress...' :
                 report.similarity_score < 30 ? 'Low plagiarism detected' : 
                 report.similarity_score < 70 ? 'Moderate plagiarism detected' : 
                 'High plagiarism detected'}
              </p>
              {/* Add detection method display */}
              <p className="text-center mt-1 text-sm text-gray-500">
                Detection method: <span className="font-medium">
                  {report.detection_method ? report.detection_method.toUpperCase() : 
                   (report.results && report.results.stats && report.results.stats.method) ? 
                   report.results.stats.method.toUpperCase() : 'STANDARD'}
                </span>
              </p>
            </div>

            <h3 className="text-lg font-semibold mb-4">Matching Content</h3>
            {report.results && report.results.matches && report.results.matches.length > 0 ? (
              <div className="space-y-4">
                {report.results.matches.map((match, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                    <div className="mb-2">
                      <span className="font-medium">Similarity: {(match.similarity * 100).toFixed(2)}%</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div className="bg-blue-50 p-3 rounded relative">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-medium text-sm text-blue-700">
                            {report.document1?.name}
                          </h4>
                          <button 
                            className="text-blue-500 hover:text-blue-700" 
                            title={`Copy from ${report.document1?.name}`}
                            onClick={() => handleCopyToClipboard(match.text1)}
                          >
                            <FaClipboard />
                          </button>
                        </div>
                        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-1 text-gray-700 italic text-sm">
                          "{match.text1 || match.text}"
                        </blockquote>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded relative">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-medium text-sm text-purple-700">
                            {report.document2?.name}
                          </h4>
                          <button 
                            className="text-purple-500 hover:text-purple-700" 
                            title={`Copy from ${report.document2?.name}`}
                            onClick={() => handleCopyToClipboard(match.text2)}
                          >
                            <FaClipboard />
                          </button>
                        </div>
                        <blockquote className="border-l-4 border-purple-500 pl-4 py-2 my-1 text-gray-700 italic text-sm">
                          "{match.text2 || match.text}"
                        </blockquote>
                      </div>
                    </div>
                    
                    {match.source && (
                      <div className="flex items-center text-sm text-gray-600 mt-2">
                        <FaSearch className="mr-2" />
                        <span>Source: </span>
                        <a href={match.source} target="_blank" rel="noreferrer" className="ml-1 text-blue-600 hover:underline">
                          {match.sourceName || match.source}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {report.status === 'pending' ? 
                  'Analysis in progress. Results will appear here when complete.' : 
                  'No matching content detected.'}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Review the highlighted sections and consider rewording them</li>
              <li>Add proper citations for any quoted content</li>
              <li>Use quotation marks for direct quotes</li>
              <li>Check bibliography for completeness</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-red-600 mb-4">Report not found or you don't have access to this report.</p>
          <Link to="/dashboard/reports" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Reports
          </Link>
        </div>
      )}
    </div>
  );
}

export default PlagiarismReport;
