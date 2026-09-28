import React, { useState } from 'react';
import { AlertCircle, FileUp, Image as ImageIcon, Package, Upload, X } from 'lucide-react';
import {
  AuthenticatedUser,
  LendingType,
  Resource,
  ResourceCondition,
  ResourceType,
  TaxonomyData,
} from '../types';
import { apiRequest, formatBytes } from '../api';
import { syncResourceToFirestore } from '../firebase';
import { compressImageFile } from '../utils/image';

interface ListResourceModalProps {
  user: AuthenticatedUser;
  taxonomy: TaxonomyData;
  onClose: () => void;
  onCreated: (resource: Resource) => void;
}

const BLOCKED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.jar',
  '.scr',
  '.ps1',
  '.msi',
  '.dll',
  '.vbs',
];

export const ListResourceModal: React.FC<ListResourceModalProps> = ({
  user,
  taxonomy,
  onClose,
  onCreated,
}) => {
  const [resourceType, setResourceType] = useState<ResourceType>(ResourceType.PHYSICAL);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(taxonomy.categories[0]?.name || 'Books');
  const [department, setDepartment] = useState(
    user.department || taxonomy.departments[0]?.name || ''
  );
  const [semester, setSemester] = useState<number>(user.semester || 1);
  const [subject, setSubject] = useState(taxonomy.subjects[0]?.name || '');
  const [description, setDescription] = useState('');

  // Physical-only fields
  const [condition, setCondition] = useState<ResourceCondition>(ResourceCondition.GOOD);
  const [lendingType, setLendingType] = useState<LendingType>(LendingType.BORROW);
  const [location, setLocation] = useState('Central Library Ground Floor Reading Counter');
  const [photos, setPhotos] = useState<{ name: string; type: string; dataUrl: string }[]>([]);

  // Digital-only fields
  const [digitalFile, setDigitalFile] = useState<{
    name: string;
    type: string;
    size: number;
    base64: string;
  } | null>(null);
  const [filePreviewText, setFilePreviewText] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDigitalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext) || lower.includes(`${ext}.`))) {
      setErrorMsg(
        'Dangerous executable or script formats (.exe, .bat, .cmd, .sh, .jar, .scr, .ps1) are prohibited.'
      );
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Digital file size cannot exceed 10 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDigitalFile({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          base64: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].some((ext) => lower.endsWith(ext))) {
      setErrorMsg('Photos must be PNG, JPG, JPEG, or WEBP images.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Each image must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }

    try {
      const compressed = await compressImageFile(file, 1200, 0.82);
      setPhotos((prev) => [
        ...prev.slice(0, 2),
        {
          name: compressed.fileName,
          type: compressed.mimeType,
          dataUrl: compressed.dataUrl,
        },
      ]);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [
            ...prev.slice(0, 2),
            { name: file.name, type: file.type, dataUrl: reader.result as string },
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanTitle = title.trim();
    const cleanDesc = description.trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 150) {
      setErrorMsg('Title is required and must be between 3 and 150 characters.');
      return;
    }
    if (cleanDesc.length < 10 || cleanDesc.length > 2000) {
      setErrorMsg('Description is required and must be between 10 and 2,000 characters.');
      return;
    }

    if (resourceType === ResourceType.PHYSICAL && location.trim().length < 3) {
      setErrorMsg('Campus pickup location is required for physical items.');
      return;
    }

    if (resourceType === ResourceType.DIGITAL && !digitalFile) {
      setErrorMsg('Please attach a valid academic PDF, DOCX, ZIP, or text file.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest<{ resource: Resource }>('/api/resources', {
        method: 'POST',
        body: JSON.stringify({
          title: cleanTitle,
          description: cleanDesc,
          resourceType,
          category,
          subject,
          department,
          semester,
          condition:
            resourceType === ResourceType.DIGITAL
              ? ResourceCondition.NOT_APPLICABLE
              : condition,
          lendingType:
            resourceType === ResourceType.DIGITAL
              ? LendingType.DIGITAL_DOWNLOAD
              : lendingType,
          location: resourceType === ResourceType.PHYSICAL ? location.trim() : undefined,
          photos: resourceType === ResourceType.PHYSICAL ? photos : [],
          fileName: digitalFile?.name,
          fileType: digitalFile?.type,
          fileDataBase64: digitalFile?.base64,
          filePreviewText: filePreviewText.trim() || undefined,
        }),
      });

      await syncResourceToFirestore(res.data.resource);
      onCreated(res.data.resource);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to list resource.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E0] rounded-md max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E4E4E0] px-5 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#171717]">
              List a Campus Resource
            </h2>
            <p className="text-xs text-[#666666]">
              Share physical equipment or upload digital study materials for fellow students.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#666666] hover:text-[#171717] border border-[#E4E4E0] rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C0] rounded text-xs text-[#B42318] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Resource Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1.5">
              Resource Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResourceType(ResourceType.PHYSICAL)}
                className={`p-3 border rounded text-left flex items-center gap-2.5 cursor-pointer ${
                  resourceType === ResourceType.PHYSICAL
                    ? 'border-[#1F5E46] bg-[#EBF5F0] text-[#171717]'
                    : 'border-[#E4E4E0] bg-white text-[#666666]'
                }`}
              >
                <Package className="w-4 h-4 text-[#1F5E46]" />
                <div>
                  <span className="text-xs font-semibold block">Physical Resource</span>
                  <span className="text-[11px] block">
                    Book, Calculator, Lab Kit, Drafter
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setResourceType(ResourceType.DIGITAL)}
                className={`p-3 border rounded text-left flex items-center gap-2.5 cursor-pointer ${
                  resourceType === ResourceType.DIGITAL
                    ? 'border-[#1F5E46] bg-[#EBF5F0] text-[#171717]'
                    : 'border-[#E4E4E0] bg-white text-[#666666]'
                }`}
              >
                <FileUp className="w-4 h-4 text-[#1F5E46]" />
                <div>
                  <span className="text-xs font-semibold block">Digital Resource</span>
                  <span className="text-[11px] block">
                    Notes, Previous Papers, Lab Manual
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#171717]">
                Resource Title * (3 to 150 characters)
              </label>
              <span className="font-mono text-[11px] text-[#666666]">
                {title.length}/150
              </span>
            </div>
            <input
              type="text"
              minLength={3}
              maxLength={150}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Casio fx-991EX Scientific Calculator or CS204 OS Lecture Notes"
              className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E0] rounded focus:outline-none focus:border-[#1F5E46]"
            />
          </div>

          {/* Category & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          {/* Department & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {d.code} - {d.name}
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
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#171717]">
                Description * (10 to 2,000 characters)
              </label>
              <span className="font-mono text-[11px] text-[#666666]">
                {description.length}/2000
              </span>
            </div>
            <textarea
              rows={3}
              minLength={10}
              maxLength={2000}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe syllabus coverage, edition, included accessories, or physical state..."
              className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E0] rounded focus:outline-none focus:border-[#1F5E46]"
            />
          </div>

          {resourceType === ResourceType.PHYSICAL ? (
            <div className="p-4 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#171717] mb-1">
                    Physical Condition *
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ResourceCondition)}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
                  >
                    <option value={ResourceCondition.NEW}>NEW (Unused / Mint)</option>
                    <option value={ResourceCondition.GOOD}>
                      GOOD (Clean, fully functional)
                    </option>
                    <option value={ResourceCondition.FAIR}>
                      FAIR (Normal academic wear)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171717] mb-1">
                    Lending Type *
                  </label>
                  <select
                    value={lendingType}
                    onChange={(e) => setLendingType(e.target.value as LendingType)}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
                  >
                    <option value={LendingType.BORROW}>
                      Temporary Borrow (Return required)
                    </option>
                    <option value={LendingType.GIVEAWAY}>
                      Free Giveaway (Permanent transfer)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Campus Handover Location *
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Central Library Ground Floor Counter or Hostel 4 Reception"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E4E4E0] rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Item Photographs (Optional, PNG/JPG/WEBP up to 5 MB)
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E4E4E0] rounded hover:bg-[#F0EFEA] cursor-pointer">
                    <ImageIcon className="w-3.5 h-3.5 text-[#1F5E46]" />
                    <span>Add photo</span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-[#666666]">
                    {photos.length} / 3 photos attached
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Digital File Upload * (PDF, DOCX, ZIP, TXT, MD — Max 10 MB)
                </label>
                <p className="text-[11px] text-[#666666] mb-2">
                  Files are validated server-side by extension, MIME type, and header magic bytes. Uploaded digital resources enter PENDING_REVIEW for moderator approval.
                </p>
                <label className="flex items-center justify-between p-3 bg-white border border-dashed border-[#1F5E46] rounded cursor-pointer hover:bg-[#F4F8F6]">
                  <div className="flex items-center gap-2 text-xs">
                    <Upload className="w-4 h-4 text-[#1F5E46]" />
                    <span className="font-medium text-[#171717]">
                      {digitalFile
                        ? `${digitalFile.name} (${formatBytes(digitalFile.size)})`
                        : 'Select academic document to upload'}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#1F5E46] underline">
                    Browse file
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.zip,.txt,.md,.csv,.png,.jpg,.jpeg"
                    onChange={handleDigitalFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Syllabus / Topics Summary (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={600}
                  value={filePreviewText}
                  onChange={(e) => setFilePreviewText(e.target.value)}
                  placeholder="Optional summary of modules or exam years covered inside this file..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[#E4E4E0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#666666] border border-[#E4E4E0] rounded hover:bg-[#F7F7F5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Validating & Saving...' : 'Publish Resource Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
