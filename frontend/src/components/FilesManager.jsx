import React, { useState } from "react";
import { IoIosMore } from "react-icons/io";
import { FaGoogleDrive } from "react-icons/fa6";
import { BsFiletypeTxt, BsFiletypePdf, BsFiletypeDocx, BsFiletypePptx } from "react-icons/bs";
import { LuUpload } from "react-icons/lu";
import Dropzone from "./Dropzone";
import { useAuth } from "../context/AuthContext";
import { useDocuments } from "../context/DocumentContext";

function FilesManager() {
    const [showDropzone, setShowDropzone] = useState(false);
    const { connectGoogleDrive, connectedToDrive, setMessage } = useAuth();
    const { documents, loading, uploadMultipleDocuments, fetchDocuments } = useDocuments();

    const handleFileUpload = async (uploadedFiles) => {
        setShowDropzone(false);
        await uploadMultipleDocuments(uploadedFiles);
    };

    const handleConnectionToDrive = () => {
        connectGoogleDrive();
    };

    const getFileIcon = (fileType) => {
        switch (fileType?.toLowerCase()) {
            case 'txt':
                return <BsFiletypeTxt className="text-xl text-blue-500" />;
            case 'pdf':
                return <BsFiletypePdf className="text-xl text-red-500" />;
            case 'docx':
                return <BsFiletypeDocx className="text-xl text-blue-600" />;
            case 'pptx':
                return <BsFiletypePptx className="text-xl text-orange-500" />;
            default:
                return <BsFiletypeTxt className="text-xl text-gray-500" />;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    };

    return (
        <div className="bg-white shadow-md rounded-md p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">My files</h2>
                <div className="flex items-center">
                    <div className="flex">
                        {connectedToDrive ? (
                            <button
                                className="hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline ml-4 flex items-center cursor-pointer"
                                onClick={() => setShowDropzone(true)}
                            >
                                <LuUpload className="mr-2" />
                                Upload
                            </button>
                        ) : (
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline flex items-center ml-4"
                                onClick={handleConnectionToDrive}
                            >
                                <FaGoogleDrive className="mr-2" />
                                Connect to Google Drive
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {connectedToDrive && showDropzone && (
                <div className="fixed top-0 left-0 w-full h-full bg-gray-500 opacity-90 flex items-center justify-center z-50">
                    <div className="bg-white rounded-md shadow-lg p-4 w-1/2">
                        <h3 className="text-lg font-semibold mb-4">Upload Files</h3>
                        <Dropzone onFileUpload={handleFileUpload} />
                        <div className="flex justify-end mt-4">
                            <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline mr-2" onClick={() => setShowDropzone(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {connectedToDrive && !showDropzone && (
                <>
                    {loading ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600">Loading your files...</p>
                        </div>
                    ) : documents.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="table-auto w-full">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="px-2 py-2 text-left w-10"></th>
                                        <th className="px-4 py-2 text-left">File Name</th>
                                        <th className="px-4 py-2 text-left">Size</th>
                                        <th className="px-4 py-2 text-left">Uploaded At</th>
                                        <th className="px-2 py-2 text-left w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((file) => (
                                        <tr key={file._id || file.file_id} className="border-t border-gray-200 hover:bg-gray-50">
                                            <td className="px-2 py-2">
                                                {getFileIcon(file.file_type)}
                                            </td>
                                            <td className="px-4 py-2">{file.file_name}</td>
                                            <td className="px-4 py-2">{formatFileSize(file.file_size)}</td>
                                            <td className="px-4 py-2">{formatDate(file.uploaded_at)}</td>
                                            <td className="px-2 py-2">
                                                <button className="text-gray-600 hover:text-gray-800 cursor-pointer focus:outline-none">
                                                    <IoIosMore className="text-xl" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-600">No files uploaded yet. Upload one now!</p>
                        </div>
                    )}
                </>
            )}
            {!connectedToDrive && (
                <div className="text-center py-8">
                    <p className="text-gray-600">Connect to Google Drive to view your files.</p>
                </div>
            )}
        </div>
    );
}

export default FilesManager;
