import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from '../src/types';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'crx_dev_institutional_jwt_secret_key_change_in_production_9283749283';

export interface JwtPayloadData {
  sub: string;
  role: UserRole;
  studentId: string;
  jti: string;
  csrfToken: string;
}

// 1. Password Security (BCrypt with 10 salt rounds - Section 11 & 46)
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

// 2. Short-lived JWT Access Tokens + Session Revocation Support (Section 38 & 45)
const revokedTokenJtis = new Set<string>();

export function generateAccessToken(
  userId: string,
  role: UserRole,
  studentId: string
): { token: string; csrfToken: string; jti: string } {
  const jti = crypto.randomUUID();
  const csrfToken = crypto.randomBytes(24).toString('hex');
  const payload: JwtPayloadData = {
    sub: userId,
    role,
    studentId,
    jti,
    csrfToken,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
  return { token, csrfToken, jti };
}

export function revokeToken(jti: string): void {
  revokedTokenJtis.add(jti);
}

export function verifyAccessToken(token: string): JwtPayloadData | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayloadData;
    if (revokedTokenJtis.has(decoded.jti)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// 3. XSS Input Normalization & Escaping (Section 36 & 37)
export function sanitizeText(input: unknown, maxLength = 2000): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function normalizePlainText(input: unknown, maxLength = 2000): string {
  if (typeof input !== 'string') return '';
  // Strip control characters and dangerous HTML/script tags while preserving clean punctuation
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, maxLength);
}

// 4. File Security & Magic-Byte Signature Validation (Section 23 & 24)
const BLOCKED_EXTENSIONS = new Set([
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
  '.com',
  '.pif',
  '.php',
  '.jsp',
  '.asp',
  '.aspx',
  '.cgi',
  '.py',
  '.rb',
  '.pl',
]);

const ALLOWED_DIGITAL_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.zip',
  '.txt',
  '.md',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
  detectedType?: string;
  checksum?: string;
  sizeBytes?: number;
}

export function validateUploadedFile(
  fileName: string,
  mimeType: string,
  base64Content: string | undefined,
  category: 'DIGITAL_RESOURCE' | 'PHOTO'
): FileValidationResult {
  const cleanName = fileName.trim().toLowerCase();
  const dotIdx = cleanName.lastIndexOf('.');
  if (dotIdx === -1) {
    return { valid: false, reason: 'File must have a valid extension.' };
  }
  const ext = cleanName.slice(dotIdx);

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      reason: `Executable or script file format (${ext}) is strictly prohibited.`,
    };
  }

  // Check double extensions like notes.pdf.exe
  const parts = cleanName.split('.');
  for (let i = 1; i < parts.length; i++) {
    if (BLOCKED_EXTENSIONS.has(`.${parts[i]}`)) {
      return {
        valid: false,
        reason: `Suspicious multi-extension filename containing .${parts[i]} is rejected.`,
      };
    }
  }

  if (category === 'PHOTO' && !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      reason: 'Resource photos must be PNG, JPG, JPEG, or WEBP images.',
    };
  }

  if (category === 'DIGITAL_RESOURCE' && !ALLOWED_DIGITAL_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      reason: 'Digital resources must be PDF, DOCX, ZIP, TXT, MD, CSV, PNG, or JPG.',
    };
  }

  if (!base64Content) {
    return { valid: false, reason: 'File payload is missing.' };
  }

  // Strip optional data URL prefix
  const rawBase64 = base64Content.includes(',')
    ? base64Content.split(',')[1]
    : base64Content;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(rawBase64, 'base64');
  } catch {
    return { valid: false, reason: 'Malformed file encoding.' };
  }

  const maxBytes = category === 'PHOTO' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (buffer.length === 0) {
    return { valid: false, reason: 'Uploaded file cannot be empty (0 bytes).' };
  }
  if (buffer.length > maxBytes) {
    return {
      valid: false,
      reason: `File size exceeds maximum limit of ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    };
  }

  // Reject Windows PE / MZ executables (0x4D 0x5A) and ELF binaries (0x7F 'E' 'L' 'F')
  if (
    (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) ||
    (buffer.length >= 4 &&
      buffer[0] === 0x7f &&
      buffer[1] === 0x45 &&
      buffer[2] === 0x4c &&
      buffer[3] === 0x46)
  ) {
    return {
      valid: false,
      reason: 'Binary executable signature detected in file header. Upload rejected.',
    };
  }

  // Verify magic bytes for binary formats
  let detectedType = mimeType || 'application/octet-stream';
  if (ext === '.pdf') {
    const header = buffer.subarray(0, 4).toString('ascii');
    if (header !== '%PDF') {
      return {
        valid: false,
        reason: 'File extension is .pdf but file header does not match %PDF signature.',
      };
    }
    detectedType = 'application/pdf';
  } else if (ext === '.png') {
    if (
      buffer.length < 8 ||
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47
    ) {
      return {
        valid: false,
        reason: 'File extension is .png but PNG magic bytes are invalid.',
      };
    }
    detectedType = 'image/png';
  } else if (ext === '.jpg' || ext === '.jpeg') {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return {
        valid: false,
        reason: 'File extension is JPEG but JPEG magic bytes (FF D8 FF) are invalid.',
      };
    }
    detectedType = 'image/jpeg';
  } else if (ext === '.zip' || ext === '.docx') {
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return {
        valid: false,
        reason: `File extension is ${ext} but PKZIP container signature is invalid.`,
      };
    }
    detectedType =
      ext === '.docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/zip';
  } else if (ext === '.txt' || ext === '.md' || ext === '.csv') {
    detectedType = 'text/plain';
  }

  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    valid: true,
    detectedType,
    checksum,
    sizeBytes: buffer.length,
  };
}

// 5. Security Headers Middleware (Section 41 & 42)
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.googleusercontent.com",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com",
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );
  next();
}

// 6. Rate Limiter Middleware Factory (Section 39)
interface RateBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(windowMs: number, maxRequests: number, code: string) {
  const buckets = new Map<string, RateBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${code}:${ip}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || now > current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this client. Please wait before retrying.',
        },
      });
      return;
    }

    current.count += 1;
    next();
  };
}
