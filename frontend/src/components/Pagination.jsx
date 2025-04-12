import React from 'react';

function Pagination({ currentPage, totalPages, onPageChange }) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    // Always show first page
    pages.push(1);
    
    // Current page and surrounding pages
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    // Remove duplicates and sort
    return [...new Set(pages)].sort((a, b) => a - b);
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex justify-center mt-6">
      <nav className="flex space-x-1">
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
        >
          Previous
        </button>
        
        {pageNumbers.map((page, index) => {
          // Add ellipsis if there's a gap
          const showEllipsisBefore = index > 0 && pageNumbers[index - 1] !== page - 1;
          
          return (
            <React.Fragment key={page}>
              {showEllipsisBefore && (
                <span className="px-3 py-1 bg-white text-gray-500">...</span>
              )}
              <button 
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
              >
                {page}
              </button>
            </React.Fragment>
          );
        })}
        
        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
        >
          Next
        </button>
      </nav>
    </div>
  );
}

export default Pagination;
