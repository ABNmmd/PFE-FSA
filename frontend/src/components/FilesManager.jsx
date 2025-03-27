import React, { useState } from "react";
import { IoIosSearch, IoIosMore } from "react-icons/io";
import { FaGoogleDrive } from "react-icons/fa6";
import { BsFiletypeTxt, BsFiletypePdf } from "react-icons/bs";
import { LuUpload } from "react-icons/lu";
import Dropzone from "./Dropzone";

function FilesManager() {
    const [connectedToDrive, setConnectedToDrive] = useState(false);
    const [showDropzone, setShowDropzone] = useState(false);
    const [files, setFiles] = useState([]);

    const handleFileUpload = (acceptedFiles) => {
        // Handle the uploaded files here
        console.log("Uploaded files:", acceptedFiles);
        // You can send the files to the backend or update the state
        setShowDropzone(false); // Close the Dropzone after upload
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
                            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline flex items-center ml-4">
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
                    {files.length > 0 ? (
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
                                {files.map((file) => (
                                    <tr key={file.id}>
                                        <td className="px-2 py-2">
                                            <BsFiletypeTxt />
                                        </td>
                                        <td className="px-4 py-2">{file.name}</td>
                                        <td className="px-4 py-2">{file.size}</td>
                                        <td className="px-4 py-2">{file.uploadedAt}</td>
                                        <td className="px-2 py-2">
                                            <button className="text-gray-600 hover:text-gray-800 cursor-pointer focus:outline-none">
                                                <IoIosMore />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
