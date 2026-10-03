import { getSystemAuthStatus } from "@/app/auth/actions";
import LoginForm from "@/components/LoginForm";
import { Flower2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Flora Studio | Florist Portal Login",
  description: "Secure login for the Flora Studio catalog management portal.",
};

export default async function LoginPage() {
  const { hasAdmin } = await getSystemAuthStatus();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="w-14 h-14 rounded-3xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30 mb-3">
          <Flower2 className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Flora Studio
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Sign in to access your mobile flower catalog CMS
        </p>
      </div>

      <LoginForm hasAdmin={hasAdmin} />
    </div>
  );
}
