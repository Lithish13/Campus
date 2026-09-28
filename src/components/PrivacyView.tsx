import React, { useState } from 'react';
import { Download, Shield, Trash2 } from 'lucide-react';
import { AuthenticatedUser } from '../types';
import { apiRequest } from '../api';
import {
  CookieConsentChoice,
  getCookieConsent,
  setCookieConsent,
} from '../utils/analytics';

interface PrivacyViewProps {
  user: AuthenticatedUser | null;
  onAccountDeleted: () => void;
  onOpenTerms?: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({
  user,
  onAccountDeleted,
  onOpenTerms,
}) => {
  const [statusMsg, setStatusMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [consentState, setConsentState] = useState<CookieConsentChoice>(() =>
    getCookieConsent()
  );

  const handleExportData = async () => {
    try {
      const res = await apiRequest<Record<string, unknown>>('/api/privacy/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crx_personal_data_${user?.studentId || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg('Personal academic data archive downloaded.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Unable to export data.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await apiRequest('/api/privacy/account', { method: 'DELETE' });
      onAccountDeleted();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Account deletion failed.');
    }
  };

  const handleUpdateConsent = (choice: 'accepted' | 'rejected') => {
    setCookieConsent(choice);
    setConsentState(choice);
    setStatusMsg(
      choice === 'accepted'
        ? 'Cookie preference saved: Optional anonymous usage analytics enabled.'
        : 'Cookie preference saved: Optional analytics disabled; only essential session cookies active.'
    );
  };

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white border border-[#E4E4E0] rounded-md p-6 sm:p-8 space-y-6">
        <div className="border-b border-[#E4E4E0] pb-4">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[#1F5E46] mb-1">
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span>DOCUMENT PATH: /privacy</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#171717]">
            Privacy Policy &amp; Data Governance
          </h1>
          <p className="text-xs text-[#666666] mt-1 font-mono">
            Effective Date: September 2026 · Operator Placeholder: [INSTITUTION_LEGAL_ENTITY_NAME]
          </p>
          <p className="text-xs text-[#666666] mt-2 bg-[#F7F7F5] border border-[#E4E4E0] rounded p-3">
            Notice: This privacy notice explains the actual technical data handling of Campus Resource Exchange (CRX) and uses placeholders for operator-specific legal identifiers. No external legal certification is claimed unless formally executed by the operating institution.
          </p>
        </div>

        {statusMsg && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 bg-[#EBF5F0] border border-[#B8DFCA] rounded text-xs text-[#16794A]"
          >
            {statusMsg}
          </div>
        )}

        <div className="space-y-5 text-sm text-[#171717] leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              1. Data Collected &amp; Why Data Is Collected
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Campus Resource Exchange (CRX), operated by <span className="font-mono text-[#171717]">[INSTITUTION_LEGAL_ENTITY_NAME]</span>, collects only the minimum information required to verify student eligibility, index shared academic materials, coordinate physical equipment lending handovers, and maintain moderation accountability.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              2. Authentication Information
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              When you create an account, your college email address is checked against the institutional domain allowlist. Passwords are never stored in plaintext or reversible form; they are salted and hashed using BCrypt before persistence. If you sign in with institutional Google OAuth, only your verified email and display name are read.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              3. Academic Profile Information
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Your profile stores your full name, college student/staff registration ID, academic department, current semester, graduation year, and account verification status. Your institutional email address is stored in an isolated private record and is never exposed on public resource cards or public student profiles.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              4. Uploaded Resources
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Digital study files (notes, lab manuals, past examination papers) and physical resource photographs are validated by file extension, MIME type, byte size, and magic-byte binary signatures. Uploaded files are stored outside the public web root under randomized keys and require moderator approval before public catalog indexing.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              5. Transaction, Request &amp; Contextual Message Data
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Borrow requests, state transitions (<span className="font-mono">AVAILABLE</span>, <span className="font-mono">REQUESTED</span>, <span className="font-mono">APPROVED</span>, <span className="font-mono">BORROWED</span>, <span className="font-mono">RETURN_REQUESTED</span>, <span className="font-mono">RETURNED</span>), resource need requests, and contextual handover messages are stored so borrowers and lenders have an accurate record of lending terms and due dates.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              6. Log Data &amp; Observability
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Structured server logs record request IDs, HTTP methods, endpoint paths, status codes, and response durations for operational reliability. Security-sensitive events (sign-ins, failed authentication attempts, resource moderation, and report resolutions) are recorded in the administrative audit log. Passwords, JWT secrets, and session tokens are never written to logs.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              7. Cookies &amp; Privacy-Conscious Analytics
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              CRX uses an essential <span className="font-mono">HttpOnly</span>, <span className="font-mono">SameSite=Lax</span> session cookie (<span className="font-mono">crx_access_token</span>) and a CSRF verification header to keep your session secure. Optional aggregate usage analytics (counting page views, searches, downloads, and completed exchanges without personal identifiers) run only if you explicitly accept optional cookies.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-[#666666]">
                Current Cookie Preference: {consentState ? consentState.toUpperCase() : 'UNSET'}
              </span>
              <button
                type="button"
                onClick={() => handleUpdateConsent('accepted')}
                className="px-2.5 py-1 bg-[#F7F7F5] hover:bg-[#F0EFEA] border border-[#E4E4E0] rounded text-[#171717] cursor-pointer"
              >
                Allow optional analytics
              </button>
              <button
                type="button"
                onClick={() => handleUpdateConsent('rejected')}
                className="px-2.5 py-1 bg-[#F7F7F5] hover:bg-[#F0EFEA] border border-[#E4E4E0] rounded text-[#171717] cursor-pointer"
              >
                Essential cookies only
              </button>
            </div>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              8. Data Retention &amp; Data Deletion
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              Active listings and borrowing history are retained while your student account remains active. You may delete individual listings at any time, export your complete personal data record in machine-readable JSON format, or permanently delete your account using the self-service controls below.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              9. Security Practices &amp; Third-Party Services
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              All API endpoints enforce authentication, role-based access control (RBAC), ownership verification (IDOR prevention), input validation against XSS/injection, and per-route rate limiting. When institutional single sign-on or cloud synchronization is enabled, Google Firebase Authentication and Cloud Firestore process authentication tokens and catalog documents under role-restricted security rules.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-[#171717]">
              10. Contact Information
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed">
              For privacy inquiries, data access requests, or security disclosures, contact <span className="font-mono text-[#171717]">[CAMPUS_DATA_PROTECTION_OFFICER_NAME]</span> at <span className="font-mono text-[#171717]">[CAMPUS_DATA_PROTECTION_OFFICER_EMAIL]</span> or <span className="font-mono text-[#171717]">[INSTITUTION_MAILING_ADDRESS]</span>.
            </p>
          </section>
        </div>

        {/* Self-Service Data Rights Controls for Authenticated Users */}
        {user && (
          <div className="pt-6 border-t border-[#E4E4E0] space-y-3">
            <h3 className="text-xs font-semibold text-[#171717]">
              Self-Service Data Portability &amp; Account Deletion
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportData}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#F7F7F5] hover:bg-[#F0EFEA] border border-[#E4E4E0] rounded text-[#171717] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#1F5E46]" aria-hidden="true" />
                Export My Personal Data (JSON)
              </button>

              {user.role !== 'ADMIN' && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#B42318] border border-[#F5C2C0] bg-[#FDF2F2] rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Delete My Account
                </button>
              )}

              {confirmDelete && (
                <div className="flex items-center gap-2 p-2 bg-[#FDF2F2] border border-[#F5C2C0] rounded">
                  <span className="text-xs text-[#B42318]">
                    Permanently delete account and listings?
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#B42318] text-white rounded cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1 text-xs text-[#666666]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {onOpenTerms && (
          <div className="pt-4 border-t border-[#E4E4E0] text-xs">
            <button
              type="button"
              onClick={onOpenTerms}
              className="font-medium text-[#1F5E46] hover:underline cursor-pointer"
            >
              View Terms and Conditions (/terms)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
