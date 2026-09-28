import React, { useState } from 'react';
import { AlertCircle, KeyRound, Lock, ShieldCheck, UserPlus, X } from 'lucide-react';
import { AuthenticatedUser, TaxonomyData } from '../types';
import { apiRequest, setAuthTokens } from '../api';
import {
  auth,
  googleProvider,
  signInWithPopup,
  syncProfileToFirestore,
} from '../firebase';

interface AuthModalProps {
  initialMode: 'login' | 'register' | 'reset';
  taxonomy: TaxonomyData;
  onClose: () => void;
  onAuthenticated: (user: AuthenticatedUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode,
  taxonomy,
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register State (Section 11 Required Fields)
  const [fullName, setFullName] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState(
    taxonomy.departments[0]?.name || 'Computer Science and Engineering'
  );
  const [semester, setSemester] = useState(3);
  const [graduationYear, setGraduationYear] = useState(2028);
  const [password, setPassword] = useState('');

  // Reset Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetStudentId, setResetStudentId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    try {
      setLoading(true);
      const res = await apiRequest<{ user: AuthenticatedUser; token: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: loginEmail.trim(),
            password: loginPassword,
          }),
        }
      );
      setAuthTokens(res.data.user.csrfToken, res.data.token);
      onAuthenticated(res.data.user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    try {
      setLoading(true);
      const res = await apiRequest<{ user: AuthenticatedUser; token: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: collegeEmail.trim(),
            studentId: studentId.trim(),
            department,
            semester,
            graduationYear,
            password,
          }),
        }
      );
      setAuthTokens(res.data.user.csrfToken, res.data.token);
      onAuthenticated(res.data.user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    try {
      setLoading(true);
      const res = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: resetEmail.trim(),
          studentId: resetStudentId.trim(),
          newPassword,
        }),
      });
      setInfoMsg(res.message);
      setLoginEmail(resetEmail.trim());
      setMode('login');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstitutionalGoogleSignIn = async () => {
    setErrorMsg('');
    try {
      setLoading(true);
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const res = await apiRequest<{ user: AuthenticatedUser; token: string }>(
        '/api/auth/firebase-sync',
        {
          method: 'POST',
          body: JSON.stringify({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
          }),
        }
      );
      setAuthTokens(res.data.user.csrfToken, res.data.token);
      await syncProfileToFirestore(res.data.user, res.data.user.email);
      onAuthenticated(res.data.user);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Institutional Google sign-in was cancelled or blocked.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillTestCredentials = (email: string, pass: string) => {
    setMode('login');
    setLoginEmail(email);
    setLoginPassword(pass);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-[#E4E4E0] rounded-md max-w-md w-full overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-[#F7F7F5] border-b border-[#E4E4E0] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#1F5E46] text-white font-mono text-[11px] font-semibold flex items-center justify-center">
              CRX
            </div>
            <span className="text-sm font-semibold text-[#171717]">
              {mode === 'login'
                ? 'Sign in to Campus Resource Exchange'
                : mode === 'register'
                ? 'Verify College Identity & Register'
                : 'Reset Institutional Password'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#666666] hover:text-[#171717] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 border-b border-[#E4E4E0] text-xs font-semibold bg-white">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-2.5 border-b-2 cursor-pointer ${
              mode === 'login'
                ? 'border-[#1F5E46] text-[#171717]'
                : 'border-transparent text-[#666666]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`py-2.5 border-b-2 cursor-pointer ${
              mode === 'register'
                ? 'border-[#1F5E46] text-[#171717]'
                : 'border-transparent text-[#666666]'
            }`}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('reset');
              setErrorMsg('');
            }}
            className={`py-2.5 border-b-2 cursor-pointer ${
              mode === 'reset'
                ? 'border-[#1F5E46] text-[#171717]'
                : 'border-transparent text-[#666666]'
            }`}
          >
            Reset password
          </button>
        </div>

        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#FDF2F2] border border-[#F5C2C0] rounded text-xs text-[#B42318] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 bg-[#EBF5F0] border border-[#B8DFCA] rounded text-xs text-[#16794A]">
              {infoMsg}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  College Email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E0] rounded focus:outline-none focus:border-[#1F5E46]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 text-xs border border-[#E4E4E0] rounded focus:outline-none focus:border-[#1F5E46]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 text-xs font-semibold bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>

              <div className="pt-2 border-t border-[#E4E4E0]">
                <button
                  type="button"
                  onClick={handleInstitutionalGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2 px-4 text-xs font-medium bg-white hover:bg-[#F7F7F5] text-[#171717] border border-[#E4E4E0] rounded transition-colors cursor-pointer"
                >
                  Continue with Institutional Google Account
                </button>
              </div>

              {/* Test Account Quick-Fill for Evaluators */}
              <div className="p-3 bg-[#F7F7F5] border border-[#E4E4E0] rounded space-y-2">
                <span className="font-mono text-[10px] uppercase text-[#666666] block">
                  Development Test Accounts (BCrypt Verified)
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      fillTestCredentials('aarav.nair@college.edu', 'Campus@2026')
                    }
                    className="px-2 py-1.5 text-[11px] font-medium bg-white border border-[#E4E4E0] hover:border-[#1F5E46] rounded text-left cursor-pointer"
                  >
                    <strong className="block text-[#171717]">Senior Student</strong>
                    <span className="font-mono text-[10px] text-[#666666]">
                      Aarav (Sem 7)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      fillTestCredentials('meera.krishnan@college.edu', 'Campus@2026')
                    }
                    className="px-2 py-1.5 text-[11px] font-medium bg-white border border-[#E4E4E0] hover:border-[#1F5E46] rounded text-left cursor-pointer"
                  >
                    <strong className="block text-[#171717]">Junior Student</strong>
                    <span className="font-mono text-[10px] text-[#666666]">
                      Meera (Sem 3)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillTestCredentials('admin@college.edu', 'Admin@2026')}
                    className="px-2 py-1.5 text-[11px] font-medium bg-white border border-[#E4E4E0] hover:border-[#1F5E46] rounded text-left cursor-pointer"
                  >
                    <strong className="block text-[#1F5E46]">Campus Admin</strong>
                    <span className="font-mono text-[10px] text-[#666666]">
                      Registrar
                    </span>
                  </button>
                </div>
              </div>
            </form>
          ) : mode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="p-2.5 bg-[#F7F7F5] border border-[#E4E4E0] rounded text-[11px] text-[#666666]">
                Allowed campus email domains:{' '}
                <span className="font-mono text-[#171717]">
                  {taxonomy.allowedDomains.slice(0, 4).map((d) => `@${d}`).join(', ')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name as on college ID card"
                  className="w-full px-3 py-1.5 text-xs border border-[#E4E4E0] rounded"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#171717] mb-1">
                    College Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={collegeEmail}
                    onChange={(e) => setCollegeEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full px-3 py-1.5 text-xs border border-[#E4E4E0] rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#171717] mb-1">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 2024CS1055"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-[#E4E4E0] rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Department *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
                >
                  {taxonomy.departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#171717] mb-1">
                    Semester *
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E4E4E0] rounded"
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
                    Graduation Year *
                  </label>
                  <input
                    type="number"
                    min={2025}
                    max={2034}
                    required
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-[#E4E4E0] rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Password * (Min 8 characters, BCrypt hashed)
                </label>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-1.5 text-xs border border-[#E4E4E0] rounded"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 text-xs font-semibold bg-[#1F5E46] hover:bg-[#174936] text-white rounded transition-colors cursor-pointer"
              >
                {loading ? 'Creating verified account...' : 'Create Student Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Registered College Email *
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full px-3 py-1.5 text-xs border border-[#E4E4E0] rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  Registered Student ID *
                </label>
                <input
                  type="text"
                  required
                  value={resetStudentId}
                  onChange={(e) => setResetStudentId(e.target.value)}
                  placeholder="e.g. 2023CS1042"
                  className="w-full px-3 py-1.5 text-xs font-mono border border-[#E4E4E0] rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">
                  New Password * (Min 8 characters)
                </label>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-1.5 text-xs border border-[#E4E4E0] rounded"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 text-xs font-semibold bg-[#1F5E46] text-white rounded cursor-pointer"
              >
                Reset Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
