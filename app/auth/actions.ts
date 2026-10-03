"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getSession,
} from "@/lib/auth";
import { validatePassword, generateTemporaryPassword } from "@/lib/password-rules";

export type UserRole = "SUPER_ADMIN" | "MASTER_ADMIN" | "Staff" | "ADMIN" | string;

export type AuthActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  isFirstAdmin?: boolean;
};

export interface AvailableRoleOption {
  id: string;
  name: string;
  isSystem: boolean;
}

export interface TeamMember {
  id: string;
  username: string;
  role: string;
  roleId?: string | null;
  roleName?: string;
  createdAt: string;
}

/**
 * Login action
 */
export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  try {
    const username = formData.get("username")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();

    if (!username || !password) {
      return { success: false, error: "Please enter both username and password." };
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return { success: false, error: "Invalid username or password." };
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return { success: false, error: "Invalid username or password." };
    }

    // Set signed JWT session cookie
    await createSession({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Login error:", error);
    const message = error instanceof Error ? error.message : "Failed to log in.";
    return { success: false, error: message };
  }
}

/**
 * Register action:
 * - If 0 users in DB: Creates initial SUPER_ADMIN (Developer)
 * - If caller is SUPER_ADMIN: Can register SUPER_ADMIN, MASTER_ADMIN, or ADMIN
 * - If caller is MASTER_ADMIN: Can register ADMIN (Staff)
 */
export async function registerAction(
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const username = formData.get("username")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirmPassword")?.toString();
    const rawRole = (formData.get("role")?.toString() || "Staff").trim();
    const requestedRole = (rawRole === "ADMIN" || rawRole.toUpperCase() === "STAFF" ? "Staff" : rawRole) as UserRole;

    if (!username) {
      return { success: false, error: "Username is required." };
    }

    if (username.length < 3) {
      return { success: false, error: "Username must be at least 3 characters." };
    }

    if (username === "superadmin") {
      return {
        success: false,
        error: "The username 'superadmin' is reserved for the root system developer.",
      };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        success: false,
        error: "Username can only contain letters, numbers, and underscores.",
      };
    }

    // Password validation rule: min 8, uppercase, number
    const passwordCheck = validatePassword(password || "");
    if (!passwordCheck.isValid) {
      return { success: false, error: passwordCheck.error };
    }

    if (password !== confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }

    const totalUsers = await prisma.user.count();

    let assignedRole: string = "Staff";
    let assignedRoleId: string | null = null;

    if (totalUsers === 0) {
      // Very first user is always the SUPER_ADMIN (Developer)
      assignedRole = "SUPER_ADMIN";
      const superAdminRole = await prisma.role.findFirst({
        where: { name: "SUPER_ADMIN" },
      });
      assignedRoleId = superAdminRole?.id || null;
    } else {
      // Must be logged in as SUPER_ADMIN or MASTER_ADMIN
      const currentSession = await getSession();
      if (!currentSession) {
        return {
          success: false,
          error: "Unauthorized: Please log in as an administrator.",
        };
      }

      if (currentSession.role === "SUPER_ADMIN") {
        // Super admin can assign any role
        const matchingRole = await prisma.role.findFirst({
          where: {
            OR: [
              { id: requestedRole },
              { name: { equals: requestedRole, mode: "insensitive" as const } },
              { name: { equals: "Staff", mode: "insensitive" as const } },
            ],
          },
        });

        if (matchingRole) {
          assignedRole = matchingRole.name;
          assignedRoleId = matchingRole.id;
        } else {
          assignedRole = requestedRole;
        }
      } else if (currentSession.role === "MASTER_ADMIN") {
        // Master admin can assign Staff or any custom non-system role
        const matchingRole = await prisma.role.findFirst({
          where: {
            OR: [
              { id: requestedRole },
              { name: { equals: requestedRole, mode: "insensitive" as const } },
              { name: { equals: "Staff", mode: "insensitive" as const } },
            ],
            isSystem: false,
          },
        });

        if (matchingRole) {
          assignedRole = matchingRole.name;
          assignedRoleId = matchingRole.id;
        } else {
          const defaultStaff = await prisma.role.findFirst({
            where: { name: { equals: "Staff", mode: "insensitive" as const } },
          });
          assignedRole = defaultStaff ? defaultStaff.name : "Staff";
          assignedRoleId = defaultStaff ? defaultStaff.id : null;
        }
      } else {
        return {
          success: false,
          error: "Unauthorized: Staff accounts cannot create other users.",
        };
      }
    }

    // Check if username is taken
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return { success: false, error: "This username is already taken." };
    }

    const hashedPassword = await hashPassword(password as string);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: assignedRole,
        roleId: assignedRoleId,
      },
    });

    // If first-time bootstrap, automatically log in
    if (totalUsers === 0) {
      await createSession({
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
      });
      return { success: true, isFirstAdmin: true };
    }

    return { success: true, isFirstAdmin: false };
  } catch (error: unknown) {
    console.error("Register error:", error);
    const message = error instanceof Error ? error.message : "Failed to register user.";
    return { success: false, error: message };
  }
}

