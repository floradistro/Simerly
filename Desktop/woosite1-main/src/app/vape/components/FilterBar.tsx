// React import not needed in React 17+
import { Filter, ChevronDown } from 'lucide-react';
import { type ProductFormat } from '../constants';

interface FilterBarProps {
  sortBy: string;
  filterCategory: 'all' | 'indica' | 'sativa' | 'hybrid';
  filterVibe: 'all' | 'relax' | 'energize' | 'balance';
  filterNose: 'all' | 'candy' | 'gas' | 'cake' | 'funk' | 'sherb';
  format: ProductFormat;
  onSortChange: (value: string) => void;
  onCategoryChange: (value: 'all' | 'indica' | 'sativa' | 'hybrid') => void;
  onVibeChange: (value: 'all' | 'relax' | 'energize' | 'balance') => void;
  onNoseChange: (value: 'all' | 'candy' | 'gas' | 'cake' | 'funk' | 'sherb') => void;
  onFormatChange: (format: ProductFormat) => void;
  productCount: number;
  totalCount: number;
}

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'thc', label: 'THC: High to Low' }
];

export default function FilterBar({
  sortBy,
  filterCategory,
  filterVibe,
  filterNose,
  format,
  onSortChange,
  onCategoryChange,
  onVibeChange,
  onNoseChange,
  onFormatChange,
  productCount,
  totalCount
}: FilterBarProps) {
  const triggerFilterDropdown = () => {
    const event = new CustomEvent('toggleMobileFilters');
    window.dispatchEvent(event);
  };

  const activeFilterCount = 
    (filterCategory !== 'all' ? 1 : 0) +
    (filterVibe !== 'all' ? 1 : 0) +
    (filterNose !== 'all' ? 1 : 0);

  const clearFilters = () => {
    onCategoryChange('all');
    onVibeChange('all');
    onNoseChange('all');
  };

  return (
    <section className="sticky top-0 z-30 bg-[#4a4a4a]/95 backdrop-blur-md border-y border-white/10">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-1 md:py-1">
        <div className="flex items-center justify-between gap-2 md:gap-3">
          {/* Left side - Results count */}
          <div className="flex items-center gap-2 md:gap-6">
            {/* Results count - Hidden on mobile, visible on desktop */}
            <div className="hidden md:block text-sm text-white/70">
              {productCount} of {totalCount} vapes
              {activeFilterCount > 0 && ` • ${activeFilterCount} filters applied`}
            </div>
          </div>

          {/* Mobile: Compact count and filter button */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-xs text-white/70">
              {productCount} vapes
            </span>
            <button
              onClick={triggerFilterDropdown}
              className="flex items-center gap-1 px-2 py-1 bg-black hover:bg-gray-900 rounded-lg transition-all duration-300 text-xs text-white"
            >
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-white text-black text-xs rounded-full font-medium">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Desktop filters and sort */}
          <div className="hidden md:flex items-center gap-4">
            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={triggerFilterDropdown}
                className="flex items-center gap-2 px-2 py-1 bg-black hover:bg-gray-900 rounded-lg transition-all duration-300 text-white"
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 bg-white text-black text-xs rounded-full font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-white/70 hover:text-white transition-colors duration-300"
                >
                  Clear all
                </button>
              )}
            </div>
            
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="appearance-none px-2 py-1 pr-6 bg-black hover:bg-gray-900 text-white rounded-lg transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-600"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value} className="bg-[#2a2a2a]">
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 