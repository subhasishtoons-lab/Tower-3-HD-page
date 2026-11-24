import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  LogIn,
  Search,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';
import { DEFAULT_GALLERY_PHOTOS, TOWER_3_LOGO_URL } from '../data/seedData';
import type { AuthStore } from '../store/useAuthStore';
import type { LocalViewRole } from '../types';
import { SECURITY_QUESTIONS, type RecoveryQuestionInfo } from '../utils/auth';
import { ALL_UNIT_NUMBERS } from '../utils/residents';

interface AuthScreenProps {
  auth: AuthStore;
  onResidentSignedUp?: (unitNumber: string, fullName: string) => void;
}

type AuthMode = 'login' | 'signup' | 'reset';

const CUSTOM_QUESTION_VALUE = '__custom__';

export function AuthScreen({ auth, onResidentSignedUp }: AuthScreenProps) {
  const [role, setRole] = useState<LocalViewRole>('resident');
  const [mode, setMode] = useState<AuthMode>('login');

  // Shared login / signup fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup-only fields
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [unitNumber, setUnitNumber] = useState('049');
  const [adminUnitNumber, setAdminUnitNumber] = useState('');
  const [designation, setDesignation] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [linkToDirectory, setLinkToDirectory] = useState(true);

  // Password Reset (Question & Answer) state
  const [resetUsername, setResetUsername] = useState('');
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryQuestionInfo | null>(null);
  const [resetAnswer, setResetAnswer] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const heroPhoto = DEFAULT_GALLERY_PHOTOS[0];
  const adminSignupLocked = role === 'admin' && mode === 'signup' && auth.hasAdmin;
  const resolvedSecurityQuestion =
    selectedQuestion === CUSTOM_QUESTION_VALUE ? customQuestion.trim() : selectedQuestion;

  const switchRole = (nextRole: LocalViewRole) => {
    setRole(nextRole);
    setError(null);
    setStatusMessage(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setStatusMessage(null);
    if (nextMode === 'reset') {
      if (username.trim() && !resetUsername.trim()) {
        setResetUsername(username.trim());
      }
    } else {
      setRecoveryInfo(null);
      setResetAnswer('');
      setResetNewPassword('');
      setResetConfirmPassword('');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const result = await auth.login(username, password, role);
      if (!result.ok) {
        setError(result.error);
      }
    } catch {
      setError('Unable to verify credentials right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (resolvedSecurityQuestion.length < 5) {
      setError('Please select or enter a Security Question (at least 5 characters) for password reset.');
      return;
    }
    if (securityAnswer.trim().length < 2) {
      setError('Please enter your Security Answer (at least 2 characters). This is mandatory for password reset.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await auth.signup({
        fullName,
        username,
        password,
        confirmPassword,
        role,
        unitNumber: role === 'resident' ? unitNumber : adminUnitNumber || undefined,
        designation: role === 'admin' ? designation : undefined,
        securityQuestion: resolvedSecurityQuestion,
        securityAnswer,
      });
      if (!result.ok) {
        setError(result.error);
      } else if (role === 'resident' && linkToDirectory && onResidentSignedUp) {
        onResidentSignedUp(unitNumber, fullName.trim());
      }
    } catch {
      setError('Unable to complete signup right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const result = await auth.getSecurityQuestion(resetUsername);
      if (!result.ok) {
        setRecoveryInfo(null);
        setError(result.error);
      } else {
        setRecoveryInfo(result.data);
        setResetAnswer('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      }
    } catch {
      setError('Unable to look up security question right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryInfo) return;
    setError(null);
    setStatusMessage(null);
    setSubmitting(true);
    try {
      const result = await auth.resetPassword({
        username: recoveryInfo.username,
        securityAnswer: resetAnswer,
        newPassword: resetNewPassword,
        confirmPassword: resetConfirmPassword,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setRole(result.data.role);
        setUsername(result.data.username);
        setPassword('');
        setRecoveryInfo(null);
        setResetAnswer('');
        setResetNewPassword('');
        setResetConfirmPassword('');
        setMode('login');
        setStatusMessage(
          `Password reset successful for "${result.data.username}". You can now log in with your new password from any device.`
        );
      }
    } catch {
      setError('Unable to reset password right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl lg:grid lg:grid-cols-12">
        {/* Left Navy Brand Column */}
        <section className="flex flex-col justify-between bg-[#0B1F3A] p-5 text-white sm:p-8 lg:col-span-5">
          <div className="space-y-4 lg:space-y-6">
            <div className="flex items-center gap-3.5">
              <img
                src={TOWER_3_LOGO_URL}
                alt="TOWER 3 HD official logo"
                className="h-12 w-12 shrink-0 rounded-xl border border-white/15 bg-[#061326] object-cover sm:h-14 sm:w-14"
              />
              <div className="min-w-0">
                <div className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
                  TOWER 3 HD
                </div>
                <div className="text-xs text-sky-300">
                  Oil India Limited Housing Colony · Duliajan
                </div>
              </div>
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-white/10 bg-slate-900 lg:block">
              <div className="aspect-[16/10] w-full overflow-hidden">
                <img
                  src={heroPhoto.imageUrl}
                  alt={heroPhoto.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="px-3.5 py-2.5 text-xs text-slate-300">
                <div className="font-semibold text-white">Tower 3, New Horizontal Enclave</div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Oil Housing Area, OIL India Ltd., Duliajan, Assam 786602
                </div>
              </div>
            </div>

            <div className="hidden space-y-2.5 text-xs text-slate-300 lg:block">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 shrink-0 text-sky-400" />
                <span>6 Floors · 24 Company-Allotted Units (049–072)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-sky-400" />
                <span>Max 3 Admins (1st Admin + 2 Residents promoted)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-4 w-4 shrink-0 text-sky-400" />
                <span>Security Question &amp; Answer reset · No email required</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] leading-relaxed text-slate-300 lg:mt-8 lg:p-3.5">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
              <p>
                <span className="font-semibold text-white">Sign Up Once, Login Everywhere:</span>{' '}
                Your User ID, encrypted password, and Security Question are saved on the Tower 3 HD
                portal server so you can log in from any desktop, Android, or iPhone browser using
                the same User ID and Password — no email account needed.
              </p>
            </div>
          </div>
        </section>

        {/* Right Login / Signup / Reset Password Column */}
        <section className="p-6 sm:p-8 lg:col-span-7">
          <div className="mx-auto max-w-md">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                {mode === 'login'
                  ? 'Sign In to Tower 3'
                  : mode === 'signup'
                  ? 'Create Portal Account'
                  : 'Reset Password'}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {mode === 'reset'
                  ? 'Reset your password using your Security Question & Answer (no email required).'
                  : 'Sign up once, then log in from web browser or mobile with your User ID & Password.'}
              </p>
            </div>

            {/* Role Selector (shown for Login and Sign Up) */}
            {mode !== 'reset' && (
              <div
                role="tablist"
                aria-label="Account role"
                className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'resident'}
                  onClick={() => switchRole('resident')}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    role === 'resident'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Resident</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'admin'}
                  onClick={() => switchRole('admin')}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    role === 'admin'
                      ? 'bg-[#0B1F3A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin</span>
                </button>
              </div>
            )}

            {/* Mode Switcher: Login | Sign Up | Reset Password */}
            <div className="mt-4 flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                  mode === 'login'
                    ? 'border-[#0B1F3A] text-[#0B1F3A]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                  mode === 'signup'
                    ? 'border-[#0B1F3A] text-[#0B1F3A]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Sign Up</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                  mode === 'reset'
                    ? 'border-[#0B1F3A] text-[#0B1F3A]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Reset Password</span>
              </button>
            </div>

            {/* First-run Contextual Prompts */}
            {auth.statusLoaded && mode === 'login' && role === 'admin' && !auth.hasAdmin && (
              <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3 text-xs text-sky-950">
                <p className="font-semibold">1st Admin Setup Open</p>
                <p className="mt-0.5 leading-relaxed text-sky-900">
                  No Admin account is registered yet. Sign up once as the 1st Admin — afterward you
                  can log in from any browser or phone, and change up to{' '}
                  <span className="font-semibold">2 Resident accounts to Admin</span> (3 Admins
                  maximum) in the Admin Dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="mt-2 font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-900"
                >
                  Create 1st Admin Account →
                </button>
              </div>
            )}

            {auth.statusLoaded && mode === 'login' && role === 'resident' && !auth.hasResident && (
              <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3 text-xs text-sky-950">
                <p className="font-semibold">New Tower 3 Resident?</p>
                <p className="mt-0.5 leading-relaxed text-sky-900">
                  No Resident account is registered yet. Sign up once with your Unit Number
                  (049–072), User ID, Password, and Security Question &amp; Answer.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="mt-2 font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-900"
                >
                  Create Resident Account →
                </button>
              </div>
            )}

            {statusMessage && (
              <div
                role="status"
                className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{statusMessage}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Locked Public Admin Signup State */}
            {adminSignupLocked ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-[#0B1F3A]">
                  <Lock className="h-4 w-4 text-sky-600" />
                  <span>1st Admin Already Registered</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Admin signup is one-time only. Once signed up, log in from any web browser or
                  mobile device using your <span className="font-semibold">User ID &amp; Password</span>.
                  Maximum <span className="font-semibold">3 Admins</span> are allowed: the 1st
                  Admin can change up to <span className="font-semibold">2 Resident accounts</span>{' '}
                  to Admin inside the <span className="font-semibold">Admin Dashboard</span>.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#132d52]"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Go to Admin Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Forgot Password? Reset via Question</span>
                  </button>
                </div>
              </div>
            ) : mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700">
                    User ID
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={role === 'admin' ? 'e.g., t3_admin' : 'e.g., unit051_name'}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs font-semibold text-sky-700 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    role === 'admin'
                      ? 'bg-[#0B1F3A] hover:bg-[#132d52]'
                      : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  <span>
                    {submitting
                      ? 'Signing in...'
                      : role === 'admin'
                      ? 'Login as Admin'
                      : 'Login as Resident'}
                  </span>
                </button>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600">
                  <span>
                    {role === 'admin' && auth.hasAdmin
                      ? '1st Admin already registered.'
                      : `New ${role === 'admin' ? '1st Admin' : 'Resident'}?`}{' '}
                    {!(role === 'admin' && auth.hasAdmin) && (
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="font-semibold text-sky-700 hover:underline"
                      >
                        Sign Up
                      </button>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="font-semibold text-[#0B1F3A] hover:underline"
                  >
                    Reset via Security Question
                  </button>
                </div>
              </form>
            ) : mode === 'signup' ? (
              <form onSubmit={handleSignupSubmit} className="mt-5 space-y-3.5">
                <div>
                  <label htmlFor="signup-fullname" className="block text-xs font-semibold text-slate-700">
                    Full Name *
                  </label>
                  <input
                    id="signup-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === 'admin' ? 'e.g., Admin full name' : 'e.g., Resident full name'}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                {role === 'resident' ? (
                  <div>
                    <label htmlFor="signup-unit" className="block text-xs font-semibold text-slate-700">
                      Tower 3 Unit Number *
                    </label>
                    <select
                      id="signup-unit"
                      value={unitNumber}
                      onChange={(e) => setUnitNumber(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    >
                      {ALL_UNIT_NUMBERS.map((u) => (
                        <option key={u} value={u}>
                          Unit {u} (Floor {Math.floor((Number(u) - 49) / 4) + 1})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="signup-designation" className="block text-xs font-semibold text-slate-700">
                        Label (Optional)
                      </label>
                      <input
                        id="signup-designation"
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g., 1st Admin"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                    <div>
                      <label htmlFor="signup-admin-unit" className="block text-xs font-semibold text-slate-700">
                        Unit (Optional)
                      </label>
                      <select
                        id="signup-admin-unit"
                        value={adminUnitNumber}
                        onChange={(e) => setAdminUnitNumber(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      >
                        <option value="">Not unit-specific</option>
                        {ALL_UNIT_NUMBERS.map((u) => (
                          <option key={u} value={u}>
                            Unit {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="signup-username" className="block text-xs font-semibold text-slate-700">
                    User ID (No email required) *
                  </label>
                  <input
                    id="signup-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="3–24 chars: letters, numbers, . _ -"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700">
                      Password (min 6 chars) *
                    </label>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-confirm" className="block text-xs font-semibold text-slate-700">
                      Confirm Password *
                    </label>
                    <input
                      id="signup-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Show passwords</span>
                  </label>
                </div>

                {/* Mandatory Security Question & Answer Block */}
                <div className="space-y-2.5 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B1F3A]">
                    <HelpCircle className="h-4 w-4 shrink-0 text-sky-600" />
                    <span>Security Question &amp; Answer (Mandatory for Password Reset) *</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Used as your password hint &amp; reset check if you forget your password — no
                    email needed.
                  </p>

                  <div>
                    <label
                      htmlFor="signup-security-question"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Security Question *
                    </label>
                    <select
                      id="signup-security-question"
                      value={selectedQuestion}
                      onChange={(e) => setSelectedQuestion(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    >
                      {SECURITY_QUESTIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                      <option value={CUSTOM_QUESTION_VALUE}>Write my own custom question...</option>
                    </select>
                  </div>

                  {selectedQuestion === CUSTOM_QUESTION_VALUE && (
                    <div>
                      <label
                        htmlFor="signup-custom-question"
                        className="block text-xs font-semibold text-slate-700"
                      >
                        Custom Security Question *
                      </label>
                      <input
                        id="signup-custom-question"
                        type="text"
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        placeholder="e.g., What is my favourite football team?"
                        required
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="signup-security-answer"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Your Answer *
                    </label>
                    <input
                      id="signup-security-answer"
                      type="text"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="Remember this answer for password reset"
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>

                {role === 'resident' && (
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={linkToDirectory}
                      onChange={(e) => setLinkToDirectory(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <span>
                      Also add my name to <span className="font-mono font-semibold">Unit {unitNumber}</span>{' '}
                      in the Tower 3 directory if that unit is currently blank.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    role === 'admin'
                      ? 'bg-[#0B1F3A] hover:bg-[#132d52]'
                      : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>
                    {submitting
                      ? 'Creating account...'
                      : role === 'admin'
                      ? 'Create 1st Admin Account'
                      : 'Create Resident Account'}
                  </span>
                </button>

                <p className="text-center text-xs text-slate-600">
                  Already signed up?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    Login from anywhere
                  </button>
                </p>
              </form>
            ) : (
              /* Reset Password via Security Question & Answer (No Email) */
              <div className="mt-5 space-y-4">
                <form onSubmit={handleLookupQuestion} className="space-y-3">
                  <div>
                    <label htmlFor="reset-username" className="block text-xs font-semibold text-slate-700">
                      Step 1: Enter Your User ID *
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id="reset-username"
                        type="text"
                        autoComplete="username"
                        value={resetUsername}
                        onChange={(e) => {
                          setResetUsername(e.target.value);
                          setRecoveryInfo(null);
                          setError(null);
                        }}
                        placeholder="Enter your User ID"
                        required
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#132d52] disabled:opacity-60 whitespace-nowrap"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>Find Question</span>
                      </button>
                    </div>
                  </div>
                </form>

                {recoveryInfo && (
                  <form
                    onSubmit={handleResetPasswordSubmit}
                    className="space-y-3.5 rounded-xl border border-sky-200 bg-sky-50/50 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#0B1F3A]">
                          Step 2: Answer Your Security Question
                        </span>
                        <span className="font-mono text-[11px] font-semibold uppercase text-sky-700">
                          {recoveryInfo.role} · @{recoveryInfo.username}
                        </span>
                      </div>
                      <div className="mt-2 rounded-lg border border-sky-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900">
                        {recoveryInfo.securityQuestion}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reset-answer" className="block text-xs font-semibold text-slate-700">
                        Your Security Answer *
                      </label>
                      <input
                        id="reset-answer"
                        type="text"
                        value={resetAnswer}
                        onChange={(e) => setResetAnswer(e.target.value)}
                        placeholder="Type the exact answer saved during signup"
                        required
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="reset-new-password"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          New Password (min 6 chars) *
                        </label>
                        <input
                          id="reset-new-password"
                          type={showResetPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          required
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="reset-confirm-password"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          Confirm New Password *
                        </label>
                        <input
                          id="reset-confirm-password"
                          type={showResetPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          required
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                      </div>
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={showResetPassword}
                        onChange={(e) => setShowResetPassword(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span>Show new password</span>
                    </label>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                      <KeyRound className="h-4 w-4" />
                      <span>{submitting ? 'Updating Password...' : 'Save New Password'}</span>
                    </button>
                  </form>
                )}

                <p className="text-center text-xs text-slate-600">
                  Remembered your password?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    Back to Login
                  </button>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
