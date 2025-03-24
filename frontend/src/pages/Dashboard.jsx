import React, { useState, useEffect } from 'react';
import DashboardAside from '../components/DashboardAside';
import { MdDocumentScanner } from "react-icons/md";
import { TbReportAnalytics } from "react-icons/tb";

function Dashboard() {
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

  const [totalDocuments, setTotalDocuments] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [totalPlagiarismChecks, setTotalPlagiarismChecks] = useState(0);


  return (
    <div className="flex h-screen bg-gray-100">
      <DashboardAside arr={dashboardPages} />
      <main className="flex-1 p-4">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white shadow-md rounded-md p-4">
            <h3 className="text-lg font-semibold">Total Documents</h3>
            <p className="text-gray-700">{totalDocuments}</p>
          </div>
          <div className="bg-white shadow-md rounded-md p-4">
            <h3 className="text-lg font-semibold">Total Reports</h3>
            <p className="text-gray-700">{totalReports}</p>
          </div>
          <div className="bg-white shadow-md rounded-md p-4">
            <h3 className="text-lg font-semibold">Plagiarism Checks</h3>
            <p className="text-gray-700">{totalPlagiarismChecks}</p>
          </div>
        </div>

        
      </main>
    </div>
  )
}

export default Dashboard;