/**
 * Logout action
 */
export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/**
 * Ensure default system roles and root superadmin account exist (Self-healing bootstrap)
 */
export async function ensureRootSuperAdminExists() {
  try {
    let superAdminRole = await prisma.role.findFirst({
      where: { name: "SUPER_ADMIN" },
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: {
          name: "SUPER_ADMIN",
          description: "Root developer role with full unrestricted access to system, roles, and settings.",
          isSystem: true,
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
        },
      });
    }

    const masterAdminRole = await prisma.role.findFirst({
      where: { name: "MASTER_ADMIN" },
    });

    if (!masterAdminRole) {
      await prisma.role.create({
        data: {
          name: "MASTER_ADMIN",
          description: "Florist shop owner role with full catalog management and staff user provisioning.",
          isSystem: true,
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
        },
      });
    }

    const staffRole = await prisma.role.findFirst({
      where: { name: "Staff" },
    });

    if (!staffRole) {
      await prisma.role.create({
        data: {
          name: "Staff",
          description: "Florist team member: can view, add, and edit bouquets, but cannot delete.",
          isSystem: false,
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: false,
        },
      });
    }

    const existingSuperAdmin = await prisma.user.findUnique({
      where: { username: "superadmin" },
    });

    if (!existingSuperAdmin) {
      const hashedPassword = await hashPassword("superadmin");
      await prisma.user.create({
        data: {
          username: "superadmin",
          password: hashedPassword,
          role: "SUPER_ADMIN",
          roleId: superAdminRole.id,
        },
      });
    }

    // Auto-migrate any legacy "ADMIN" users or unlinked staff to the "Staff" role
    if (staffRole) {
      await prisma.user.updateMany({
        where: {
          OR: [
            { role: "ADMIN" },
            { role: "admin" },
            { role: "STAFF" },
            { role: "staff" },
            { role: "Staff", roleId: null },
          ],
          username: { not: "superadmin" },
        },
        data: {
          role: "Staff",
          roleId: staffRole.id,
        },
      });
    }
  } catch (err) {
    console.warn("Bootstrap self-healing check notice:", err);
  }
}

/**
 * Check if the system has an existing admin or is in initial bootstrap mode
 */
export async function getSystemAuthStatus() {
  try {
    await ensureRootSuperAdminExists();
    const count = await prisma.user.count();
    const session = await getSession();
    return {
      hasAdmin: count > 0,
      isAuthenticated: Boolean(session),
      currentUser: session
        ? {
            username: session.username,
            role: session.role as UserRole,
            userId: session.userId,
          }
        : null,
    };
  } catch (error) {
    console.warn("Auth status check fallback:", error);
    return {
      hasAdmin: false,
      isAuthenticated: false,
      currentUser: null,
    };
  }
}

/**
 * Fetch all team members for Team Management modal
 */
export async function getTeamMembersAction(): Promise<
  AuthActionResult<{
    members: TeamMember[];
    availableRoles: AvailableRoleOption[];
    currentUserRole: UserRole;
    isSuperAdmin: boolean;
    isMasterAdmin: boolean;
    currentUserId: string;
  }>
> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        username: true,
        role: true,
        roleId: true,
        roleRef: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    // If only one user exists in the system, ensure they are SUPER_ADMIN
    if (users.length === 1 && users[0].role !== "SUPER_ADMIN") {
      await prisma.user.update({
        where: { id: users[0].id },
        data: { role: "SUPER_ADMIN" },
      });
      users[0].role = "SUPER_ADMIN";
    }

    const availableRoles = await prisma.role.findMany({
      select: { id: true, name: true, isSystem: true },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });

    const currentUser = users.find((u) => u.id === session.userId);
    const currentUserRole = (currentUser?.role || session.role || "ADMIN") as UserRole;
    const isSuperAdmin = currentUserRole === "SUPER_ADMIN";
    const isMasterAdmin = currentUserRole === "MASTER_ADMIN";

    return {
      success: true,
      data: {
        members: users.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          roleId: u.roleId,
          roleName: u.roleRef?.name || u.role,
          createdAt: u.createdAt.toISOString(),
        })),
        availableRoles,
        currentUserRole,
        isSuperAdmin,
        isMasterAdmin,
        currentUserId: session.userId,
      },
    };
  } catch (error: unknown) {
    console.error("Error fetching team members:", error);
    const message = error instanceof Error ? error.message : "Failed to load team members.";
    return { success: false, error: message };
  }
}

/**
 * Reset User Password
 * - SUPER_ADMIN: Can reset anyone (Master Admin, Staff, or self)
 * - MASTER_ADMIN: Can reset only ADMIN (Staff)
 */
