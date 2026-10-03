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
  const { hasAdmin, isAuthenticated } = await getSystemAuthStatus();

  // If an admin already exists and the current visitor is NOT an authenticated admin, deny access
  if (hasAdmin && !isAuthenticated) {
    redirect("/login");
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
          {hasAdmin
            ? "Create an additional administrator account"
            : "First-time Master Administrator Setup"}
        </p>
      </div>

      <RegisterForm
        isFirstAdmin={!hasAdmin}
        isLoggedInAdmin={isAuthenticated}
      />
    </div>
  );
}
