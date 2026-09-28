import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  List,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Resource,
  ResourceType,
  TaxonomyData,
} from '../types';
import {
  Button,
  EmptyState,
  ErrorState,
  FilterPanel,
  LoadingState,
  Pagination,
  ResourceCard,
  ResourceStatus,
  SearchBar,
} from './ui';
import { trackAnalyticsEvent } from '../utils/analytics';

export interface CatalogFilters {
  q: string;
  department: string;
  semester: string;
  subject: string;
  category: string;
  resourceType: string;
  lendingType: string;
  availableOnly: boolean;
}

interface CatalogViewProps {
  resources: Resource[];
  taxonomy: TaxonomyData;
  filters: CatalogFilters;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onChangeFilters: (next: CatalogFilters) => void;
  onClearFilters: () => void;
  onSelectResource: (resource: Resource) => void;
  onListResource: () => void;
}

const PAGE_SIZE = 20; // Section 66: Load 20 to 30 resources per page initially

export const CatalogView: React.FC<CatalogViewProps> = ({
  resources,
  taxonomy,
  filters,
  loading = false,
  error = null,
  onRetry,
  onChangeFilters,
  onClearFilters,
  onSelectResource,
  onListResource,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.department ||
      filters.semester ||
      filters.subject ||
      filters.category ||
      filters.resourceType ||
      filters.lendingType ||
      filters.availableOnly
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Track privacy-conscious search event (debounced)
  useEffect(() => {
    if (!filters.q.trim()) return;
    const timer = setTimeout(() => {
      trackAnalyticsEvent('resource_search', {
        queryLength: filters.q.trim().length,
        hasDepartmentFilter: Boolean(filters.department),
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [filters.q, filters.department]);

  const updateFilter = <K extends keyof CatalogFilters>(
    key: K,
    value: CatalogFilters[K]
  ) => {
    onChangeFilters({ ...filters, [key]: value });
  };

  const totalPages = Math.max(1, Math.ceil(resources.length / PAGE_SIZE));
  const paginatedResources = resources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white border border-[#E4E4E0] rounded-md p-4 sm:p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-[#171717]">
              Campus Resource Catalog
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Find textbooks, notes, calculators, and lab equipment shared by students in your campus.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              aria-expanded={mobileFiltersOpen}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#F7F7F5] border border-[#E4E4E0] rounded text-[#171717] cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Filters</span>
            </button>
            <div
              role="group"
              aria-label="Catalog view mode"
              className="inline-flex border border-[#E4E4E0] rounded overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#171717] text-white'
                    : 'bg-white text-[#666666] hover:bg-[#F7F7F5]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#171717] text-white'
                    : 'bg-white text-[#666666] hover:bg-[#F7F7F5]'
                }`}
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
            <Button variant="primary" size="sm" onClick={onListResource}>
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>List a resource</span>
            </Button>
          </div>
        </div>

        <SearchBar
          value={filters.q}
          onChange={(val) => updateFilter('q', val)}
        />
      </div>

      {mobileFiltersOpen && (
        <div className="lg:hidden bg-white border border-[#E4E4E0] rounded-md p-4 mb-6">
          <FilterPanel
            filters={filters}
            taxonomy={taxonomy}
            hasActiveFilters={hasActiveFilters}
            onUpdateFilter={updateFilter}
            onClearFilters={onClearFilters}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside
          aria-label="Resource filters"
          className="hidden lg:block lg:col-span-3 bg-white border border-[#E4E4E0] rounded-md p-4 sticky top-20"
        >
          <FilterPanel
            filters={filters}
            taxonomy={taxonomy}
            hasActiveFilters={hasActiveFilters}
            onUpdateFilter={updateFilter}
            onClearFilters={onClearFilters}
          />
        </aside>

        <div className="lg:col-span-9 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#666666] bg-white border border-[#E4E4E0] rounded px-4 py-2.5">
            <span>
              Showing{' '}
              <strong className="text-[#171717] font-mono tabular-nums">
                {resources.length}
              </strong>{' '}
              catalog {resources.length === 1 ? 'entry' : 'entries'}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="text-xs font-medium text-[#1F5E46] hover:underline cursor-pointer"
              >
                Clear all active filters
              </button>
            )}
          </div>

          {loading ? (
            <LoadingState count={6} />
          ) : error ? (
            <ErrorState
              code="CATALOG_FETCH_FAILED"
              message={error}
              onRetry={onRetry}
            />
          ) : resources.length === 0 ? (
            <EmptyState
              title="No resources found"
              description="Try another search or list a resource for others."
              actionLabel="List a resource"
              onAction={onListResource}
              secondaryActionLabel={hasActiveFilters ? 'Reset filters' : undefined}
              onSecondaryAction={hasActiveFilters ? onClearFilters : undefined}
            />
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedResources.map((res) => (
                  <ResourceCard
                    key={res.id}
                    resource={res}
                    onSelect={onSelectResource}
                  />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={resources.length}
                pageSize={PAGE_SIZE}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          ) : (
            <>
              <div className="bg-white border border-[#E4E4E0] rounded-md overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E4E4E0] bg-[#F7F7F5] text-[11px] font-mono text-[#666666]">
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Resource Title &amp; Subject</th>
                      <th className="py-2.5 px-3 hidden sm:table-cell">Category</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Dept / Sem</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4E0] text-xs">
                    {paginatedResources.map((res) => (
                      <tr
                        key={res.id}
                        onClick={() => onSelectResource(res)}
                        className="hover:bg-[#F7F7F5] transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-3 font-mono text-[11px] text-[#666666] whitespace-nowrap tabular-nums">
                          {res.code}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-[#171717]">{res.title}</div>
                          <div className="text-[11px] text-[#666666]">
                            <span className="font-mono text-[#1F5E46]">{res.courseCode}</span> ·{' '}
                            {res.subject}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-[#171717] hidden sm:table-cell">
                          {res.category}
                        </td>
                        <td className="py-3 px-3 text-[#666666] hidden md:table-cell">
                          <div className="truncate max-w-[160px]">{res.department}</div>
                          <div className="font-mono text-[11px] tabular-nums">
                            Semester {res.semester}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                          {res.resourceType === ResourceType.DIGITAL
                            ? 'DIGITAL'
                            : res.lendingType}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <ResourceStatus status={res.availability} />
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="text-xs font-medium text-[#1F5E46] hover:underline">
                            Inspect
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={resources.length}
                pageSize={PAGE_SIZE}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
