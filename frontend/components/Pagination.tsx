'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  hasNext: boolean;
  hasPrevious: boolean;
  totalItems: number;
}

export default function Pagination({ hasNext, hasPrevious, totalItems }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get current page from URL, default to 1
  const currentPage = Number(searchParams.get('page')) || 1;

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handleNavigate = (pageNumber: number) => {
    // router.push updates the URL without a full page reload
    router.push(createPageURL(pageNumber), { scroll: false });
  };

  if (!hasNext && !hasPrevious) return null;

  return (
    <div className="flex items-center justify-between border-t border-cyan-900/50 pt-6 mt-8">
      <div className="text-xs text-slate-500 font-mono">
        Showing page <span className="text-cyan-400 font-bold">{currentPage}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleNavigate(currentPage - 1)}
          disabled={!hasPrevious}
          className="flex items-center gap-1 px-4 py-2 text-xs font-bold uppercase tracking-widest font-mono rounded border border-cyan-800 text-cyan-400 hover:bg-cyan-950/50 hover:border-cyan-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-cyan-800 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        
        <button
          onClick={() => handleNavigate(currentPage + 1)}
          disabled={!hasNext}
          className="flex items-center gap-1 px-4 py-2 text-xs font-bold uppercase tracking-widest font-mono rounded border border-cyan-800 text-cyan-400 hover:bg-cyan-950/50 hover:border-cyan-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-cyan-800 transition-all"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}