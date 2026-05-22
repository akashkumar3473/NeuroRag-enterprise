"use client";

import React, { useEffect } from "react";
import Sidebar from "./Sidebar";
import { useApp } from "../context/AppContext";
import { ShieldCheck, HelpCircle, Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading, isDemoMode } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const normalizedPathname = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  const isPublicRoute = normalizedPathname === "/" || normalizedPathname === "/login";

  useEffect(() => {
    if (!isLoading && !currentUser && !isPublicRoute) {
      router.push("/login");
    }
  }, [currentUser, isLoading, normalizedPathname, router, isPublicRoute]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#08090D] text-slate-100 flex-col gap-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading NeuroRAG environment...</p>
      </div>
    );
  }

  // Handle redirecting states to prevent flash of content
  if (!currentUser && !isPublicRoute) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#08090D] text-slate-100 flex-col gap-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Redirecting to login...</p>
      </div>
    );
  }

  // Public layouts (landing page and login page)
  if (isPublicRoute) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#08090D]">
        {children}
      </div>
    );
  }

  // Authenticated workspace layouts
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#08090D] text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0a0d14]/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs font-mono text-slate-400">
              System Active: <span className="text-slate-200">NeuroCorp node-1</span>
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* RBAC Banner */}
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RBAC Policy: Active (Role: {currentUser?.role})</span>
            </div>

            {isDemoMode && (
              <div className="flex items-center gap-2 px-3 py-1 rounded bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-400">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Demo Sandbox</span>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#08090D]">
          {children}
        </main>
      </div>
    </div>
  );
}
