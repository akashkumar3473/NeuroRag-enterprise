"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  FileUp, 
  MessageSquareShare, 
  Network, 
  ShieldAlert, 
  Key, 
  HelpCircle,
  LogOut,
  Sparkles
} from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Sidebar() {
  const pathname = usePathname();
  const normalizedPathname = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  const router = useRouter();
  const { currentUser, logout, apiSettings, setApiSettings, isDemoMode } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(apiSettings.GEMINI_API_KEY);
  const [openaiKeyInput, setOpenaiKeyInput] = useState(apiSettings.OPENAI_API_KEY);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Document Hub", href: "/upload", icon: FileUp },
    { label: "AI Knowledge Chat", href: "/chat", icon: MessageSquareShare },
    { label: "Knowledge Graph", href: "/graph", icon: Network },
  ];

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setApiSettings({
      GEMINI_API_KEY: geminiKeyInput,
      OPENAI_API_KEY: openaiKeyInput
    });
    setShowSettings(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin": return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "HR": return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      case "Finance": return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      default: return "bg-slate-500/20 text-slate-400 border border-slate-500/30";
    }
  };

  return (
    <>
      <aside className="w-64 border-r border-white/5 flex flex-col h-full bg-[#0a0d14] text-slate-300 relative z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Sparkles className="w-5 h-5 text-[#08090D]" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-wider leading-none">NeuroRAG</h1>
            <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">Knowledge OS</span>
          </div>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 font-mono">v1.0</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = normalizedPathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                    : "hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Sidebar Action & User Selector */}
        <div className="p-4 border-t border-white/5 space-y-4">
          {/* Mode Badge */}
          <div 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 cursor-pointer transition-all"
          >
            <Key className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <p className="text-[11px] text-slate-400 leading-none">RAG Engine Mode</p>
              <p className="text-xs font-semibold text-white mt-1">
                {isDemoMode ? "Offline (Demo)" : "Live (LLM Connected)"}
              </p>
            </div>
            <span className={`w-2 h-2 rounded-full ml-auto ${isDemoMode ? "bg-amber-500 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
          </div>

          {/* User & Role Presentation with Log Out */}
          {currentUser && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between gap-2 overflow-hidden">
              <div className="truncate flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
                <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase font-mono flex-shrink-0 ${getRoleColor(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">{currentUser.email}</span>
                </div>
              </div>
              
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                title="Log Out"
                className="p-2 rounded bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/25 transition duration-200 flex-shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Settings Modal Dialog */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f131c] border border-white/10 rounded-xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
            
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Configure RAG Engine Keys
            </h2>
            <p className="text-slate-400 text-xs mb-6">
              Enter your API keys to enable live semantic embeddings and response generation. Leave them blank to fall back to the SQLite + TF-IDF Local Demo Mode.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={openaiKeyInput}
                  onChange={(e) => setOpenaiKeyInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 border border-white/5 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-semibold text-[#08090D] shadow-lg shadow-emerald-500/20 transition"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
