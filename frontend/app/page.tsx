"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getApiUrl } from "./utils/api";
import { 
  Sparkles, 
  ShieldCheck, 
  Terminal, 
  Database,
  ArrowRight,
  Activity,
  Cpu,
  Network
} from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    fetch(getApiUrl("/api/health"))
      .then(res => {
        if (res.ok) setBackendStatus("connected");
        else setBackendStatus("disconnected");
      })
      .catch(() => setBackendStatus("disconnected"));
  }, []);

  const featureCards = [
    {
      title: "Semantic Vector Search",
      desc: "Dual-path chunk indexing via Google Gemini, OpenAI, or local TF-IDF math fallbacks.",
      icon: Database,
      color: "text-emerald-400 border-emerald-500/20"
    },
    {
      title: "Agentic Knowledge Audits",
      desc: "Autopilot Agents for document summaries, safety classifications, and compliance alerts.",
      icon: Cpu,
      color: "text-blue-400 border-blue-500/20"
    },
    {
      title: "Multi-Tenant RBAC",
      desc: "Strict logical boundary separation preventing cross-role information exposure.",
      icon: ShieldCheck,
      color: "text-purple-400 border-purple-500/20"
    },
    {
      title: "Relational Knowledge Graph",
      desc: "Dynamic node mapping illustrating semantic correlations across corporate domains.",
      icon: Network,
      color: "text-pink-400 border-pink-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-[#08090D] flex flex-col justify-between p-8 font-sans relative overflow-hidden">
      
      {/* Background Decorative Rings */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.02] border border-emerald-500/[0.05] rounded-full pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/[0.01] border border-blue-500/[0.03] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5.5 h-5.5 text-[#08090D]" />
          </div>
          <div>
            <h1 className="font-extrabold text-white tracking-wider text-lg">NeuroRAG</h1>
            <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase block leading-none">Knowledge OS</span>
          </div>
        </div>

        {/* Backend Status indicator */}
        <div className="flex items-center gap-2.5 bg-[#0a0d14]/80 border border-white/5 rounded-full px-4 py-1.5 text-xs">
          <span className={`w-2 h-2 rounded-full ${
            backendStatus === "connected" ? "bg-emerald-400 animate-pulse" :
            backendStatus === "disconnected" ? "bg-red-500" : "bg-amber-400 animate-pulse"
          }`} />
          <span className="text-slate-400 font-mono text-[10px]">
            Backend Status: {
              backendStatus === "connected" ? "Connected" :
              backendStatus === "disconnected" ? "Offline" : "Checking..."
            }
          </span>
        </div>
      </header>

      {/* Hero / Main Section */}
      <main className="max-w-4xl mx-auto w-full text-center py-20 relative z-10 space-y-12">
        <div className="space-y-6">
          <motion.span 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-semibold uppercase tracking-wider"
          >
            <Terminal className="w-3.5 h-3.5" />
            V1.0 Live Workstation
          </motion.span>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none"
          >
            Enterprise AI <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              Knowledge Operating System
            </span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base leading-relaxed"
          >
            Upload company resources, map semantic correlations, and audit sensitive files. 
            An intelligent secure dashboard featuring real-time AI agents and role constraints.
          </motion.p>
        </div>

        {/* Action Button */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-bold text-[#08090D] shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Enter Workstation
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-12 text-left">
          {featureCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="glass-panel p-6 rounded-xl border border-white/5 space-y-3 flex flex-col justify-between hover:border-white/10 transition-all"
              >
                <div className={`w-10 h-10 rounded-lg bg-white/[0.02] border flex items-center justify-center ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{card.title}</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-8 text-xs text-slate-500 relative z-10">
        <span>© {new Date().getFullYear()} NeuroCorp Industries. All rights reserved.</span>
        <div className="flex gap-4 mt-4 sm:mt-0 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Enforcer Active
          </span>
          <span>•</span>
          <span>Docker Sandbox Node</span>
        </div>
      </footer>
    </div>
  );
}
