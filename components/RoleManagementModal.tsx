"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  PlusCircle,
  Pencil,
  Trash,
  Crown,
  ShieldAlert,
  Users,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getRolesAndPermissionsAction,
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  RoleWithPermissions,
} from "@/app/roles/actions";
import { useBottomSheet } from "@/lib/useBottomSheet";
import { cn } from "@/lib/utils";

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: string;
  onRoleChanged?: () => void;
}

export default function RoleManagementModal({
  isOpen,
  onClose,
  currentUserRole,
  onRoleChanged,
}: RoleManagementModalProps) {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit / Create Sub-view State
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [isSystemRole, setIsSystemRole] = useState(false);

  // Form Fields
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [canView, setCanView] = useState(true);
  const [canAdd, setCanAdd] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { sheetStyle, dragHandleProps, backdropProps, isDragging } = useBottomSheet({
    isOpen,
    onClose,
  });

  useEffect(() => {
    if (isOpen) {
      loadRoles();
    }
  }, [isOpen]);

  // Close on Escape key press (or cancel sub-form if editing role)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        if (isEditing) {
          setIsEditing(false);
          setEditingRoleId(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, isEditing, onClose]);

  const loadRoles = async () => {
    setLoading(true);
    setErrorMessage(null);
    const res = await getRolesAndPermissionsAction();
    if (res.success && res.data) {
      setRoles(res.data.roles);
    } else {
      setErrorMessage(res.error || "Failed to load roles.");
    }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingRoleId(null);
    setIsSystemRole(false);
    setRoleName("");
    setRoleDescription("");
    setCanView(true);
    setCanAdd(true);
    setCanEdit(true);
    setCanDelete(false); // Default: Staff has View, Add, Edit, but NO Delete
    setIsEditing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleOpenEdit = (role: RoleWithPermissions) => {
    setEditingRoleId(role.id);
    setIsSystemRole(role.isSystem);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setCanView(role.canView);
    setCanAdd(role.canAdd);
    setCanEdit(role.canEdit);
    setCanDelete(role.canDelete);
    setIsEditing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!roleName.trim()) {
      setErrorMessage("Role name is required.");
      toast.warning("Role name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingRoleId) {
        // Update existing role & permissions
        const res = await updateRoleAction(editingRoleId, {
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          canView,
          canAdd,
          canEdit,
          canDelete,
        });

        if (res.success) {
          toast.success(`Role "${roleName}" permissions updated!`);
          setSuccessMessage(`Role "${roleName}" permissions updated.`);
          await loadRoles();
          if (onRoleChanged) onRoleChanged();
          setIsEditing(false);
          setSuccessMessage(null);
        } else {
          const errorMsg = res.error || "Failed to update role.";
          setErrorMessage(errorMsg);
          toast.error(errorMsg);
        }
      } else {
        // Create new role
        const res = await createRoleAction({
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          canView,
          canAdd,
          canEdit,
          canDelete,
        });

        if (res.success) {
          toast.success(`Role "${roleName}" created successfully!`);
          setSuccessMessage(`Role "${roleName}" created successfully.`);
          await loadRoles();
          if (onRoleChanged) onRoleChanged();
          setIsEditing(false);
          setSuccessMessage(null);
        } else {
          const errorMsg = res.error || "Failed to create role.";
          setErrorMessage(errorMsg);
          toast.error(errorMsg);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving role.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: RoleWithPermissions) => {
    if (
      !confirm(
        `Are you sure you want to delete role "${role.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    const res = await deleteRoleAction(role.id);
    if (res.success) {
      toast.success(`Role "${role.name}" deleted.`);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (onRoleChanged) onRoleChanged();
    } else {
      toast.error(res.error || "Failed to delete role.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      {...backdropProps}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer touch-none"
    >
      <div
        className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden cursor-default overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        style={sheetStyle}
      >
        {/* iOS Grabber */}
        <div
          {...dragHandleProps}
          className="flex sm:hidden justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none -mb-1"
          aria-label="Drag to dismiss"
          role="button"
          tabIndex={0}
        >
          <div
            className={cn(
              "h-1.5 rounded-full transition-all duration-150",
              isDragging
                ? "w-14 bg-slate-400 scale-105"
                : "w-11 bg-slate-300 hover:bg-slate-400"
            )}
          />
        </div>

        {/* Modal Header */}
        <div
          {...dragHandleProps}
          className="flex items-center justify-between px-6 py-4 border-b border-slate-100 select-none touch-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Role & Permission Modules
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {currentUserRole === "SUPER_ADMIN" ? "Super Admin" : "Master Admin"} Control
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure custom roles with View, Add, Edit, and Delete catalog rules
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 overscroll-contain">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* VIEW 2: Create / Edit Role & Permissions Form */}
          {isEditing ? (
            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>
                    {editingRoleId ? `Edit Role: ${roleName}` : "Create New Role"}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Back to List
                </button>
              </div>

              {/* Role Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Staff, Florist, Inventory Clerk"
                    value={roleName}
                    disabled={isSystemRole}
                    onChange={(e) => setRoleName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                  />
                  {isSystemRole && (
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" /> System roles have permanent names and full access.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Can view, add and edit bouquets, but cannot delete"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Permission Module Matrix */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Catalog Permission Module
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* View Permission */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      canView
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={canView}
                      disabled={isSystemRole}
                      onChange={(e) => setCanView(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-xs font-bold text-slate-900">
                          View Permission
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Browse flower catalog, stock metrics, and search bouquets
                      </p>
                    </div>
                  </label>

                  {/* Add Permission */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      canAdd
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={canAdd}
                      disabled={isSystemRole}
                      onChange={(e) => setCanAdd(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-xs font-bold text-slate-900">
                          Add Permission
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Create new bouquet listings and upload flower photos
                      </p>
                    </div>
                  </label>

                  {/* Edit Permission */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      canEdit
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={canEdit}
                      disabled={isSystemRole}
                      onChange={(e) => setCanEdit(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-xs font-bold text-slate-900">
                          Edit Permission
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Modify bouquet prices, descriptions, and toggle In Stock / Sold Out
                      </p>
                    </div>
                  </label>

                  {/* Delete Permission */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      canDelete
                        ? "bg-rose-50/70 border-rose-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={canDelete}
                      disabled={isSystemRole}
                      onChange={(e) => setCanDelete(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-rose-600 rounded-md border-slate-300 focus:ring-rose-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Trash className="w-3.5 h-3.5 text-rose-600" />
                        <span className="text-xs font-bold text-slate-900">
                          Delete Permission
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Permanently delete items from the catalog. Hide if disabled.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Live Preview Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  Users with role <strong>&quot;{roleName || "Untitled"}&quot;</strong> can{" "}
                  {[
                    canView ? "View" : null,
                    canAdd ? "Add" : null,
                    canEdit ? "Edit" : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "no features"}
                  {!canDelete ? " (Delete button will be completely hidden)" : " and Delete items"}.
                </span>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Role...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingRoleId ? "Save Permissions" : "Create Role"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="py-3 px-5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* VIEW 1: Roles List (Role Module Directory) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Configured Roles ({roles.length})
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Role</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Loading roles and permissions...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {roles.map((role) => {
                    const isSuper = role.name === "SUPER_ADMIN";
                    const isMaster = role.name === "MASTER_ADMIN";

                    return (
                      <div
                        key={role.id}
                        className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-3 transition-all hover:border-slate-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                                isSuper
                                  ? "bg-purple-100 text-purple-800"
                                  : isMaster
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isSuper ? (
                                <ShieldAlert className="w-4 h-4" />
                              ) : isMaster ? (
                                <Crown className="w-4 h-4" />
                              ) : (
                                <Shield className="w-4 h-4" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900">
                                  {role.name === "SUPER_ADMIN"
                                    ? "Developer (Super Admin)"
                                    : role.name === "MASTER_ADMIN"
                                    ? "Florist Owner (Master Admin)"
                                    : role.name}
                                </h4>

                                {role.isSystem && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    System
                                  </span>
                                )}

                                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {role.userCount} {role.userCount === 1 ? "user" : "users"}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 mt-0.5">
                                {role.description || "No description provided."}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleOpenEdit(role)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Edit role permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Permissions</span>
                            </button>

                            {!role.isSystem && (
                              <button
                                onClick={() => handleDeleteRole(role)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete role"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Permission Pills */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">
                            Permissions:
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              role.canView
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-slate-100 text-slate-400 line-through"
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              role.canAdd
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-slate-100 text-slate-400 line-through"
                            }`}
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Add</span>
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              role.canEdit
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-slate-100 text-slate-400 line-through"
                            }`}
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              role.canDelete
                                ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Trash className="w-3 h-3" />
                            <span>{role.canDelete ? "Delete" : "No Delete"}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
