import React, { useState, useEffect } from 'react';
import { MdDocumentScanner } from "react-icons/md";
import { TbReportAnalytics } from "react-icons/tb";
import { MdCompareArrows } from "react-icons/md";
import DashboardNumbers from '../components/DashboardNumbers';
import FilesManager from '../components/FilesManager';
import { useAuth } from '../context/AuthContext';
import { useDocuments } from '../context/DocumentContext';
import { useNavigate, Link } from 'react-router-dom';
import { useReports } from '../context/ReportContext';
import api from '../services/api';

function Dashboard() {
  const [totalReports, setTotalReports] = useState(0);
  const [totalPlagiarismChecks, setTotalPlagiarismChecks] = useState(0);
  const [recentActivity, setRecentActivity] = useState(0);
  const { connectedToDrive } = useAuth();
  const { getDocumentCount, documents } = useDocuments();
  const { fetchReports } = useReports();
  const navigate = useNavigate();


  const statistics = [
    {
      id: 1,
      name: "Total Documents",
      value: getDocumentCount()
    },
    {
      id: 2,
      name: "Total Reports",
      value: totalReports
    },
    {
      id: 4,
      name: "Recent Activity (7 days)",
      value: recentActivity
    }
  ];
  
  return (
    <>
      {/* <section className='mb-8'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <DashboardNumbers list={statistics} />
        </div>
      </section> */}
      <section className='mb-8'>
        <h2 className='text-xl font-semibold mb-4'>Quick Actions</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <Link
            to='/dashboard/plagiarism'
            className='flex items-center justify-center bg-blue-600 text-white px-6 py-4 rounded-lg shadow-md hover:bg-blue-700 transition-all cursor-pointer'
            onClick={() => {
              if (documents.length === 0) {
                showToast('No documents available for plagiarism check. Please upload a document first.', 'error');
              } else {
                navigate('/dashboard/plagiarism');
              }
            }}
          >
            <MdDocumentScanner className='text-2xl mr-2' />
            Check Plagiarism
          </Link>
          <Link
            to='/dashboard/compare'
            className='flex items-center justify-center bg-green-600 text-white px-6 py-4 rounded-lg shadow-md hover:bg-green-700 transition-all cursor-pointer'
          >
            <MdCompareArrows className='text-2xl mr-2' />
            Compare Documents
          </Link>
        </div>
      </section>
      <section>
        <FilesManager />
      </section>
    </>
  )
}

export default Dashboard;