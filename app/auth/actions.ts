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
} from "@/lib/auth";

export type AuthActionResult = {
  success: boolean;
  error?: string;
  isFirstAdmin?: boolean;
};

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
      if (!currentSession || currentSession.role !== "ADMIN") {
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

    // Hash password & store
    const hashedPassword = await hashPassword(password as string);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: "ADMIN",
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
