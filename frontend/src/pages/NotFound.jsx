import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaSearch, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

function NotFound() {
  const { token } = useAuth();
  const homePath = token ? '/dashboard' : '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-blue-600">404</h1>
          <div className="h-2 w-24 bg-blue-600 mx-auto my-4 rounded-full"></div>
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">Page Not Found</h2>
          <p className="text-gray-600 text-lg mb-8">
            Oops! The page you are looking for might have been removed, had its name changed, 
            or is temporarily unavailable.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <FaSearch className="text-blue-500 text-5xl inline-block mb-4" />
            <p className="text-gray-700">
              Let's get you back on track. Here are some helpful links:
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Link 
              to={homePath}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <FaHome className="mr-2" /> 
              {token ? 'Back to Dashboard' : 'Go to Homepage'}
            </Link>
            
            <button 
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center cursor-pointer"
            >
              <FaArrowLeft className="mr-2" /> Go Back
            </button>
          </div>
        </div>
        
        <p className="text-gray-500">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}

export default NotFound;