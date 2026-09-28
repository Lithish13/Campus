import React from 'react';
import { FileText } from 'lucide-react';

interface TermsViewProps {
  onOpenPrivacy: () => void;
  onBrowseResources: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({
  onOpenPrivacy,
  onBrowseResources,
}) => {
  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white border border-[#E4E4E0] rounded-md p-6 sm:p-8 space-y-6">
        <div className="border-b border-[#E4E4E0] pb-4">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[#1F5E46] mb-1">
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>DOCUMENT PATH: /terms</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#171717]">
            Terms and Conditions of Use
          </h1>
          <p className="text-xs text-[#666666] mt-1 font-mono">
            Effective Date: September 2026 · Operator Placeholder: [INSTITUTION_LEGAL_ENTITY_NAME]
          </p>
          <p className="text-xs text-[#666666] mt-2 bg-[#F7F7F5] border border-[#E4E4E0] rounded p-3">
            Notice: This document provides operational terms for Campus Resource Exchange (CRX) and uses placeholders for institution-specific legal identifiers. It has not been reviewed by external legal counsel unless confirmed by your campus administration.
          </p>
        </div>

        <div className="space-y-5 text-sm text-[#171717] leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              1. Acceptable Use
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Campus Resource Exchange (CRX) is a non-commercial academic utility operated by <span className="font-mono text-[#171717]">[INSTITUTION_LEGAL_ENTITY_NAME]</span> for enrolled students, faculty, and verified academic staff. You may use CRX solely to locate, lend, borrow, give away, or share legitimate academic materials and course equipment within your campus community.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              2. User Responsibilities
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Users must register with an authentic institutional email address and student/staff identification number. You are responsible for maintaining the confidentiality of your account credentials, providing accurate descriptions of listed items, honoring agreed pickup and return schedules, and communicating respectfully with peers.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              3. Prohibited Content
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Users must not upload, list, or request: (a) live or active examination papers, confidential test banks, or unauthorized solutions to ongoing graded assessments; (b) pirated commercial textbooks or materials that violate publisher licenses; (c) malicious software, executables, scripts, or archives; (d) hazardous laboratory chemicals, restricted biological materials, or unsafe electrical equipment; or (e) commercial advertisements, spam, or off-topic listings.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              4. Copyright Responsibilities
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              By uploading digital study notes, lab manuals, or past papers, you represent that you are the original author of the notes or have explicit institutional permission to share the material within the college. Copyright infringement reports are investigated by campus moderators and may result in immediate removal of the file and account disciplinary action.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              5. Resource Ownership
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Listing a physical item for temporary borrowing (<span className="font-mono">BORROW</span>) does not transfer ownership; legal title remains with the lending student or department. Listing an item as a permanent free transfer (<span className="font-mono">GIVEAWAY</span>) transfers possession to the recipient upon physical handover on campus.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              6. Physical Item Rules
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Physical handovers should take place in designated, well-lit public campus locations (such as the central library, department reading rooms, or student commons). Borrowers must inspect items at pickup, use equipment with reasonable care, and return borrowed items on or before the agreed return date. No monetary rental fees or off-platform cash deposits may be demanded on CRX.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              7. Digital Resource Rules
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Digital uploads are restricted to approved document formats (such as PDF, TXT, MD, CSV, and standard images) under the configured file size limit. Every uploaded file undergoes server-side MIME and binary signature verification and remains in <span className="font-mono">PENDING</span> moderation status until approved by a campus administrator.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              8. Reporting & Moderation
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Verified users may report listings or messages for copyright violations, inaccurate academic categorization, unsafe items, or inappropriate conduct. Campus moderators review submitted reports, record resolution notes in the administrative audit log, and may reject or remove non-compliant resources.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              9. Account Suspension & Termination
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Campus administrators may suspend or revoke access for accounts that repeatedly fail to return borrowed equipment, upload prohibited or copyrighted files, attempt unauthorized API access, or violate institutional conduct policies.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              10. Platform Limitations
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              CRX is an indexing and coordination tool. It does not act as an escrow agent, courier, insurer, or guarantor of physical item condition or academic accuracy of student-contributed study notes.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              11. Liability Limitations
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              To the maximum extent permitted by applicable law, <span className="font-mono text-[#171717]">[INSTITUTION_LEGAL_ENTITY_NAME]</span> and the Campus Resource Exchange maintainers provide the service &ldquo;as is&rdquo; and shall not be liable for lost, damaged, or unreturned physical items, inaccurate study notes, or service interruptions.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              12. Changes to Terms
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              These Terms and Conditions may be updated at the start of an academic semester to reflect campus policy adjustments. Material updates will be indicated by revising the effective date at the top of this page.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              13. Contact Information
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Questions regarding these terms, copyright notices, or lending disputes should be directed to <span className="font-mono text-[#171717]">[CAMPUS_ADMINISTRATION_OFFICE_NAME]</span> at <span className="font-mono text-[#171717]">[CAMPUS_LEGAL_CONTACT_EMAIL]</span> or by mail at <span className="font-mono text-[#171717]">[INSTITUTION_MAILING_ADDRESS]</span>.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-[#E4E4E0] flex flex-wrap items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="font-medium text-[#1F5E46] hover:underline cursor-pointer"
          >
            Read Privacy Policy (/privacy)
          </button>
          <button
            type="button"
            onClick={onBrowseResources}
            className="px-4 py-2 font-medium bg-[#1F5E46] hover:bg-[#174936] text-white rounded cursor-pointer"
          >
            Browse resources
          </button>
        </div>
      </div>
    </div>
  );
};
