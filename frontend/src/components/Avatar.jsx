import React from 'react';
import { FaUser } from 'react-icons/fa';

function Avatar({ src, size = 'md', alt = 'Profile picture' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  const iconSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center overflow-hidden`}>
      {src ? (
        <img 
          src={src} 
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = null;
          }}
        />
      ) : (
        <FaUser className={`${iconSizes[size]} text-gray-400`} />
      )}
    </div>
  );
}

export default Avatar;