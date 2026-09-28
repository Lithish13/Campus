import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { BorrowRequest, Resource, ResourceNeedRequest, UserPublicProfile } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export async function verifyFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'resources', 'connection_probe'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export async function syncResourceToFirestore(resource: Resource): Promise<void> {
  if (!auth.currentUser) return;
  const path = `resources/${resource.id}`;
  try {
    await setDoc(
      doc(db, 'resources', resource.id),
      {
        id: resource.id,
        code: resource.code,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resourceType,
        category: resource.category,
        subject: resource.subject,
        courseCode: resource.courseCode,
        department: resource.department,
        semester: resource.semester,
        academicYear: resource.academicYear,
        condition: resource.condition,
        lendingType: resource.lendingType,
        availability: resource.availability,
        moderationStatus: resource.moderationStatus,
        ownerId: auth.currentUser.uid,
        ownerName: resource.ownerName,
        ownerDepartment: resource.ownerDepartment,
        location: resource.location || '',
        fileName: resource.fileName || '',
        fileType: resource.fileType || '',
        fileSize: resource.fileSize || 0,
        downloadCount: resource.downloadCount,
        reportCount: resource.reportCount,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncProfileToFirestore(
  profile: UserPublicProfile,
  email: string
): Promise<void> {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        id: uid,
        fullName: profile.fullName,
        studentId: profile.studentId,
        department: profile.department,
        semester: profile.semester,
        graduationYear: profile.graduationYear,
        role: profile.role,
        verificationStatus: profile.verificationStatus,
        resourcesListedCount: profile.resourcesListedCount,
        resourcesBorrowedCount: profile.resourcesBorrowedCount,
        resourcesSharedCount: profile.resourcesSharedCount,
        joinedAt: profile.joinedAt,
      },
      { merge: true }
    );
    await setDoc(
      doc(db, 'users_private', uid),
      {
        id: uid,
        email,
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

export async function syncBorrowRequestToFirestore(reqItem: BorrowRequest): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(
      doc(db, 'borrow_requests', reqItem.id),
      {
        id: reqItem.id,
        resourceId: reqItem.resourceId,
        resourceTitle: reqItem.resourceTitle,
        resourceCode: reqItem.resourceCode,
        requesterId: auth.currentUser.uid,
        requesterName: reqItem.requesterName,
        ownerId: reqItem.ownerId,
        ownerName: reqItem.ownerName,
        requestedDurationDays: reqItem.requestedDurationDays,
        dueDate: reqItem.requiredUntil,
        message: reqItem.message,
        status: reqItem.status,
        createdAt: reqItem.createdAt,
        updatedAt: reqItem.updatedAt,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `borrow_requests/${reqItem.id}`);
  }
}

export async function syncNeedRequestToFirestore(need: ResourceNeedRequest): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(
      doc(db, 'resource_requests', need.id),
      {
        id: need.id,
        title: need.title,
        description: need.description,
        category: need.category,
        subject: need.subject,
        department: need.department,
        semester: need.semester,
        resourceType: need.resourceType,
        preference: need.preference,
        requiredUntil: need.requiredUntil,
        requesterId: auth.currentUser.uid,
        requesterName: need.requesterName,
        status: need.status,
        createdAt: need.createdAt,
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `resource_requests/${need.id}`);
  }
}

export async function logoutFirebase(): Promise<void> {
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch {
    // ignore signout error
  }
}

verifyFirestoreConnection();

export { signInWithPopup, signOut };
