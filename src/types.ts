export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

export enum VerificationStatus {
  VERIFIED = 'VERIFIED',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export enum ResourceType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
}

export enum ResourceCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum LendingType {
  BORROW = 'BORROW',
  GIVEAWAY = 'GIVEAWAY',
  DIGITAL_DOWNLOAD = 'DIGITAL_DOWNLOAD',
}

export enum BorrowStatus {
  AVAILABLE = 'AVAILABLE',
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  BORROWED = 'BORROWED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  OVERDUE = 'OVERDUE',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum ModerationStatus {
  APPROVED = 'APPROVED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

export enum ReportStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum ReportReason {
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  COPYRIGHTED_MATERIAL = 'COPYRIGHTED_MATERIAL',
  SPAM = 'SPAM',
  MISLEADING_INFORMATION = 'MISLEADING_INFORMATION',
  OFFENSIVE_CONTENT = 'OFFENSIVE_CONTENT',
  UNSAFE_ITEM = 'UNSAFE_ITEM',
  SUSPICIOUS_USER = 'SUSPICIOUS_USER',
}

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface Semester {
  id: number;
  label: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  resourceKind: 'PHYSICAL' | 'DIGITAL' | 'BOTH';
}

export interface Subject {
  id: string;
  courseCode: string;
  name: string;
  department: string;
  semester: number;
}

export interface UserPublicProfile {
  id: string;
  fullName: string;
  studentId: string;
  department: string;
  semester: number;
  graduationYear: number;
  role: UserRole;
  verificationStatus: VerificationStatus;
  profilePhotoUrl?: string;
  resourcesListedCount: number;
  resourcesBorrowedCount: number;
  resourcesSharedCount: number;
  joinedAt: string;
}

export interface AuthenticatedUser extends UserPublicProfile {
  email: string;
  emailVerified: boolean;
  csrfToken?: string;
}

export interface ResourceRating {
  id: string;
  transactionId: string;
  resourceId: string;
  reviewerId: string;
  reviewerName: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface Resource {
  id: string;
  code: string;
  title: string;
  description: string;
  resourceType: ResourceType;
  category: string;
  subject: string;
  courseCode: string;
  department: string;
  semester: number;
  academicYear: string;
  condition: ResourceCondition;
  lendingType: LendingType;
  availability: BorrowStatus;
  moderationStatus: ModerationStatus;
  moderationNote?: string;
  ownerId: string;
  ownerName: string;
  ownerStudentId: string;
  ownerDepartment: string;
  ownerSemester: number;
  ownerVerificationStatus: VerificationStatus;
  location?: string;
  photos: string[];
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileChecksum?: string;
  filePreviewText?: string;
  downloadCount: number;
  reportCount: number;
  ratings: ResourceRating[];
  createdAt: string;
  updatedAt: string;
}

export interface BorrowRequest {
  id: string;
  resourceId: string;
  resourceCode: string;
  resourceTitle: string;
  resourceType: ResourceType;
  lendingType: LendingType;
  pickupLocation?: string;
  requesterId: string;
  requesterName: string;
  requesterStudentId: string;
  requesterDepartment: string;
  ownerId: string;
  ownerName: string;
  requestedDurationDays: number;
  requiredUntil: string;
  message: string;
  status: BorrowStatus;
  handedOverAt?: string;
  returnedAt?: string;
  hasRated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceNeedResponse {
  id: string;
  requestId: string;
  responderId: string;
  responderName: string;
  responderDepartment: string;
  message: string;
  offeredResourceId?: string;
  offeredResourceCode?: string;
  createdAt: string;
}

export interface ResourceNeedRequest {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  department: string;
  semester: number;
  resourceType: ResourceType;
  preference: 'BORROW' | 'GIVEAWAY' | 'DIGITAL_COPY';
  requiredUntil: string;
  requesterId: string;
  requesterName: string;
  requesterDepartment: string;
  requesterSemester: number;
  status: 'OPEN' | 'FULFILLED' | 'CLOSED';
  responses: ResourceNeedResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ContextualMessage {
  id: string;
  resourceId?: string;
  borrowRequestId?: string;
  resourceRequestId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  body: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | 'NEW_BORROW_REQUEST'
    | 'REQUEST_ACCEPTED'
    | 'REQUEST_REJECTED'
    | 'RETURN_REMINDER'
    | 'RESOURCE_APPROVED'
    | 'RESOURCE_REJECTED'
    | 'NEED_REQUEST_RESPONSE'
    | 'REPORT_RESOLUTION';
  title: string;
  message: string;
  resourceId?: string;
  borrowRequestId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'RESOURCE' | 'USER' | 'MESSAGE' | 'REQUEST';
  targetId: string;
  targetTitle: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  resolutionNote?: string;
  resolvedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress: string;
  details: string;
  createdAt: string;
}

export interface TaxonomyData {
  allowedDomains: string[];
  categories: Category[];
  departments: Department[];
  semesters: Semester[];
  subjects: Subject[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
