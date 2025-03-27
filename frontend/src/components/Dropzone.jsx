import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

function Dropzone({ onFileUpload }) {
    const [files, setFiles] = useState([]);

    const onDrop = useCallback(acceptedFiles => {
        setFiles(acceptedFiles);
        onFileUpload(acceptedFiles); // Notify parent component about the uploaded files
    }, [onFileUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div {...getRootProps()} className={`flex flex-col items-center justify-center w-full h-48 border-2 rounded-md cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'} p-4`}>
            <input {...getInputProps()} />
            {isDragActive ? (
                <p className="text-blue-500">Drop the files here ...</p>
            ) : (
                <>
                    <p className="text-gray-500">Drag 'n' drop some files here, or click to select files</p>
                </>
            )}
            {files.length > 0 && (
                <aside className="mt-4">
                    <h4 className="font-semibold">Files</h4>
                    <ul>
                        {files.map(file => (
                            <li key={file.name} className="text-sm">
                                {file.name} - {file.size} bytes
                            </li>
                        ))}
                    </ul>
                </aside>
            )}
        </div>
    );
}

export default Dropzone;
