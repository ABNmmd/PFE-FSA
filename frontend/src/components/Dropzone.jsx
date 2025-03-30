import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

function Dropzone({ onFileUpload }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(acceptedFiles => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    }
  });

  const handleUpload = async () => {
    if (!files.length) return;
    
    setUploading(true);
    await onFileUpload(files);
    setUploading(false);
    setFiles([]);
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        {...getRootProps()} 
        className={`flex flex-col items-center justify-center w-full h-48 border-2 rounded-md cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'} p-4`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500">Drop the files here ...</p>
        ) : (
          <>
            <p className="text-gray-500">Drag 'n' drop some files here, or click to select files</p>
            <p className="text-gray-400 text-sm mt-2">Supported formats: .txt, .pdf, .docx, .pptx</p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4 w-full">
          <h4 className="font-semibold">Files to upload:</h4>
          <ul className="mt-2 space-y-2">
            {files.map(file => (
              <li key={file.name} className="text-sm">
                {file.name} - {(file.size / 1024).toFixed(2)} KB
              </li>
            ))}
          </ul>
          
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`mt-4 px-4 py-2 rounded-md text-white font-medium ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Dropzone;
