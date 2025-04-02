import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaDownload, FaSearch, FaClipboard } from 'react-icons/fa';
import { useDocuments } from '../context/DocumentContext';
import { useToast } from '../context/ToastContext';

function PlagiarismReport() {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { documents, getFileContent } = useDocuments();
  const { showToast } = useToast();

  useEffect(() => {
    // Find the file from documents array
    if (documents.length > 0) {
      const foundFile = documents.find(doc => doc.file_id === fileId);
      setFile(foundFile);
    }

    // Simulate loading plagiarism report data
    const loadReport = async () => {
      try {
        setLoading(true);
        // In a real application, you would fetch the plagiarism report from the backend
        // For now, we'll simulate a report with dummy data
        setTimeout(() => {
          setReport({
            score: 28,
            analysisDate: new Date().toISOString(),
            matches: [
              {
                id: 1,
                text: "The quick brown fox jumps over the lazy dog",
                similarity: 95,
                source: "https://example.com/article1",
                sourceName: "Example Article 1"
              },
              {
                id: 2,
                text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
                similarity: 87,
                source: "https://example.com/article2",
                sourceName: "Example Article 2"
              },
              {
                id: 3,
                text: "Pellentesque habitant morbi tristique senectus et netus",
                similarity: 76,
                source: "https://example.com/article3",
                sourceName: "Example Article 3"
              }
            ]
          });
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Error loading plagiarism report:', error);
        showToast('Failed to load plagiarism report', 'error');
        setLoading(false);
      }
    };

    loadReport();
  }, [fileId, documents, showToast]);

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
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">{file?.file_name || 'Document'}</h2>
                <p className="text-gray-600 text-sm mt-1">Analyzed on {new Date(report.analysisDate).toLocaleString()}</p>
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
                  borderColor: report.score < 30 ? '#10B981' : report.score < 70 ? '#F59E0B' : '#EF4444',
                  color: report.score < 30 ? '#10B981' : report.score < 70 ? '#F59E0B' : '#EF4444'
                }}>
                  <span className="text-3xl font-bold">{report.score}%</span>
                </div>
              </div>
              <p className="text-center mt-4 font-medium">
                {report.score < 30 ? 'Low plagiarism detected' : 
                 report.score < 70 ? 'Moderate plagiarism detected' : 
                 'High plagiarism detected'}
              </p>
            </div>

            <h3 className="text-lg font-semibold mb-4">Matching Content</h3>
            <div className="space-y-4">
              {report.matches.map(match => (
                <div key={match.id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Similarity: {match.similarity}%</span>
                    <button className="text-gray-500 hover:text-gray-700" title="Copy to clipboard">
                      <FaClipboard />
                    </button>
                  </div>
                  <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-2 text-gray-700 italic">
                    "{match.text}"
                  </blockquote>
                  <div className="flex items-center text-sm text-gray-600">
                    <FaSearch className="mr-2" />
                    <span>Source: </span>
                    <a href={match.source} target="_blank" rel="noreferrer" className="ml-1 text-blue-600 hover:underline">
                      {match.sourceName}
                    </a>
                  </div>
                </div>
              ))}
            </div>
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
      )}
    </div>
  );
}

export default PlagiarismReport;
