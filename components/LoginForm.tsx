"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  MessageCircle,
  X,
  HelpCircle,
} from "lucide-react";
import { loginAction } from "@/app/auth/actions";

interface LoginFormProps {
  hasAdmin: boolean;
}

export default function LoginForm({ hasAdmin }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage("Please enter your username and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("password", password);

      const res = await loginAction(formData);

      if (res.success) {
        router.push(from);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Invalid username or password.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during login.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppResetLink = () => {
    const userToReport = resetUsername.trim() || username.trim() || "[my username]";
    const message = `Hi! 🌸 I forgot my Flora CMS password for username "${userToReport}". Could you please reset it for me in the Admin Portal?`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* First-time setup banner if no admin user exists */}
      {!hasAdmin && (
        <div className="mb-6 p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-800">
                First-Time Setup Required
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                No admin account has been created yet. Create your master admin account to secure the portal.
              </p>
              <Link
                href="/register"
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-full border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-xs"
              >
                <span>Create Master Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-ios">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Username Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setResetUsername(e.target.value);
                }}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetUsername(username);
                  setForgotModalOpen(true);
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Protected Florist CMS • Admin Access Only</span>
        </div>
      </div>

      {/* Forgot Password Modal (Option 1: Master Admin Reset Flow) */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Password Recovery
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation */}
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Flora CMS accounts are managed by your <strong>Master Administrator</strong> (Florist Owner).
              </p>
              <p className="text-[11px] text-slate-500">
                The Master Admin can instantly reset your password or issue a temporary login code directly from their iPhone inside the Admin Portal.
              </p>
            </div>

            {/* Username Input for WhatsApp pre-fill */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Your Username (optional)
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <a
                href={getWhatsAppResetLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-green-600/20 transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Request Reset via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
