import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Package,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  AuthenticatedUser,
  BorrowRequest,
  BorrowStatus,
  ModerationStatus,
  Resource,
  ResourceNeedRequest,
} from '../types';
import { apiRequest, formatDateShort } from '../api';
import { syncBorrowRequestToFirestore } from '../firebase';

interface ActivityProfileViewProps {
  user: AuthenticatedUser;
  onSelectResource: (resource: Resource) => void;
  onSelectResourceById: (resourceId: string) => void;
  onOpenListModal: () => void;
  onGlobalRefresh: () => void;
}

export const ActivityProfileView: React.FC<ActivityProfileViewProps> = ({
  user,
  onSelectResource,
  onSelectResourceById,
  onOpenListModal,
  onGlobalRefresh,
}) => {
  const [myResources, setMyResources] = useState<Resource[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<BorrowRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<BorrowRequest[]>([]);
  const [myNeedRequests, setMyNeedRequests] = useState<ResourceNeedRequest[]>([]);
  const [activeTab, setActiveTab] = useState<
    'incoming' | 'outgoing' | 'resources' | 'needs'
  >('incoming');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const loadActivity = async () => {
    try {
      setLoading(true);
      const [resList, reqList] = await Promise.all([
        apiRequest<{ resources: Resource[] }>('/api/my/resources'),
        apiRequest<{
          incomingBorrowRequests: BorrowRequest[];
          outgoingBorrowRequests: BorrowRequest[];
          myNeedRequests: ResourceNeedRequest[];
        }>('/api/my/requests'),
      ]);
      setMyResources(resList.data.resources);
      setIncomingRequests(reqList.data.incomingBorrowRequests);
      setOutgoingRequests(reqList.data.outgoingBorrowRequests);
      setMyNeedRequests(reqList.data.myNeedRequests);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to load activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const handleTransition = async (reqId: string, nextStatus: BorrowStatus) => {
    try {
      setFeedback('');
      const res = await apiRequest<{ borrowRequest: BorrowRequest }>(
        `/api/borrow-requests/${reqId}/transition`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      await syncBorrowRequestToFirestore(res.data.borrowRequest);
      setFeedback(`Updated request status to ${res.data.borrowRequest.status}.`);
      await loadActivity();
      onGlobalRefresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Transition failed.');
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await apiRequest(`/api/resources/${id}`, { method: 'DELETE' });
      await loadActivity();
      onGlobalRefresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Could not delete resource.');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* User Profile Card (Section 13) */}
      <div className="bg-white border border-[#E4E4E0] rounded-md p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E4E4E0]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded bg-[#1F5E46] text-white font-mono text-lg font-semibold flex items-center justify-center shrink-0">
              {user.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-[#171717]">{user.fullName}</h1>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#EBF5F0] text-[#16794A] border border-[#B8DFCA]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user.verificationStatus}
                </span>
              </div>
              <p className="text-xs font-mono text-[#666666] mt-0.5">
                Student ID: {user.studentId} • Role: {user.role} • Joined{' '}
                {formatDateShort(user.joinedAt)}
              </p>
              <p className="text-xs text-[#666666] mt-0.5">
                {user.department} • Semester {user.semester} • Class of{' '}
                {user.graduationYear}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenListModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1F5E46] hover:bg-[#174936] text-white rounded cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            List a resource
          </button>
        </div>

        {/* Profile Activity Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="p-3 bg-[#F7F7F5] border border-[#E4E4E0] rounded">
            <span className="text-xs text-[#666666] block">Resources Listed</span>
            <strong className="text-lg font-mono font-semibold text-[#171717]">
              {myResources.length}
            </strong>
          </div>
          <div className="p-3 bg-[#F7F7F5] border border-[#E4E4E0] rounded">
            <span className="text-xs text-[#666666] block">Incoming Borrow Requests</span>
            <strong className="text-lg font-mono font-semibold text-[#171717]">
              {incomingRequests.length}
            </strong>
          </div>
          <div className="p-3 bg-[#F7F7F5] border border-[#E4E4E0] rounded">
            <span className="text-xs text-[#666666] block">Active / Past Borrowings</span>
            <strong className="text-lg font-mono font-semibold text-[#171717]">
              {outgoingRequests.length}
            </strong>
          </div>
          <div className="p-3 bg-[#F7F7F5] border border-[#E4E4E0] rounded">
            <span className="text-xs text-[#666666] block">My &ldquo;I Need&rdquo; Posts</span>
            <strong className="text-lg font-mono font-semibold text-[#171717]">
              {myNeedRequests.length}
            </strong>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-[#EBF5F0] border border-[#B8DFCA] rounded text-xs text-[#16794A] flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            className="text-[11px] underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border border-[#E4E4E0] rounded-md overflow-hidden">
        <div className="border-b border-[#E4E4E0] px-4 flex flex-wrap gap-2 bg-[#F7F7F5]">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'incoming'
                ? 'border-[#1F5E46] text-[#171717]'
                : 'border-transparent text-[#666666]'
            }`}
          >
            Incoming Requests on My Resources ({incomingRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'outgoing'
                ? 'border-[#1F5E46] text-[#171717]'
                : 'border-transparent text-[#666666]'
            }`}
          >
            My Outgoing Borrowings ({outgoingRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'resources'
                ? 'border-[#1F5E46] text-[#171717]'
                : 'border-transparent text-[#666666]'
            }`}
          >
            My Listed Resources ({myResources.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('needs')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'needs'
                ? 'border-[#1F5E46] text-[#171717]'
                : 'border-transparent text-[#666666]'
            }`}
          >
            My &ldquo;I Need&rdquo; Requests ({myNeedRequests.length})
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <p className="text-xs text-[#666666]">Loading your campus records...</p>
          ) : activeTab === 'incoming' ? (
            incomingRequests.length === 0 ? (
              <p className="text-xs text-[#666666] py-6 text-center">
                No incoming borrowing requests on your resources yet.
              </p>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((br) => (
                  <div
                    key={br.id}
                    className="p-4 border border-[#E4E4E0] rounded bg-[#F7F7F5] space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-semibold text-[#1F5E46]">
                          {br.resourceCode}
                        </span>{' '}
                        <strong className="text-sm text-[#171717]">
                          {br.resourceTitle}
                        </strong>
                      </div>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white border border-[#E4E4E0] rounded">
                        STATUS: {br.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#666666]">
                      Requested by{' '}
                      <strong className="text-[#171717]">{br.requesterName}</strong> [
                      {br.requesterStudentId}] ({br.requesterDepartment}) for{' '}
                      <strong className="font-mono">{br.requestedDurationDays} days</strong>{' '}
                      (until {br.requiredUntil})
                    </p>
                    <p className="text-xs text-[#171717] bg-white p-2.5 border border-[#E4E4E0] rounded">
                      &ldquo;{br.message}&rdquo;
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {br.status === BorrowStatus.REQUESTED && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTransition(br.id, BorrowStatus.APPROVED)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#16794A] text-white rounded cursor-pointer"
                          >
                            Accept Request
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTransition(br.id, BorrowStatus.REJECTED)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#B42318] text-white rounded cursor-pointer"
                          >
                            Reject Request
                          </button>
                        </>
                      )}
                      {br.status === BorrowStatus.APPROVED && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTransition(br.id, BorrowStatus.BORROWED)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#1F5E46] text-white rounded cursor-pointer"
                          >
                            Confirm Item Handed Over (→ BORROWED)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTransition(br.id, BorrowStatus.CANCELLED)}
                            className="px-3 py-1.5 text-xs border border-[#E4E4E0] bg-white text-[#B42318] rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {(br.status === BorrowStatus.RETURN_REQUESTED ||
                        br.status === BorrowStatus.OVERDUE) && (
                        <button
                          type="button"
                          onClick={() => handleTransition(br.id, BorrowStatus.RETURNED)}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#16794A] text-white rounded cursor-pointer"
                        >
                          Confirm Return Receipt (Reset to AVAILABLE)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectResourceById(br.resourceId)}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E4E4E0] rounded text-[#171717] cursor-pointer"
                      >
                        Open Resource & Messages
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'outgoing' ? (
            outgoingRequests.length === 0 ? (
              <p className="text-xs text-[#666666] py-6 text-center">
                You have not requested or borrowed any physical resources yet.
              </p>
            ) : (
              <div className="space-y-3">
                {outgoingRequests.map((br) => (
                  <div
                    key={br.id}
                    className="p-4 border border-[#E4E4E0] rounded bg-[#F7F7F5] space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-semibold text-[#1F5E46]">
                          {br.resourceCode}
                        </span>{' '}
                        <strong className="text-sm text-[#171717]">
                          {br.resourceTitle}
                        </strong>
                      </div>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white border border-[#E4E4E0] rounded">
                        STATUS: {br.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#666666]">
                      Owner: <strong className="text-[#171717]">{br.ownerName}</strong> •
                      Duration: {br.requestedDurationDays} days • Due: {br.requiredUntil}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {br.status === BorrowStatus.REQUESTED && (
                        <button
                          type="button"
                          onClick={() => handleTransition(br.id, BorrowStatus.CANCELLED)}
                          className="px-3 py-1.5 text-xs font-medium bg-white border border-[#F5C2C0] text-[#B42318] rounded cursor-pointer"
                        >
                          Cancel Request
                        </button>
                      )}
                      {br.status === BorrowStatus.BORROWED && (
                        <button
                          type="button"
                          onClick={() =>
                            handleTransition(br.id, BorrowStatus.RETURN_REQUESTED)
                          }
                          className="px-3 py-1.5 text-xs font-semibold bg-[#1F5E46] text-white rounded cursor-pointer"
                        >
                          Initiate Return Request
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectResourceById(br.resourceId)}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E4E4E0] rounded text-[#171717] cursor-pointer"
                      >
                        Inspect Resource / Rate Transaction
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'resources' ? (
            myResources.length === 0 ? (
              <p className="text-xs text-[#666666] py-6 text-center">
                You have not listed any resources yet.
              </p>
            ) : (
              <div className="space-y-3">
                {myResources.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 border border-[#E4E4E0] rounded bg-[#F7F7F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-[#666666]">{r.code}</span>
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-[#E4E4E0]">
                          {r.availability}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
                            r.moderationStatus === ModerationStatus.APPROVED
                              ? 'bg-[#EBF5F0] text-[#16794A]'
                              : 'bg-[#FEF6E7] text-[#A16207]'
                          }`}
                        >
                          MODERATION: {r.moderationStatus}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#171717]">{r.title}</p>
                      <p className="text-xs text-[#666666]">
                        {r.category} • {r.courseCode} ({r.subject}) • Sem {r.semester}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectResource(r)}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E4E4E0] rounded text-[#171717] cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteResource(r.id)}
                        className="p-1.5 text-[#B42318] bg-white border border-[#F5C2C0] rounded cursor-pointer"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : myNeedRequests.length === 0 ? (
            <p className="text-xs text-[#666666] py-6 text-center">
              You have not posted any &ldquo;I Need&rdquo; requests yet.
            </p>
          ) : (
            <div className="space-y-3">
              {myNeedRequests.map((n) => (
                <div
                  key={n.id}
                  className="p-4 border border-[#E4E4E0] rounded bg-[#F7F7F5] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#1F5E46]">{n.code}</span>
                    <span className="font-mono text-xs font-semibold">{n.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#171717]">{n.title}</p>
                  <p className="text-xs text-[#666666]">
                    Responses received: {n.responses.length} • Required until:{' '}
                    {n.requiredUntil}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