export async function resetUserPasswordAction(
  targetUserId: string,
  newPassword: string
): Promise<AuthActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized: Please log in." };
    }

    const caller = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!caller) {
      return { success: false, error: "Caller account not found." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return { success: false, error: "Target user not found." };
    }

    // Ironclad protection: No one can edit or reset superadmin password, except superadmin themselves
    if (targetUser.username === "superadmin") {
      if (session.userId !== targetUser.id) {
        return {
          success: false,
          error: "Permission denied: The root superadmin account cannot be modified by other users.",
        };
      }
    }

    // Role-based privilege validation
    if (caller.role === "SUPER_ADMIN") {
      // Super Admin has full unrestricted access
    } else if (caller.role === "MASTER_ADMIN") {
      // Master Admin can only reset staff (ADMIN)
      if (targetUser.role === "SUPER_ADMIN") {
        return {
          success: false,
          error: "Permission denied: Master Admin cannot reset the Developer / Super Admin account.",
        };
      }
      if (targetUser.role === "MASTER_ADMIN" && targetUser.id !== caller.id) {
        return {
          success: false,
          error: "Permission denied: Cannot reset credentials for another Master Admin.",
        };
      }
    } else {
      return {
        success: false,
        error: "Permission denied: Staff accounts cannot reset passwords.",
      };
    }

    // Validate new password rules: min 8, uppercase, number
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.isValid) {
      return { success: false, error: passwordCheck.error };
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error resetting password:", error);
    const message = error instanceof Error ? error.message : "Failed to reset password.";
    return { success: false, error: message };
  }
}

/**
 * Delete User Account
 * - SUPER_ADMIN: Can delete anyone (except self)
 * - MASTER_ADMIN: Can delete only ADMIN (Staff)
 */
export async function deleteTeamMemberAction(
  targetUserId: string
): Promise<AuthActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized." };
    }

    if (session.userId === targetUserId) {
      return { success: false, error: "You cannot delete your own account." };
    }

    const caller = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!caller) {
      return { success: false, error: "Caller not found." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return { success: false, error: "User not found." };
    }

    // Ironclad protection: The root superadmin account can NEVER be deleted
    if (targetUser.username === "superadmin") {
      return {
        success: false,
        error: "Permission denied: The root superadmin account is permanent and cannot be deleted.",
      };
    }

    if (caller.role === "SUPER_ADMIN") {
      // Super Admin can delete anyone except self
    } else if (caller.role === "MASTER_ADMIN") {
      if (targetUser.role === "SUPER_ADMIN" || targetUser.role === "MASTER_ADMIN") {
        return {
          success: false,
          error: "Permission denied: Master Admin can only remove Staff accounts.",
        };
      }
    } else {
      return {
        success: false,
        error: "Permission denied: Staff cannot delete accounts.",
      };
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting member:", error);
    const message = error instanceof Error ? error.message : "Failed to delete user.";
    return { success: false, error: message };
  }
}

/**
 * Change User Role (SUPER_ADMIN and MASTER_ADMIN)
 */
export async function updateUserRoleAction(
  targetUserId: string,
  newRoleOrId: string
): Promise<AuthActionResult> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Unauthorized." };

    const caller = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!caller || (caller.role !== "SUPER_ADMIN" && caller.role !== "MASTER_ADMIN")) {
      return {
        success: false,
        error: "Permission denied: Only Super Admin and Master Admin can change roles.",
      };
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return { success: false, error: "User not found." };
    }

    // Ironclad protection: The root superadmin account role is permanent and cannot be modified
    if (targetUser.username === "superadmin") {
      return {
        success: false,
        error: "Permission denied: The root superadmin account role is permanent and cannot be modified.",
      };
    }

    // Master Admin cannot modify Super Admin or promote to Super Admin/Master Admin
    if (caller.role === "MASTER_ADMIN") {
      if (targetUser.role === "SUPER_ADMIN" || targetUser.role === "MASTER_ADMIN") {
        return {
          success: false,
          error: "Permission denied: Master Admin cannot modify administrative accounts.",
        };
      }
      if (newRoleOrId === "SUPER_ADMIN" || newRoleOrId === "MASTER_ADMIN") {
        return {
          success: false,
          error: "Permission denied: Master Admin cannot grant admin privileges.",
        };
      }
    }

    // Lookup matching Role in DB
    const matchingRole = await prisma.role.findFirst({
      where: {
        OR: [
          { id: newRoleOrId },
          { name: { equals: newRoleOrId, mode: "insensitive" as const } },
        ],
      },
    });

    let assignedRoleName = newRoleOrId;
    let assignedRoleId: string | null = null;

    if (matchingRole) {
      assignedRoleName = matchingRole.name;
      assignedRoleId = matchingRole.id;
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: assignedRoleName,
        roleId: assignedRoleId,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating role:", error);
    const message = error instanceof Error ? error.message : "Failed to update role.";
    return { success: false, error: message };
  }
}

/**
 * Helper to generate random compliant password
 */
export async function generateRandomPasswordAction(): Promise<{ password: string }> {
  return { password: generateTemporaryPassword() };
}
