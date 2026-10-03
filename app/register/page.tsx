import { redirect } from "next/navigation";
import { getSystemAuthStatus } from "@/app/auth/actions";
import RegisterForm from "@/components/RegisterForm";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Flora Studio | Admin Registration",
  description: "Register a new administrator for Flora Studio.",
};

export default async function RegisterPage() {
  const { hasAdmin, isAuthenticated, currentUser } = await getSystemAuthStatus();

  // If an admin already exists and the current visitor is NOT an authenticated admin, deny access
  if (hasAdmin && !isAuthenticated) {
    redirect("/login");
  }

  // Staff accounts cannot create other users
  if (
    hasAdmin &&
    currentUser?.role !== "SUPER_ADMIN" &&
    currentUser?.role !== "MASTER_ADMIN"
  ) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="w-14 h-14 rounded-3xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30 mb-3">
          <Package className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Flora Studio
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {!hasAdmin
            ? "First-time Developer (Super Admin) Setup"
            : currentUser?.role === "SUPER_ADMIN"
            ? "Developer Console: Provision Florist Owner or Staff"
            : "Master Admin: Register Florist Staff Member"}
        </p>
      </div>

      <RegisterForm
        isFirstAdmin={!hasAdmin}
        currentUserRole={currentUser?.role ?? null}
      />
    </div>
  );
}
