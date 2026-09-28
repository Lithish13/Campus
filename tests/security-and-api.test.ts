/**
 * Automated Backend, Security, State-Machine & File Validation Test Suite (Section 80)
 * Run with: npx tsx tests/security-and-api.test.ts
 */
import assert from 'node:assert/strict';
import {
  createRateLimiter,
  generateAccessToken,
  hashPassword,
  normalizePlainText,
  revokeToken,
  validateUploadedFile,
  verifyAccessToken,
  verifyPassword,
} from '../server/security';
import { validateBorrowStateTransition } from '../server/store';
import { BorrowStatus, UserRole } from '../src/types';

async function runTests() {
  console.log('Running Campus Resource Exchange (CRX) Security & Workflow Tests...');

  // 1. Password Hashing & Verification
  const rawPass = 'CampusTest@2026';
  const hash = await hashPassword(rawPass);
  assert.notEqual(hash, rawPass, 'Password must never be stored in plaintext');
  assert.equal(await verifyPassword(rawPass, hash), true, 'Valid password should verify');
  assert.equal(await verifyPassword('WrongPass@123', hash), false, 'Invalid password must fail');

  // 2. JWT Generation, Verification & Revocation
  const { token, csrfToken, jti } = generateAccessToken(
    'usr-test-1',
    UserRole.STUDENT,
    'CS26B099'
  );
  assert.ok(token.length > 20, 'JWT token generated');
  assert.ok(csrfToken.length >= 16, 'CSRF token generated');
  const verified = verifyAccessToken(token);
  assert.equal(verified?.sub, 'usr-test-1', 'Token subject verified');
  revokeToken(jti);
  assert.equal(verifyAccessToken(token), null, 'Revoked token must be rejected');

  // 3. XSS Sanitization & Input Normalization
  const maliciousInput = '<script>alert("xss")</script>Calculus   Textbook';
  const cleaned = normalizePlainText(maliciousInput, 100);
  assert.equal(cleaned.includes('<script>'), false, 'Script tags must be stripped');
  assert.equal(cleaned.includes('>'), false, 'Angle brackets must be stripped');

  // 4. File Upload Validation & Magic-Byte Signature Verification
  const blockedExe = validateUploadedFile(
    'payload.pdf.exe',
    'application/pdf',
    Buffer.from('%PDF-1.5 test').toString('base64'),
    'DIGITAL_RESOURCE'
  );
  assert.equal(blockedExe.valid, false, 'Double-extension .exe must be blocked');

  const spoofedPdf = validateUploadedFile(
    'notes.pdf',
    'application/pdf',
    Buffer.from('MZ-executable-header-not-a-pdf').toString('base64'),
    'DIGITAL_RESOURCE'
  );
  assert.equal(spoofedPdf.valid, false, 'Spoofed MIME without %PDF- magic bytes must be rejected');

  const validPdf = validateUploadedFile(
    'lecture_notes.pdf',
    'application/pdf',
    Buffer.from('%PDF-1.7 sample academic notes content').toString('base64'),
    'DIGITAL_RESOURCE'
  );
  assert.equal(validPdf.valid, true, 'Authentic PDF header should pass validation');

  // 5. Borrow State Machine Enforcement (Section 21)
  const validApprove = validateBorrowStateTransition(
    BorrowStatus.REQUESTED,
    BorrowStatus.APPROVED,
    'owner-1',
    'owner-1',
    'borrower-1',
    false
  );
  assert.equal(validApprove.allowed, true, 'Owner can approve a REQUESTED borrow');

  const invalidBorrowerApprove = validateBorrowStateTransition(
    BorrowStatus.REQUESTED,
    BorrowStatus.APPROVED,
    'borrower-1',
    'owner-1',
    'borrower-1',
    false
  );
  assert.equal(
    invalidBorrowerApprove.allowed,
    false,
    'Borrower cannot approve their own borrow request (IDOR/RBAC prevention)'
  );

  const invalidSkipToReturned = validateBorrowStateTransition(
    BorrowStatus.REQUESTED,
    BorrowStatus.RETURNED,
    'owner-1',
    'owner-1',
    'borrower-1',
    false
  );
  assert.equal(
    invalidSkipToReturned.allowed,
    false,
    'Cannot skip directly from REQUESTED to RETURNED'
  );

  // 6. Rate Limiter Behavior
  const limiter = createRateLimiter(60_000, 2, 'test-suite');
  let statusSet = 200;
  const mockReq: unknown = {
    headers: {},
    socket: { remoteAddress: '10.0.0.99' },
  };
  const mockRes: unknown = {
    setHeader: () => {},
    status(code: number) {
      statusSet = code;
      return this;
    },
    json() {
      return this;
    },
  };
  let nextCalled = 0;
  limiter(mockReq as never, mockRes as never, () => {
    nextCalled += 1;
  });
  limiter(mockReq as never, mockRes as never, () => {
    nextCalled += 1;
  });
  limiter(mockReq as never, mockRes as never, () => {
    nextCalled += 1;
  });
  assert.equal(nextCalled, 2, 'Only 2 requests allowed within window');
  assert.equal(statusSet, 429, 'Third request must trigger HTTP 429 Too Many Requests');

  console.log('All CRX security, authentication, file validation, and state-machine tests passed.');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
