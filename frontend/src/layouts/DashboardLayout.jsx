import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardAside from '../components/DashboardAside';

function DashboardLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <DashboardAside />
      <main className="flex-1 p-4 h-screen overflow-y-auto relative">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
