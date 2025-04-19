import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaUser, FaEnvelope, FaCalendar, FaCog } from 'react-icons/fa';
import Avatar from '../components/Avatar';

function Profile() {
  const { user } = useAuth();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0">
              <Avatar 
                src={user?.profile_picture_url}
                size="xl"
                alt={`${user?.username}'s profile`}
              />
            </div>

            <div className="flex-grow space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FaUser className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{user?.username || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <FaEnvelope className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="font-medium">{user?.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <FaCalendar className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="font-medium">{formatDate(user?.created_at)}</p>
                  </div>
                </div>
              </div>

              <Link 
                to="/dashboard/settings" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <FaCog className="mr-2" />
                Edit Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;