"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  userCount: number;
  createdAt: string;
}

export type RoleActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Ensure default system roles exist in DB
 */
async function ensureDefaultRolesExist() {
  const existingRoles = await prisma.role.findMany();
  const existingNames = new Set(existingRoles.map((r) => r.name.toLowerCase()));

  // 1. Super Admin (Developer)
  if (!existingNames.has("super_admin")) {
    await prisma.role.create({
      data: {
        name: "SUPER_ADMIN",
        description: "Full developer access to all system features, roles, and settings.",
        isSystem: true,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
      },
    });
  }

  // 2. Master Admin (Florist Owner)
  if (!existingNames.has("master_admin")) {
    await prisma.role.create({
      data: {
        name: "MASTER_ADMIN",
        description: "Florist business owner with full store management and staff control.",
        isSystem: true,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
      },
    });
  }

  // 3. Default Staff Role
  if (!existingNames.has("staff") && !existingNames.has("admin")) {
    await prisma.role.create({
      data: {
        name: "Staff",
        description: "Florist team member: can view, add, and edit bouquets, but cannot delete.",
        isSystem: false,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: false, // Per requirements: Staff can View, Add, Edit, but NO Delete
      },
    });
  }
}

/**
 * Verify caller is SUPER_ADMIN or MASTER_ADMIN
 */
async function verifyAdminPrivileges() {
  const session = await getSession();
  if (!session) {
    return { authorized: false, error: "Unauthorized: Please log in." };
  }

  if (session.role !== "SUPER_ADMIN" && session.role !== "MASTER_ADMIN") {
    return {
      authorized: false,
      error: "Permission denied: Only Super Admin and Master Admin can access Role & Permission modules.",
    };
  }

  return { authorized: true, session };
}

/**
 * Fetch all roles and their configured permissions (Role Module)
 */
export async function getRolesAndPermissionsAction(): Promise<
  RoleActionResult<{ roles: RoleWithPermissions[]; canManageRoles: boolean }>
> {
  try {
    const auth = await verifyAdminPrivileges();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    await ensureDefaultRolesExist();

    const roles = await prisma.role.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return {
      success: true,
      data: {
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
          canView: r.canView,
          canAdd: r.canAdd,
          canEdit: r.canEdit,
          canDelete: r.canDelete,
          userCount: r._count.users,
          createdAt: r.createdAt.toISOString(),
        })),
        canManageRoles: true,
      },
    };
  } catch (error: unknown) {
    console.error("Error fetching roles:", error);
    const message = error instanceof Error ? error.message : "Failed to load roles.";
    return { success: false, error: message };
  }
}

/**
 * Create a new Role with specified permissions (Role + Permission Module CRUD)
 */
export async function createRoleAction(data: {
  name: string;
  description?: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}): Promise<RoleActionResult<RoleWithPermissions>> {
  try {
    const auth = await verifyAdminPrivileges();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const trimmedName = data.name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: "Role name must be at least 2 characters." };
    }

    const existing = await prisma.role.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return { success: false, error: `A role named "${trimmedName}" already exists.` };
    }

    const newRole = await prisma.role.create({
      data: {
        name: trimmedName,
        description: data.description?.trim() || null,
        isSystem: false,
        canView: data.canView,
        canAdd: data.canAdd,
        canEdit: data.canEdit,
        canDelete: data.canDelete,
      },
    });

    revalidatePath("/admin");

    return {
      success: true,
      data: {
        id: newRole.id,
        name: newRole.name,
        description: newRole.description,
        isSystem: newRole.isSystem,
        canView: newRole.canView,
        canAdd: newRole.canAdd,
        canEdit: newRole.canEdit,
        canDelete: newRole.canDelete,
        userCount: 0,
        createdAt: newRole.createdAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Error creating role:", error);
    const message = error instanceof Error ? error.message : "Failed to create role.";
    return { success: false, error: message };
  }
}

/**
 * Update an existing Role and its permissions (Role + Permission Module CRUD)
 */
