import React, { useState, useEffect } from 'react';
import DashboardAside from '../components/DashboardAside';
import { MdDocumentScanner } from "react-icons/md";
import { TbReportAnalytics } from "react-icons/tb";
import DashboardNumbers from '../components/DashboardNumbers';
import FilesManager from '../components/filesManager';
import { useAuth } from '../context/AuthContext';
import { useDocuments } from '../context/DocumentContext';

function Dashboard() {
  const [totalReports, setTotalReports] = useState(0);
  const [totalPlagiarismChecks, setTotalPlagiarismChecks] = useState(0);
  const { connectedToDrive } = useAuth();
  const { getDocumentCount } = useDocuments();

  const dashboardPages = [
    {
      id: 2,
      name: "Plagiarism Check",
      icon: <MdDocumentScanner />,
      path: "/plagiarism"
    },
    {
      id: 3,
      name: "Reports",
      icon: <TbReportAnalytics />,
    }
  ];
  
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
      id: 3,
      name: "Plagiarism Checks",
      value: totalPlagiarismChecks
    }
  ];
  
  return (
    <>
      <div className="flex h-screen bg-gray-100">
        <DashboardAside arr={dashboardPages} />
        <main className="flex-1 p-4 h-screen overflow-y-auto relative">
          <section className='grid grid-cols-3 gap-4 mb-8'>
            <DashboardNumbers list={statistics} />
          </section>
          <section>
            <FilesManager />
          </section>
        </main>
      </div>
    </>
  )
}

export default Dashboard;