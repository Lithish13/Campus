import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Flag,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import {
  AuditLogEntry,
  BorrowRequest,
  ContentReport,
  ModerationStatus,
  ReportStatus,
  Resource,
  TaxonomyData,
  UserPublicProfile,
  VerificationStatus,
} from '../types';
import { apiRequest, formatBytes, formatDateShort } from '../api';

interface AdminDashboardViewProps {
  taxonomy: TaxonomyData;
  onSelectResource: (resource: Resource) => void;
  onGlobalRefresh: () => void;
}

interface AdminMetrics {
  totalUsers: number;
  verifiedUsers: number;
  pendingUsers: number;
  totalApprovedResources: number;
  pendingModerationCount: number;
  activeBorrowingsCount: number;
  openReportsCount: number;
  openNeedRequestsCount: number;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  taxonomy,
  onSelectResource,
  onGlobalRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'pending'
    | 'resources'
    | 'users'
    | 'reports'
    | 'requests'
    | 'taxonomy'
    | 'audit'
  >('overview');

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<(UserPublicProfile & { email: string })[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [pendingResources, setPendingResources] = useState<Resource[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Taxonomy Add Forms
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubDept, setNewSubDept] = useState(
    taxonomy.departments[0]?.name || 'Computer Science and Engineering'
  );
  const [newSubSem, setNewSubSem] = useState(1);

  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await apiRequest<{
        metrics: AdminMetrics;
        users: (UserPublicProfile & { email: string })[];
        allResources: Resource[];
        pendingResources: Resource[];
        reports: ContentReport[];
        borrowRequests: BorrowRequest[];
        auditLogs: AuditLogEntry[];
      }>('/api/admin/overview');

      setMetrics(res.data.metrics);
      setUsers(res.data.users);
      setAllResources(res.data.allResources);
      setPendingResources(res.data.pendingResources);
      setReports(res.data.reports);
      setBorrowRequests(res.data.borrowRequests);
      setAuditLogs(res.data.auditLogs);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load admin console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleModerateResource = async (
    id: string,
    action: 'approve' | 'reject' | 'flag'
  ) => {
    try {
      setErrorMsg('');
      if (action === 'approve') {
        await apiRequest(`/api/admin/resources/${id}/approve`, {
          method: 'PATCH',
          body: JSON.stringify({ note: 'Verified and approved by campus moderator.' }),
        });
        setStatusMsg('Resource approved and published to catalog.');
      } else {
        await apiRequest(`/api/admin/resources/${id}/reject`, {
          method: 'PATCH',
          body: JSON.stringify({
            flag: action === 'flag',
            note:
              action === 'flag'
                ? 'Flagged for secondary syllabus and copyright verification.'
                : 'Rejected during moderation review.',
          }),
        });
        setStatusMsg(`Resource marked as ${action === 'flag' ? 'FLAGGED' : 'REJECTED'}.`);
      }
      await fetchAdminData();
      onGlobalRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Moderation action failed.');
    }
  };

  const handleUserStatus = async (userId: string, status: VerificationStatus) => {
    try {
      setErrorMsg('');
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ verificationStatus: status }),
      });
      setStatusMsg(`User verification status updated to ${status}.`);
      await fetchAdminData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not update user status.');
    }
  };

  const handleResolveReport = async (
    reportId: string,
    status: ReportStatus,
    removeResource = false
  ) => {
    try {
      setErrorMsg('');
      await apiRequest(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          resolutionNote: removeResource
            ? 'Resolved by moderator and removed reported resource.'
            : `Report marked ${status} following review.`,
          removeTargetResource: removeResource,
        }),
      });
      setStatusMsg(`Report updated to ${status}.`);
      await fetchAdminData();
      onGlobalRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not update report.');
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/taxonomy/subjects', {
        method: 'POST',
        body: JSON.stringify({
          courseCode: newSubCode,
          name: newSubName,
          department: newSubDept,
          semester: newSubSem,
        }),
      });
      setNewSubCode('');
      setNewSubName('');
      setStatusMsg('Subject added to university taxonomy.');
      onGlobalRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not add subject.');
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/taxonomy/departments', {
        method: 'POST',
        body: JSON.stringify({
          code: newDeptCode,
          name: newDeptName,
        }),
      });
      setNewDeptCode('');
      setNewDeptName('');
      setStatusMsg('Department added to university taxonomy.');
      onGlobalRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not add department.');
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/taxonomy/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: newDomain }),
      });
      setNewDomain('');
      setStatusMsg('Allowed college email domain added.');
      onGlobalRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not add domain.');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E4E4E0] rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[#1F5E46] mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>RBAC PROTECTED ADMINISTRATION CONSOLE</span>
          </div>
          <h1 className="text-xl font-semibold text-[#171717]">
            Campus Moderation & Governance
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            All metrics below are computed directly from live database queries. Every administrative action is recorded in the immutable audit log.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAdminData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#F7F7F5] hover:bg-[#F0EFEA] border border-[#E4E4E0] rounded text-[#171717] cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh live data
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C0] rounded text-xs text-[#B42318]">
          {errorMsg}
        </div>
      )}
      {statusMsg && (
        <div className="p-3 bg-[#EBF5F0] border border-[#B8DFCA] rounded text-xs text-[#16794A] flex items-center justify-between">
          <span>{statusMsg}</span>
          <button
            type="button"
            onClick={() => setStatusMsg('')}
            className="text-[11px] underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Real Database-Derived Metrics Strip (Section 27) */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-[#E4E4E0] rounded p-4">
            <span className="text-xs text-[#666666] block">Total Registered Users</span>
            <strong className="text-xl font-mono font-semibold text-[#171717] mt-1 block">
              {metrics.totalUsers}
            </strong>
            <span className="text-[11px] font-mono text-[#16794A]">
              {metrics.verifiedUsers} verified • {metrics.pendingUsers} pending
            </span>
          </div>

          <div className="bg-white border border-[#E4E4E0] rounded p-4">
            <span className="text-xs text-[#666666] block">Total Approved Resources</span>
            <strong className="text-xl font-mono font-semibold text-[#171717] mt-1 block">
              {metrics.totalApprovedResources}
            </strong>
            <span className="text-[11px] font-mono text-[#666666]">
              {metrics.activeBorrowingsCount} active borrowings
            </span>
          </div>

          <div className="bg-white border border-[#E4E4E0] rounded p-4">
            <span className="text-xs text-[#666666] block">Pending Moderation</span>
            <strong className="text-xl font-mono font-semibold text-[#A16207] mt-1 block">
              {metrics.pendingModerationCount}
            </strong>
            <span className="text-[11px] font-mono text-[#666666]">
              Awaiting review
            </span>
          </div>

          <div className="bg-white border border-[#E4E4E0] rounded p-4">
            <span className="text-xs text-[#666666] block">Open Reports</span>
            <strong className="text-xl font-mono font-semibold text-[#B42318] mt-1 block">
              {metrics.openReportsCount}
            </strong>
            <span className="text-[11px] font-mono text-[#666666]">
              {metrics.openNeedRequestsCount} open student requests
            </span>
          </div>
        </div>
      )}

      {/* Admin Sub-Navigation Tabs */}
      <div className="bg-white border border-[#E4E4E0] rounded-md overflow-hidden">
        <div className="border-b border-[#E4E4E0] px-4 flex flex-wrap gap-1 bg-[#F7F7F5]">
          {[
            { id: 'overview', label: 'Overview & Health' },
            { id: 'pending', label: `Pending Resources (${pendingResources.length})` },
            { id: 'resources', label: `All Resources (${allResources.length})` },
            { id: 'users', label: `Users (${users.length})` },
            { id: 'reports', label: `Reports (${reports.length})` },
            { id: 'requests', label: `Borrow Ledger (${borrowRequests.length})` },
            { id: 'taxonomy', label: 'Categories, Subjects & Domains' },
            { id: 'audit', label: `Audit Logs (${auditLogs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#1F5E46] text-[#171717]'
                  : 'border-transparent text-[#666666] hover:text-[#171717]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading ? (
            <p className="text-xs text-[#666666]">Querying database records...</p>
          ) : activeTab === 'overview' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-3">
                  Pending Moderation Queue ({pendingResources.length})
                </h3>
                {pendingResources.length === 0 ? (
                  <p className="text-xs text-[#666666] p-4 bg-[#F7F7F5] border border-[#E4E4E0] rounded">
                    All uploaded digital and physical resources have been reviewed.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {pendingResources.map((res) => (
                      <div
                        key={res.id}
                        className="p-3.5 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-[#1F5E46]">
                            {res.code} • {res.courseCode}
                          </span>
                          <span className="font-mono text-[10px] px-2 py-0.5 bg-[#FEF6E7] text-[#A16207] border border-[#F3D299] rounded">
                            {res.moderationStatus}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#171717]">{res.title}</p>
                        <p className="text-[11px] text-[#666666]">
                          Uploaded by {res.ownerName} [{res.ownerStudentId}] •{' '}
                          {res.fileName || res.resourceType} ({formatBytes(res.fileSize)})
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleModerateResource(res.id, 'approve')}
                            className="px-2.5 py-1 text-xs font-medium bg-[#16794A] text-white rounded cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModerateResource(res.id, 'reject')}
                            className="px-2.5 py-1 text-xs font-medium bg-[#B42318] text-white rounded cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectResource(res)}
                            className="px-2.5 py-1 text-xs bg-white border border-[#E4E4E0] rounded text-[#171717] cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#171717] mb-3">
                  Recent Security & Moderation Audit Trail
                </h3>
                <div className="space-y-2">
                  {auditLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-[#F7F7F5] border border-[#E4E4E0] rounded text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-semibold text-[#1F5E46]">
                          {log.action}
                        </span>
                        <span className="font-mono text-[10px] text-[#666666]">
                          {formatDateShort(log.createdAt)} • IP {log.ipAddress}
                        </span>
                      </div>
                      <p className="text-[#171717]">{log.details}</p>
                      <p className="text-[11px] text-[#666666] mt-0.5">
                        Actor: {log.actorName} ({log.actorRole}) → Target: {log.targetType}{' '}
                        [{log.targetId}]
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'pending' ? (
            <div className="space-y-3">
              {pendingResources.length === 0 ? (
                <p className="text-xs text-[#666666] py-6 text-center">
                  No resources currently awaiting moderation.
                </p>
              ) : (
                pendingResources.map((res) => (
                  <div
                    key={res.id}
                    className="p-4 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs text-[#1F5E46] font-semibold">
                          {res.code}
                        </span>{' '}
                        <strong className="text-sm text-[#171717]">{res.title}</strong>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 bg-[#FEF6E7] text-[#A16207] border border-[#F3D299] rounded">
                        {res.moderationStatus}
                      </span>
                    </div>
                    <p className="text-xs text-[#666666]">{res.description}</p>
                    {res.fileName && (
                      <p className="text-xs font-mono text-[#171717]">
                        File: {res.fileName} ({formatBytes(res.fileSize)}) • SHA-256:{' '}
                        {res.fileChecksum?.slice(0, 24)}...
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleModerateResource(res.id, 'approve')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#16794A] text-white rounded cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Resource
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerateResource(res.id, 'flag')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#A16207] text-white rounded cursor-pointer"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Flag for Review
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerateResource(res.id, 'reject')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#B42318] text-white rounded cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectResource(res)}
                        className="px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded text-[#171717] cursor-pointer"
                      >
                        Inspect Full Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'resources' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#E4E4E0] bg-[#F7F7F5] text-[11px] font-mono uppercase text-[#666666]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Title & Owner</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Availability</th>
                    <th className="py-2.5 px-3">Moderation</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E0] text-xs">
                  {allResources.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F7F7F5]">
                      <td className="py-2.5 px-3 font-mono">{r.code}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#171717]">{r.title}</div>
                        <div className="text-[11px] text-[#666666]">
                          Owner: {r.ownerName} [{r.ownerStudentId}] • {r.department}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{r.resourceType}</td>
                      <td className="py-2.5 px-3 font-mono">{r.availability}</td>
                      <td className="py-2.5 px-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.moderationStatus === ModerationStatus.APPROVED
                              ? 'bg-[#EBF5F0] text-[#16794A]'
                              : r.moderationStatus === ModerationStatus.PENDING_REVIEW
                              ? 'bg-[#FEF6E7] text-[#A16207]'
                              : 'bg-[#FDF2F2] text-[#B42318]'
                          }`}
                        >
                          {r.moderationStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                        {r.moderationStatus !== ModerationStatus.APPROVED && (
                          <button
                            type="button"
                            onClick={() => handleModerateResource(r.id, 'approve')}
                            className="text-xs font-medium text-[#16794A] hover:underline cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {r.moderationStatus !== ModerationStatus.REJECTED && (
                          <button
                            type="button"
                            onClick={() => handleModerateResource(r.id, 'reject')}
                            className="text-xs font-medium text-[#B42318] hover:underline cursor-pointer"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectResource(r)}
                          className="text-xs font-medium text-[#1F5E46] hover:underline cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#E4E4E0] bg-[#F7F7F5] text-[11px] font-mono uppercase text-[#666666]">
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Name & Institutional Email</th>
                    <th className="py-2.5 px-3">Department / Sem</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E0] text-xs">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F7F7F5]">
                      <td className="py-2.5 px-3 font-mono">{u.studentId}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#171717]">{u.fullName}</div>
                        <div className="font-mono text-[11px] text-[#666666]">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div>{u.department}</div>
                        <div className="font-mono text-[11px] text-[#666666]">
                          Sem {u.semester} • Class of {u.graduationYear}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{u.role}</td>
                      <td className="py-2.5 px-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.verificationStatus === VerificationStatus.VERIFIED
                              ? 'bg-[#EBF5F0] text-[#16794A]'
                              : u.verificationStatus === VerificationStatus.PENDING
                              ? 'bg-[#FEF6E7] text-[#A16207]'
                              : 'bg-[#FDF2F2] text-[#B42318]'
                          }`}
                        >
                          {u.verificationStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                        {u.verificationStatus !== VerificationStatus.VERIFIED && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUserStatus(u.id, VerificationStatus.VERIFIED)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#16794A] text-white rounded cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3" />
                            Verify
                          </button>
                        )}
                        {u.role !== 'ADMIN' &&
                          u.verificationStatus !== VerificationStatus.SUSPENDED && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUserStatus(u.id, VerificationStatus.SUSPENDED)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#B42318] text-white rounded cursor-pointer"
                            >
                              <UserX className="w-3 h-3" />
                              Suspend
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'reports' ? (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-xs text-[#666666] py-6 text-center">
                  No reports filed.
                </p>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-semibold text-[#B42318]">
                          [{rep.reason}]
                        </span>{' '}
                        <strong className="text-xs text-[#171717]">
                          Target: {rep.targetTitle}
                        </strong>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 bg-white border border-[#E4E4E0] rounded">
                        STATE: {rep.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#171717]">{rep.details}</p>
                    <p className="text-[11px] text-[#666666]">
                      Reported by {rep.reporterName} on {formatDateShort(rep.createdAt)}
                    </p>
                    {rep.resolutionNote && (
                      <p className="text-xs text-[#16794A] font-medium">
                        Resolution: {rep.resolutionNote} (by {rep.resolvedByName})
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleResolveReport(rep.id, ReportStatus.UNDER_REVIEW, false)
                        }
                        className="px-2.5 py-1 text-xs bg-white border border-[#E4E4E0] rounded cursor-pointer"
                      >
                        Mark Under Review
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleResolveReport(rep.id, ReportStatus.RESOLVED, false)
                        }
                        className="px-2.5 py-1 text-xs bg-[#16794A] text-white rounded cursor-pointer"
                      >
                        Resolve (Keep Resource)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleResolveReport(rep.id, ReportStatus.RESOLVED, true)
                        }
                        className="px-2.5 py-1 text-xs bg-[#B42318] text-white rounded cursor-pointer"
                      >
                        Resolve & Remove Resource
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleResolveReport(rep.id, ReportStatus.DISMISSED, false)
                        }
                        className="px-2.5 py-1 text-xs text-[#666666] border border-[#E4E4E0] bg-white rounded cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'requests' ? (
            <div className="space-y-2.5">
              {borrowRequests.map((br) => (
                <div
                  key={br.id}
                  className="p-3.5 bg-[#F7F7F5] border border-[#E4E4E0] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold text-[#1F5E46]">
                      {br.resourceCode}
                    </span>{' '}
                    <strong className="text-[#171717]">{br.resourceTitle}</strong>
                    <div className="text-[#666666] mt-0.5">
                      Borrower: {br.requesterName} [{br.requesterStudentId}] → Owner:{' '}
                      {br.ownerName} • Due: {br.requiredUntil}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white border border-[#E4E4E0] rounded self-start sm:self-auto">
                    {br.status}
                  </span>
                </div>
              ))}
            </div>
          ) : activeTab === 'taxonomy' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Subject */}
              <form
                onSubmit={handleAddSubject}
                className="p-4 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-3"
              >
                <h3 className="text-xs font-semibold uppercase text-[#171717]">
                  Manage Subjects ({taxonomy.subjects.length})
                </h3>
                <input
                  type="text"
                  required
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  placeholder="Course Code (e.g. CS402)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded font-mono"
                />
                <input
                  type="text"
                  required
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="Subject Title (e.g. Compiler Design)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                />
                <select
                  value={newSubDept}
                  onChange={(e) => setNewSubDept(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                >
                  {taxonomy.departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full py-1.5 text-xs font-semibold bg-[#1F5E46] text-white rounded cursor-pointer"
                >
                  Add Subject
                </button>
              </form>

              {/* Add Department */}
              <form
                onSubmit={handleAddDepartment}
                className="p-4 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-3"
              >
                <h3 className="text-xs font-semibold uppercase text-[#171717]">
                  Manage Departments ({taxonomy.departments.length})
                </h3>
                <input
                  type="text"
                  required
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  placeholder="Dept Code (e.g. BIO)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded font-mono"
                />
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Department Name (e.g. Biotechnology)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 text-xs font-semibold bg-[#1F5E46] text-white rounded cursor-pointer"
                >
                  Add Department
                </button>
              </form>

              {/* Allowed College Email Domains */}
              <form
                onSubmit={handleAddDomain}
                className="p-4 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-3"
              >
                <h3 className="text-xs font-semibold uppercase text-[#171717]">
                  Allowed College Email Domains
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {taxonomy.allowedDomains.map((dom) => (
                    <span
                      key={dom}
                      className="font-mono text-[11px] px-2 py-0.5 bg-white border border-[#E4E4E0] rounded"
                    >
                      @{dom}
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="Add domain (e.g. engineering.edu)"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded font-mono"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 text-xs font-semibold bg-[#1F5E46] text-white rounded cursor-pointer"
                >
                  Add Allowed Domain
                </button>
              </form>
            </div>
          ) : (
            /* Audit Logs Tab (Section 49) */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#E4E4E0] bg-[#F7F7F5] text-[11px] font-mono uppercase text-[#666666]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">IP</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E0] text-xs">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F7F7F5]">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#666666] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-GB')}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#1F5E46] whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {log.actorName}{' '}
                        <span className="font-mono text-[10px] text-[#666666]">
                          ({log.actorRole})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                        {log.targetType}:{log.targetId}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#666666] whitespace-nowrap">
                        {log.ipAddress}
                      </td>
                      <td className="py-2.5 px-3 text-[#171717]">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
