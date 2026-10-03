import { Package, Loader2 } from "lucide-react";

export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-150">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="w-14 h-14 rounded-3xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30 mb-3 animate-pulse">
          <Package className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Flora Studio
        </h1>
        <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          <span>Loading sign in...</span>
        </p>
      </div>

      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-ios space-y-4">
          <div className="h-4 w-28 bg-slate-200 rounded-md animate-pulse" />
          <div className="pt-2 space-y-3">
            <div className="h-11 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-11 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-12 bg-emerald-100 rounded-2xl animate-pulse mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
