import React from 'react';
import { ArrowRight } from 'lucide-react';

interface NotFoundViewProps {
  onBrowseResources: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onBrowseResources,
}) => {
  return (
    <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-16">
      <div className="bg-white border border-[#E4E4E0] rounded-md p-6 sm:p-8 space-y-4">
        <div className="font-mono text-xs text-[#666666]">HTTP 404 · NOT FOUND</div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[#171717]">
          This page doesn&apos;t exist.
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed">
          The resource may have been removed or the link may be incorrect.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onBrowseResources}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors cursor-pointer"
          >
            <span>Browse resources</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
