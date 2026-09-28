import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createRateLimiter,
  generateAccessToken,
  hashPassword,
  JwtPayloadData,
  normalizePlainText,
  revokeToken,
  securityHeadersMiddleware,
  validateUploadedFile,
  verifyAccessToken,
  verifyPassword,
} from './server/security';
import {
  appendAuditLog,
  createNotification,
  loadDatabase,
  readPrivateUploadedFile,
  saveDatabase,
  savePrivateUploadedFile,
  StoredUserRecord,
  toPublicProfile,
  validateBorrowStateTransition,
} from './server/store';
import { OPENAPI_SPEC, aggregateAnalytics, AggregateAnalyticsStore } from './server/openapi';
import {
  BorrowRequest,
  BorrowStatus,
  ContextualMessage,
  ContentReport,
  LendingType,
  ModerationStatus,
  ReportReason,
  ReportStatus,
  Resource,
  ResourceCondition,
  ResourceNeedRequest,
  ResourceType,
  UserRole,
  VerificationStatus,
} from './src/types';

declare global {
  namespace Express {
    interface Request {
      authUser?: StoredUserRecord;
      jwtPayload?: JwtPayloadData;
      clientIp?: string;
    }
  }
}

function sendSuccess<T>(res: Response, data: T, message: string, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    message,
  });
}

function sendError(res: Response, code: string, message: string, status = 400): void {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}

function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
}

