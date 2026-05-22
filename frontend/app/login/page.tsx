"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { getApiUrl } from "../utils/api";
import { useRouter } from "next/navigation";
import { 
  Sparkles, 
  Mail, 
  Key, 
  ArrowRight, 
  Lock, 
  ShieldCheck, 
  AlertCircle,
  Loader2,
  CheckCircle,
  Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const { login, currentUser } = useApp();
  const router = useRouter();

  // Authentication states
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If already logged in, redirect to dashboard immediately
  useEffect(() => {
    if (currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(getApiUrl("/api/auth/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to send OTP code");
      }

      setSuccess("Verification code dispatched! Please check your terminal console.");
      setStep("otp");
      setCooldown(30);
      
      // Auto focus first OTP input block
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || "Connection to authorization server failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpValues.join("");
    if (otpCode.length < 6 || loading) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(getApiUrl("/api/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp_code: otpCode
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Authentication verification failed");
      }

      const data = await res.json();
      setSuccess("Authentication confirmed. Accessing workstation...");
      
      // Save session in context
      setTimeout(() => {
        login(data.user, data.token);
        router.push("/dashboard");
      }, 800);
    } catch (err: any) {
      setError(err.message || "Incorrect verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle single digit input
  const handleOtpChange = (index: number, val: string) => {
    const numericVal = val.replace(/[^0-9]/g, "");
    if (!numericVal) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = "";
      setOtpValues(newOtpValues);
      return;
    }

    const newOtpValues = [...otpValues];
    newOtpValues[index] = numericVal[numericVal.length - 1];
    setOtpValues(newOtpValues);

    // Auto-focus next field
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Backspace key navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Paste handler for convenience
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedText)) {
      const digits = pastedText.split("");
      setOtpValues(digits);
      otpRefs.current[5]?.focus();
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtpValues(Array(6).fill(""));
    setError("");
    setSuccess("");
  };

  const seedProfiles = [
    { email: "admin@neurocorp.com", role: "Admin", desc: "Full controls & compliance keys" },
    { email: "hr@neurocorp.com", role: "HR", desc: "Corporate documentation access" },
    { email: "finance@neurocorp.com", role: "Finance", desc: "Fiduciary records access" }
  ];

  return (
    <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Visual background enhancements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/[0.015] border border-emerald-500/[0.04] rounded-full pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-500/[0.01] border border-blue-500/[0.02] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
        
        {/* Left column: branding & seeded guide */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-5.5 h-5.5 text-[#08090D]" />
              </div>
              <div>
                <h1 className="font-extrabold text-white tracking-wider text-lg leading-none">NeuroRAG</h1>
                <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase block mt-1">Knowledge OS</span>
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-white leading-tight">
              Corporate Portal & Authentication Node
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Verify your employee credentials via OTP to claim session authorization and load your role-based documents, compliance history, and semantic mappings.
            </p>
          </div>

          {/* Guidelines on seeded profiles */}
          <div className="glass-panel p-5 rounded-xl border border-white/5 bg-[#0a0d14]/40 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
              <Terminal className="w-3.5 h-3.5" />
              Developer Sandbox Sandbox Info
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              You can sign in with any email. New emails are registered automatically with the <strong>General</strong> role. Or use seeded sandbox profiles to audit RBAC levels:
            </p>
            <div className="space-y-2">
              {seedProfiles.map((p, i) => (
                <div 
                  key={i} 
                  onClick={() => setEmail(p.email)}
                  className="p-2 rounded bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition cursor-pointer flex justify-between items-center group"
                >
                  <div className="truncate">
                    <p className="text-[11px] font-semibold text-white group-hover:text-emerald-400 transition truncate">{p.email}</p>
                    <p className="text-[9px] text-slate-500 truncate">{p.desc}</p>
                  </div>
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0 ${
                    p.role === "Admin" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    p.role === "HR" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: login form card */}
        <div className="md:col-span-7 flex items-center justify-center">
          <div className="w-full glass-panel border border-white/10 rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-[#0d1017]/80 backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

            <AnimatePresence mode="wait">
              {step === "email" ? (
                <motion.div
                  key="email-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      Workstation Entry
                    </div>
                    <p className="text-[11px] text-slate-500">Enter your corporate email address. A 6-digit verification code will be output to your server terminal console.</p>
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Corporate Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. admin@neurocorp.com"
                          className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-sm font-bold text-[#08090D] rounded-xl shadow-lg shadow-emerald-500/10 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#08090D]" />
                          Generating Key...
                        </>
                      ) : (
                        <>
                          Request Verification Code
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="otp-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <Key className="w-4 h-4 text-emerald-400" />
                      Verify OTP Identity
                    </div>
                    <p className="text-[11px] text-slate-500">
                      We dispatched a code to <span className="text-white font-mono">{email}</span>. Copy the 6-digit OTP code printed in the FastAPI server terminal window.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Verification Code</label>
                      <div className="flex justify-between gap-2 max-w-xs mx-auto">
                        {otpValues.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpRefs.current[idx] = el; }}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                            onPaste={idx === 0 ? handlePaste : undefined}
                            className="w-10 h-12 bg-black/40 border border-white/10 rounded-lg text-center text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpValues.join("").length < 6}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-sm font-bold text-[#08090D] rounded-xl shadow-lg shadow-emerald-500/10 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#08090D]" />
                          Authenticating Node...
                        </>
                      ) : (
                        <>
                          Verify & Access Workstation
                          <ShieldCheck className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-2">
                      <button
                        type="button"
                        onClick={handleBackToEmail}
                        className="text-slate-400 hover:text-white transition"
                      >
                        ← Back to Email
                      </button>

                      <button
                        type="button"
                        disabled={cooldown > 0 || loading}
                        onClick={handleSendOtp}
                        className="text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 transition font-medium"
                      >
                        {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP Code"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error & Success Toast Displays */}
            <div className="mt-6 min-h-[40px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-red-400 text-xs flex items-center gap-2 w-full"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                {success && !error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-xs flex items-center gap-2 w-full animate-pulse-slow"
                  >
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
