import { Package, Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 animate-in fade-in duration-150">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 ios-glass border-b border-slate-200/80">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30 animate-pulse">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="h-4 w-24 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-3 w-36 bg-slate-100 rounded-md animate-pulse mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span className="text-xs text-slate-400 font-medium">Loading catalog...</span>
          </div>
        </div>
      </header>

      {/* Main Skeleton Cards */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        <div className="h-10 bg-white rounded-2xl border border-slate-200/80 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-7 w-20 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-7 w-20 bg-slate-100 rounded-full animate-pulse" />
        </div>

        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3.5 bg-white rounded-3xl border border-slate-200/80 flex items-center gap-3.5 shadow-xs"
            >
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex-shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 rounded-md animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-100 rounded-md animate-pulse" />
                <div className="h-4 w-16 bg-emerald-100 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
