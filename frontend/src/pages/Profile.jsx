import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCalendarAlt, FaEnvelope, FaClock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { user } = useAuth();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="flex items-center text-blue-600 hover:text-blue-800">
            <FaArrowLeft className="mr-2" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b">
            <h2 className="text-2xl font-semibold text-gray-800">Profile</h2>
            <p className="mt-1 text-sm text-gray-500">Your personal information</p>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                <FaUser className="text-4xl text-gray-400" />
              </div>
              <div className="ml-6">
                <h3 className="text-xl font-medium text-gray-900">{user?.username}</h3>
                <div className="flex items-center text-sm text-gray-500">
                  <FaEnvelope className="mr-2" />
                  <span className="break-all">{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Account Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Username</p>
                      <p className="mt-1 font-medium">{user?.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="mt-1 font-medium break-all">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Member Since</p>
                      <p className="mt-1 font-medium flex items-center">
                        <FaCalendarAlt className="mr-2 text-gray-400" />
                        {formatDate(user?.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="mt-1 font-medium flex items-center">
                        <FaClock className="mr-2 text-gray-400" />
                        {formatDate(user?.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Integration Status</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Google Drive</p>
                    <p className="mt-1 font-medium">
                      {user?.has_google_drive ? (
                        <span className="text-green-600">Connected</span>
                      ) : (
                        <span className="text-red-600">Not Connected</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Link 
                to="/settings" 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Update Profile Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;