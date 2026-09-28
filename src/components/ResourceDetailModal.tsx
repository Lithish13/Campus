import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Flag,
  MapPin,
  MessageSquare,
  Package,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  AuthenticatedUser,
  BorrowRequest,
  BorrowStatus,
  ContextualMessage,
  ModerationStatus,
  ReportReason,
  Resource,
  ResourceType,
  UserPublicProfile,
  UserRole,
} from '../types';
import { apiRequest, formatBytes, formatDateShort, getStoredBearerToken } from '../api';
import { syncBorrowRequestToFirestore } from '../firebase';
import { trackAnalyticsEvent } from '../utils/analytics';

interface ResourceDetailModalProps {
  resourceId: string;
  user: AuthenticatedUser | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onResourceUpdated: () => void;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  resourceId,
  user,
  onClose,
  onOpenAuth,
  onResourceUpdated,
}) => {
  const [resource, setResource] = useState<Resource | null>(null);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [messages, setMessages] = useState<ContextualMessage[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<UserPublicProfile | null>(null);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusBanner, setStatusBanner] = useState('');

  // Borrow Request Form State
  const [durationDays, setDurationDays] = useState(7);
  const [requiredUntil, setRequiredUntil] = useState('2026-10-15');
  const [requestNote, setRequestNote] = useState('');
  const [submittingBorrow, setSubmittingBorrow] = useState(false);

  // Contextual Message Form State
  const [messageBody, setMessageBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Report Form State
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>(
    ReportReason.INAPPROPRIATE_CONTENT
  );
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Completed Transaction Rating State
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await apiRequest<{
        resource: Resource;
        borrowRequests: BorrowRequest[];
        messages: ContextualMessage[];
      }>(`/api/resources/${resourceId}`);
      setResource(res.data.resource);
      setBorrowRequests(res.data.borrowRequests);
      setMessages(res.data.messages);
      trackAnalyticsEvent('resource_view', {
        resourceType: res.data.resource.resourceType,
        category: res.data.resource.category,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load resource details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [resourceId]);

  const handleInspectOwnerProfile = async () => {
    if (!resource) return;
    try {
      const res = await apiRequest<{ profile: UserPublicProfile }>(
        `/api/users/${resource.ownerId}/profile`
      );
      setOwnerProfile(res.data.profile);
      setShowOwnerModal(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load owner profile.');
    }
  };

  const handleDownloadDigital = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!resource) return;
    try {
      setErrorMsg('');
      const headers: Record<string, string> = {};
      const token = getStoredBearerToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/resources/${resource.id}/download`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(
          errJson?.error?.message || 'Unable to download digital resource.'
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.fileName || `${resource.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      trackAnalyticsEvent('resource_download', {
        category: resource.category,
      });
      setStatusBanner('Secure download started and logged.');
      fetchDetails();
      onResourceUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const handleSubmitBorrowRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!resource) return;
    try {
      setSubmittingBorrow(true);
      setErrorMsg('');
      const res = await apiRequest<{ borrowRequest: BorrowRequest; resource: Resource }>(
        `/api/resources/${resource.id}/requests`,
        {
          method: 'POST',
          body: JSON.stringify({
            requestedDurationDays: durationDays,
            requiredUntil,
            message: requestNote,
          }),
        }
      );
      await syncBorrowRequestToFirestore(res.data.borrowRequest);
      trackAnalyticsEvent('resource_request', {
        lendingType: resource.lendingType,
        durationDays,
      });
      setRequestNote('');
      setStatusBanner('Borrow request submitted to resource owner.');
      await fetchDetails();
      onResourceUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not submit borrow request.');
    } finally {
      setSubmittingBorrow(false);
    }
  };

  const handleStateTransition = async (reqId: string, nextStatus: BorrowStatus) => {
    try {
      setErrorMsg('');
      const res = await apiRequest<{ borrowRequest: BorrowRequest }>(
        `/api/borrow-requests/${reqId}/transition`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      await syncBorrowRequestToFirestore(res.data.borrowRequest);
      if (nextStatus === BorrowStatus.RETURNED) {
        trackAnalyticsEvent('exchange_completed', {
          status: nextStatus,
        });
      }
      setStatusBanner(`Borrow status updated to ${res.data.borrowRequest.status}.`);
      await fetchDetails();
      onResourceUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'State transition rejected.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!resource || !messageBody.trim()) return;
    try {
      setSendingMsg(true);
      setErrorMsg('');
      const activeReq = borrowRequests[0];
      await apiRequest(`/api/messages`, {
        method: 'POST',
        body: JSON.stringify({
          resourceId: resource.id,
          borrowRequestId: activeReq?.id,
          body: messageBody.trim(),
        }),
      });
      setMessageBody('');
      await fetchDetails();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!resource) return;
    try {
      setSubmittingReport(true);
      setErrorMsg('');
      await apiRequest(`/api/reports`, {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'RESOURCE',
          targetId: resource.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setReportOpen(false);
      setReportDetails('');
      setStatusBanner('Report filed with campus moderation.');
      await fetchDetails();
      onResourceUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;
    try {
      setSubmittingRating(true);
      setErrorMsg('');
      await apiRequest(`/api/resources/${resource.id}/rate`, {
        method: 'POST',
        body: JSON.stringify({
          score: ratingScore,
          comment: ratingComment,
        }),
      });
      setRatingComment('');
      setStatusBanner('Completed transaction feedback recorded.');
      await fetchDetails();
      onResourceUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleDeleteResource = async () => {
    if (!resource) return;
    try {
      await apiRequest(`/api/resources/${resource.id}`, { method: 'DELETE' });
      onResourceUpdated();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not delete resource.');
    }
  };

  const eligibleForRating = Boolean(
    user &&
      borrowRequests.some(
        (b) =>
          b.requesterId === user.id &&
          b.status === BorrowStatus.RETURNED &&
          !b.hasRated
      )
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E0] rounded-md max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E4E4E0] px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[#1F5E46] bg-[#EBF5F0] px-2 py-0.5 rounded">
              {resource?.code || 'LOADING'}
            </span>
            <span className="text-xs font-mono text-[#666666]">
              RESOURCE SPECIFICATION SHEET
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#666666] hover:text-[#171717] border border-[#E4E4E0] rounded cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading || !resource ? (
          <div className="p-8 text-center text-xs text-[#666666]">
            {errorMsg || 'Loading resource record...'}
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6">
            {errorMsg && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C0] rounded text-xs text-[#B42318]">
                {errorMsg}
              </div>
            )}
            {statusBanner && (
              <div className="p-3 bg-[#EBF5F0] border border-[#B8DFCA] rounded text-xs text-[#16794A] flex items-center justify-between">
                <span>{statusBanner}</span>
                <button
                  type="button"
                  onClick={() => setStatusBanner('')}
                  className="text-[11px] underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Header Metadata & Availability */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-[#E4E4E0]">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-[#F7F7F5] border border-[#E4E4E0] rounded text-[#171717]">
                    {resource.courseCode}
                  </span>
                  <span className="text-xs font-medium text-[#666666]">
                    {resource.subject}
                  </span>
                  <span className="text-xs text-[#666666]">•</span>
                  <span className="font-mono text-xs text-[#1F5E46]">
                    {resource.resourceType} ({resource.lendingType})
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-[#171717] leading-snug">
                  {resource.title}
                </h2>
                <p className="text-sm text-[#666666] leading-relaxed whitespace-pre-line">
                  {resource.description}
                </p>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                <span
                  className={`font-mono text-xs font-semibold px-2.5 py-1 rounded border ${
                    resource.availability === BorrowStatus.AVAILABLE
                      ? 'bg-[#EBF5F0] text-[#16794A] border-[#B8DFCA]'
                      : 'bg-[#FEF6E7] text-[#A16207] border-[#F3D299]'
                  }`}
                >
                  STATUS: {resource.availability}
                </span>
                {resource.moderationStatus !== ModerationStatus.APPROVED && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#FEF6E7] text-[#A16207] border border-[#F3D299]">
                    MODERATION: {resource.moderationStatus}
                  </span>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReportOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#666666] hover:text-[#B42318] border border-[#E4E4E0] rounded cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    Report
                  </button>
                  {user &&
                    (user.id === resource.ownerId || user.role === UserRole.ADMIN) && (
                      <button
                        type="button"
                        onClick={handleDeleteResource}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#B42318] hover:bg-[#FDF2F2] border border-[#F5C2C0] rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove listing
                      </button>
                    )}
                </div>
              </div>
            </div>

            {/* Structured Specification Table & Owner Public Profile */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-7 bg-[#F7F7F5] border border-[#E4E4E0] rounded p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-3">
                  Academic & Physical Specifications
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <dt className="text-[#666666]">Category</dt>
                    <dd className="font-semibold text-[#171717]">{resource.category}</dd>
                  </div>
                  <div>
                    <dt className="text-[#666666]">Department</dt>
                    <dd className="font-semibold text-[#171717]">{resource.department}</dd>
                  </div>
                  <div>
                    <dt className="text-[#666666]">Semester</dt>
                    <dd className="font-mono font-semibold text-[#171717]">
                      Semester {resource.semester}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#666666]">Academic Year</dt>
                    <dd className="font-mono text-[#171717]">{resource.academicYear}</dd>
                  </div>
                  <div>
                    <dt className="text-[#666666]">Condition</dt>
                    <dd className="font-mono font-semibold text-[#171717]">
                      {resource.condition}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#666666]">Uploaded Date</dt>
                    <dd className="font-mono text-[#171717]">
                      {formatDateShort(resource.createdAt)}
                    </dd>
                  </div>
                  {resource.location && (
                    <div className="col-span-2 pt-1 border-t border-[#E4E4E0]">
                      <dt className="text-[#666666] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#1F5E46]" />
                        Campus Pickup / Handover Location
                      </dt>
                      <dd className="font-semibold text-[#171717] mt-0.5">
                        {resource.location}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Owner Public Profile Card (No Email Exposed - Section 13 & 19) */}
              <div className="md:col-span-5 bg-white border border-[#E4E4E0] rounded p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
                      Listed By (Public Profile)
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#16794A] bg-[#EBF5F0] px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3 h-3" />
                      {resource.ownerVerificationStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-10 h-10 rounded bg-[#1F5E46] text-white font-mono text-sm font-semibold flex items-center justify-center shrink-0">
                      {resource.ownerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#171717]">
                        {resource.ownerName}
                      </p>
                      <p className="text-xs font-mono text-[#666666]">
                        ID: {resource.ownerStudentId} • Sem {resource.ownerSemester}
                      </p>
                      <p className="text-xs text-[#666666]">{resource.ownerDepartment}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleInspectOwnerProfile}
                  className="mt-4 w-full py-1.5 px-3 text-xs font-medium text-[#1F5E46] bg-[#F7F7F5] hover:bg-[#F0EFEA] border border-[#E4E4E0] rounded transition-colors cursor-pointer"
                >
                  View student public profile
                </button>
              </div>
            </div>

            {/* Photos if uploaded */}
            {resource.photos && resource.photos.length > 0 && (
              <div className="border border-[#E4E4E0] rounded p-4 bg-white">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-3">
                  Uploaded Item Photographs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {resource.photos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`${resource.title} photo ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-40 object-cover border border-[#E4E4E0] rounded bg-[#F7F7F5]"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Digital Resource Action Box OR Physical Borrow Request Box */}
            {resource.resourceType === ResourceType.DIGITAL ? (
              <div className="bg-[#F7F7F5] border border-[#E4E4E0] rounded p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-[#1F5E46] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-[#171717]">
                        {resource.fileName || `${resource.code}.pdf`}
                      </h3>
                      <p className="text-xs font-mono text-[#666666]">
                        Type: {resource.fileType || 'application/pdf'} • Size:{' '}
                        {formatBytes(resource.fileSize)} • Downloads:{' '}
                        {resource.downloadCount}
                      </p>
                      {resource.fileChecksum && (
                        <p className="text-[11px] font-mono text-[#666666] mt-0.5">
                          SHA-256: {resource.fileChecksum.slice(0, 32)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadDigital}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download digital resource
                  </button>
                </div>

                {resource.filePreviewText && (
                  <div className="bg-white border border-[#E4E4E0] rounded p-3">
                    <span className="text-[11px] font-mono uppercase text-[#666666] block mb-1">
                      Document Syllabus / Contents Preview
                    </span>
                    <pre className="text-xs font-mono text-[#171717] whitespace-pre-wrap leading-relaxed">
                      {resource.filePreviewText}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              /* Physical Resource Borrow Workflow Section (Sections 20 & 21) */
              <div className="bg-[#F7F7F5] border border-[#E4E4E0] rounded p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#1F5E46]" />
                    <span>
                      Physical Resource {resource.lendingType === 'GIVEAWAY' ? 'Transfer' : 'Borrowing'} Workflow
                    </span>
                  </h3>
                  <span className="font-mono text-[11px] text-[#666666]">
                    STATE MACHINE: AVAILABLE → REQUESTED → APPROVED → BORROWED → RETURNED
                  </span>
                </div>

                {/* Request Form if AVAILABLE and user is not the owner */}
                {resource.availability === BorrowStatus.AVAILABLE &&
                  user?.id !== resource.ownerId && (
                    <form
                      onSubmit={handleSubmitBorrowRequest}
                      className="bg-white border border-[#E4E4E0] rounded p-4 space-y-3"
                    >
                      <p className="text-xs font-semibold text-[#171717]">
                        Submit a {resource.lendingType === 'GIVEAWAY' ? 'Giveaway Claim' : 'Borrow Request'}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-[#171717] mb-1">
                            Requested Duration (Days)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={180}
                            value={durationDays}
                            onChange={(e) => setDurationDays(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs border border-[#E4E4E0] rounded font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#171717] mb-1">
                            Required Until Date
                          </label>
                          <input
                            type="date"
                            value={requiredUntil}
                            onChange={(e) => setRequiredUntil(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-[#E4E4E0] rounded font-mono"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#171717] mb-1">
                          Contextual Message for Owner (Pickup time / course purpose)
                        </label>
                        <textarea
                          rows={2}
                          maxLength={1000}
                          value={requestNote}
                          onChange={(e) => setRequestNote(e.target.value)}
                          placeholder="e.g. Is the calculator available until Friday? I can pick it up at the Central Library counter."
                          className="w-full px-3 py-2 text-xs border border-[#E4E4E0] rounded"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingBorrow}
                        className="px-4 py-2 text-xs font-semibold bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {submittingBorrow ? 'Submitting...' : 'Request resource'}
                      </button>
                    </form>
                  )}

                {/* Active / Historical Borrow Requests for Owner or Requester */}
                {borrowRequests.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-xs font-semibold text-[#171717] block">
                      Borrow Request Ledger ({borrowRequests.length})
                    </span>
                    {borrowRequests.map((br) => {
                      const isOwner = user?.id === br.ownerId;
                      const isRequester = user?.id === br.requesterId;
                      return (
                        <div
                          key={br.id}
                          className="bg-white border border-[#E4E4E0] rounded p-3.5 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs">
                              <span className="font-semibold text-[#171717]">
                                Requester: {br.requesterName}
                              </span>{' '}
                              <span className="font-mono text-[#666666]">
                                [{br.requesterStudentId}]
                              </span>
                              <span className="text-[#666666]">
                                {' '}
                                • Duration: {br.requestedDurationDays} days (until{' '}
                                {br.requiredUntil})
                              </span>
                            </div>
                            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#E4E4E0] text-[#171717]">
                              STATE: {br.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#666666]">{br.message}</p>

                          {/* State Machine Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {br.status === BorrowStatus.REQUESTED && isOwner && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStateTransition(br.id, BorrowStatus.APPROVED)
                                  }
                                  className="px-3 py-1 text-xs font-medium bg-[#16794A] text-white rounded cursor-pointer"
                                >
                                  Accept Request (→ APPROVED)
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStateTransition(br.id, BorrowStatus.REJECTED)
                                  }
                                  className="px-3 py-1 text-xs font-medium bg-[#B42318] text-white rounded cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {br.status === BorrowStatus.REQUESTED && isRequester && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStateTransition(br.id, BorrowStatus.CANCELLED)
                                }
                                className="px-3 py-1 text-xs font-medium border border-[#E4E4E0] text-[#B42318] rounded cursor-pointer"
                              >
                                Cancel Request
                              </button>
                            )}
                            {br.status === BorrowStatus.APPROVED &&
                              (isOwner || isRequester) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStateTransition(br.id, BorrowStatus.BORROWED)
                                    }
                                    className="px-3 py-1 text-xs font-medium bg-[#1F5E46] text-white rounded cursor-pointer"
                                  >
                                    Confirm Handover (→ BORROWED)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStateTransition(br.id, BorrowStatus.CANCELLED)
                                    }
                                    className="px-3 py-1 text-xs font-medium border border-[#E4E4E0] text-[#666666] rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            {br.status === BorrowStatus.BORROWED && isRequester && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStateTransition(
                                    br.id,
                                    BorrowStatus.RETURN_REQUESTED
                                  )
                                }
                                className="px-3 py-1 text-xs font-medium bg-[#1F5E46] text-white rounded cursor-pointer"
                              >
                                Mark Return Initiated (→ RETURN_REQUESTED)
                              </button>
                            )}
                            {br.status === BorrowStatus.BORROWED && isOwner && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStateTransition(br.id, BorrowStatus.OVERDUE)
                                }
                                className="px-3 py-1 text-xs font-medium bg-[#A16207] text-white rounded cursor-pointer"
                              >
                                Mark Overdue
                              </button>
                            )}
                            {(br.status === BorrowStatus.RETURN_REQUESTED ||
                              br.status === BorrowStatus.OVERDUE) &&
                              isOwner && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStateTransition(br.id, BorrowStatus.RETURNED)
                                  }
                                  className="px-3 py-1 text-xs font-medium bg-[#16794A] text-white rounded cursor-pointer"
                                >
                                  Confirm Item Returned (→ RETURNED / AVAILABLE)
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Contextual Messaging Thread (Section 30) */}
            <div className="border border-[#E4E4E0] rounded p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#1F5E46]" />
                  <span>Contextual Resource Discussion</span>
                </h3>
                <span className="text-[11px] text-[#666666]">
                  Attached to {resource.code}
                </span>
              </div>

              {messages.length === 0 ? (
                <p className="text-xs text-[#666666]">
                  No contextual messages exchanged on this resource yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 bg-[#F7F7F5] border border-[#E4E4E0] rounded text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#171717]">
                          {m.senderName}
                        </span>
                        <span className="font-mono text-[10px] text-[#666666]">
                          {formatDateShort(m.createdAt)}
                        </span>
                      </div>
                      <p className="text-[#171717]">{m.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {user && (
                <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={1000}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Ask a question about availability, syllabus edition, or campus pickup..."
                    className="flex-1 px-3 py-1.5 text-xs bg-[#F7F7F5] border border-[#E4E4E0] rounded focus:outline-none focus:bg-white focus:border-[#1F5E46]"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-[#1F5E46] text-white rounded cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </form>
              )}
            </div>

            {/* Completed Transaction Ratings (Section 31 - Only real completed transaction ratings) */}
            {(resource.ratings.length > 0 || eligibleForRating) && (
              <div className="border border-[#E4E4E0] rounded p-4 bg-white space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#1F5E46]" />
                  <span>
                    Verified Transaction Feedback ({resource.ratings.length})
                  </span>
                </h3>
                {resource.ratings.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-[#F7F7F5] border border-[#E4E4E0] rounded text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#171717]">
                        {r.reviewerName} (Verified Borrower)
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#1F5E46]">
                        Rating: {r.score}/5
                      </span>
                    </div>
                    <p className="text-[#666666]">{r.comment}</p>
                  </div>
                ))}

                {eligibleForRating && (
                  <form
                    onSubmit={handleSubmitRating}
                    className="p-3 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-2"
                  >
                    <p className="text-xs font-semibold text-[#171717]">
                      Rate your completed borrow transaction
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-[#666666]">Score (1 to 5):</label>
                      <select
                        value={ratingScore}
                        onChange={(e) => setRatingScore(Number(e.target.value))}
                        className="px-2 py-1 text-xs bg-white border border-[#E4E4E0] rounded font-mono"
                      >
                        {[5, 4, 3, 2, 1].map((s) => (
                          <option key={s} value={s}>
                            {s} / 5
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      maxLength={400}
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Optional note on item condition and handover..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                    />
                    <button
                      type="submit"
                      disabled={submittingRating}
                      className="px-3 py-1.5 text-xs font-medium bg-[#1F5E46] text-white rounded cursor-pointer"
                    >
                      Submit transaction rating
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Report Content Drawer */}
            {reportOpen && (
              <form
                onSubmit={handleSubmitReport}
                className="border border-[#F5C2C0] bg-[#FDF2F2] rounded p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#B42318]">
                    Report Resource to Campus Moderation
                  </span>
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="text-xs text-[#666666]"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Reason
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as ReportReason)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                  >
                    <option value={ReportReason.INAPPROPRIATE_CONTENT}>
                      Inappropriate Content
                    </option>
                    <option value={ReportReason.COPYRIGHTED_MATERIAL}>
                      Copyrighted Material
                    </option>
                    <option value={ReportReason.SPAM}>Spam</option>
                    <option value={ReportReason.MISLEADING_INFORMATION}>
                      Misleading Information
                    </option>
                    <option value={ReportReason.OFFENSIVE_CONTENT}>
                      Offensive Content
                    </option>
                    <option value={ReportReason.UNSAFE_ITEM}>Unsafe Item</option>
                    <option value={ReportReason.SUSPICIOUS_USER}>Suspicious User</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#171717] mb-1">
                    Details
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide specific details for the campus moderator..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-[#B42318] text-white rounded cursor-pointer"
                >
                  Submit Report
                </button>
              </form>
            )}

            {/* Public Profile Inspection Modal */}
            {showOwnerModal && ownerProfile && (
              <div className="border border-[#E4E4E0] bg-[#F7F7F5] rounded p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-[#171717]">
                    Verified Campus Member Record
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOwnerModal(false)}
                    className="text-xs text-[#1F5E46] underline"
                  >
                    Close profile
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[#666666] block">Name</span>
                    <strong className="text-[#171717]">{ownerProfile.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-[#666666] block">Student ID</span>
                    <strong className="font-mono text-[#171717]">
                      {ownerProfile.studentId}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#666666] block">Graduation Year</span>
                    <strong className="font-mono text-[#171717]">
                      {ownerProfile.graduationYear}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#666666] block">Joined</span>
                    <strong className="font-mono text-[#171717]">
                      {formatDateShort(ownerProfile.joinedAt)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#666666] block">Resources Listed</span>
                    <strong className="font-mono text-[#171717]">
                      {ownerProfile.resourcesListedCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#666666] block">Resources Shared</span>
                    <strong className="font-mono text-[#171717]">
                      {ownerProfile.resourcesSharedCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#666666] block">Resources Borrowed</span>
                    <strong className="font-mono text-[#171717]">
                      {ownerProfile.resourcesBorrowedCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#666666] block">Verification</span>
                    <strong className="font-mono text-[#16794A]">
                      {ownerProfile.verificationStatus}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
