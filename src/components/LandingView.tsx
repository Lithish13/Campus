import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Download,
  FileCheck,
  Package,
  Repeat,
  Search,
} from 'lucide-react';
import { Category, Resource, ResourceType } from '../types';
import { ResourceStatus } from './ui';

interface LandingViewProps {
  categories: Category[];
  recentResources: Resource[];
  onBrowseAll: () => void;
  onSelectCategory: (categoryName: string) => void;
  onListResource: () => void;
  onOpenRequests: () => void;
  onSelectResource: (resource: Resource) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  categories,
  recentResources,
  onBrowseAll,
  onSelectCategory,
  onListResource,
  onOpenRequests,
  onSelectResource,
}) => {
  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SECTION — Direct institutional copy, single dominant CTA anchor, UI ledger preview */}
      <section className="bg-white border-b border-[#E4E4E0]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left 7 Columns: Core Institutional Copy & CTAs */}
            <div className="lg:col-span-7 space-y-5">
              <div className="text-xs font-mono text-[#666666]">
                <span>Campus Resource Exchange</span>
                <span aria-hidden="true"> · </span>
                <span>Verified College Directory</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-semibold tracking-tight text-[#171717] leading-[1.18] text-balance max-w-2xl">
                Find what you need. Pass on what you no longer use.
              </h1>

              <p className="text-base sm:text-lg text-[#666666] leading-relaxed max-w-2xl">
                Find textbooks, notes and equipment shared by students in your campus.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onBrowseAll}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Browse resources</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onListResource}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-white hover:bg-[#F7F7F5] text-[#171717] border border-[#E4E4E0] rounded transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>List a resource</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#E4E4E0] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#666666]">
                <div>
                  <span className="font-semibold text-[#171717] block">
                    College Email Verification
                  </span>
                  Restricted to verified institutional student and staff accounts.
                </div>
                <div>
                  <span className="font-semibold text-[#171717] block">
                    Structured Lending Workflow
                  </span>
                  Tracked availability from request through physical handover and return.
                </div>
                <div>
                  <span className="font-semibold text-[#171717] block">
                    Moderated Digital Archive
                  </span>
                  Reviewed notes, lab manuals, and previous-year examination papers.
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Live Catalog Index Preview */}
            <div className="lg:col-span-5 bg-[#F7F7F5] border border-[#E4E4E0] rounded-md p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E4E4E0]">
                <div>
                  <span className="text-xs font-semibold text-[#171717] block">
                    Recent Catalog Listings
                  </span>
                  <span className="text-[11px] font-mono text-[#666666]">
                    Verified Campus Index
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onBrowseAll}
                  className="text-xs font-medium text-[#1F5E46] hover:underline cursor-pointer"
                >
                  View full catalog
                </button>
              </div>

              <div className="space-y-2.5">
                {recentResources.slice(0, 4).map((res) => (
                  <div
                    key={res.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectResource(res)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectResource(res);
                      }
                    }}
                    className="bg-white border border-[#E4E4E0] hover:border-[#1F5E46] rounded p-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#666666]">
                        <span className="tabular-nums">{res.code}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-[#1F5E46]">{res.courseCode}</span>
                      </div>
                      <ResourceStatus status={res.availability} />
                    </div>
                    <p className="text-xs font-semibold text-[#171717] line-clamp-1">
                      {res.title}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-[#666666] mt-1.5">
                      <span>
                        {res.category} · Sem {res.semester}
                      </span>
                      <span className="font-mono">
                        {res.resourceType === ResourceType.DIGITAL
                          ? 'DIGITAL'
                          : res.lendingType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RESOURCE CATEGORIES SECTION */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-[#171717]">
              Resource categories
            </h2>
            <p className="text-sm text-[#666666]">
              Filter academic equipment and study materials by standard university classification.
            </p>
          </div>
          <button
            type="button"
            onClick={onBrowseAll}
            className="text-xs font-medium text-[#1F5E46] hover:underline self-start sm:self-auto cursor-pointer"
          >
            Browse all categories
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className="bg-white border border-[#E4E4E0] hover:border-[#1F5E46] rounded-md p-4 text-left transition-colors group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="text-[11px] font-mono text-[#666666] mb-1.5">
                  {cat.resourceKind === 'BOTH' ? 'Physical & Digital' : cat.resourceKind}
                </div>
                <h3 className="text-sm font-semibold text-[#171717] group-hover:text-[#1F5E46] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-[#666666] mt-1 leading-relaxed">
                  {cat.description}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#E4E4E0] flex items-center justify-between text-xs font-medium text-[#1F5E46]">
                <span>Open index</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E4E4E0] rounded-md p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#171717]">How it works</h2>
            <p className="text-sm text-[#666666]">
              A three-step process for exchanging materials within the campus network.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-t-2 border-[#1F5E46] pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-[#1F5E46] tabular-nums">
                  01. Find
                </span>
                <Search className="w-4 h-4 text-[#666666]" aria-hidden="true" />
              </div>
              <p className="text-xs text-[#666666] leading-relaxed">
                Search the catalog by subject, course code, department, semester, or resource category to locate available books, instruments, or digital notes.
              </p>
            </div>

            <div className="border-t-2 border-[#1F5E46] pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-[#1F5E46] tabular-nums">
                  02. Request
                </span>
                <FileCheck className="w-4 h-4 text-[#666666]" aria-hidden="true" />
              </div>
              <p className="text-xs text-[#666666] leading-relaxed">
                Download moderator-approved digital files immediately, or submit a borrow request with your required duration and coordinate pickup on campus.
              </p>
            </div>

            <div className="border-t-2 border-[#1F5E46] pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-[#1F5E46] tabular-nums">
                  03. Share or return
                </span>
                <Repeat className="w-4 h-4 text-[#666666]" aria-hidden="true" />
              </div>
              <p className="text-xs text-[#666666] leading-relaxed">
                Return borrowed equipment on schedule so the status resets to available, or list your own surplus resources when a semester ends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DIGITAL, PHYSICAL & REQUESTS EXPLANATION SECTIONS */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E4E4E0] rounded-md p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#1F5E46] mb-2">
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Digital Repository</span>
              </div>
              <h3 className="text-base font-semibold text-[#171717]">
                Digital resources
              </h3>
              <p className="text-sm text-[#666666] mt-2 leading-relaxed">
                Students can upload approved academic materials such as notes, lab manuals and previous-year question papers.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-[#666666] border-t border-[#E4E4E0] pt-3">
                <li>Server-side file type and signature verification</li>
                <li>Moderator review prior to public catalog listing</li>
                <li>Authenticated downloads organized by course code</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory('Notes')}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F5E46] hover:underline cursor-pointer"
            >
              <span>Browse digital study materials</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="bg-white border border-[#E4E4E0] rounded-md p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#1F5E46] mb-2">
                <Package className="w-4 h-4" aria-hidden="true" />
                <span>Equipment &amp; Textbook Lending</span>
              </div>
              <h3 className="text-base font-semibold text-[#171717]">
                Physical resources
              </h3>
              <p className="text-sm text-[#666666] mt-2 leading-relaxed">
                Students can lend, give away or make physical academic resources available to others.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-[#666666] border-t border-[#E4E4E0] pt-3">
                <li>Temporary borrowing or permanent free transfer</li>
                <li>State-machine tracked availability and due dates</li>
                <li>Contextual messaging for campus handover locations</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory('Calculators')}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F5E46] hover:underline cursor-pointer"
            >
              <span>Browse physical equipment</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="bg-white border border-[#E4E4E0] rounded-md p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#1F5E46] mb-2">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Campus Request Board</span>
              </div>
              <h3 className="text-base font-semibold text-[#171717]">
                Resource requests
              </h3>
              <p className="text-sm text-[#666666] mt-2 leading-relaxed">
                Students can post what they need when they cannot find it.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-[#666666] border-t border-[#E4E4E0] pt-3">
                <li>Specify required subject, semester, and deadline</li>
                <li>Indicate preference for borrowing or giveaway</li>
                <li>Receive direct responses from senior students</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onOpenRequests}
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F5E46] hover:underline cursor-pointer"
            >
              <span>View open student requests</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E4E4E0] rounded-md p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#171717]">
              Explore the campus resource catalog
            </h2>
            <p className="text-sm text-[#666666] mt-1">
              Search available textbooks, calculators, lab instruments, and digital course archives by department.
            </p>
          </div>
          <button
            type="button"
            onClick={onBrowseAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors shrink-0 whitespace-nowrap cursor-pointer"
          >
            <span>Browse resources</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
};
