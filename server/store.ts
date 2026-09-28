import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  AppNotification,
  AuditLogEntry,
  BorrowRequest,
  BorrowStatus,
  Category,
  ContextualMessage,
  ContentReport,
  Department,
  LendingType,
  ModerationStatus,
  ReportReason,
  ReportStatus,
  Resource,
  ResourceCondition,
  ResourceNeedRequest,
  ResourceType,
  Semester,
  Subject,
  UserPublicProfile,
  UserRole,
  VerificationStatus,
} from '../src/types';

export interface StoredUserRecord extends UserPublicProfile {
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: number;
}

export interface StoredDigitalFile {
  resourceId: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

export interface DatabaseState {
  allowedDomains: string[];
  departments: Department[];
  semesters: Semester[];
  categories: Category[];
  subjects: Subject[];
  users: StoredUserRecord[];
  resources: Resource[];
  digitalFiles: StoredDigitalFile[];
  borrowRequests: BorrowRequest[];
  resourceRequests: ResourceNeedRequest[];
  messages: ContextualMessage[];
  notifications: AppNotification[];
  reports: ContentReport[];
  auditLogs: AuditLogEntry[];
}

const PRIVATE_DIR = path.resolve(process.cwd(), 'private_storage');
const UPLOADS_DIR = path.join(PRIVATE_DIR, 'uploads');
const DB_FILE = path.join(PRIVATE_DIR, 'crx_db.json');

if (!fs.existsSync(PRIVATE_DIR)) {
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function createInitialSeed(): DatabaseState {
  const defaultPasswordHash = bcrypt.hashSync('Campus@2026', 10);
  const adminPasswordHash = bcrypt.hashSync('Admin@2026', 10);

  const allowedDomains = (
    process.env.ALLOWED_COLLEGE_DOMAINS ||
    'college.edu,university.edu,campus.edu,iit.ac.in,nit.ac.in,mit.edu,stanford.edu,berkeley.edu'
  )
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  const departments: Department[] = [
    { id: 'dept-cse', code: 'CSE', name: 'Computer Science and Engineering' },
    { id: 'dept-ece', code: 'ECE', name: 'Electronics and Communication Engineering' },
    { id: 'dept-ee', code: 'EE', name: 'Electrical Engineering' },
    { id: 'dept-me', code: 'ME', name: 'Mechanical Engineering' },
    { id: 'dept-ce', code: 'CE', name: 'Civil Engineering' },
    { id: 'dept-math', code: 'MATH', name: 'Mathematics and Computing' },
    { id: 'dept-phy', code: 'PHY', name: 'Physics and Applied Sciences' },
    { id: 'dept-chem', code: 'CHM', name: 'Chemical Engineering' },
  ];

  const semesters: Semester[] = [
    { id: 1, label: 'Semester 1' },
    { id: 2, label: 'Semester 2' },
    { id: 3, label: 'Semester 3' },
    { id: 4, label: 'Semester 4' },
    { id: 5, label: 'Semester 5' },
    { id: 6, label: 'Semester 6' },
    { id: 7, label: 'Semester 7' },
    { id: 8, label: 'Semester 8' },
  ];

  const categories: Category[] = [
    {
      id: 'cat-books',
      slug: 'books',
      name: 'Books',
      description: 'Core textbooks, reference volumes, and prescribed course readers.',
      resourceKind: 'PHYSICAL',
    },
    {
      id: 'cat-calculators',
      slug: 'calculators',
      name: 'Calculators',
      description: 'Non-programmable and scientific calculators permitted in university examinations.',
      resourceKind: 'PHYSICAL',
    },
    {
      id: 'cat-notes',
      slug: 'notes',
      name: 'Notes',
      description: 'Handwritten or typeset lecture notes organized by course code and semester.',
      resourceKind: 'DIGITAL',
    },
    {
      id: 'cat-lab-equip',
      slug: 'lab-equipment',
      name: 'Lab Equipment',
      description: 'Lab coats, multimeters, breadboards, dissection kits, and safety goggles.',
      resourceKind: 'PHYSICAL',
    },
    {
      id: 'cat-proj-comp',
      slug: 'project-components',
      name: 'Project Components',
      description: 'Microcontrollers, sensors, FPGA boards, and mechanical prototyping parts.',
      resourceKind: 'PHYSICAL',
    },
    {
      id: 'cat-prev-papers',
      slug: 'previous-papers',
      name: 'Previous Papers',
      description: 'Mid-semester and end-semester question papers from prior academic sessions.',
      resourceKind: 'DIGITAL',
    },
    {
      id: 'cat-study-mat',
      slug: 'study-materials',
      name: 'Study Materials',
      description: 'Lab manuals, problem sets, tutorial sheets, and reference guides.',
      resourceKind: 'BOTH',
    },
    {
      id: 'cat-other',
      slug: 'other',
      name: 'Other',
      description: 'Engineering drawing instruments, drafters, T-squares, and miscellaneous academic tools.',
      resourceKind: 'BOTH',
    },
  ];

  const subjects: Subject[] = [
    { id: 'sub-ma101', courseCode: 'MA101', name: 'Engineering Mathematics-I', department: 'Mathematics and Computing', semester: 1 },
    { id: 'sub-ma201', courseCode: 'MA201', name: 'Discrete Mathematics and Graph Theory', department: 'Mathematics and Computing', semester: 3 },
    { id: 'sub-me102', courseCode: 'ME102', name: 'Engineering Graphics and Drawing', department: 'Mechanical Engineering', semester: 1 },
    { id: 'sub-ee201', courseCode: 'EE201', name: 'Analog and Digital Electronics Lab', department: 'Electronics and Communication Engineering', semester: 3 },
    { id: 'sub-cs204', courseCode: 'CS204', name: 'Operating Systems and Kernel Design', department: 'Computer Science and Engineering', semester: 4 },
    { id: 'sub-cs301', courseCode: 'CS301', name: 'Database Management Systems', department: 'Computer Science and Engineering', semester: 5 },
    { id: 'sub-ec305', courseCode: 'EC305', name: 'Embedded Systems and Microcontrollers', department: 'Electronics and Communication Engineering', semester: 6 },
    { id: 'sub-me204', courseCode: 'ME204', name: 'Thermodynamics and Fluid Mechanics', department: 'Mechanical Engineering', semester: 4 },
    { id: 'sub-ce202', courseCode: 'CE202', name: 'Structural Analysis and Surveying', department: 'Civil Engineering', semester: 4 },
    { id: 'sub-ph101', courseCode: 'PH101', name: 'Engineering Physics Laboratory', department: 'Physics and Applied Sciences', semester: 2 },
  ];

  const users: StoredUserRecord[] = [
    {
      id: 'usr-senior-1',
      fullName: 'Aarav Nair',
      email: 'aarav.nair@college.edu',
      studentId: '2023CS1042',
      passwordHash: defaultPasswordHash,
      department: 'Computer Science and Engineering',
      semester: 7,
      graduationYear: 2027,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
      emailVerified: true,
      resourcesListedCount: 4,
      resourcesBorrowedCount: 1,
      resourcesSharedCount: 3,
      joinedAt: '2025-08-14T09:00:00.000Z',
    },
    {
      id: 'usr-junior-1',
      fullName: 'Meera Krishnan',
      email: 'meera.krishnan@college.edu',
      studentId: '2025EC2018',
      passwordHash: defaultPasswordHash,
      department: 'Electronics and Communication Engineering',
      semester: 3,
      graduationYear: 2029,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
      emailVerified: true,
      resourcesListedCount: 2,
      resourcesBorrowedCount: 2,
      resourcesSharedCount: 1,
      joinedAt: '2025-09-02T11:30:00.000Z',
    },
    {
      id: 'usr-senior-2',
      fullName: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@college.edu',
      studentId: '2023ME1089',
      passwordHash: defaultPasswordHash,
      department: 'Mechanical Engineering',
      semester: 7,
      graduationYear: 2027,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
      emailVerified: true,
      resourcesListedCount: 2,
      resourcesBorrowedCount: 0,
      resourcesSharedCount: 2,
      joinedAt: '2025-08-20T14:15:00.000Z',
    },
    {
      id: 'usr-pending-1',
      fullName: 'Devika Sharma',
      email: 'devika.sharma@college.edu',
      studentId: '2026CE1104',
      passwordHash: defaultPasswordHash,
      department: 'Civil Engineering',
      semester: 1,
      graduationYear: 2030,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.PENDING,
      emailVerified: true,
      resourcesListedCount: 1,
      resourcesBorrowedCount: 0,
      resourcesSharedCount: 0,
      joinedAt: '2026-09-20T16:45:00.000Z',
    },
    {
      id: 'usr-admin-1',
      fullName: 'Dr. Vikramaditya Rao (Campus Registrar Office)',
      email: 'admin@college.edu',
      studentId: 'STAFF-REG-01',
      passwordHash: adminPasswordHash,
      department: 'Computer Science and Engineering',
      semester: 8,
      graduationYear: 2026,
      role: UserRole.ADMIN,
      verificationStatus: VerificationStatus.VERIFIED,
      emailVerified: true,
      resourcesListedCount: 1,
      resourcesBorrowedCount: 0,
      resourcesSharedCount: 1,
      joinedAt: '2025-07-01T08:00:00.000Z',
    },
  ];

  const resources: Resource[] = [
    {
      id: 'res-101',
      code: 'CRX-2026-0101',
      title: 'Casio fx-991EX ClassWiz Scientific Calculator',
      description:
        'Non-programmable scientific calculator with high-resolution LCD display. Permitted in all university mid-semester and end-semester examinations. Matrix, vector, and complex number operations work cleanly. Protective hard slide cover included.',
      resourceType: ResourceType.PHYSICAL,
      category: 'Calculators',
      subject: 'Engineering Mathematics-I',
      courseCode: 'MA101',
      department: 'Mathematics and Computing',
      semester: 1,
      academicYear: '2026-2027',
      condition: ResourceCondition.GOOD,
      lendingType: LendingType.BORROW,
      availability: BorrowStatus.AVAILABLE,
      moderationStatus: ModerationStatus.APPROVED,
      ownerId: 'usr-senior-1',
      ownerName: 'Aarav Nair',
      ownerStudentId: '2023CS1042',
      ownerDepartment: 'Computer Science and Engineering',
      ownerSemester: 7,
      ownerVerificationStatus: VerificationStatus.VERIFIED,
      location: 'Central Library Ground Floor Reading Counter',
      photos: [],
      downloadCount: 0,
      reportCount: 0,
      ratings: [
        {
          id: 'rat-1',
          transactionId: 'tx-hist-1',
          resourceId: 'res-101',
          reviewerId: 'usr-junior-1',
          reviewerName: 'Meera Krishnan',
          score: 5,
          comment: 'Picked up on time at the library counter. Keys and solar cell work without issue.',
          createdAt: '2026-09-10T12:00:00.000Z',
        },
      ],
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-10T12:00:00.000Z',
    },
    {
      id: 'res-102',
      code: 'CRX-2026-0102',
      title: 'Omega Mini Drafter, Roller Scale & Sheet Holder Tube (ME102 Kit)',
      description:
        'Complete first-year Engineering Graphics and Drawing instrument set. Includes stainless steel Omega mini drafter with zero-play pivot, transparent parallel roller scale, set squares, and waterproof telescopic drawing sheet tube. Giving away permanently to a first-year student.',
      resourceType: ResourceType.PHYSICAL,
      category: 'Other',
      subject: 'Engineering Graphics and Drawing',
      courseCode: 'ME102',
      department: 'Mechanical Engineering',
      semester: 1,
      academicYear: '2026-2027',
      condition: ResourceCondition.GOOD,
      lendingType: LendingType.GIVEAWAY,
      availability: BorrowStatus.AVAILABLE,
      moderationStatus: ModerationStatus.APPROVED,
      ownerId: 'usr-senior-2',
      ownerName: 'Rohan Deshmukh',
      ownerStudentId: '2023ME1089',
      ownerDepartment: 'Mechanical Engineering',
      ownerSemester: 7,
      ownerVerificationStatus: VerificationStatus.VERIFIED,
      location: 'Mechanical Workshop Block B Foyer',
      photos: [],
      downloadCount: 0,
      reportCount: 0,
      ratings: [],
      createdAt: '2026-09-04T15:20:00.000Z',
      updatedAt: '2026-09-04T15:20:00.000Z',
    },
    {
      id: 'res-103',
      code: 'CRX-2026-0103',
      title: 'Operating Systems Concepts (Silberschatz, Galvin, Gagne) 10th Ed. Hardcover',
      description:
        'Standard textbook for CS204 Operating Systems. Clean pages with no ink markings; includes chapters on process synchronization, deadlocks, virtual memory paging, and Linux kernel modules.',
      resourceType: ResourceType.PHYSICAL,
      category: 'Books',
      subject: 'Operating Systems and Kernel Design',
      courseCode: 'CS204',
      department: 'Computer Science and Engineering',
      semester: 4,
      academicYear: '2026-2027',
      condition: ResourceCondition.NEW,
      lendingType: LendingType.BORROW,
      availability: BorrowStatus.BORROWED,
      moderationStatus: ModerationStatus.APPROVED,
      ownerId: 'usr-senior-1',
      ownerName: 'Aarav Nair',
      ownerStudentId: '2023CS1042',
      ownerDepartment: 'Computer Science and Engineering',
      ownerSemester: 7,
      ownerVerificationStatus: VerificationStatus.VERIFIED,
      location: 'CSE Department Seminar Hall Corridor',
      photos: [],
      downloadCount: 0,
      reportCount: 0,
      ratings: [],
      createdAt: '2026-09-06T09:30:00.000Z',
      updatedAt: '2026-09-18T11:00:00.000Z',
    },
    {
      id: 'res-104',
      code: 'CRX-2026-0104',
      title: 'MA101 Engineering Mathematics-I Complete Lecture Notes & Solved Tutorials',
      description:
        'Typeset LaTeX PDF notes covering Linear Algebra, Eigenvalues, Cayley-Hamilton Theorem, Multivariable Calculus, Jacobian, Multiple Integrals, and Vector Differential Calculus (Grad, Div, Curl, Stokes and Gauss Divergence Theorems). Includes 45 worked tutorial problems.',
      resourceType: ResourceType.DIGITAL,
      category: 'Notes',
      subject: 'Engineering Mathematics-I',
      courseCode: 'MA101',
      department: 'Mathematics and Computing',
      semester: 1,
      academicYear: '2026-2027',
      condition: ResourceCondition.NOT_APPLICABLE,
      lendingType: LendingType.DIGITAL_DOWNLOAD,
      availability: BorrowStatus.AVAILABLE,
      moderationStatus: ModerationStatus.APPROVED,
      ownerId: 'usr-senior-1',
      ownerName: 'Aarav Nair',
      ownerStudentId: '2023CS1042',
      ownerDepartment: 'Computer Science and Engineering',
      ownerSemester: 7,
      ownerVerificationStatus: VerificationStatus.VERIFIED,
      photos: [],
      fileName: 'MA101_Engineering_Mathematics_I_Complete_Notes.pdf',
      fileType: 'application/pdf',
      fileSize: 2458624,
      fileChecksum: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
      filePreviewText:
        'MODULE 1: MATRICES AND LINEAR SYSTEMS\n1.1 Echelon Form & Rank of a Matrix\n1.2 Cayley-Hamilton Theorem and Inverse Computation\nMODULE 2: MULTIVARIABLE CALCULUS\n2.1 Partial Derivatives, Total Differential, and Jacobians\n2.2 Taylor Series Expansion for Functions of Two Variables\nMODULE 3: VECTOR CALCULUS\n3.1 Green, Gauss Divergence, and Stokes Theorems with Complete Proofs.',
      downloadCount: 18,
      reportCount: 0,
      ratings: [],
      createdAt: '2026-09-08T08:15:00.000Z',
      updatedAt: '2026-09-08T08:15:00.000Z',
    },
    {
      id: 'res-105',
      code: 'CRX-2026-0105',
      title: 'STM32F401RE Nucleo-64 Board, Logic Analyzer & Breadboard Kit',
      description:
        'ARM Cortex-M4 development board with USB ST-LINK cable, 8-channel 24MHz logic analyzer, two 830-point solderless breadboards, and jumper wire assortment. Ideal for EC305 Embedded Systems lab projects.',
      resourceType: ResourceType.PHYSICAL,
      category: 'Project Components',
      subject: 'Embedded Systems and Microcontrollers',
      courseCode: 'EC305',
      department: 'Electronics and Communication Engineering',
      semester: 6,
      academicYear: '2026-2027',
      condition: ResourceCondition.GOOD,
      lendingType: LendingType.BORROW,
      availability: BorrowStatus.REQUESTED,
      moderationStatus: ModerationStatus.APPROVED,
      ownerId: 'usr-junior-1',
      ownerName: 'Meera Krishnan',
      ownerStudentId: '2025EC2018',
      ownerDepartment: 'Electronics and Communication Engineering',
      ownerSemester: 3,
      ownerVerificationStatus: VerificationStatus.VERIFIED,
      location: 'ECE Digital Systems Lab 204 Entrance',
      photos: [],
      downloadCount: 0,
      reportCount: 0,
      ratings: [],
      createdAt: '2026-09-12T13:10:00.000Z',
      updatedAt: '2026-09-25T10:00:00.000Z',
    },
    {
      id: 'res-106',
      code: 'CRX-2026-0106',
      title: 'CS301 Database Management Systems Mid-Sem & End-Sem Question Papers (2022-2025)',
      description:
        'Archive of official university examination question papers for CS301 DBMS covering Relational Algebra, SQL Window Functions, B+ Tree Indexing, Boyce-Codd Normal Form (BCNF), Conflict Serializability, and ARIES Recovery.',
      resourceType: ResourceType.DIGITAL,
      category: 'Previous Papers',
      subject: 'Database Management Systems',
      courseCode: 'CS301',
      department: 'Computer Science and Engineering',
      semester: 5,
      academicYear: '2026-2027',
      condition: ResourceCondition.NOT_APPLICABLE,
      lendingType: LendingType.DIGITAL_DOWNLOAD,
      availability: BorrowStatus.AVAILABLE,
      moderationStatus: ModerationStatus.APPROVED,
      ownerId: 'usr-senior-1',
      ownerName: 'Aarav Nair',
      ownerStudentId: '2023CS1042',
      ownerDepartment: 'Computer Science and Engineering',
      ownerSemester: 7,
      ownerVerificationStatus: VerificationStatus.VERIFIED,
      photos: [],
      fileName: 'CS301_DBMS_Previous_Papers_2022_2025.pdf',
      fileType: 'application/pdf',
      fileSize: 1843200,
      fileChecksum: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      filePreviewText:
        'CS301 END-SEMESTER EXAMINATION ARCHIVE (2022-2025)\nQ1. Prove that every relation in BCNF is also in 3NF. Construct a schema decomposition that is dependency-preserving.\nQ2. Trace the B+ Tree insertion and node split sequence for order p=4.\nQ3. Analyze strict two-phase locking (Strict 2PL) and construct the precedence graph for Schedule S.',
      downloadCount: 11,
      reportCount: 0,
      ratings: [],
      createdAt: '2026-09-14T17:40:00.000Z',
      updatedAt: '2026-09-14T17:40:00.000Z',
    },
    {
      id: 'res-107',
      code: 'CRX-2026-0107',
      title: 'Fluke 107 Palm-Sized Digital Multimeter & BNC Oscilloscope Probes',
      description:
        'True-RMS digital multimeter with continuity buzzer, diode test, capacitance measurement, and a pair of 100MHz switchable 1x/10x BNC oscilloscope probes for EE201 Analog and Digital Electronics Lab.',
      resourceType: ResourceType.PHYSICAL,
      category: 'Lab Equipment',
      subject: 'Analog and Digital Electronics Lab',
      courseCode: 'EE201',
      department: 'Electronics and Communication Engineering',
      semester: 3,
      academicYear: '2026-2027',
      condition: ResourceCondition.NEW,
      lendingType: LendingType.BORROW,
      availability: BorrowStatus.AVAILABLE,
      moderationStatus: ModerationStatus.APPROVED,
      ownerId: 'usr-junior-1',
      ownerName: 'Meera Krishnan',
      ownerStudentId: '2025EC2018',
      ownerDepartment: 'Electronics and Communication Engineering',
      ownerSemester: 3,
      ownerVerificationStatus: VerificationStatus.VERIFIED,
      location: 'Electrical Machines Lab Verandah',
      photos: [],
      downloadCount: 0,
      reportCount: 0,
      ratings: [],
      createdAt: '2026-09-15T11:20:00.000Z',
      updatedAt: '2026-09-15T11:20:00.000Z',
    },
    {
      id: 'res-108',
      code: 'CRX-2026-0108',
      title: 'ME204 Steam Tables, Mollier Diagram Chart & Fluid Mechanics Lab Manual',
      description:
        'Scanned high-contrast PDF of the standard Thermodynamic Steam & Refrigerant Property Tables along with the annotated ME204 Fluid Mechanics laboratory experiment manual (Venturimeter, Orifice Meter, Reynolds Apparatus, Francis Turbine).',
      resourceType: ResourceType.DIGITAL,
      category: 'Study Materials',
      subject: 'Thermodynamics and Fluid Mechanics',
      courseCode: 'ME204',
      department: 'Mechanical Engineering',
      semester: 4,
      academicYear: '2026-2027',
      condition: ResourceCondition.NOT_APPLICABLE,
      lendingType: LendingType.DIGITAL_DOWNLOAD,
      availability: BorrowStatus.AVAILABLE,
      moderationStatus: ModerationStatus.PENDING_REVIEW,
      ownerId: 'usr-senior-2',
      ownerName: 'Rohan Deshmukh',
      ownerStudentId: '2023ME1089',
      ownerDepartment: 'Mechanical Engineering',
      ownerSemester: 7,
      ownerVerificationStatus: VerificationStatus.VERIFIED,
      photos: [],
      fileName: 'ME204_Steam_Tables_And_Fluid_Lab_Manual.pdf',
      fileType: 'application/pdf',
      fileSize: 3120512,
      fileChecksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      filePreviewText:
        'ME204 THERMODYNAMICS & FLUID MECHANICS MANUAL\nTable A-4: Saturated Water - Temperature Table\nTable A-5: Saturated Water - Pressure Table\nTable A-6: Superheated Water Vapor Properties\nExperiment 1: Determination of Coefficient of Discharge for Venturimeter.',
      downloadCount: 0,
      reportCount: 0,
      ratings: [],
      createdAt: '2026-09-26T16:00:00.000Z',
      updatedAt: '2026-09-26T16:00:00.000Z',
    },
    {
      id: 'res-109',
      code: 'CRX-2026-0109',
      title: 'MA201 Discrete Mathematics and Graph Theory Tutorial Compendium',
      description:
        'Complete set of solved problem sheets for MA201 covering Generating Functions, Recurrence Relations, Planar Graphs, Euler and Hamiltonian Paths, Network Flows, and Group Homomorphisms.',
      resourceType: ResourceType.DIGITAL,
      category: 'Notes',
      subject: 'Discrete Mathematics and Graph Theory',
      courseCode: 'MA201',
      department: 'Mathematics and Computing',
      semester: 3,
      academicYear: '2026-2027',
      condition: ResourceCondition.NOT_APPLICABLE,
      lendingType: LendingType.DIGITAL_DOWNLOAD,
      availability: BorrowStatus.AVAILABLE,
      moderationStatus: ModerationStatus.PENDING_REVIEW,
      ownerId: 'usr-pending-1',
      ownerName: 'Devika Sharma',
      ownerStudentId: '2026CE1104',
      ownerDepartment: 'Civil Engineering',
      ownerSemester: 1,
      ownerVerificationStatus: VerificationStatus.PENDING,
      photos: [],
      fileName: 'MA201_Discrete_Mathematics_Solutions.pdf',
      fileType: 'application/pdf',
      fileSize: 1512400,
      fileChecksum: '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
      filePreviewText:
        'MA201 DISCRETE MATHEMATICS COMPENDIUM\nSheet 1: Pigeonhole Principle & Inclusion-Exclusion\nSheet 2: Non-homogeneous Linear Recurrence Relations\nSheet 3: Kuratowski Theorem & Chromatic Polynomials.',
      downloadCount: 0,
      reportCount: 0,
      ratings: [],
      createdAt: '2026-09-27T09:10:00.000Z',
      updatedAt: '2026-09-27T09:10:00.000Z',
    },
  ];

  const borrowRequests: BorrowRequest[] = [
    {
      id: 'breq-201',
      resourceId: 'res-103',
      resourceCode: 'CRX-2026-0103',
      resourceTitle: 'Operating Systems Concepts (Silberschatz, Galvin, Gagne) 10th Ed. Hardcover',
      resourceType: ResourceType.PHYSICAL,
      lendingType: LendingType.BORROW,
      pickupLocation: 'CSE Department Seminar Hall Corridor',
      requesterId: 'usr-junior-1',
      requesterName: 'Meera Krishnan',
      requesterStudentId: '2025EC2018',
      requesterDepartment: 'Electronics and Communication Engineering',
      ownerId: 'usr-senior-1',
      ownerName: 'Aarav Nair',
      requestedDurationDays: 14,
      requiredUntil: '2026-10-12',
      message:
        'Need this reference book for our mid-semester kernel synchronization assignment. Will keep it in clean condition.',
      status: BorrowStatus.BORROWED,
      handedOverAt: '2026-09-18T11:00:00.000Z',
      createdAt: '2026-09-17T14:20:00.000Z',
      updatedAt: '2026-09-18T11:00:00.000Z',
    },
    {
      id: 'breq-202',
      resourceId: 'res-105',
      resourceCode: 'CRX-2026-0105',
      resourceTitle: 'STM32F401RE Nucleo-64 Board, Logic Analyzer & Breadboard Kit',
      resourceType: ResourceType.PHYSICAL,
      lendingType: LendingType.BORROW,
      pickupLocation: 'ECE Digital Systems Lab 204 Entrance',
      requesterId: 'usr-senior-1',
      requesterName: 'Aarav Nair',
      requesterStudentId: '2023CS1042',
      requesterDepartment: 'Computer Science and Engineering',
      ownerId: 'usr-junior-1',
      ownerName: 'Meera Krishnan',
      requestedDurationDays: 7,
      requiredUntil: '2026-10-08',
      message:
        'Testing SPI bus timing on a sensor node this week. Is the logic analyzer available until next Thursday?',
      status: BorrowStatus.REQUESTED,
      createdAt: '2026-09-25T10:00:00.000Z',
      updatedAt: '2026-09-25T10:00:00.000Z',
    },
    {
      id: 'breq-200',
      resourceId: 'res-101',
      resourceCode: 'CRX-2026-0101',
      resourceTitle: 'Casio fx-991EX ClassWiz Scientific Calculator',
      resourceType: ResourceType.PHYSICAL,
      lendingType: LendingType.BORROW,
      pickupLocation: 'Central Library Ground Floor Reading Counter',
      requesterId: 'usr-junior-1',
      requesterName: 'Meera Krishnan',
      requesterStudentId: '2025EC2018',
      requesterDepartment: 'Electronics and Communication Engineering',
      ownerId: 'usr-senior-1',
      ownerName: 'Aarav Nair',
      requestedDurationDays: 3,
      requiredUntil: '2026-09-10',
      message: 'Needed for the MA201 quiz on Wednesday morning.',
      status: BorrowStatus.RETURNED,
      handedOverAt: '2026-09-07T09:00:00.000Z',
      returnedAt: '2026-09-10T11:45:00.000Z',
      hasRated: true,
      createdAt: '2026-09-06T18:00:00.000Z',
      updatedAt: '2026-09-10T11:45:00.000Z',
    },
  ];

  const resourceRequests: ResourceNeedRequest[] = [
    {
      id: 'nreq-301',
      code: 'REQ-2026-0301',
      title: 'Scientific calculator (Casio fx-991EX or fx-991CW)',
      description:
        'Semester exam preparation for CE202 Structural Analysis. Looking to borrow a non-programmable scientific calculator for matrix stiffness calculations until 15 October.',
      category: 'Calculators',
      subject: 'Structural Analysis and Surveying',
      department: 'Civil Engineering',
      semester: 4,
      resourceType: ResourceType.PHYSICAL,
      preference: 'BORROW',
      requiredUntil: '2026-10-15',
      requesterId: 'usr-pending-1',
      requesterName: 'Devika Sharma',
      requesterDepartment: 'Civil Engineering',
      requesterSemester: 1,
      status: 'OPEN',
      responses: [
        {
          id: 'nresp-1',
          requestId: 'nreq-301',
          responderId: 'usr-senior-1',
          responderName: 'Aarav Nair',
          responderDepartment: 'Computer Science and Engineering',
          message:
            'My Casio fx-991EX (CRX-2026-0101) is currently available in the catalog. Feel free to place a borrow request.',
          offeredResourceId: 'res-101',
          offeredResourceCode: 'CRX-2026-0101',
          createdAt: '2026-09-24T12:00:00.000Z',
        },
      ],
      createdAt: '2026-09-23T09:00:00.000Z',
      updatedAt: '2026-09-24T12:00:00.000Z',
    },
    {
      id: 'nreq-302',
      code: 'REQ-2026-0302',
      title: 'PH101 Engineering Physics Lab Manual & Error Analysis Guide',
      description:
        'Need the current academic year PH101 laboratory manual covering Newton Rings, Michelson Interferometer, and Hall Effect apparatus error propagation formulas.',
      category: 'Study Materials',
      subject: 'Engineering Physics Laboratory',
      department: 'Physics and Applied Sciences',
      semester: 2,
      resourceType: ResourceType.DIGITAL,
      preference: 'DIGITAL_COPY',
      requiredUntil: '2026-10-20',
      requesterId: 'usr-junior-1',
      requesterName: 'Meera Krishnan',
      requesterDepartment: 'Electronics and Communication Engineering',
      requesterSemester: 3,
      status: 'OPEN',
      responses: [],
      createdAt: '2026-09-25T15:30:00.000Z',
      updatedAt: '2026-09-25T15:30:00.000Z',
    },
    {
      id: 'nreq-303',
      code: 'REQ-2026-0303',
      title: 'White Cotton Lab Coat (Size M/L) for Chemical Engineering Lab',
      description:
        'Need a knee-length cotton lab coat for Friday afternoon titration and distillation lab sessions.',
      category: 'Lab Equipment',
      subject: 'Thermodynamics and Fluid Mechanics',
      department: 'Chemical Engineering',
      semester: 3,
      resourceType: ResourceType.PHYSICAL,
      preference: 'BORROW',
      requiredUntil: '2026-11-01',
      requesterId: 'usr-senior-2',
      requesterName: 'Rohan Deshmukh',
      requesterDepartment: 'Mechanical Engineering',
      requesterSemester: 7,
      status: 'OPEN',
      responses: [],
      createdAt: '2026-09-26T10:15:00.000Z',
      updatedAt: '2026-09-26T10:15:00.000Z',
    },
  ];

  const messages: ContextualMessage[] = [
    {
      id: 'msg-1',
      resourceId: 'res-105',
      borrowRequestId: 'breq-202',
      senderId: 'usr-senior-1',
      senderName: 'Aarav Nair',
      senderRole: UserRole.STUDENT,
      recipientId: 'usr-junior-1',
      body: 'Is the logic analyzer available until Friday? I can pick it up outside ECE Lab 204 after the 2 PM lecture.',
      createdAt: '2026-09-25T10:02:00.000Z',
    },
    {
      id: 'msg-2',
      resourceId: 'res-105',
      borrowRequestId: 'breq-202',
      senderId: 'usr-junior-1',
      senderName: 'Meera Krishnan',
      senderRole: UserRole.STUDENT,
      recipientId: 'usr-senior-1',
      body: 'Yes, all 8 probe clips are in the case. I will review and approve the request right after my afternoon lab.',
      createdAt: '2026-09-25T11:15:00.000Z',
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-1',
      userId: 'usr-junior-1',
      type: 'NEW_BORROW_REQUEST',
      title: 'New Borrow Request on CRX-2026-0105',
      message: 'Aarav Nair requested to borrow STM32F401RE Nucleo-64 Board, Logic Analyzer & Breadboard Kit for 7 days.',
      resourceId: 'res-105',
      borrowRequestId: 'breq-202',
      isRead: false,
      createdAt: '2026-09-25T10:00:00.000Z',
    },
    {
      id: 'notif-2',
      userId: 'usr-senior-1',
      type: 'RESOURCE_APPROVED',
      title: 'Digital Resource Approved',
      message: 'Your upload "CS301 Database Management Systems Mid-Sem & End-Sem Question Papers (2022-2025)" was approved by campus moderation.',
      resourceId: 'res-106',
      isRead: false,
      createdAt: '2026-09-14T18:00:00.000Z',
    },
  ];

  const reports: ContentReport[] = [
    {
      id: 'rep-401',
      reporterId: 'usr-junior-1',
      reporterName: 'Meera Krishnan',
      targetType: 'RESOURCE',
      targetId: 'res-108',
      targetTitle: 'ME204 Steam Tables, Mollier Diagram Chart & Fluid Mechanics Lab Manual',
      reason: ReportReason.COPYRIGHTED_MATERIAL,
      details: 'Please verify that the scanned appendix pages only include the department-authored lab manual and public domain steam tables.',
      status: ReportStatus.OPEN,
      createdAt: '2026-09-27T11:00:00.000Z',
      updatedAt: '2026-09-27T11:00:00.000Z',
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'aud-1',
      actorId: 'usr-admin-1',
      actorName: 'Dr. Vikramaditya Rao (Campus Registrar Office)',
      actorRole: 'ADMIN',
      action: 'ADMIN_APPROVE',
      targetType: 'RESOURCE',
      targetId: 'CRX-2026-0106',
      ipAddress: '10.14.2.10',
      details: 'Verified and approved digital resource CS301_DBMS_Previous_Papers_2022_2025.pdf after magic-byte and syllabus check.',
      createdAt: '2026-09-14T18:00:00.000Z',
    },
    {
      id: 'aud-2',
      actorId: 'usr-senior-1',
      actorName: 'Aarav Nair',
      actorRole: 'STUDENT',
      action: 'BORROW_STATE_CHANGE',
      targetType: 'BORROW_REQUEST',
      targetId: 'breq-201',
      ipAddress: '10.14.88.42',
      details: 'Transitioned borrow request breq-201 from APPROVED to BORROWED upon physical handover.',
      createdAt: '2026-09-18T11:00:00.000Z',
    },
    {
      id: 'aud-3',
      actorId: 'usr-junior-1',
      actorName: 'Meera Krishnan',
      actorRole: 'STUDENT',
      action: 'REPORT_CREATE',
      targetType: 'RESOURCE',
      targetId: 'CRX-2026-0108',
      ipAddress: '10.14.91.19',
      details: 'Submitted content report (COPYRIGHTED_MATERIAL) for moderator verification.',
      createdAt: '2026-09-27T11:00:00.000Z',
    },
  ];

  return {
    allowedDomains,
    departments,
    semesters,
    categories,
    subjects,
    users,
    resources,
    digitalFiles: [],
    borrowRequests,
    resourceRequests,
    messages,
    notifications,
    reports,
    auditLogs,
  };
}

let dbState: DatabaseState;

export function loadDatabase(): DatabaseState {
  if (dbState) return dbState;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbState = JSON.parse(raw) as DatabaseState;
      return dbState;
    }
  } catch (err) {
    console.error('Failed to read local DB state, initializing fresh seed:', err);
  }
  dbState = createInitialSeed();
  saveDatabase();
  return dbState;
}

