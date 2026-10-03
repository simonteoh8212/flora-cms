"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Complete and reset on navigation
  useEffect(() => {
    if (loading) {
      clearTimers();
      setProgress(100);
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }
    return () => clearTimers();
  }, [pathname, searchParams, loading, clearTimers]);

  const startProgress = useCallback(() => {
    clearTimers();
    setLoading(true);
    setProgress(30);

    // Increment progress progressively
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        if (prev < 65) return prev + 20;
        return prev + 4;
      });
    }, 180);

    // Failsafe auto-reset after 8s
    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setLoading(false);
      setProgress(0);
    }, 8000);
  }, [clearTimers]);

  // Intercept all internal link clicks to trigger progress bar immediately
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      // Only handle internal links without new tab
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        targetAttr !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const cleanHref = href.split("?")[0].split("#")[0];
        if (cleanHref === pathname && !href.includes("?")) return;

        startProgress();
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      clearTimers();
    };
  }, [pathname, startProgress, clearTimers]);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 shadow-sm shadow-emerald-500/50 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? "width 150ms ease-out, opacity 250ms 100ms ease"
              : "width 220ms ease-out",
        }}
      />
    </div>
  );
}
