import React from 'react';
import { FaExclamationTriangle, FaTrash } from 'react-icons/fa';

function ConfirmDeleteModal({ file, onConfirm, onCancel }) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden shadow-xl transform transition-all">
        <div className="bg-red-50 p-6 text-center">
          <FaExclamationTriangle className="mx-auto text-4xl text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Confirmation</h3>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete <span className="font-semibold">{file.file_name}</span>? 
            This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(file)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center cursor-pointer"
            >
              <FaTrash className="mr-2" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDeleteModal;
