import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileCheck,
  Lock,
  Package,
  Repeat,
  Search,
  Shield,
} from 'lucide-react';

interface HowItWorksAboutViewProps {
  mode: 'how-it-works' | 'about';
  onBrowseResources: () => void;
  onOpenRequests: () => void;
  onOpenPrivacy: () => void;
}

export const HowItWorksAboutView: React.FC<HowItWorksAboutViewProps> = ({
  mode,
  onBrowseResources,
  onOpenRequests,
  onOpenPrivacy,
}) => {
  if (mode === 'how-it-works') {
    return (
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white border border-[#E4E4E0] rounded-md p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#E4E4E0] pb-4">
            <span className="font-mono text-xs text-[#1F5E46] uppercase block mb-1">
              OPERATIONAL GUIDE
            </span>
            <h1 className="text-2xl font-semibold text-[#171717]">
              How Campus Resource Exchange Works
            </h1>
            <p className="text-sm text-[#666666] mt-1">
              Standard procedures for borrowing physical equipment, transferring textbooks, and sharing digital study materials within the college.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#1F5E46]">
                  01 / FIND
                </span>
                <Search className="w-4 h-4 text-[#1F5E46]" />
              </div>
              <h2 className="text-base font-semibold text-[#171717]">
                Search by Course & Semester
              </h2>
              <p className="text-xs text-[#666666] leading-relaxed">
                Filter the catalog by department, semester, subject, or resource type. Every item carries a structured catalog ID and course code.
              </p>
            </div>

            <div className="p-5 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#1F5E46]">
                  02 / REQUEST
                </span>
                <FileCheck className="w-4 h-4 text-[#1F5E46]" />
              </div>
              <h2 className="text-base font-semibold text-[#171717]">
                Request or Download
              </h2>
              <p className="text-xs text-[#666666] leading-relaxed">
                Download moderator-approved digital files directly, or submit a borrow request with your required duration and pickup note.
              </p>
            </div>

            <div className="p-5 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#1F5E46]">
                  03 / SHARE OR RETURN
                </span>
                <Repeat className="w-4 h-4 text-[#1F5E46]" />
              </div>
              <h2 className="text-base font-semibold text-[#171717]">
                Complete the State Machine
              </h2>
              <p className="text-xs text-[#666666] leading-relaxed">
                Confirm handover when picking up physical items and initiate return when done so the resource returns to AVAILABLE status.
              </p>
            </div>
          </div>

          {/* State Machine Reference Table */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-[#171717]">
              Borrowing State Machine Reference
            </h3>
            <div className="overflow-x-auto border border-[#E4E4E0] rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F7F5] border-b border-[#E4E4E0] font-mono text-[11px] uppercase text-[#666666]">
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">Triggered By</th>
                    <th className="py-2.5 px-3">Meaning & Next Allowed Step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E0]">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#16794A]">
                      AVAILABLE
                    </td>
                    <td className="py-2.5 px-3">Owner / Return</td>
                    <td className="py-2.5 px-3 text-[#666666]">
                      Resource is ready to be requested by any verified student.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#A16207]">
                      REQUESTED
                    </td>
                    <td className="py-2.5 px-3">Requester</td>
                    <td className="py-2.5 px-3 text-[#666666]">
                      Student submitted a borrow request. Owner may Approve or Reject; requester may Cancel.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#1F5E46]">
                      APPROVED
                    </td>
                    <td className="py-2.5 px-3">Resource Owner</td>
                    <td className="py-2.5 px-3 text-[#666666]">
                      Owner accepted request. Both parties meet at the specified campus location to confirm handover.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#B42318]">
                      BORROWED
                    </td>
                    <td className="py-2.5 px-3">Owner / Borrower</td>
                    <td className="py-2.5 px-3 text-[#666666]">
                      Item is in borrower custody until the agreed due date. Borrower initiates RETURN_REQUESTED when ready.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#A16207]">
                      RETURN_REQUESTED
                    </td>
                    <td className="py-2.5 px-3">Borrower</td>
                    <td className="py-2.5 px-3 text-[#666666]">
                      Borrower has initiated return. Owner confirms physical receipt to transition to RETURNED.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#16794A]">
                      RETURNED
                    </td>
                    <td className="py-2.5 px-3">Resource Owner</td>
                    <td className="py-2.5 px-3 text-[#666666]">
                      Transaction complete. Resource automatically resets to AVAILABLE and borrower may leave transaction feedback.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBrowseResources}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#1F5E46] text-white rounded cursor-pointer"
            >
              Browse resources
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenRequests}
              className="text-xs font-medium text-[#1F5E46] hover:underline cursor-pointer"
            >
              View student &ldquo;I Need&rdquo; requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white border border-[#E4E4E0] rounded-md p-6 sm:p-8 space-y-6">
        <div className="border-b border-[#E4E4E0] pb-4">
          <span className="font-mono text-xs text-[#1F5E46] uppercase block mb-1">
            INSTITUTIONAL OVERVIEW
          </span>
          <h1 className="text-2xl font-semibold text-[#171717]">
            About Campus Resource Exchange (CRX)
          </h1>
          <p className="text-sm text-[#666666] mt-1">
            A private campus utility built to circulate academic textbooks, instruments, and course study materials across student cohorts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#666666] leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[#171717]">
              Purpose & Academic Utility
            </h2>
            <p>
              Every semester, senior students complete courses and no longer need prescribed textbooks, scientific calculators, engineering drawing drafters, microcontroller kits, or lab manuals. At the same time, incoming and junior students require those exact items for their coursework.
            </p>
            <p>
              Campus Resource Exchange provides a structured, non-commercial registry where students can lend physical items temporarily, transfer surplus equipment permanently at no cost, and share moderator-reviewed digital study materials.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[#171717]">
              Verification, Moderation & Security
            </h2>
            <p>
              Access is restricted to verified college members. Digital uploads undergo extension, MIME type, and file header signature checks and are reviewed by campus administrators prior to catalog publication.
            </p>
            <p>
              All borrowing workflows, reports, and moderation decisions are logged in an auditable database trail. Personal email addresses are never exposed on public listings.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBrowseResources}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#1F5E46] text-white rounded cursor-pointer"
          >
            Browse resources
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-xs font-medium text-[#1F5E46] hover:underline cursor-pointer"
          >
            Read Privacy Policy (/privacy)
          </button>
        </div>
      </div>
    </div>
  );
};
