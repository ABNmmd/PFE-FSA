import React, { useState, useRef, useEffect } from "react";
import { IoIosMore } from "react-icons/io";
import { FaGoogleDrive, FaDownload } from "react-icons/fa6";
import { BsFiletypeTxt, BsFiletypePdf, BsFiletypeDocx, BsFiletypePptx } from "react-icons/bs";
import { LuUpload } from "react-icons/lu";
import { RiDeleteBin6Line } from "react-icons/ri";
import { AiOutlineEye, AiOutlineWarning } from "react-icons/ai";
import { MdCompareArrows, MdDocumentScanner } from "react-icons/md";
import { TbReportSearch } from "react-icons/tb";
import { useNavigate } from 'react-router-dom';
import Dropzone from "./Dropzone";
import FileDetailsModal from "./FileDetailsModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { useAuth } from "../context/AuthContext";
import { useDocuments } from "../context/DocumentContext";
import { useToast } from "../context/ToastContext";
import { useReports } from '../context/ReportContext';

function FilesManager() {
    const [showDropzone, setShowDropzone] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileToDelete, setFileToDelete] = useState(null);
    const dropdownRef = useRef(null);
    const { showToast } = useToast();
    const { connectGoogleDrive, connectedToDrive } = useAuth();
    const { documents, loading, uploadMultipleDocuments, fetchDocuments, downloadDocument, deleteDocument } = useDocuments();
    const { checkDocumentPlagiarism } = useReports();
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        }
        
        // Add event listener if dropdown is open
        if (activeDropdown !== null) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        
        // Cleanup event listener
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeDropdown]);

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

    const toggleDropdown = (fileId) => {
        if (activeDropdown === fileId) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(fileId);
        }
    };

    const handleDownload = async (file) => {
        await downloadDocument(file.file_id, file.file_name);
        setActiveDropdown(null);
    };

    const handleViewDetails = (file) => {
        setSelectedFile(file);
        setActiveDropdown(null);
    };

    const handleDelete = (file) => {
        setFileToDelete(file);
        setActiveDropdown(null);
    };

    const confirmDelete = async (file) => {
        const success = await deleteDocument(file.file_id, file.file_name);
        setFileToDelete(null);
    };

    const cancelDelete = () => {
        setFileToDelete(null);
    };

    const handleCheckPlagiarism = async (file) => {
        try {
            showToast(`Starting plagiarism check for ${file.file_name}...`, 'loading');
            const response = await checkDocumentPlagiarism(file.file_id);
            if (response && response.report_id) {
                showToast('Plagiarism check started successfully!', 'success');
                navigate(`/dashboard/reports/${response.report_id}`);
            } else {
                showToast('Failed to start plagiarism check. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error starting plagiarism check:', error);
            showToast('An error occurred while starting the plagiarism check.', 'error');
        }
    };

    const handleCompareDocuments = (file) => {
        navigate('/dashboard/compare', { state: { first: file.file_id || file._id } });
        setActiveDropdown(null);
    };

    const handleCloseModal = () => {
        setSelectedFile(null);
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
                <div className="fixed top-0 left-0 w-full h-full bg-gray-900/75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-1/2">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Upload Files</h3>
                        <p className="text-sm text-gray-600 mb-4">Drag and drop your files here or click to select files from your computer.</p>
                        <Dropzone onFileUpload={handleFileUpload} />
                        <div className="flex justify-end mt-6">
                            <button 
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline mr-2 cursor-pointer"
                                onClick={() => setShowDropzone(false)}
                            >
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
                                                <button 
                                                    className="text-gray-600 hover:text-gray-800 cursor-pointer focus:outline-none"
                                                    onClick={() => toggleDropdown(file._id || file.file_id)}
                                                >
                                                    <IoIosMore className="text-xl" />
                                                </button>
                                                
                                                {activeDropdown === (file._id || file.file_id) && (
                                                    <div 
                                                        ref={dropdownRef}
                                                        className="absolute right-6 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                                                    >
                                                        <ul className="py-1">
                                                            <li 
                                                                className="px-4 py-2 hover:bg-gray-100 flex items-center cursor-pointer text-blue-600"
                                                                onClick={() => handleCheckPlagiarism(file)}
                                                            >
                                                                <MdDocumentScanner className="mr-2" />
                                                                <span>Check for Plagiarism</span>
                                                            </li>
                                                            <li 
                                                                className="px-4 py-2 hover:bg-gray-100 flex items-center cursor-pointer"
                                                                onClick={() => handleCompareDocuments(file)}
                                                            >
                                                                <MdCompareArrows className="mr-2 text-gray-500" />
                                                                <span>Compare Documents</span>
                                                            </li>
                                                            <hr className="my-1 border-gray-200" />
                                                            <li 
                                                                className="px-4 py-2 hover:bg-gray-100 flex items-center cursor-pointer"
                                                                onClick={() => handleDownload(file)}
                                                            >
                                                                <FaDownload className="mr-2 text-gray-500" />
                                                                <span>Download</span>
                                                            </li>
                                                            <li 
                                                                className="px-4 py-2 hover:bg-gray-100 flex items-center cursor-pointer"
                                                                onClick={() => handleViewDetails(file)}
                                                            >
                                                                <AiOutlineEye className="mr-2 text-gray-500" />
                                                                <span>View Details</span>
                                                            </li>
                                                            <li 
                                                                className="px-4 py-2 hover:bg-gray-100 flex items-center cursor-pointer text-red-500"
                                                                onClick={() => handleDelete(file)}
                                                            >
                                                                <RiDeleteBin6Line className="mr-2" />
                                                                <span>Delete</span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                )}
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
            {selectedFile && (
                <FileDetailsModal 
                    file={selectedFile} 
                    onClose={handleCloseModal} 
                    onDownload={handleDownload}
                />
            )}
            {fileToDelete && (
                <ConfirmDeleteModal 
                    file={fileToDelete}
                    onConfirm={confirmDelete}
                    onCancel={cancelDelete}
                />
            )}
        </div>
    );
}

export default FilesManager;
