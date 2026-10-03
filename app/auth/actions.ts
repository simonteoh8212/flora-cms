"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  validatePassword,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getSession,
  generateTemporaryPassword,
} from "@/lib/auth";

export type AuthActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  isFirstAdmin?: boolean;
};

export interface TeamMember {
  id: string;
  username: string;
  role: string;
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
 * Register action: Only admin can access, or initial setup if no admin exists yet
 */
export async function registerAction(
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const username = formData.get("username")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirmPassword")?.toString();

    if (!username) {
      return { success: false, error: "Username is required." };
    }

    if (username.length < 3) {
      return { success: false, error: "Username must be at least 3 characters." };
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

    // Security Gate: Check if users exist in the database
    const totalUsers = await prisma.user.count();

    if (totalUsers > 0) {
      // If an admin already exists, check that caller is an authenticated admin
      const currentSession = await getSession();
      if (!currentSession || (currentSession.role !== "ADMIN" && currentSession.role !== "MASTER_ADMIN")) {
        return {
          success: false,
          error: "Unauthorized: Only an active admin can register new accounts.",
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

    // Hash password & store. The very first user is the MASTER_ADMIN
    const role = totalUsers === 0 ? "MASTER_ADMIN" : "ADMIN";
    const hashedPassword = await hashPassword(password as string);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
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
 * Check if the system has an existing admin or is in initial bootstrap mode
 */
export async function getSystemAuthStatus() {
  try {
    const count = await prisma.user.count();
    const session = await getSession();
    return {
      hasAdmin: count > 0,
      isAuthenticated: Boolean(session),
      currentUser: session ? { username: session.username, role: session.role } : null,
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
 * Fetch all team members (passwords omitted) for Team Management in Admin Portal
 */
export async function getTeamMembersAction(): Promise<
  AuthActionResult<{ members: TeamMember[]; isMasterAdmin: boolean; currentUserId: string }>
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
        createdAt: true,
      },
    });

    // If only one user exists and has role ADMIN, ensure they are promoted to MASTER_ADMIN
    if (users.length === 1 && users[0].role === "ADMIN") {
      await prisma.user.update({
        where: { id: users[0].id },
        data: { role: "MASTER_ADMIN" },
      });
      users[0].role = "MASTER_ADMIN";
    }

    const isMasterAdmin =
      session.role === "MASTER_ADMIN" ||
      users.find((u) => u.id === session.userId)?.role === "MASTER_ADMIN";

    return {
      success: true,
      data: {
        members: users.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        })),
        isMasterAdmin: Boolean(isMasterAdmin),
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
 * Master Admin resets a staff member's password
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

    // Verify caller has MASTER_ADMIN privileges
    const caller = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!caller || caller.role !== "MASTER_ADMIN") {
      return {
        success: false,
        error: "Permission denied: Only the Master Admin can reset staff passwords.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return { success: false, error: "Target staff user not found." };
    }

    // Prevent changing another master admin if multiple existed
    if (targetUser.role === "MASTER_ADMIN" && targetUser.id !== caller.id) {
      return {
        success: false,
        error: "Cannot reset password for another Master Admin.",
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
 * Master Admin deletes a staff member
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

    if (!caller || caller.role !== "MASTER_ADMIN") {
      return {
        success: false,
        error: "Permission denied: Only the Master Admin can delete accounts.",
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
 * Helper to generate random compliant password
 */
export async function generateRandomPasswordAction(): Promise<{ password: string }> {
  return { password: generateTemporaryPassword() };
}
