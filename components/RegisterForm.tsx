"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  UserPlus,
  ShieldCheck,
  ArrowLeft,
  Crown,
  ShieldAlert,
} from "lucide-react";
import { registerAction, UserRole } from "@/app/auth/actions";
import { validatePassword } from "@/lib/password-rules";

interface RegisterFormProps {
  isFirstAdmin: boolean;
  currentUserRole: UserRole | null;
}

export default function RegisterForm({
  isFirstAdmin,
  currentUserRole,
}: RegisterFormProps) {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>(
    currentUserRole === "SUPER_ADMIN" ? "MASTER_ADMIN" : "ADMIN"
  );
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live Password Validation Checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const isFormValid =
    username.trim().length >= 3 &&
    hasMinLength &&
    hasUppercase &&
    hasNumber &&
    passwordsMatch;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const check = validatePassword(password);
    if (!check.isValid) {
      setErrorMessage(check.error || "Password requirements not met.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (username.trim().length < 3) {
      setErrorMessage("Username must be at least 3 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("password", password);
      formData.append("confirmPassword", confirmPassword);
      formData.append("role", role);

      const res = await registerAction(formData);

      if (res.success) {
        if (res.isFirstAdmin) {
          // First Super Admin automatically logged in
          router.push("/admin");
          router.refresh();
        } else {
          setSuccessMessage(
            `Account for @${username} created with role "${
              role === "MASTER_ADMIN"
                ? "Florist Owner (Master Admin)"
                : role === "SUPER_ADMIN"
                ? "Developer (Super Admin)"
                : "Florist Staff"
            }".`
          );
          setUsername("");
          setPassword("");
          setConfirmPassword("");
        }
      } else {
        setErrorMessage(res.error || "Failed to create account.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during registration.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-ios">
        <div className="mb-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isFirstAdmin
                ? "Developer Setup (Super Admin)"
                : currentUserRole === "SUPER_ADMIN"
                ? "Create Account"
                : "Register Florist Staff"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isFirstAdmin
                ? "Create your Master Developer account with full system access"
                : currentUserRole === "SUPER_ADMIN"
                ? "Provision a Florist Owner or team member"
                : "Add a florist team member to manage catalog"}
            </p>
          </div>
          {currentUserRole && (
            <Link
              href="/admin"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Back to Admin"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Role Selector (visible only to SUPER_ADMIN when registering someone else) */}
          {!isFirstAdmin && currentUserRole === "SUPER_ADMIN" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Account Role
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setRole("MASTER_ADMIN")}
                  className={`p-2 rounded-2xl border text-center transition-all ${
                    role === "MASTER_ADMIN"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Crown className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <span className="block text-[11px] font-bold leading-tight">Florist Owner</span>
                  <span className="block text-[9px] text-slate-500 font-normal">
                    Master Admin
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("ADMIN")}
                  className={`p-2 rounded-2xl border text-center transition-all ${
                    role === "ADMIN"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <User className="w-4 h-4 text-slate-600 mx-auto mb-1" />
                  <span className="block text-[11px] font-bold leading-tight">Florist Staff</span>
                  <span className="block text-[9px] text-slate-500 font-normal">
                    Staff Admin
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("SUPER_ADMIN")}
                  className={`p-2 rounded-2xl border text-center transition-all ${
                    role === "SUPER_ADMIN"
                      ? "border-purple-600 bg-purple-50 text-purple-950 font-bold shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                  <span className="block text-[11px] font-bold leading-tight">Developer</span>
                  <span className="block text-[9px] text-slate-500 font-normal">
                    Super Admin
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Username *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder={
                  isFirstAdmin
                    ? "e.g. dev_admin"
                    : role === "MASTER_ADMIN"
                    ? "e.g. florist_owner"
                    : "e.g. staff_amy"
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Real-time Password Requirements Checklist */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-[11px]">
            <span className="font-semibold text-slate-600 block mb-1">
              Password requirements:
            </span>

            <div className="flex items-center gap-2">
              {hasMinLength ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              )}
              <span className={hasMinLength ? "text-emerald-700 font-medium" : "text-slate-500"}>
                Minimum 8 characters
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasUppercase ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              )}
              <span className={hasUppercase ? "text-emerald-700 font-medium" : "text-slate-500"}>
                At least 1 uppercase letter (A-Z)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasNumber ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              )}
              <span className={hasNumber ? "text-emerald-700 font-medium" : "text-slate-500"}>
                At least 1 number (0-9)
              </span>
            </div>

            {confirmPassword.length > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                {passwordsMatch ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                )}
                <span className={passwordsMatch ? "text-emerald-700 font-medium" : "text-rose-600"}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {isFirstAdmin
                      ? "Create Super Admin & Sign In"
                      : role === "MASTER_ADMIN"
                      ? "Create Florist Owner Account"
                      : "Create Staff Account"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link
            href="/login"
            className="text-emerald-700 font-semibold hover:underline"
          >
            ← Back to Login
          </Link>

          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {isFirstAdmin
              ? "Developer Bootstrap"
              : currentUserRole === "SUPER_ADMIN"
              ? "Super Admin Mode"
              : "Master Admin Mode"}
          </span>
        </div>
      </div>
    </div>
  );
}