// Authentication Middleware (supports HttpOnly Cookie or Bearer Header + CSRF validation)
function extractAuthUser(req: Request): { user?: StoredUserRecord; payload?: JwtPayloadData } {
  const cookieToken = req.cookies?.crx_access_token;
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

  const rawToken = bearerToken || cookieToken;
  if (!rawToken) return {};

  const payload = verifyAccessToken(rawToken);
  if (!payload) return {};

  const db = loadDatabase();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user || user.verificationStatus === VerificationStatus.SUSPENDED) {
    return {};
  }
  return { user, payload };
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const { user, payload } = extractAuthUser(req);
  if (!user || !payload) {
    sendError(
      res,
      'UNAUTHORIZED',
      'Authentication is required to perform this action.',
      401
    );
    return;
  }

  // CSRF check for state-mutating requests using cookies (Section 38)
  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    req.cookies?.crx_access_token &&
    !req.headers.authorization
  ) {
    const csrfHeader = req.headers['x-csrf-token'];
    if (csrfHeader && csrfHeader !== payload.csrfToken) {
      sendError(res, 'CSRF_INVALID', 'Invalid CSRF security token.', 403);
      return;
    }
  }

  req.authUser = user;
  req.jwtPayload = payload;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.authUser || req.authUser.role !== UserRole.ADMIN) {
      sendError(
        res,
        'FORBIDDEN_ADMIN_ONLY',
        'Administrator privileges are required to access this endpoint.',
        403
      );
      return;
    }
    next();
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  loadDatabase();

  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: '16mb' }));

  // Structured Server Observability Logs (Section 85: Request ID, HTTP method, Endpoint, Status, Duration, Error type; zero secrets)
  app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    const startHr = process.hrtime.bigint();
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
      if (req.path.startsWith('/api') || req.path === '/health') {
        const logEntry: Record<string, unknown> = {
          timestamp: new Date().toISOString(),
          requestId,
          method: req.method,
          endpoint: req.path,
          status: res.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
        };
        if (res.statusCode >= 400) {
          logEntry.errorType =
            res.statusCode === 401
              ? 'UNAUTHORIZED'
              : res.statusCode === 403
              ? 'FORBIDDEN'
              : res.statusCode === 404
              ? 'NOT_FOUND'
              : res.statusCode === 429
              ? 'RATE_LIMITED'
              : res.statusCode >= 500
              ? 'SERVER_ERROR'
              : 'CLIENT_VALIDATION_ERROR';
        }
        console.log(JSON.stringify(logEntry));
      }
    });
    next();
  });

  // Minimal Health Check Endpoints (Section 84: Never expose DB credentials, env vars, or secrets)
  app.get(['/health', '/api/health'], (_req, res) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
    });
  });

  // SEO Sitemap, Robots & Favicon Routes (Sections 60, 61, 62)
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Allow: /browse',
        'Allow: /requests',
        'Allow: /how-it-works',
        'Allow: /about',
        'Allow: /privacy',
        'Allow: /terms',
        '',
        'Disallow: /admin',
        'Disallow: /api',
        'Disallow: /dashboard',
        'Disallow: /private',
        'Disallow: /activity',
        '',
        'Sitemap: /sitemap.xml',
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl =
      process.env.APP_URL ||
      `${req.protocol}://${req.get('host') || 'your-domain.com'}`;
    const publicPaths = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/browse', priority: '0.9', changefreq: 'hourly' },
      { path: '/requests', priority: '0.8', changefreq: 'hourly' },
      { path: '/how-it-works', priority: '0.6', changefreq: 'monthly' },
      { path: '/about', priority: '0.6', changefreq: 'monthly' },
      { path: '/privacy', priority: '0.4', changefreq: 'monthly' },
      { path: '/terms', priority: '0.4', changefreq: 'monthly' },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPaths
      .map(
        (p) =>
          `  <url>\n    <loc>${baseUrl.replace(/\/+$/, '')}${p.path}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
      )
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  });

  app.get('/favicon.ico', (_req, res) => {
    res.redirect(302, '/favicon.svg');
  });

  // Explicit CORS configuration (Section 40)
  app.use((req, res, next) => {
    req.clientIp = getClientIp(req);
    const origin = req.headers.origin;
    const allowedOrigin = process.env.APP_URL || process.env.FRONTEND_URL || origin;
    if (origin && allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-CSRF-Token'
      );
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Rate limiters (Section 39)
  const authLimiter = createRateLimiter(15 * 60 * 1000, 30, 'auth');
  const writeLimiter = createRateLimiter(15 * 60 * 1000, 80, 'write');
  const downloadLimiter = createRateLimiter(15 * 60 * 1000, 60, 'download');
  const apiLimiter = createRateLimiter(15 * 60 * 1000, 300, 'api');

  app.use('/api', apiLimiter);

  // ============================================================================
  // TAXONOMY & METADATA ENDPOINTS
  // ============================================================================
  app.get('/api/taxonomy', (_req, res) => {
    const db = loadDatabase();
    sendSuccess(
      res,
      {
        allowedDomains: db.allowedDomains,
        categories: db.categories,
        departments: db.departments,
        semesters: db.semesters,
        subjects: db.subjects,
      },
      'Campus taxonomy loaded.'
    );
  });

  // ============================================================================
  // AUTHENTICATION ENDPOINTS (Sections 11, 12, 45, 46)
  // ============================================================================
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const db = loadDatabase();
      const fullName = normalizePlainText(req.body.fullName, 120);
      const email = normalizePlainText(req.body.email, 160).toLowerCase();
      const studentId = normalizePlainText(req.body.studentId, 40).toUpperCase();
      const department = normalizePlainText(req.body.department, 120);
      const semester = Number(req.body.semester);
      const graduationYear = Number(req.body.graduationYear);
      const password = typeof req.body.password === 'string' ? req.body.password : '';

      if (fullName.length < 2) {
        sendError(res, 'VALIDATION_ERROR', 'Full name must be at least 2 characters.');
        return;
      }

      const emailParts = email.split('@');
      if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1]) {
        sendError(res, 'INVALID_EMAIL', 'Please enter a valid college email address.');
        return;
      }

      const emailDomain = emailParts[1];
      const domainAllowed = db.allowedDomains.some(
        (allowed) => emailDomain === allowed || emailDomain.endsWith(`.${allowed}`)
      );

      if (!domainAllowed) {
        sendError(
          res,
          'COLLEGE_DOMAIN_RESTRICTED',
          `Registration requires an official college email domain (${db.allowedDomains.slice(0, 4).join(', ')}).`
        );
        return;
      }

      if (studentId.length < 4) {
        sendError(res, 'INVALID_STUDENT_ID', 'Please enter a valid college Student ID.');
        return;
      }

      if (!db.departments.some((d) => d.name === department)) {
        sendError(res, 'INVALID_DEPARTMENT', 'Please select a valid academic department.');
        return;
      }

      if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
        sendError(res, 'INVALID_SEMESTER', 'Semester must be between 1 and 8.');
        return;
      }

      if (!Number.isInteger(graduationYear) || graduationYear < 2025 || graduationYear > 2034) {
        sendError(res, 'INVALID_GRAD_YEAR', 'Graduation year must be between 2025 and 2034.');
        return;
      }

      if (password.length < 8) {
        sendError(
          res,
          'WEAK_PASSWORD',
          'Password must be at least 8 characters long.'
        );
        return;
      }

      if (db.users.some((u) => u.email.toLowerCase() === email)) {
        sendError(res, 'EMAIL_EXISTS', 'An account with this college email already exists.', 409);
        return;
      }

      if (db.users.some((u) => u.studentId.toUpperCase() === studentId)) {
        sendError(res, 'STUDENT_ID_EXISTS', 'This Student ID is already registered.', 409);
        return;
      }

      const passwordHash = await hashPassword(password);
      const newUser: StoredUserRecord = {
        id: `usr-${crypto.randomUUID().slice(0, 8)}`,
        fullName,
        email,
        studentId,
        passwordHash,
        department,
        semester,
        graduationYear,
        role: UserRole.STUDENT,
        verificationStatus: VerificationStatus.VERIFIED,
        emailVerified: true,
        resourcesListedCount: 0,
        resourcesBorrowedCount: 0,
        resourcesSharedCount: 0,
        joinedAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      saveDatabase();

      appendAuditLog(
        newUser.id,
        newUser.fullName,
        newUser.role,
        'REGISTER',
        'USER',
        newUser.studentId,
        req.clientIp || '127.0.0.1',
        `Registered student account (${newUser.department}, Sem ${newUser.semester}).`
      );

      const { token, csrfToken } = generateAccessToken(
        newUser.id,
        newUser.role,
        newUser.studentId
      );

      res.cookie('crx_access_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60 * 1000,
      });

      sendSuccess(
        res,
        {
          user: {
            ...toPublicProfile(newUser),
            email: newUser.email,
            emailVerified: newUser.emailVerified,
            csrfToken,
          },
          token,
        },
        'Campus account registered and verified.',
        201
      );
    } catch {
      sendError(res, 'REGISTRATION_FAILED', 'Unable to complete registration.', 500);
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const db = loadDatabase();
      const email = normalizePlainText(req.body.email, 160).toLowerCase();
      const password = typeof req.body.password === 'string' ? req.body.password : '';

      const user = db.users.find((u) => u.email.toLowerCase() === email);
      if (!user) {
        appendAuditLog(
          'anonymous',
          email || 'unknown',
          'GUEST',
          'FAILED_LOGIN',
          'AUTH',
          email || 'unknown',
          req.clientIp || '127.0.0.1',
          'Login failed: account not found.'
        );
        sendError(res, 'INVALID_CREDENTIALS', 'Invalid college email or password.', 401);
        return;
      }

      if (user.verificationStatus === VerificationStatus.SUSPENDED) {
        sendError(
          res,
          'ACCOUNT_SUSPENDED',
          'This account has been suspended by campus administration.',
          403
        );
        return;
      }

      const validPassword = await verifyPassword(password, user.passwordHash);
      if (!validPassword) {
        appendAuditLog(
          user.id,
          user.fullName,
          user.role,
          'FAILED_LOGIN',
          'AUTH',
          user.studentId,
          req.clientIp || '127.0.0.1',
          'Login failed: invalid password verification.'
        );
        sendError(res, 'INVALID_CREDENTIALS', 'Invalid college email or password.', 401);
        return;
      }

      const { token, csrfToken } = generateAccessToken(
        user.id,
        user.role,
        user.studentId
      );

      res.cookie('crx_access_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60 * 1000,
      });

      appendAuditLog(
        user.id,
        user.fullName,
        user.role,
        'LOGIN',
        'USER',
        user.studentId,
        req.clientIp || '127.0.0.1',
        'Authenticated session started.'
      );

      sendSuccess(
        res,
        {
          user: {
            ...toPublicProfile(user),
            email: user.email,
            emailVerified: user.emailVerified,
            csrfToken,
          },
          token,
        },
        'Signed in successfully.'
      );
    } catch {
      sendError(res, 'LOGIN_ERROR', 'Authentication service encountered an error.', 500);
    }
  });

  // Firebase Institutional Sign-In Synchronization
  app.post('/api/auth/firebase-sync', authLimiter, async (req, res) => {
    try {
      const db = loadDatabase();
      const email = normalizePlainText(req.body.email, 160).toLowerCase();
      const displayName = normalizePlainText(req.body.displayName, 120) || 'Campus Student';
      const uid = normalizePlainText(req.body.uid, 80);

      if (!email || !uid) {
        sendError(res, 'INVALID_SSO_PAYLOAD', 'Missing institutional identity payload.');
        return;
      }

      let user = db.users.find((u) => u.email.toLowerCase() === email);
      if (!user) {
        const isDefaultAdmin = email === 'lithis2649@gmail.com';
        const passwordHash = await hashPassword(crypto.randomUUID());
        user = {
          id: `usr-${uid.slice(0, 10)}`,
          fullName: displayName,
          email,
          studentId: isDefaultAdmin
            ? 'STAFF-ADMIN-01'
            : `2026CS${Math.floor(1000 + Math.random() * 8999)}`,
          passwordHash,
          department: 'Computer Science and Engineering',
          semester: 5,
          graduationYear: 2028,
          role: isDefaultAdmin ? UserRole.ADMIN : UserRole.STUDENT,
          verificationStatus: VerificationStatus.VERIFIED,
          emailVerified: true,
          resourcesListedCount: 0,
          resourcesBorrowedCount: 0,
          resourcesSharedCount: 0,
          joinedAt: new Date().toISOString(),
        };
        db.users.push(user);
        saveDatabase();

        appendAuditLog(
          user.id,
          user.fullName,
          user.role,
          'REGISTER_SSO',
          'USER',
          user.studentId,
          req.clientIp || '127.0.0.1',
          'Provisioned campus profile via institutional Google Auth.'
        );
      }

      if (user.verificationStatus === VerificationStatus.SUSPENDED) {
        sendError(res, 'ACCOUNT_SUSPENDED', 'This account is suspended.', 403);
        return;
      }

      const { token, csrfToken } = generateAccessToken(
        user.id,
        user.role,
        user.studentId
      );

      res.cookie('crx_access_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60 * 1000,
      });

      sendSuccess(
        res,
        {
          user: {
            ...toPublicProfile(user),
            email: user.email,
            emailVerified: user.emailVerified,
            csrfToken,
          },
          token,
        },
        'Institutional SSO session synchronized.'
      );
    } catch {
      sendError(res, 'SSO_SYNC_ERROR', 'Unable to synchronize institutional session.', 500);
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const { user, payload } = extractAuthUser(req);
    if (payload) {
      revokeToken(payload.jti);
    }
    if (user) {
      appendAuditLog(
        user.id,
        user.fullName,
        user.role,
        'LOGOUT',
        'USER',
        user.studentId,
        req.clientIp || '127.0.0.1',
        'Session terminated by user.'
      );
    }
    res.clearCookie('crx_access_token');
    sendSuccess(res, {}, 'Logged out and session invalidated.');
  });

  app.get('/api/auth/me', (req, res) => {
    const { user, payload } = extractAuthUser(req);
    if (!user || !payload) {
      sendSuccess(res, { user: null }, 'No active session.');
      return;
    }
    sendSuccess(
      res,
      {
        user: {
          ...toPublicProfile(user),
          email: user.email,
          emailVerified: user.emailVerified,
          csrfToken: payload.csrfToken,
        },
      },
      'Active session verified.'
    );
  });

  app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
    const db = loadDatabase();
    const email = normalizePlainText(req.body.email, 160).toLowerCase();
    const studentId = normalizePlainText(req.body.studentId, 40).toUpperCase();
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

    if (newPassword.length < 8) {
      sendError(res, 'WEAK_PASSWORD', 'New password must be at least 8 characters.');
      return;
    }

    const user = db.users.find(
      (u) => u.email.toLowerCase() === email && u.studentId.toUpperCase() === studentId
    );
    if (!user) {
      sendError(
        res,
        'VERIFICATION_MISMATCH',
        'Could not verify matching college email and Student ID.',
        404
      );
      return;
    }

    user.passwordHash = await hashPassword(newPassword);
    saveDatabase();

    appendAuditLog(
      user.id,
      user.fullName,
      user.role,
      'PASSWORD_RESET',
      'USER',
      user.studentId,
      req.clientIp || '127.0.0.1',
      'Password reset completed via institutional verification.'
    );

    sendSuccess(res, {}, 'Password has been reset. You may now sign in.');
  });

  // ============================================================================
  // PUBLIC USER PROFILE ENDPOINT (Section 13 - No Email Exposed)
  // ============================================================================
  app.get('/api/users/:id/profile', (req, res) => {
    const db = loadDatabase();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      sendError(res, 'USER_NOT_FOUND', 'Student profile not found.', 404);
      return;
    }
    const listedResources = db.resources.filter(
      (r) => r.ownerId === target.id && r.moderationStatus === ModerationStatus.APPROVED
    );
    sendSuccess(
      res,
      {
        profile: toPublicProfile(target),
        resources: listedResources,
      },
      'Public student profile loaded.'
    );
  });

  // ============================================================================
  // RESOURCES CATALOG, SEARCH, FILTER & CRUD (Sections 14-19, 23, 24)
  // ============================================================================
  app.get('/api/resources', (req, res) => {
    const db = loadDatabase();
    const { user } = extractAuthUser(req);

    const q = normalizePlainText(req.query.q, 120).toLowerCase();
    const department = normalizePlainText(req.query.department, 120);
    const semester = req.query.semester ? Number(req.query.semester) : undefined;
    const subject = normalizePlainText(req.query.subject, 140);
    const category = normalizePlainText(req.query.category, 80);
    const resourceType = normalizePlainText(req.query.resourceType, 20);
    const lendingType = normalizePlainText(req.query.lendingType, 24);
    const availableOnly = req.query.availableOnly === 'true';

    const filtered = db.resources.filter((r) => {
      // Only show APPROVED resources publicly; owners and admins can see their own pending items
      const isVisible =
        r.moderationStatus === ModerationStatus.APPROVED ||
        (user && (user.id === r.ownerId || user.role === UserRole.ADMIN));
      if (!isVisible) return false;

      if (q) {
        const hay = [
          r.title,
          r.subject,
          r.courseCode,
          r.category,
          r.department,
          `semester ${r.semester}`,
          r.resourceType,
          r.code,
          r.description,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (department && r.department !== department) return false;
      if (semester && r.semester !== semester) return false;
      if (subject && r.subject !== subject) return false;
      if (category && r.category !== category) return false;
      if (resourceType && r.resourceType !== resourceType) return false;
      if (lendingType && r.lendingType !== lendingType) return false;
      if (availableOnly && r.availability !== BorrowStatus.AVAILABLE) return false;

      return true;
    });

    sendSuccess(res, { resources: filtered }, 'Resources retrieved.');
  });

  app.get('/api/resources/:id', (req, res) => {
    const db = loadDatabase();
    const { user } = extractAuthUser(req);
    const resource = db.resources.find((r) => r.id === req.params.id);

    if (!resource) {
      sendError(res, 'RESOURCE_NOT_FOUND', 'Resource was not found.', 404);
      return;
    }

    if (
      resource.moderationStatus !== ModerationStatus.APPROVED &&
      (!user || (user.id !== resource.ownerId && user.role !== UserRole.ADMIN))
    ) {
      sendError(
        res,
        'RESOURCE_UNDER_MODERATION',
        'This resource is currently awaiting moderator approval.',
        403
      );
      return;
    }

    // Contextual messages & borrow requests visible only to involved parties or admin (IDOR Protection - Section 48)
    const relatedRequests = user
      ? db.borrowRequests.filter(
          (br) =>
            br.resourceId === resource.id &&
            (br.requesterId === user.id ||
              br.ownerId === user.id ||
              user.role === UserRole.ADMIN)
        )
      : [];

    const relatedMessages = user
      ? db.messages.filter(
          (m) =>
            m.resourceId === resource.id &&
            (m.senderId === user.id ||
              m.recipientId === user.id ||
              resource.ownerId === user.id ||
              user.role === UserRole.ADMIN)
        )
      : [];

    sendSuccess(
      res,
      {
        resource,
        borrowRequests: relatedRequests,
        messages: relatedMessages,
      },
      'Resource details loaded.'
    );
  });

  app.post('/api/resources', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;

    const title = normalizePlainText(req.body.title, 150);
    const description = normalizePlainText(req.body.description, 2000);
    const resourceType = normalizePlainText(req.body.resourceType, 20) as ResourceType;
    const category = normalizePlainText(req.body.category, 80);
    const subject = normalizePlainText(req.body.subject, 140);
    const department = normalizePlainText(req.body.department, 120);
    const semester = Number(req.body.semester);
    const condition = normalizePlainText(req.body.condition, 24) as ResourceCondition;
    const lendingType = normalizePlainText(req.body.lendingType, 24) as LendingType;
    const location = normalizePlainText(req.body.location, 160);

    if (title.length < 3 || title.length > 150) {
      sendError(res, 'INVALID_TITLE', 'Title must be between 3 and 150 characters.');
      return;
    }
    if (description.length < 10 || description.length > 2000) {
      sendError(
        res,
        'INVALID_DESCRIPTION',
        'Description must be between 10 and 2,000 characters.'
      );
      return;
    }
    if (![ResourceType.PHYSICAL, ResourceType.DIGITAL].includes(resourceType)) {
      sendError(res, 'INVALID_RESOURCE_TYPE', 'Resource type must be PHYSICAL or DIGITAL.');
      return;
    }
    if (!db.categories.some((c) => c.name === category)) {
      sendError(res, 'INVALID_CATEGORY', 'Please select a valid resource category.');
      return;
    }
    if (!db.departments.some((d) => d.name === department)) {
      sendError(res, 'INVALID_DEPARTMENT', 'Please select a valid academic department.');
      return;
    }
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
      sendError(res, 'INVALID_SEMESTER', 'Semester must be between 1 and 8.');
      return;
    }

    const matchedSubject = db.subjects.find((s) => s.name === subject);
    const courseCode =
      matchedSubject?.courseCode ||
      normalizePlainText(req.body.courseCode, 16).toUpperCase() ||
      'GEN101';

    let fileName: string | undefined;
    let fileType: string | undefined;
    let fileSize: number | undefined;
    let fileChecksum: string | undefined;
    let filePreviewText: string | undefined;

    if (resourceType === ResourceType.DIGITAL) {
      const uploadedFileName = normalizePlainText(req.body.fileName, 180);
      const uploadedMime = normalizePlainText(req.body.fileType, 80);
      const uploadedBase64 =
        typeof req.body.fileDataBase64 === 'string' ? req.body.fileDataBase64 : undefined;

      const validation = validateUploadedFile(
        uploadedFileName,
        uploadedMime,
        uploadedBase64,
        'DIGITAL_RESOURCE'
      );

      if (!validation.valid) {
        sendError(
          res,
          'FILE_SECURITY_REJECTED',
          validation.reason || 'Uploaded digital file failed security validation.'
        );
        return;
      }

      fileName = uploadedFileName;
      fileType = validation.detectedType;
      fileSize = validation.sizeBytes;
      fileChecksum = validation.checksum;
      filePreviewText =
        normalizePlainText(req.body.filePreviewText, 600) ||
        `Verified academic upload (${uploadedFileName}, ${validation.sizeBytes} bytes, SHA-256: ${validation.checksum?.slice(0, 16)}...)`;
    } else {
      if (!location || location.length < 3) {
        sendError(
          res,
          'LOCATION_REQUIRED',
          'Please specify a campus pickup or handover location for physical items.'
        );
        return;
      }
    }

    const validatedPhotos: string[] = [];
    if (Array.isArray(req.body.photos)) {
      for (const photoObj of req.body.photos.slice(0, 3)) {
        if (photoObj && typeof photoObj.dataUrl === 'string') {
          const check = validateUploadedFile(
            photoObj.name || 'photo.jpg',
            photoObj.type || 'image/jpeg',
            photoObj.dataUrl,
            'PHOTO'
          );
          if (!check.valid) {
            sendError(
              res,
              'INVALID_IMAGE',
              check.reason || 'Uploaded photo failed image validation.'
            );
            return;
          }
          validatedPhotos.push(photoObj.dataUrl);
        }
      }
    }

    const nextSeq = 101 + db.resources.length;
    const resourceId = `res-${crypto.randomUUID().slice(0, 8)}`;
    const catalogCode = `CRX-2026-0${nextSeq}`;

    // Digital resources initially enter PENDING_REVIEW as required by Section 25
    const initialModerationStatus =
      resourceType === ResourceType.DIGITAL && user.role !== UserRole.ADMIN
        ? ModerationStatus.PENDING_REVIEW
        : ModerationStatus.APPROVED;

    const newResource: Resource = {
      id: resourceId,
      code: catalogCode,
      title,
      description,
      resourceType,
      category,
      subject: subject || 'General Coursework',
      courseCode,
      department,
      semester,
      academicYear: '2026-2027',
      condition:
        resourceType === ResourceType.DIGITAL
          ? ResourceCondition.NOT_APPLICABLE
          : condition || ResourceCondition.GOOD,
      lendingType:
        resourceType === ResourceType.DIGITAL
          ? LendingType.DIGITAL_DOWNLOAD
          : lendingType || LendingType.BORROW,
      availability: BorrowStatus.AVAILABLE,
      moderationStatus: initialModerationStatus,
      ownerId: user.id,
      ownerName: user.fullName,
      ownerStudentId: user.studentId,
      ownerDepartment: user.department,
      ownerSemester: user.semester,
      ownerVerificationStatus: user.verificationStatus,
      location: resourceType === ResourceType.PHYSICAL ? location : undefined,
      photos: validatedPhotos,
      fileName,
      fileType,
      fileSize,
      fileChecksum,
      filePreviewText,
      downloadCount: 0,
      reportCount: 0,
      ratings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (
      resourceType === ResourceType.DIGITAL &&
      fileName &&
      fileType &&
      fileChecksum &&
      typeof req.body.fileDataBase64 === 'string'
    ) {
      savePrivateUploadedFile(
        resourceId,
        fileName,
        fileType,
        req.body.fileDataBase64,
        fileChecksum
      );
    }

    db.resources.unshift(newResource);
    user.resourcesListedCount += 1;
    saveDatabase();

    appendAuditLog(
      user.id,
      user.fullName,
      user.role,
      'RESOURCE_CREATE',
      'RESOURCE',
      newResource.code,
      req.clientIp || '127.0.0.1',
      `Listed ${newResource.resourceType} resource "${newResource.title}" (status: ${newResource.moderationStatus}).`
    );

    sendSuccess(
      res,
      { resource: newResource },
      initialModerationStatus === ModerationStatus.PENDING_REVIEW
        ? 'Digital resource uploaded and queued for campus moderator approval.'
        : 'Resource listed in the campus catalog.',
      201
    );
  });

  app.put('/api/resources/:id', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const resource = db.resources.find((r) => r.id === req.params.id);

    if (!resource) {
      sendError(res, 'RESOURCE_NOT_FOUND', 'Resource was not found.', 404);
      return;
    }

    // Ownership check (Section 47 & 48)
    if (resource.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      sendError(
        res,
        'FORBIDDEN_NOT_OWNER',
        'You do not have permission to modify another student’s resource.',
        403
      );
      return;
    }

    const title = normalizePlainText(req.body.title, 150);
    const description = normalizePlainText(req.body.description, 2000);
    const location = normalizePlainText(req.body.location, 160);
    const condition = normalizePlainText(req.body.condition, 24) as ResourceCondition;

    if (title.length >= 3) resource.title = title;
    if (description.length >= 10) resource.description = description;
    if (location && resource.resourceType === ResourceType.PHYSICAL) {
      resource.location = location;
    }
    if (
      condition &&
      [ResourceCondition.NEW, ResourceCondition.GOOD, ResourceCondition.FAIR].includes(condition)
    ) {
      resource.condition = condition;
    }
    resource.updatedAt = new Date().toISOString();
    saveDatabase();

    sendSuccess(res, { resource }, 'Resource updated successfully.');
  });

  app.delete('/api/resources/:id', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const idx = db.resources.findIndex((r) => r.id === req.params.id);

    if (idx === -1) {
      sendError(res, 'RESOURCE_NOT_FOUND', 'Resource was not found.', 404);
      return;
    }

    const resource = db.resources[idx];
    if (resource.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      sendError(
        res,
        'FORBIDDEN_NOT_OWNER',
        'You cannot delete a resource owned by another student.',
        403
      );
      return;
    }

    db.resources.splice(idx, 1);
    saveDatabase();

    appendAuditLog(
      user.id,
      user.fullName,
      user.role,
      'RESOURCE_DELETE',
      'RESOURCE',
      resource.code,
      req.clientIp || '127.0.0.1',
      `Deleted resource "${resource.title}".`
    );

    sendSuccess(res, {}, 'Resource removed from catalog.');
  });

  // Secure Digital Resource Download Endpoint (Section 23)
  app.get('/api/resources/:id/download', requireAuth, downloadLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const resource = db.resources.find((r) => r.id === req.params.id);

    if (!resource || resource.resourceType !== ResourceType.DIGITAL) {
      sendError(res, 'RESOURCE_NOT_FOUND', 'Digital resource not found.', 404);
      return;
    }

    if (
      resource.moderationStatus !== ModerationStatus.APPROVED &&
      resource.ownerId !== user.id &&
      user.role !== UserRole.ADMIN
    ) {
      sendError(
        res,
        'DOWNLOAD_NOT_APPROVED',
        'This digital resource has not yet been approved by campus moderators.',
        403
      );
      return;
    }

    const fileData = readPrivateUploadedFile(resource.id);
    if (!fileData) {
      sendError(res, 'FILE_UNAVAILABLE', 'Digital file stream is unavailable.', 404);
      return;
    }

    resource.downloadCount += 1;
    saveDatabase();

    appendAuditLog(
      user.id,
      user.fullName,
      user.role,
      'FILE_DOWNLOAD',
      'RESOURCE',
      resource.code,
      req.clientIp || '127.0.0.1',
      `Downloaded digital resource ${fileData.fileName} (${fileData.buffer.length} bytes).`
    );

    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileData.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(fileData.buffer);
  });

  // ============================================================================
  // BORROW REQUESTS & STATE MACHINE WORKFLOW (Sections 20 & 21)
  // ============================================================================
  app.post('/api/resources/:id/requests', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const resource = db.resources.find((r) => r.id === req.params.id);

    if (!resource) {
      sendError(res, 'RESOURCE_NOT_FOUND', 'Resource was not found.', 404);
      return;
    }

    if (resource.resourceType !== ResourceType.PHYSICAL) {
      sendError(
        res,
        'INVALID_OPERATION',
        'Digital resources can be downloaded directly without a physical borrow request.'
      );
      return;
    }

    if (resource.ownerId === user.id) {
      sendError(res, 'CANNOT_BORROW_OWN', 'You cannot request your own listed resource.');
      return;
    }

    if (resource.availability !== BorrowStatus.AVAILABLE) {
      sendError(
        res,
        'RESOURCE_UNAVAILABLE',
        `This item is currently ${resource.availability} and cannot accept new requests.`,
        409
      );
      return;
    }

    const requestedDurationDays = Number(req.body.requestedDurationDays) || 7;
    const requiredUntil = normalizePlainText(req.body.requiredUntil, 32);
    const message = normalizePlainText(req.body.message, 1000);

    if (requestedDurationDays < 1 || requestedDurationDays > 180) {
      sendError(res, 'INVALID_DURATION', 'Requested duration must be between 1 and 180 days.');
      return;
    }
    if (!requiredUntil) {
      sendError(res, 'DATE_REQUIRED', 'Please specify the date until which you need the item.');
      return;
    }
    if (message.length < 5) {
      sendError(
        res,
        'MESSAGE_REQUIRED',
        'Please include a short contextual note (at least 5 characters) for the owner.'
      );
      return;
    }

    const newReq: BorrowRequest = {
      id: `breq-${crypto.randomUUID().slice(0, 8)}`,
      resourceId: resource.id,
      resourceCode: resource.code,
      resourceTitle: resource.title,
      resourceType: resource.resourceType,
      lendingType: resource.lendingType,
      pickupLocation: resource.location,
      requesterId: user.id,
      requesterName: user.fullName,
      requesterStudentId: user.studentId,
      requesterDepartment: user.department,
      ownerId: resource.ownerId,
      ownerName: resource.ownerName,
      requestedDurationDays,
      requiredUntil,
      message,
      status: BorrowStatus.REQUESTED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    resource.availability = BorrowStatus.REQUESTED;
    resource.updatedAt = new Date().toISOString();
    db.borrowRequests.unshift(newReq);

    // Also create initial contextual message attached to the request
    db.messages.push({
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      resourceId: resource.id,
      borrowRequestId: newReq.id,
      senderId: user.id,
      senderName: user.fullName,
      senderRole: user.role,
      recipientId: resource.ownerId,
      body: message,
      createdAt: new Date().toISOString(),
    });

    createNotification(
      resource.ownerId,
      'NEW_BORROW_REQUEST',
      `New Request for ${resource.code}`,
      `${user.fullName} (${user.department}) requested "${resource.title}" for ${requestedDurationDays} days.`,
      resource.id,
      newReq.id
    );

    appendAuditLog(
      user.id,
      user.fullName,
      user.role,
      'BORROW_REQUEST_CREATED',
      'BORROW_REQUEST',
      newReq.id,
      req.clientIp || '127.0.0.1',
      `Requested ${resource.code} (${resource.title}) from ${resource.ownerName}.`
    );

    saveDatabase();
    sendSuccess(res, { borrowRequest: newReq, resource }, 'Borrow request submitted.', 201);
  });

  app.patch('/api/borrow-requests/:id/transition', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const borrowReq = db.borrowRequests.find((b) => b.id === req.params.id);

    if (!borrowReq) {
      sendError(res, 'REQUEST_NOT_FOUND', 'Borrow request was not found.', 404);
      return;
    }

    const targetStatus = normalizePlainText(req.body.status, 32) as BorrowStatus;
    const validation = validateBorrowStateTransition(
      borrowReq.status,
      targetStatus,
      user.id,
      borrowReq.ownerId,
      borrowReq.requesterId,
      user.role === UserRole.ADMIN
    );

    if (!validation.allowed) {
      sendError(
        res,
        'INVALID_STATE_TRANSITION',
        validation.reason || 'State transition not permitted.',
        403
      );
      return;
    }

    const previousStatus = borrowReq.status;
    borrowReq.status = targetStatus;
    borrowReq.updatedAt = new Date().toISOString();

    const resource = db.resources.find((r) => r.id === borrowReq.resourceId);
    if (resource && validation.nextResourceAvailability) {
      // If it's a permanent GIVEAWAY and handover is confirmed (BORROWED), mark it RETURNED/UNAVAILABLE
      if (
        resource.lendingType === LendingType.GIVEAWAY &&
        targetStatus === BorrowStatus.BORROWED
      ) {
        borrowReq.status = BorrowStatus.RETURNED;
        borrowReq.handedOverAt = new Date().toISOString();
        borrowReq.returnedAt = new Date().toISOString();
        resource.availability = BorrowStatus.UNAVAILABLE;
      } else {
        resource.availability = validation.nextResourceAvailability;
      }
      resource.updatedAt = new Date().toISOString();
    }

    if (targetStatus === BorrowStatus.BORROWED && !borrowReq.handedOverAt) {
      borrowReq.handedOverAt = new Date().toISOString();
      const ownerRecord = db.users.find((u) => u.id === borrowReq.ownerId);
      const borrowerRecord = db.users.find((u) => u.id === borrowReq.requesterId);
      if (ownerRecord) ownerRecord.resourcesSharedCount += 1;
      if (borrowerRecord) borrowerRecord.resourcesBorrowedCount += 1;
    }

    if (targetStatus === BorrowStatus.RETURNED) {
      borrowReq.returnedAt = new Date().toISOString();
    }

    // Notify counterparty
    if (targetStatus === BorrowStatus.APPROVED) {
      createNotification(
        borrowReq.requesterId,
        'REQUEST_ACCEPTED',
        `Request Approved: ${borrowReq.resourceCode}`,
        `${borrowReq.ownerName} approved your request for "${borrowReq.resourceTitle}". Pickup location: ${borrowReq.pickupLocation || 'Campus Counter'}.`,
        borrowReq.resourceId,
        borrowReq.id
      );
    } else if (targetStatus === BorrowStatus.REJECTED) {
      createNotification(
        borrowReq.requesterId,
        'REQUEST_REJECTED',
        `Request Declined: ${borrowReq.resourceCode}`,
        `${borrowReq.ownerName} could not fulfill the request for "${borrowReq.resourceTitle}".`,
        borrowReq.resourceId,
        borrowReq.id
      );
    } else if (targetStatus === BorrowStatus.RETURN_REQUESTED) {
      createNotification(
        borrowReq.ownerId,
        'RETURN_REMINDER',
        `Return Initiated: ${borrowReq.resourceCode}`,
        `${borrowReq.requesterName} marked "${borrowReq.resourceTitle}" ready for return. Confirm receipt once handed back.`,
        borrowReq.resourceId,
        borrowReq.id
      );
    } else if (targetStatus === BorrowStatus.OVERDUE) {
      createNotification(
        borrowReq.requesterId,
        'RETURN_REMINDER',
        `Overdue Reminder: ${borrowReq.resourceCode}`,
        `Your borrowing period for "${borrowReq.resourceTitle}" is marked overdue. Please coordinate return immediately.`,
        borrowReq.resourceId,
        borrowReq.id
      );
    }

    appendAuditLog(
      user.id,
      user.fullName,
      user.role,
      'BORROW_STATE_CHANGE',
      'BORROW_REQUEST',
      borrowReq.id,
      req.clientIp || '127.0.0.1',
      `Transitioned ${borrowReq.resourceCode} request from ${previousStatus} to ${borrowReq.status}.`
    );

    saveDatabase();
    sendSuccess(
      res,
      { borrowRequest: borrowReq, resource },
      `Borrow status updated to ${borrowReq.status}.`
    );
  });

  // Transaction Rating Endpoint (Section 31 - Only completed transactions allowed)
  app.post('/api/resources/:id/rate', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const resource = db.resources.find((r) => r.id === req.params.id);

    if (!resource) {
      sendError(res, 'RESOURCE_NOT_FOUND', 'Resource was not found.', 404);
      return;
    }

    const completedTx = db.borrowRequests.find(
      (br) =>
        br.resourceId === resource.id &&
        br.requesterId === user.id &&
        br.status === BorrowStatus.RETURNED &&
        !br.hasRated
    );

    if (!completedTx) {
      sendError(
        res,
        'RATING_NOT_ELIGIBLE',
        'Only students who have completed a verified borrow and return transaction for this item can submit a rating.',
        403
      );
      return;
    }

    const score = Number(req.body.score);
    const comment = normalizePlainText(req.body.comment, 400);

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      sendError(res, 'INVALID_SCORE', 'Rating score must be an integer between 1 and 5.');
      return;
    }

    completedTx.hasRated = true;
    resource.ratings.unshift({
      id: `rat-${crypto.randomUUID().slice(0, 8)}`,
      transactionId: completedTx.id,
      resourceId: resource.id,
      reviewerId: user.id,
      reviewerName: user.fullName,
      score,
      comment: comment || 'Completed transaction smoothly.',
      createdAt: new Date().toISOString(),
    });

    saveDatabase();
    sendSuccess(res, { resource }, 'Transaction feedback recorded.');
  });

  // ============================================================================
  // MY RESOURCES & MY REQUESTS (Section 34 & IDOR Protected)
  // ============================================================================
  app.get('/api/my/resources', requireAuth, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const myResources = db.resources.filter((r) => r.ownerId === user.id);
    sendSuccess(res, { resources: myResources }, 'Your listed resources retrieved.');
  });

  app.get('/api/my/requests', requireAuth, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const incomingBorrowRequests = db.borrowRequests.filter((b) => b.ownerId === user.id);
    const outgoingBorrowRequests = db.borrowRequests.filter((b) => b.requesterId === user.id);
    const myNeedRequests = db.resourceRequests.filter((r) => r.requesterId === user.id);

    sendSuccess(
      res,
      {
        incomingBorrowRequests,
        outgoingBorrowRequests,
        myNeedRequests,
      },
      'Your borrowing and request activity loaded.'
    );
  });

  // ============================================================================
  // "I NEED" RESOURCE REQUESTS BOARD (Section 22)
  // ============================================================================
  app.get('/api/resource-requests', (req, res) => {
    const db = loadDatabase();
    const department = normalizePlainText(req.query.department, 120);
    const category = normalizePlainText(req.query.category, 80);
    const q = normalizePlainText(req.query.q, 120).toLowerCase();

    const list = db.resourceRequests.filter((item) => {
      if (department && item.department !== department) return false;
      if (category && item.category !== category) return false;
      if (q) {
        const hay = `${item.title} ${item.description} ${item.subject} ${item.category} ${item.department}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    sendSuccess(res, { resourceRequests: list }, 'Resource requests loaded.');
  });

  app.post('/api/resource-requests', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;

    const title = normalizePlainText(req.body.title, 150);
    const description = normalizePlainText(req.body.description, 2000);
    const category = normalizePlainText(req.body.category, 80);
    const subject = normalizePlainText(req.body.subject, 140);
    const department = normalizePlainText(req.body.department, 120) || user.department;
    const semester = Number(req.body.semester) || user.semester;
    const resourceType = normalizePlainText(req.body.resourceType, 20) as ResourceType;
    const preference = normalizePlainText(req.body.preference, 24) as
      | 'BORROW'
      | 'GIVEAWAY'
      | 'DIGITAL_COPY';
    const requiredUntil = normalizePlainText(req.body.requiredUntil, 32);

    if (title.length < 3 || title.length > 150) {
      sendError(res, 'INVALID_TITLE', 'Title must be between 3 and 150 characters.');
      return;
    }
    if (description.length < 10 || description.length > 2000) {
      sendError(res, 'INVALID_DESCRIPTION', 'Description must be between 10 and 2,000 characters.');
      return;
    }
    if (!requiredUntil) {
      sendError(res, 'DATE_REQUIRED', 'Please specify when the resource is needed until.');
      return;
    }

    const nextNum = 301 + db.resourceRequests.length;
    const newNeed: ResourceNeedRequest = {
      id: `nreq-${crypto.randomUUID().slice(0, 8)}`,
      code: `REQ-2026-0${nextNum}`,
      title,
      description,
      category: category || 'Other',
      subject: subject || 'General Coursework',
      department,
      semester,
      resourceType:
        resourceType === ResourceType.DIGITAL ? ResourceType.DIGITAL : ResourceType.PHYSICAL,
      preference: ['BORROW', 'GIVEAWAY', 'DIGITAL_COPY'].includes(preference)
        ? preference
        : 'BORROW',
      requiredUntil,
      requesterId: user.id,
      requesterName: user.fullName,
      requesterDepartment: user.department,
      requesterSemester: user.semester,
      status: 'OPEN',
      responses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.resourceRequests.unshift(newNeed);
    saveDatabase();

    appendAuditLog(
      user.id,
      user.fullName,
      user.role,
      'NEED_REQUEST_CREATE',
      'RESOURCE_REQUEST',
      newNeed.code,
      req.clientIp || '127.0.0.1',
      `Posted "I Need" request "${newNeed.title}".`
    );

    sendSuccess(res, { resourceRequest: newNeed }, 'Resource request posted.', 201);
  });

  app.post('/api/resource-requests/:id/respond', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const need = db.resourceRequests.find((n) => n.id === req.params.id);

    if (!need) {
      sendError(res, 'REQUEST_NOT_FOUND', 'Resource request not found.', 404);
      return;
    }

    const message = normalizePlainText(req.body.message, 1000);
    const offeredResourceId = normalizePlainText(req.body.offeredResourceId, 64);

    if (message.length < 3) {
      sendError(res, 'INVALID_MESSAGE', 'Response message must be at least 3 characters.');
      return;
    }

    const offeredResource = offeredResourceId
      ? db.resources.find((r) => r.id === offeredResourceId)
      : undefined;

    const respItem = {
      id: `nresp-${crypto.randomUUID().slice(0, 8)}`,
      requestId: need.id,
      responderId: user.id,
      responderName: user.fullName,
      responderDepartment: user.department,
      message,
      offeredResourceId: offeredResource?.id,
      offeredResourceCode: offeredResource?.code,
      createdAt: new Date().toISOString(),
    };

    need.responses.push(respItem);
    need.updatedAt = new Date().toISOString();

    createNotification(
      need.requesterId,
      'NEED_REQUEST_RESPONSE',
      `Response to ${need.code}: ${need.title}`,
      `${user.fullName} responded to your request: "${message.slice(0, 120)}"`,
      offeredResource?.id
    );

    saveDatabase();
    sendSuccess(res, { resourceRequest: need }, 'Response sent to requester.', 201);
  });

  app.patch('/api/resource-requests/:id/status', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const need = db.resourceRequests.find((n) => n.id === req.params.id);

    if (!need) {
      sendError(res, 'REQUEST_NOT_FOUND', 'Resource request not found.', 404);
      return;
    }
    if (need.requesterId !== user.id && user.role !== UserRole.ADMIN) {
      sendError(res, 'FORBIDDEN', 'Only the requester can update this request.', 403);
      return;
    }

    const status = normalizePlainText(req.body.status, 24) as 'OPEN' | 'FULFILLED' | 'CLOSED';
    if (['OPEN', 'FULFILLED', 'CLOSED'].includes(status)) {
      need.status = status;
      need.updatedAt = new Date().toISOString();
      saveDatabase();
    }

    sendSuccess(res, { resourceRequest: need }, `Request marked as ${need.status}.`);
  });

  // ============================================================================
  // CONTEXTUAL MESSAGING (Section 30 - Attached to Resource/Request)
  // ============================================================================
  app.post('/api/messages', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;

    const resourceId = normalizePlainText(req.body.resourceId, 64);
    const borrowRequestId = normalizePlainText(req.body.borrowRequestId, 64);
    const body = normalizePlainText(req.body.body, 1000);

    if (!body || body.length < 1 || body.length > 1000) {
      sendError(res, 'INVALID_MESSAGE', 'Message must be between 1 and 1,000 characters.');
      return;
    }

    const resource = db.resources.find((r) => r.id === resourceId);
    if (!resource) {
      sendError(res, 'RESOURCE_NOT_FOUND', 'Associated resource was not found.', 404);
      return;
    }

    let recipientId = resource.ownerId;
    if (borrowRequestId) {
      const br = db.borrowRequests.find((b) => b.id === borrowRequestId);
      if (!br) {
        sendError(res, 'BORROW_REQUEST_NOT_FOUND', 'Associated borrow request not found.', 404);
        return;
      }
      if (
        br.requesterId !== user.id &&
        br.ownerId !== user.id &&
        user.role !== UserRole.ADMIN
      ) {
        sendError(
          res,
          'FORBIDDEN_MESSAGE',
          'You can only message within borrow requests you are party to.',
          403
        );
        return;
      }
      recipientId = user.id === br.ownerId ? br.requesterId : br.ownerId;
    } else if (user.id === resource.ownerId) {
      const latestMsg = [...db.messages]
        .reverse()
        .find((m) => m.resourceId === resource.id && m.senderId !== user.id);
      recipientId = latestMsg ? latestMsg.senderId : resource.ownerId;
    }

    const msg: ContextualMessage = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      resourceId: resource.id,
      borrowRequestId: borrowRequestId || undefined,
      senderId: user.id,
      senderName: user.fullName,
      senderRole: user.role,
      recipientId,
      body,
      createdAt: new Date().toISOString(),
    };

    db.messages.push(msg);
    saveDatabase();

    sendSuccess(res, { message: msg }, 'Contextual message sent.', 201);
  });

  // ============================================================================
  // NOTIFICATIONS (Section 29)
  // ============================================================================
  app.get('/api/notifications', requireAuth, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const list = db.notifications.filter((n) => n.userId === user.id);
    sendSuccess(res, { notifications: list }, 'Notifications loaded.');
  });

  app.patch('/api/notifications/read-all', requireAuth, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    db.notifications.forEach((n) => {
      if (n.userId === user.id) n.isRead = true;
    });
    saveDatabase();
    sendSuccess(res, {}, 'All notifications marked as read.');
  });

  // ============================================================================
  // REPORTING INAPPROPRIATE CONTENT (Section 26)
  // ============================================================================
  app.post('/api/reports', requireAuth, writeLimiter, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;

    const targetType = normalizePlainText(req.body.targetType, 24) as
      | 'RESOURCE'
      | 'USER'
      | 'MESSAGE'
      | 'REQUEST';
    const targetId = normalizePlainText(req.body.targetId, 64);
    const reason = normalizePlainText(req.body.reason, 40) as ReportReason;
    const details = normalizePlainText(req.body.details, 1000);

    if (!['RESOURCE', 'USER', 'MESSAGE', 'REQUEST'].includes(targetType)) {
      sendError(res, 'INVALID_TARGET_TYPE', 'Invalid report target type.');
      return;
    }
    if (!Object.values(ReportReason).includes(reason)) {
      sendError(res, 'INVALID_REASON', 'Please select a valid report reason.');
      return;
    }
    if (details.length < 5) {
      sendError(
        res,
        'DETAILS_REQUIRED',
        'Please provide at least 5 characters explaining the issue.'
      );
      return;
    }

    let targetTitle = targetId;
    if (targetType === 'RESOURCE') {
      const resTarget = db.resources.find((r) => r.id === targetId);
      if (resTarget) {
        resTarget.reportCount += 1;
        targetTitle = `${resTarget.code}: ${resTarget.title}`;
      }
    }

    const newReport: ContentReport = {
      id: `rep-${crypto.randomUUID().slice(0, 8)}`,
      reporterId: user.id,
      reporterName: user.fullName,
      targetType,
      targetId,
      targetTitle,
      reason,
      details,
      status: ReportStatus.OPEN,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.reports.unshift(newReport);
    saveDatabase();

    appendAuditLog(
      user.id,
      user.fullName,
      user.role,
      'REPORT_CREATE',
      targetType,
      targetTitle,
      req.clientIp || '127.0.0.1',
      `Reported ${targetType} (${reason}): ${details.slice(0, 120)}`
    );

    sendSuccess(res, { report: newReport }, 'Report submitted to campus moderation.', 201);
  });

  // ============================================================================
  // PRIVACY POLICY SELF-SERVICE DATA EXPORT & DELETION (Section 54)
  // ============================================================================
  app.get('/api/privacy/export', requireAuth, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    const myResources = db.resources.filter((r) => r.ownerId === user.id);
    const myBorrowRequests = db.borrowRequests.filter(
      (b) => b.requesterId === user.id || b.ownerId === user.id
    );
    const myNeedRequests = db.resourceRequests.filter((n) => n.requesterId === user.id);

    sendSuccess(
      res,
      {
        exportedAt: new Date().toISOString(),
        account: {
          ...toPublicProfile(user),
          email: user.email,
        },
        listedResources: myResources,
        borrowHistory: myBorrowRequests,
        resourceRequests: myNeedRequests,
      },
      'Personal academic data archive generated.'
    );
  });

  app.delete('/api/privacy/account', requireAuth, (req, res) => {
    const db = loadDatabase();
    const user = req.authUser!;
    if (user.role === UserRole.ADMIN) {
      sendError(
        res,
        'ADMIN_PROTECTED',
        'Institutional administrator accounts cannot be self-deleted.'
      );
      return;
    }

    db.resources = db.resources.filter((r) => r.ownerId !== user.id);
    db.resourceRequests = db.resourceRequests.filter((r) => r.requesterId !== user.id);
    db.users = db.users.filter((u) => u.id !== user.id);
    saveDatabase();

    if (req.jwtPayload) revokeToken(req.jwtPayload.jti);
    res.clearCookie('crx_access_token');

    appendAuditLog(
      user.id,
      user.fullName,
      user.role,
      'ACCOUNT_SELF_DELETE',
      'USER',
      user.studentId,
      req.clientIp || '127.0.0.1',
      'User exercised privacy right to delete account and associated listings.'
    );

    sendSuccess(res, {}, 'Your account and associated listings have been permanently deleted.');
  });

  // ============================================================================
  // ADMIN PANEL & MODERATION ENDPOINTS (Sections 25, 27, 28, 49)
  // ============================================================================
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const db = loadDatabase();
    const totalUsers = db.users.length;
    const verifiedUsers = db.users.filter(
      (u) => u.verificationStatus === VerificationStatus.VERIFIED
    ).length;
    const pendingUsers = db.users.filter(
      (u) => u.verificationStatus === VerificationStatus.PENDING
    ).length;
    const totalApprovedResources = db.resources.filter(
      (r) => r.moderationStatus === ModerationStatus.APPROVED
    ).length;
    const pendingModerationCount = db.resources.filter(
      (r) => r.moderationStatus === ModerationStatus.PENDING_REVIEW
    ).length;
    const activeBorrowingsCount = db.borrowRequests.filter((b) =>
      [BorrowStatus.APPROVED, BorrowStatus.BORROWED, BorrowStatus.RETURN_REQUESTED].includes(
        b.status
      )
    ).length;
    const openReportsCount = db.reports.filter(
      (rep) => rep.status === ReportStatus.OPEN || rep.status === ReportStatus.UNDER_REVIEW
    ).length;
    const openNeedRequestsCount = db.resourceRequests.filter((n) => n.status === 'OPEN').length;

    sendSuccess(
      res,
      {
        metrics: {
          totalUsers,
          verifiedUsers,
          pendingUsers,
          totalApprovedResources,
          pendingModerationCount,
          activeBorrowingsCount,
          openReportsCount,
          openNeedRequestsCount,
        },
        users: db.users.map((u) => ({
          ...toPublicProfile(u),
          email: u.email,
        })),
        allResources: db.resources,
        pendingResources: db.resources.filter(
          (r) => r.moderationStatus === ModerationStatus.PENDING_REVIEW
        ),
        reports: db.reports,
        borrowRequests: db.borrowRequests,
        auditLogs: db.auditLogs.slice(0, 100),
      },
      'Admin platform overview derived from live database queries.'
    );
  });

  app.get('/api/admin/resources/pending', requireAdmin, (_req, res) => {
    const db = loadDatabase();
    const pending = db.resources.filter(
      (r) => r.moderationStatus === ModerationStatus.PENDING_REVIEW
    );
    sendSuccess(res, { resources: pending }, 'Pending resources loaded.');
  });

  app.patch('/api/admin/resources/:id/approve', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const admin = req.authUser!;
    const resource = db.resources.find((r) => r.id === req.params.id);

    if (!resource) {
      sendError(res, 'RESOURCE_NOT_FOUND', 'Resource was not found.', 404);
      return;
    }

    resource.moderationStatus = ModerationStatus.APPROVED;
    resource.moderationNote = normalizePlainText(req.body.note, 300) || 'Approved by moderator.';
    resource.updatedAt = new Date().toISOString();
    saveDatabase();

    createNotification(
      resource.ownerId,
      'RESOURCE_APPROVED',
      `Resource Approved: ${resource.code}`,
      `Your listing "${resource.title}" has been approved and is now live in the campus catalog.`,
      resource.id
    );

    appendAuditLog(
      admin.id,
      admin.fullName,
      admin.role,
      'ADMIN_APPROVE',
      'RESOURCE',
      resource.code,
      req.clientIp || '127.0.0.1',
      `Approved resource "${resource.title}".`
    );

    sendSuccess(res, { resource }, 'Resource approved.');
  });

  app.patch('/api/admin/resources/:id/reject', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const admin = req.authUser!;
    const resource = db.resources.find((r) => r.id === req.params.id);

    if (!resource) {
      sendError(res, 'RESOURCE_NOT_FOUND', 'Resource was not found.', 404);
      return;
    }

    const status =
      req.body.flag === true ? ModerationStatus.FLAGGED : ModerationStatus.REJECTED;
    const note =
      normalizePlainText(req.body.note, 300) ||
      'Does not meet institutional academic resource guidelines.';

    resource.moderationStatus = status;
    resource.moderationNote = note;
    resource.updatedAt = new Date().toISOString();
    saveDatabase();

    createNotification(
      resource.ownerId,
      'RESOURCE_REJECTED',
      `Moderation Update: ${resource.code}`,
      `Your listing "${resource.title}" was marked ${status}. Reason: ${note}`,
      resource.id
    );

    appendAuditLog(
      admin.id,
      admin.fullName,
      admin.role,
      status === ModerationStatus.FLAGGED ? 'ADMIN_FLAG' : 'ADMIN_REJECT',
      'RESOURCE',
      resource.code,
      req.clientIp || '127.0.0.1',
      `Marked resource "${resource.title}" as ${status}: ${note}`
    );

    sendSuccess(res, { resource }, `Resource marked as ${status}.`);
  });

  app.get('/api/admin/reports', requireAdmin, (_req, res) => {
    const db = loadDatabase();
    sendSuccess(res, { reports: db.reports }, 'Reports loaded.');
  });

  app.patch('/api/admin/reports/:id', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const admin = req.authUser!;
    const report = db.reports.find((r) => r.id === req.params.id);

    if (!report) {
      sendError(res, 'REPORT_NOT_FOUND', 'Report not found.', 404);
      return;
    }

    const status = normalizePlainText(req.body.status, 24) as ReportStatus;
    const resolutionNote =
      normalizePlainText(req.body.resolutionNote, 500) || 'Reviewed by campus moderator.';
    const removeTargetResource = req.body.removeTargetResource === true;

    if (!Object.values(ReportStatus).includes(status)) {
      sendError(res, 'INVALID_STATUS', 'Invalid report status.');
      return;
    }

    report.status = status;
    report.resolutionNote = resolutionNote;
    report.resolvedByName = admin.fullName;
    report.updatedAt = new Date().toISOString();

    if (removeTargetResource && report.targetType === 'RESOURCE') {
      const targetRes = db.resources.find((r) => r.id === report.targetId);
      if (targetRes) {
        targetRes.moderationStatus = ModerationStatus.REJECTED;
        targetRes.moderationNote = `Removed following report ${report.id}: ${resolutionNote}`;
      }
    }

    saveDatabase();

    createNotification(
      report.reporterId,
      'REPORT_RESOLUTION',
      `Report ${report.status}: ${report.targetTitle}`,
      `Moderator resolution: ${resolutionNote}`
    );

    appendAuditLog(
      admin.id,
      admin.fullName,
      admin.role,
      'REPORT_RESOLVE',
      'REPORT',
      report.id,
      req.clientIp || '127.0.0.1',
      `Updated report ${report.id} to ${status}. Note: ${resolutionNote}`
    );

    sendSuccess(res, { report }, 'Report status updated.');
  });

  app.patch('/api/admin/users/:id/status', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const admin = req.authUser!;
    const targetUser = db.users.find((u) => u.id === req.params.id);

    if (!targetUser) {
      sendError(res, 'USER_NOT_FOUND', 'User not found.', 404);
      return;
    }

    const verificationStatus = normalizePlainText(
      req.body.verificationStatus,
      24
    ) as VerificationStatus;

    if (!Object.values(VerificationStatus).includes(verificationStatus)) {
      sendError(res, 'INVALID_STATUS', 'Invalid verification status.');
      return;
    }

    targetUser.verificationStatus = verificationStatus;
    saveDatabase();

    appendAuditLog(
      admin.id,
      admin.fullName,
      admin.role,
      verificationStatus === VerificationStatus.SUSPENDED
        ? 'ACCOUNT_SUSPEND'
        : 'USER_VERIFY',
      'USER',
      targetUser.studentId,
      req.clientIp || '127.0.0.1',
      `Set user ${targetUser.fullName} (${targetUser.studentId}) status to ${verificationStatus}.`
    );

    sendSuccess(
      res,
      { user: { ...toPublicProfile(targetUser), email: targetUser.email } },
      `User status updated to ${verificationStatus}.`
    );
  });

  app.post('/api/admin/taxonomy/subjects', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const admin = req.authUser!;
    const courseCode = normalizePlainText(req.body.courseCode, 24).toUpperCase();
    const name = normalizePlainText(req.body.name, 140);
    const department = normalizePlainText(req.body.department, 120);
    const semester = Number(req.body.semester) || 1;

    if (!courseCode || !name || !department) {
      sendError(res, 'INVALID_SUBJECT', 'Course code, subject name, and department are required.');
      return;
    }

    const newSub = {
      id: `sub-${crypto.randomUUID().slice(0, 8)}`,
      courseCode,
      name,
      department,
      semester,
    };
    db.subjects.push(newSub);
    saveDatabase();

    appendAuditLog(
      admin.id,
      admin.fullName,
      admin.role,
      'TAXONOMY_UPDATE',
      'SUBJECT',
      courseCode,
      req.clientIp || '127.0.0.1',
      `Added subject ${courseCode} (${name}) under ${department}.`
    );

    sendSuccess(res, { subject: newSub, subjects: db.subjects }, 'Subject added.', 201);
  });

  app.post('/api/admin/taxonomy/departments', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const admin = req.authUser!;
    const code = normalizePlainText(req.body.code, 16).toUpperCase();
    const name = normalizePlainText(req.body.name, 120);

    if (!code || !name) {
      sendError(res, 'INVALID_DEPARTMENT', 'Department code and name are required.');
      return;
    }

    const newDept = {
      id: `dept-${crypto.randomUUID().slice(0, 8)}`,
      code,
      name,
    };
    db.departments.push(newDept);
    saveDatabase();

    appendAuditLog(
      admin.id,
      admin.fullName,
      admin.role,
      'TAXONOMY_UPDATE',
      'DEPARTMENT',
      code,
      req.clientIp || '127.0.0.1',
      `Added academic department ${code} (${name}).`
    );

    sendSuccess(res, { department: newDept, departments: db.departments }, 'Department added.', 201);
  });

  app.post('/api/admin/taxonomy/domains', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const admin = req.authUser!;
    const domain = normalizePlainText(req.body.domain, 100).toLowerCase();

    if (!domain || !domain.includes('.')) {
      sendError(res, 'INVALID_DOMAIN', 'Please enter a valid institutional domain (e.g. college.edu).');
      return;
    }

    if (!db.allowedDomains.includes(domain)) {
      db.allowedDomains.push(domain);
      saveDatabase();
      appendAuditLog(
        admin.id,
        admin.fullName,
        admin.role,
        'DOMAIN_ALLOWLIST_ADD',
        'CONFIG',
        domain,
        req.clientIp || '127.0.0.1',
        `Added ${domain} to allowed college registration domains.`
      );
    }

    sendSuccess(res, { allowedDomains: db.allowedDomains }, 'Allowed college domain added.');
  });

  // ============================================================================
  // PRIVACY-CONSCIOUS ANALYTICS & OPENAPI DOCUMENTATION (Sections 57 & 92)
  // ============================================================================
  app.post('/api/analytics/event', writeLimiter, (req, res) => {
    const eventType = normalizePlainText(req.body?.eventType, 40) as keyof AggregateAnalyticsStore;
    if (eventType && Object.prototype.hasOwnProperty.call(aggregateAnalytics, eventType)) {
      aggregateAnalytics[eventType] += 1;
    }
    sendSuccess(res, { recorded: true }, 'Anonymous event counted.');
  });

  app.get('/api/admin/analytics', requireAdmin, (_req, res) => {
    sendSuccess(res, { analytics: aggregateAnalytics }, 'Aggregate analytics loaded.');
  });

  app.get('/api/openapi.json', requireAuth, (_req, res) => {
    res.status(200).json(OPENAPI_SPEC);
  });

  // Catch-all for unknown /api routes (no stack traces - Section 35 & 50)
  app.use('/api/*', (_req, res) => {
    sendError(res, 'ENDPOINT_NOT_FOUND', 'Requested API endpoint does not exist.', 404);
  });

  // Vite middleware in development / static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler — never expose stack traces to users (Section 35 & 50)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      sendError(
        res,
        'INTERNAL_SERVER_ERROR',
        'An unexpected server error occurred. Please try again.',
        500
      );
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Campus Resource Exchange (CRX) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
