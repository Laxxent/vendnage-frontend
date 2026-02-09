import { useState, KeyboardEvent, ChangeEvent } from "react";

interface PaginationControlsProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
  // Optional: untuk server-side pagination
  from?: number;
  to?: number;
  total?: number;
  // Optional: show jump to page input (default: true jika lastPage > 10)
  showJumpToPage?: boolean;
}

export const PaginationControls = ({
  currentPage,
  lastPage,
  onPageChange,
  isFetching = false,
  from,
  to,
  total,
  showJumpToPage,
}: PaginationControlsProps) => {
  const [jumpToPage, setJumpToPage] = useState<string>("");

  // ✅ Determine if should show jump to page (default: true jika lastPage > 10)
  const shouldShowJumpToPage = showJumpToPage !== undefined 
    ? showJumpToPage 
    : lastPage > 10;

  // ✅ Handle jump to page input change dengan validasi real-time
  const handleJumpToPageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // ✅ Allow empty input
    if (value === "") {
      setJumpToPage("");
      return;
    }
    
    const numValue = parseInt(value);
    
    // ✅ Validasi real-time: hanya terima angka dalam range 1-lastPage
    if (!isNaN(numValue) && numValue >= 1 && numValue <= lastPage) {
      setJumpToPage(value);
    }
    // Jika di luar range, tidak update state (input tetap kosong atau nilai sebelumnya)
  };

  // ✅ Handle jump to page (Enter key atau tombol Go)
  const handleJumpToPage = (e?: KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== "Enter") return;
    
    const page = parseInt(jumpToPage);
    if (page >= 1 && page <= lastPage && !isNaN(page)) {
      onPageChange(page);
      setJumpToPage("");
    }
  };

  // ✅ Check if jump to page input is valid
  const isJumpToPageValid = () => {
    if (!jumpToPage) return false;
    const page = parseInt(jumpToPage);
    return !isNaN(page) && page >= 1 && page <= lastPage;
  };

  // ✅ Improved pagination logic untuk banyak halaman
  const getPageNumbers = () => {
    // ✅ Jika hanya sedikit halaman (≤7), tampilkan semua
    if (lastPage <= 7) {
      return Array.from({ length: lastPage }, (_, i) => i + 1);
    }
    
    const pages: (number | string)[] = [];
    const pageSet = new Set<number>();
    
    // ✅ Always show first page
    pages.push(1);
    pageSet.add(1);
    
    // ✅ Show ellipsis left jika currentPage jauh dari awal
    if (currentPage > 4) {
      pages.push("ellipsis-left");
    }
    
    // ✅ Show pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(lastPage - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      if (!pageSet.has(i)) {
        pages.push(i);
        pageSet.add(i);
      }
    }
    
    // ✅ Show ellipsis right jika currentPage jauh dari akhir
    if (currentPage < lastPage - 3) {
      pages.push("ellipsis-right");
    }
    
    // ✅ Always show last page
    if (!pageSet.has(lastPage)) {
      pages.push(lastPage);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-monday-border flex-shrink-0 mt-auto">
      {/* ✅ Info section */}
      <div className="flex items-center gap-2">
        {from !== undefined && to !== undefined && total !== undefined ? (
          // ✅ Server-side pagination: "Showing X to Y of Z results"
          <span className="text-sm font-medium text-gray-600">
            Showing {from || 0} to {to || 0} of {total || 0} results
          </span>
        ) : (
          // ✅ Client-side pagination: "Page X of Y"
          <span className="text-sm font-medium text-gray-600">
            Page {currentPage} of {lastPage}
          </span>
        )}
      </div>

      {/* ✅ Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Prev button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isFetching}
          className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            currentPage === 1 || isFetching
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-monday-gray-background text-gray-700 hover:bg-monday-gray"
          }`}
        >
          Prev
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-3">
          {pageNumbers.map((page, index) => {
            if (page === "ellipsis-left" || page === "ellipsis-right") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-gray-400 text-sm font-medium"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                disabled={isFetching}
                className={`flex items-center justify-center min-w-[40px] h-10 px-3 rounded-lg font-semibold text-sm transition-colors ${
                  currentPage === pageNum
                    ? "bg-monday-blue text-white"
                    : "bg-monday-gray-background text-gray-700 hover:bg-monday-gray"
                } ${isFetching ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* ✅ Jump to page input (optional) dengan tombol Go */}
        {shouldShowJumpToPage && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
              Go to:
            </span>
            <input
              type="number"
              min="1"
              max={lastPage}
              value={jumpToPage}
              onChange={handleJumpToPageChange}
              onKeyDown={handleJumpToPage}
              placeholder="Page"
              className={`w-20 px-3 py-2 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 transition-colors ${
                jumpToPage && !isJumpToPageValid()
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500" // ✅ Tampilkan error jika invalid
                  : "border-monday-border focus:ring-monday-blue focus:border-monday-blue"
              }`}
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">
              / {lastPage}
            </span>
            {/* ✅ Tombol "Go" untuk jump to page */}
            <button
              onClick={() => handleJumpToPage()}
              disabled={!isJumpToPageValid() || isFetching}
              className="px-3 py-2 bg-monday-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Go to page"
            >
              Go
            </button>
          </div>
        )}

        {/* Next button */}
        <button
          type="button"
          onClick={() => {
            const nextPage = Math.min(lastPage, currentPage + 1);
            onPageChange(nextPage);
          }}
          disabled={currentPage === lastPage || isFetching}
          className={`flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            currentPage === lastPage || isFetching
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-monday-gray-background text-gray-700 hover:bg-monday-gray"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

