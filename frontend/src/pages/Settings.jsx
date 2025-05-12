import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaLock, FaGoogle, FaEye, FaEyeSlash, FaUser, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

function Settings() {
  // Existing password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // New profile states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { user, connectGoogleDrive, connectedToDrive, updateProfile, updatePassword, disconnectGoogleDrive } = useAuth();
  const { showToast } = useToast();

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrors({});

    // Password validation logic
    if (!currentPassword) {
      setErrors(prev => ({ ...prev, currentPassword: 'Current password is required' }));
      return;
    }
    if (!newPassword) {
      setErrors(prev => ({ ...prev, newPassword: 'New password is required' }));
      return;
    }
    if (newPassword.length < 6) {
      setErrors(prev => ({ ...prev, newPassword: 'Password must be at least 6 characters' }));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrors(prev => ({ ...prev, confirmNewPassword: 'Passwords do not match' }));
      return;
    }

    setIsPasswordLoading(true);
    try {
      await updatePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      
      showToast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update password';
      showToast(message, 'error');
      setErrors(prev => ({ ...prev, api: message }));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!username && !email) {
      showToast('No changes to update', 'info');
      return;
    }

    // Validate email format if provided
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
      return;
    }

    setIsProfileLoading(true);
    try {
      await updateProfile({
        username: username || undefined,
        email: email || undefined
      });

      showToast('Profile updated successfully!', 'success');
      setUsername('');
      setEmail('');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      showToast(message, 'error');
      setErrors(prev => ({ ...prev, profile: message }));
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleGoogleDriveConnection = () => {
    connectGoogleDrive();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard/profile" className="flex items-center text-blue-600 hover:text-blue-800">
            <FaArrowLeft className="mr-2" />
            Back to Profile
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
            <p className="mt-1 text-sm text-gray-500">Manage your account settings and integrations</p>
          </div>

          {/* Profile Information Section */}
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Profile Information</h3>
            <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  New Username
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    id="username"
                    placeholder={user?.username}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <FaUser className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  New Email
                </label>
                <div className="relative mt-1">
                  <input
                    type="email"
                    id="email"
                    placeholder={user?.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <FaEnvelope className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {errors.profile && (
                <p className="text-sm text-red-600">{errors.profile}</p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isProfileLoading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white cursor-pointer ${
                    isProfileLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <FaUser className="mr-2" />
                  {isProfileLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Password Section */}
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 flex items-center cursor-pointer"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <FaEyeSlash className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <FaEye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 flex items-center cursor-pointer"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <FaEyeSlash className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <FaEye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmNewPassword"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 flex items-center cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <FaEyeSlash className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <FaEye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {errors.confirmNewPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmNewPassword}</p>
                )}
              </div>

              {errors.api && (
                <p className="text-sm text-red-600">{errors.api}</p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isPasswordLoading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white cursor-pointer ${
                    isPasswordLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <FaLock className="mr-2" />
                  {isPasswordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Google Drive Section */}
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Connected Services</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FaGoogle className="text-xl text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Google Drive</p>
                    <p className="text-sm text-gray-500">
                      {connectedToDrive
                        ? 'Your Google Drive account is connected'
                        : 'Connect your Google Drive account to enable file uploads'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={connectedToDrive ? disconnectGoogleDrive : handleGoogleDriveConnection}
                  className={`ml-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium cursor-pointer ${
                    connectedToDrive
                      ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                      : 'text-white bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {connectedToDrive ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;