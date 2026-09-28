import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  MessageSquarePlus,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import {
  AuthenticatedUser,
  Resource,
  ResourceNeedRequest,
  ResourceType,
  TaxonomyData,
} from '../types';
import { apiRequest, formatDateShort } from '../api';
import { syncNeedRequestToFirestore } from '../firebase';

interface RequestsBoardViewProps {
  requests: ResourceNeedRequest[];
  myResources: Resource[];
  taxonomy: TaxonomyData;
  user: AuthenticatedUser | null;
  onOpenAuth: () => void;
  onRefresh: () => void;
  onSelectResourceById: (resourceId: string) => void;
}

export const RequestsBoardView: React.FC<RequestsBoardViewProps> = ({
  requests,
  myResources,
  taxonomy,
  user,
  onOpenAuth,
  onRefresh,
  onSelectResourceById,
}) => {
  const [searchQ, setSearchQ] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [respondingToId, setRespondingToId] = useState<string | null>(null);

  // Create Need Request Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(taxonomy.categories[0]?.name || 'Calculators');
  const [subject, setSubject] = useState(taxonomy.subjects[0]?.name || '');
  const [department, setDepartment] = useState(
    user?.department || taxonomy.departments[0]?.name || ''
  );
  const [semester, setSemester] = useState<number>(user?.semester || 3);
  const [resourceType, setResourceType] = useState<ResourceType>(ResourceType.PHYSICAL);
  const [preference, setPreference] = useState<'BORROW' | 'GIVEAWAY' | 'DIGITAL_COPY'>(
    'BORROW'
  );
  const [requiredUntil, setRequiredUntil] = useState('2026-10-15');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Respond Form
  const [responseMessage, setResponseMessage] = useState('');
  const [offeredResourceId, setOfferedResourceId] = useState('');

  const filteredRequests = requests.filter((req) => {
    if (deptFilter && req.department !== deptFilter) return false;
    if (searchQ.trim()) {
      const hay = `${req.title} ${req.description} ${req.subject} ${req.category} ${req.department}`.toLowerCase();
      if (!hay.includes(searchQ.trim().toLowerCase())) return false;
    }
    return true;
  });

  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setFormError('');
    try {
      setSubmitting(true);
      const res = await apiRequest<{ resourceRequest: ResourceNeedRequest }>(
        '/api/resource-requests',
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            description,
            category,
            subject,
            department,
            semester,
            resourceType,
            preference,
            requiredUntil,
          }),
        }
      );
      await syncNeedRequestToFirestore(res.data.resourceRequest);
      setTitle('');
      setDescription('');
      setCreateOpen(false);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to post request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (e: React.FormEvent, reqId: string) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    try {
      setSubmitting(true);
      await apiRequest(`/api/resource-requests/${reqId}/respond`, {
        method: 'POST',
        body: JSON.stringify({
          message: responseMessage,
          offeredResourceId: offeredResourceId || undefined,
        }),
      });
      setResponseMessage('');
      setOfferedResourceId('');
      setRespondingToId(null);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkFulfilled = async (reqId: string) => {
    try {
      await apiRequest(`/api/resource-requests/${reqId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'FULFILLED' }),
      });
      onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to update request status.');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-[#E4E4E0] rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs text-[#1F5E46] uppercase block mb-1">
            STUDENT REQUEST LEDGER
          </span>
          <h1 className="text-xl font-semibold text-[#171717]">
            Campus &ldquo;I Need&rdquo; Resource Requests
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Post academic equipment or study materials you need for upcoming labs or examinations so senior students can respond.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              onOpenAuth();
            } else {
              setCreateOpen((prev) => !prev);
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Post an &ldquo;I Need&rdquo; Request
        </button>
      </div>

      {/* Create Form Drawer */}
      {createOpen && (
        <form
          onSubmit={handleCreateNeed}
          className="bg-white border border-[#E4E4E0] rounded-md p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E4E4E0] pb-3">
            <h2 className="text-sm font-semibold text-[#171717]">
              Create a Resource Request
            </h2>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="p-1 text-[#666666] hover:text-[#171717]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C0] rounded text-xs text-[#B42318]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                What resource do you need? * (3 to 150 chars)
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scientific calculator for Semester exam preparation"
                className="w-full px-3 py-2 text-xs border border-[#E4E4E0] rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Required Until Date *
              </label>
              <input
                type="date"
                required
                value={requiredUntil}
                onChange={(e) => setRequiredUntil(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-[#E4E4E0] rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
              >
                {taxonomy.categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Subject *
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
              >
                {taxonomy.subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.courseCode} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
              >
                {taxonomy.departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Semester *
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
              >
                {taxonomy.semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Resource Format *
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as ResourceType)}
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
              >
                <option value={ResourceType.PHYSICAL}>Physical Item</option>
                <option value={ResourceType.DIGITAL}>Digital Material</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Borrow / Give-Away Preference *
              </label>
              <select
                value={preference}
                onChange={(e) =>
                  setPreference(
                    e.target.value as 'BORROW' | 'GIVEAWAY' | 'DIGITAL_COPY'
                  )
                }
                className="w-full px-2.5 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
              >
                <option value="BORROW">Borrow Temporarily</option>
                <option value="GIVEAWAY">Free Transfer / Giveaway</option>
                <option value="DIGITAL_COPY">Digital Upload / Copy</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Purpose & Details * (10 to 2,000 characters)
            </label>
            <textarea
              rows={3}
              required
              minLength={10}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain why you need the resource, preferred edition or model, and when you can return it..."
              className="w-full px-3 py-2 text-xs border border-[#E4E4E0] rounded"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-xs border border-[#E4E4E0] rounded text-[#666666]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-[#1F5E46] text-white rounded cursor-pointer"
            >
              {submitting ? 'Publishing...' : 'Publish Request'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Department Filter Bar */}
      <div className="bg-white border border-[#E4E4E0] rounded-md p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Filter requests by title, subject, or category..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F7F5] border border-[#E4E4E0] rounded"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
        >
          <option value="">All departments</option>
          {taxonomy.departments.map((d) => (
            <option key={d.id} value={d.name}>
              {d.code} - {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white border border-[#E4E4E0] rounded-md p-8 text-center text-xs text-[#666666]">
            No matching resource requests found.
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-[#E4E4E0] rounded-md p-5 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-[#666666] bg-[#F7F7F5] px-1.5 py-0.5 border border-[#E4E4E0] rounded">
                      {req.code}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-[#1F5E46] bg-[#EBF5F0] px-2 py-0.5 rounded">
                      PREFERENCE: {req.preference}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        req.status === 'OPEN'
                          ? 'bg-[#EBF5F0] text-[#16794A] border-[#B8DFCA]'
                          : 'bg-[#F7F7F5] text-[#666666] border-[#E4E4E0]'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#171717]">{req.title}</h3>
                </div>

                <div className="text-right text-xs text-[#666666]">
                  <div className="inline-flex items-center gap-1 font-mono text-[#171717]">
                    <Calendar className="w-3.5 h-3.5 text-[#1F5E46]" />
                    Required until: {req.requiredUntil}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    Posted by {req.requesterName} ({req.requesterDepartment}, Sem{' '}
                    {req.requesterSemester})
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#666666] leading-relaxed">{req.description}</p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E4E4E0] text-xs">
                <div className="text-[#666666]">
                  Category: <strong className="text-[#171717]">{req.category}</strong> •
                  Subject: <strong className="text-[#171717]">{req.subject}</strong> • Sem{' '}
                  {req.semester}
                </div>

                <div className="flex items-center gap-2">
                  {user?.id === req.requesterId && req.status === 'OPEN' && (
                    <button
                      type="button"
                      onClick={() => handleMarkFulfilled(req.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-[#EBF5F0] text-[#16794A] border border-[#B8DFCA] rounded cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Fulfilled
                    </button>
                  )}
                  {req.status === 'OPEN' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          onOpenAuth();
                        } else {
                          setRespondingToId((prev) => (prev === req.id ? null : req.id));
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1F5E46] hover:bg-[#174936] text-white rounded cursor-pointer"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      Respond if you have this resource
                    </button>
                  )}
                </div>
              </div>

              {/* Existing Responses */}
              {req.responses.length > 0 && (
                <div className="bg-[#F7F7F5] border border-[#E4E4E0] rounded p-3 space-y-2">
                  <span className="text-[11px] font-mono uppercase text-[#666666] block">
                    Student Responses ({req.responses.length})
                  </span>
                  {req.responses.map((resp) => (
                    <div
                      key={resp.id}
                      className="bg-white border border-[#E4E4E0] rounded p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#171717]">
                          {resp.responderName} ({resp.responderDepartment})
                        </span>
                        <span className="font-mono text-[10px] text-[#666666]">
                          {formatDateShort(resp.createdAt)}
                        </span>
                      </div>
                      <p className="text-[#666666]">{resp.message}</p>
                      {resp.offeredResourceId && (
                        <button
                          type="button"
                          onClick={() => onSelectResourceById(resp.offeredResourceId!)}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-mono font-medium text-[#1F5E46] hover:underline cursor-pointer"
                        >
                          View linked catalog item: {resp.offeredResourceCode}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Respond Form */}
              {respondingToId === req.id && (
                <form
                  onSubmit={(e) => handleRespond(e, req.id)}
                  className="bg-[#F7F7F5] border border-[#E4E4E0] rounded p-3.5 space-y-2.5"
                >
                  <label className="block text-xs font-semibold text-[#171717]">
                    Offer your resource or coordinate with {req.requesterName}
                  </label>
                  <textarea
                    rows={2}
                    required
                    maxLength={1000}
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Let the student know if you have this item available to lend or share..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                  />
                  {myResources.length > 0 && (
                    <div>
                      <label className="block text-[11px] text-[#666666] mb-1">
                        Optionally link one of your listed resources:
                      </label>
                      <select
                        value={offeredResourceId}
                        onChange={(e) => setOfferedResourceId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                      >
                        <option value="">No linked listing</option>
                        {myResources.map((mr) => (
                          <option key={mr.id} value={mr.id}>
                            {mr.code} - {mr.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRespondingToId(null)}
                      className="px-3 py-1 text-xs text-[#666666]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#1F5E46] text-white rounded cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Response
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