export function saveDatabase(): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(dbState, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist DB state:', err);
  }
}

export function appendAuditLog(
  actorId: string,
  actorName: string,
  actorRole: string,
  action: string,
  targetType: string,
  targetId: string,
  ipAddress: string,
  details: string
): AuditLogEntry {
  const db = loadDatabase();
  const entry: AuditLogEntry = {
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    actorId,
    actorName,
    actorRole,
    action,
    targetType,
    targetId,
    ipAddress,
    details,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(entry);
  saveDatabase();
  return entry;
}

export function createNotification(
  userId: string,
  type: AppNotification['type'],
  title: string,
  message: string,
  resourceId?: string,
  borrowRequestId?: string
): AppNotification {
  const db = loadDatabase();
  const notif: AppNotification = {
    id: `notif-${crypto.randomUUID().slice(0, 8)}`,
    userId,
    type,
    title,
    message,
    resourceId,
    borrowRequestId,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  saveDatabase();
  return notif;
}

export function savePrivateUploadedFile(
  resourceId: string,
  originalFileName: string,
  mimeType: string,
  base64Content: string,
  checksum: string
): StoredDigitalFile {
  const db = loadDatabase();
  const ext = path.extname(originalFileName).toLowerCase() || '.bin';
  // Never use original filename as storage path (Section 24)
  const storageKey = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(UPLOADS_DIR, storageKey);

  const rawBase64 = base64Content.includes(',')
    ? base64Content.split(',')[1]
    : base64Content;
  const buffer = Buffer.from(rawBase64, 'base64');
  fs.writeFileSync(fullPath, buffer);

  const record: StoredDigitalFile = {
    resourceId,
    storageKey,
    originalFileName,
    mimeType,
    sizeBytes: buffer.length,
    checksum,
  };
  db.digitalFiles.push(record);
  saveDatabase();
  return record;
}

export function readPrivateUploadedFile(resourceId: string): {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
} | null {
  const db = loadDatabase();
  const record = db.digitalFiles.find((f) => f.resourceId === resourceId);
  if (record) {
    const fullPath = path.join(UPLOADS_DIR, record.storageKey);
    if (fs.existsSync(fullPath)) {
      return {
        buffer: fs.readFileSync(fullPath),
        fileName: record.originalFileName,
        mimeType: record.mimeType,
      };
    }
  }
  // If it's one of the seeded approved academic PDFs, generate a valid, clean PDF document on the fly
  const resource = db.resources.find((r) => r.id === resourceId);
  if (!resource || resource.resourceType !== ResourceType.DIGITAL) return null;

  const pdfBody = generateCleanAcademicPdf(resource);
  return {
    buffer: Buffer.from(pdfBody, 'utf-8'),
    fileName: resource.fileName || `${resource.code}.pdf`,
    mimeType: 'application/pdf',
  };
}

function generateCleanAcademicPdf(resource: Resource): string {
  const safeTitle = resource.title.replace(/[()\\]/g, '');
  const safeCourse = `${resource.courseCode} - ${resource.subject}`.replace(/[()\\]/g, '');
  const safePreview = (resource.filePreviewText || resource.description)
    .replace(/[()\\]/g, '')
    .split('\n')
    .slice(0, 6)
    .join(' | ');

  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 420 >>
stream
BT
/F1 14 Tf
50 730 Td
(CAMPUS RESOURCE EXCHANGE - ARCHIVAL ACADEMIC DOCUMENT) Tj
/F1 11 Tf
0 -28 Td
(Catalog ID: ${resource.code}) Tj
0 -20 Td
(Title: ${safeTitle.slice(0, 75)}) Tj
0 -20 Td
(Course: ${safeCourse.slice(0, 75)}) Tj
0 -20 Td
(Department: ${resource.department} | Semester ${resource.semester}) Tj
0 -28 Td
(Summary: ${safePreview.slice(0, 95)}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000229 00000 n 
0000000297 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
769
%%EOF`;
}

// Strict State Machine Transition Validator (Section 20 & 21)
export function validateBorrowStateTransition(
  currentStatus: BorrowStatus,
  targetStatus: BorrowStatus,
  actorId: string,
  ownerId: string,
  requesterId: string,
  isAdmin: boolean
): { allowed: boolean; reason?: string; nextResourceAvailability?: BorrowStatus } {
  const isOwner = actorId === ownerId;
  const isRequester = actorId === requesterId;

  if (!isOwner && !isRequester && !isAdmin) {
    return {
      allowed: false,
      reason: 'Only the resource owner or borrower can transition this request.',
    };
  }

  switch (currentStatus) {
    case BorrowStatus.REQUESTED:
      if (targetStatus === BorrowStatus.APPROVED) {
        if (!isOwner && !isAdmin) {
          return { allowed: false, reason: 'Only the resource owner can approve a borrow request.' };
        }
        return { allowed: true, nextResourceAvailability: BorrowStatus.APPROVED };
      }
      if (targetStatus === BorrowStatus.REJECTED) {
        if (!isOwner && !isAdmin) {
          return { allowed: false, reason: 'Only the resource owner can reject a borrow request.' };
        }
        return { allowed: true, nextResourceAvailability: BorrowStatus.AVAILABLE };
      }
      if (targetStatus === BorrowStatus.CANCELLED) {
        if (!isRequester && !isOwner && !isAdmin) {
          return { allowed: false, reason: 'Only the requester or owner can cancel a request.' };
        }
        return { allowed: true, nextResourceAvailability: BorrowStatus.AVAILABLE };
      }
      break;

    case BorrowStatus.APPROVED:
      if (targetStatus === BorrowStatus.BORROWED) {
        if (!isOwner && !isRequester && !isAdmin) {
          return { allowed: false, reason: 'Unauthorized handover confirmation.' };
        }
        return { allowed: true, nextResourceAvailability: BorrowStatus.BORROWED };
      }
      if (targetStatus === BorrowStatus.CANCELLED) {
        return { allowed: true, nextResourceAvailability: BorrowStatus.AVAILABLE };
      }
      break;

    case BorrowStatus.BORROWED:
      if (targetStatus === BorrowStatus.RETURN_REQUESTED) {
        if (!isRequester && !isOwner && !isAdmin) {
          return { allowed: false, reason: 'Only the borrower can initiate a return request.' };
        }
        return { allowed: true, nextResourceAvailability: BorrowStatus.RETURN_REQUESTED };
      }
      if (targetStatus === BorrowStatus.OVERDUE) {
        if (!isOwner && !isAdmin) {
          return { allowed: false, reason: 'Only the owner or administrator can mark an item overdue.' };
        }
        return { allowed: true, nextResourceAvailability: BorrowStatus.OVERDUE };
      }
      break;

    case BorrowStatus.OVERDUE:
      if (targetStatus === BorrowStatus.RETURN_REQUESTED) {
        return { allowed: true, nextResourceAvailability: BorrowStatus.RETURN_REQUESTED };
      }
      if (targetStatus === BorrowStatus.RETURNED) {
        if (!isOwner && !isAdmin) {
          return { allowed: false, reason: 'Only the resource owner can confirm physical return.' };
        }
        return { allowed: true, nextResourceAvailability: BorrowStatus.AVAILABLE };
      }
      break;

    case BorrowStatus.RETURN_REQUESTED:
      if (targetStatus === BorrowStatus.RETURNED) {
        if (!isOwner && !isAdmin) {
          return { allowed: false, reason: 'Only the resource owner can confirm final return receipt.' };
        }
        return { allowed: true, nextResourceAvailability: BorrowStatus.AVAILABLE };
      }
      break;

    default:
      break;
  }

  return {
    allowed: false,
    reason: `Invalid state transition from ${currentStatus} to ${targetStatus}.`,
  };
}

export function toPublicProfile(user: StoredUserRecord): UserPublicProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    studentId: user.studentId,
    department: user.department,
    semester: user.semester,
    graduationYear: user.graduationYear,
    role: user.role,
    verificationStatus: user.verificationStatus,
    profilePhotoUrl: user.profilePhotoUrl,
    resourcesListedCount: user.resourcesListedCount,
    resourcesBorrowedCount: user.resourcesBorrowedCount,
    resourcesSharedCount: user.resourcesSharedCount,
    joinedAt: user.joinedAt,
  };
}
