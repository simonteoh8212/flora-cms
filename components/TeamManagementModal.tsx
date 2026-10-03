"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  X,
  KeyRound,
  Trash2,
  UserPlus,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  getTeamMembersAction,
  resetUserPasswordAction,
  deleteTeamMemberAction,
  generateRandomPasswordAction,
  TeamMember,
} from "@/app/auth/actions";
import { validatePassword } from "@/lib/password-rules";

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamManagementModal({
  isOpen,
  onClose,
}: TeamManagementModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Reset Password Sub-state
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessPassword, setResetSuccessPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live password validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber;

  useEffect(() => {
    if (isOpen) {
      loadTeam();
    }
  }, [isOpen]);

  const loadTeam = async () => {
    setLoading(true);
    setErrorMessage(null);
    const res = await getTeamMembersAction();
    if (res.success && res.data) {
      setMembers(res.data.members);
      setIsMasterAdmin(res.data.isMasterAdmin);
      setCurrentUserId(res.data.currentUserId);
    } else {
      setErrorMessage(res.error || "Failed to load team.");
    }
    setLoading(false);
  };

  const handleGeneratePassword = async () => {
    const { password } = await generateRandomPasswordAction();
    setNewPassword(password);
  };

  const handleExecuteReset = async () => {
    if (!selectedMember) return;
    setErrorMessage(null);

    const check = validatePassword(newPassword);
    if (!check.isValid) {
      setErrorMessage(check.error || "Password does not meet requirements.");
      return;
    }

    setIsResetting(true);
    const res = await resetUserPasswordAction(selectedMember.id, newPassword);
    setIsResetting(false);

    if (res.success) {
      setResetSuccessPassword(newPassword);
    } else {
      setErrorMessage(res.error || "Failed to reset password.");
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (
      !confirm(
        `Are you sure you want to remove staff member "${member.username}"? They will lose all access.`
      )
    ) {
      return;
    }

    const res = await deleteTeamMemberAction(member.id);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } else {
      alert(res.error || "Failed to delete team member.");
    }
  };

  const handleCopyPassword = () => {
    if (resetSuccessPassword) {
      navigator.clipboard.writeText(resetSuccessPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Grabber */}
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Team & Access Control
              </h2>
              <p className="text-xs text-slate-500">
                Manage staff accounts and reset credentials
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Reset Password Form Sub-View */}
          {selectedMember ? (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    Reset Password for @{selectedMember.username}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign a new secure password or generate a temporary code
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setNewPassword("");
                    setResetSuccessPassword(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Cancel
                </button>
              </div>

              {resetSuccessPassword ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Password successfully updated!</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Share this temporary password with <strong>@{selectedMember.username}</strong>:
                  </p>
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-300 font-mono text-sm font-bold text-emerald-950">
                    <span>{resetSuccessPassword}</span>
                    <button
                      onClick={handleCopyPassword}
                      className="px-2.5 py-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMember(null);
                      setNewPassword("");
                      setResetSuccessPassword(null);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600">
                        New Password
                      </label>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Generate Temp Code
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. FloraBloom2026"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* Requirements checklist */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={hasMinLength ? "text-emerald-700 font-medium" : "text-slate-400"}>
                        {hasMinLength ? "✓" : "○"} Min 8 characters
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className={hasUppercase ? "text-emerald-700 font-medium" : "text-slate-400"}>
                        {hasUppercase ? "✓" : "○"} 1 Uppercase (A-Z)
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className={hasNumber ? "text-emerald-700 font-medium" : "text-slate-400"}>
                        {hasNumber ? "✓" : "○"} 1 Number (0-9)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteReset}
                    disabled={isResetting || !isPasswordValid}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Save New Password</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Members List */}
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Loading team members...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                <span>Team Members ({members.length})</span>
                {isMasterAdmin && (
                  <Link
                    href="/register"
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add Staff
                  </Link>
                )}
              </div>

              {members.map((member) => {
                const isSelf = member.id === currentUserId;
                const isTargetMaster = member.role === "MASTER_ADMIN";

                return (
                  <div
                    key={member.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isTargetMaster
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {member.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900">
                            {member.username}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isTargetMaster
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isTargetMaster ? "Master Admin" : "Staff Admin"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions for Master Admin */}
                    {isMasterAdmin && !isTargetMaster && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setNewPassword("");
                            setResetSuccessPassword(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Reset password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>

                        <button
                          onClick={() => handleDeleteMember(member)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete staff"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
