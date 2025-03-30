import React from 'react';
import { AiOutlineCloseCircle, AiOutlineCheckCircle } from 'react-icons/ai';
import { IoClose } from "react-icons/io5";

function Alert({ message, success, onClose }) {
  if (!message) {
    return null;
  }

  const backgroundColor = success ? 'bg-green-200' : 'bg-red-200';
  const borderColor = success ? 'border-green-500' : 'border-red-500';
  const textColor = success ? 'text-green-700' : 'text-red-700';
  const strongColor = success ? 'text-green-700' : 'text-red-700';
  const iconColor = success ? 'text-green-500' : 'text-red-500';

  return (
    <div className={`absolute top-4 right-4 w-fit max-w-sm ${backgroundColor} ${borderColor} ${textColor} px-4 py-3 rounded flex items-center justify-between`} role="alert">
      <div className="flex items-center">
        {success ? <AiOutlineCheckCircle className={`mr-1 h-5 w-5 ${iconColor}`} /> : <AiOutlineCloseCircle className={`mr-1 h-5 w-5 ${iconColor}`} />}
        <strong className={`font-bold ${strongColor}`}>{success ? 'Success!' : 'Error!'}</strong>
        <span className="block sm:inline ml-2">{message}</span>
      </div>
      <button className="cursor-pointer ml-4" onClick={onClose} aria-label="Close alert">
        <IoClose className={`h-6 w-6 ${iconColor}`} />
      </button>
    </div>
  );
}

export default Alert;