export async function updateRoleAction(
  id: string,
  data: {
    name: string;
    description?: string;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }
): Promise<RoleActionResult> {
  try {
    const auth = await verifyAdminPrivileges();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return { success: false, error: "Role not found." };
    }

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Role name cannot be empty." };
    }

    // If changing name, check for uniqueness
    if (trimmedName.toLowerCase() !== role.name.toLowerCase()) {
      if (role.isSystem) {
        return { success: false, error: "System role names cannot be renamed." };
      }
      const existing = await prisma.role.findFirst({
        where: {
          name: { equals: trimmedName, mode: "insensitive" },
          id: { not: id },
        },
      });
      if (existing) {
        return { success: false, error: `A role named "${trimmedName}" already exists.` };
      }
    }

    await prisma.role.update({
      where: { id },
      data: {
        name: role.isSystem ? role.name : trimmedName,
        description: data.description?.trim() || null,
        // System roles like SUPER_ADMIN and MASTER_ADMIN always keep full permissions
        canView: role.isSystem ? true : data.canView,
        canAdd: role.isSystem ? true : data.canAdd,
        canEdit: role.isSystem ? true : data.canEdit,
        canDelete: role.isSystem ? true : data.canDelete,
      },
    });

    revalidatePath("/admin");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating role:", error);
    const message = error instanceof Error ? error.message : "Failed to update role.";
    return { success: false, error: message };
  }
}

/**
 * Delete a custom Role (Role Module CRUD)
 */
export async function deleteRoleAction(id: string): Promise<RoleActionResult> {
  try {
    const auth = await verifyAdminPrivileges();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return { success: false, error: "Role not found." };
    }

    if (role.isSystem) {
      return { success: false, error: "System roles cannot be deleted." };
    }

    if (role._count.users > 0) {
      return {
        success: false,
        error: `Cannot delete role "${role.name}": It is currently assigned to ${role._count.users} user(s). Please reassign them first.`,
      };
    }

    await prisma.role.delete({ where: { id } });

    revalidatePath("/admin");

    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting role:", error);
    const message = error instanceof Error ? error.message : "Failed to delete role.";
    return { success: false, error: message };
  }
}

/**
 * Get effective permissions for the currently logged-in user
 */
export async function getCurrentUserPermissions(): Promise<{
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageTeam: boolean;
  canManageRoles: boolean;
  roleName: string;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return {
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canManageTeam: false,
        canManageRoles: false,
        roleName: "Guest",
      };
    }

    // Super Admin & Master Admin always have full access
    if (session.role === "SUPER_ADMIN") {
      return {
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canManageTeam: true,
        canManageRoles: true,
        roleName: "Developer (Super Admin)",
      };
    }

    if (session.role === "MASTER_ADMIN") {
      return {
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canManageTeam: true,
        canManageRoles: true,
        roleName: "Florist Owner (Master Admin)",
      };
    }

    // Look up user's assigned role in DB
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { roleRef: true },
    });

    if (user?.roleRef) {
      return {
        canView: user.roleRef.canView,
        canAdd: user.roleRef.canAdd,
        canEdit: user.roleRef.canEdit,
        canDelete: user.roleRef.canDelete,
        canManageTeam: false,
        canManageRoles: false,
        roleName: user.roleRef.name,
      };
    }

    // Fallback if legacy "ADMIN" role or no roleRef linked yet
    // Try finding the "Staff" role permissions
    const staffRole = await prisma.role.findFirst({
      where: {
        name: { in: ["Staff", "staff", "ADMIN"] },
      },
    });

    if (staffRole) {
      return {
        canView: staffRole.canView,
        canAdd: staffRole.canAdd,
        canEdit: staffRole.canEdit,
        canDelete: staffRole.canDelete,
        canManageTeam: false,
        canManageRoles: false,
        roleName: staffRole.name,
      };
    }

    // Default safe fallback for staff: view, add, edit, but NO delete
    return {
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: false,
      canManageTeam: false,
      canManageRoles: false,
      roleName: "Staff",
    };
  } catch (error) {
    console.error("Error retrieving user permissions:", error);
    return {
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: false,
      canManageTeam: false,
      canManageRoles: false,
      roleName: "Staff",
    };
  }
}
