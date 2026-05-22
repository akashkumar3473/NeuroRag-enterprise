"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { getApiUrl } from "../utils/api";
import { 
  FileText, 
  Cpu, 
  Search, 
  ShieldAlert, 
  ArrowUpRight, 
  Activity,
  User,
  Clock
} from "lucide-react";
import { motion } from "framer-motion";

interface AnalyticsData {
  total_searches: number;
  top_queries: { query: string; count: number }[];
  knowledge_gaps: string[];
  average_latency_ms: number;
  flagged_compliance_queries: number;
}

interface DocumentInfo {
  id: number;
  file_name: string;
  chunk_count: number;
  embedding_status: string;
  access_role: string;
}

export default function Dashboard() {
  const { currentUser, refreshTrigger } = useApp();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    total_searches: 0,
    top_queries: [],
    knowledge_gaps: [],
    average_latency_ms: 0,
    flagged_compliance_queries: 0
  });
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    // Fetch analytics
    const p1 = fetch(getApiUrl(`/api/analytics?user_email=${currentUser.email}`))
      .then(res => res.json())
      .then(data => setAnalytics(data))
      .catch(err => console.error("Error fetching analytics:", err));

    // Fetch documents
    const p2 = fetch(getApiUrl(`/api/documents?user_email=${currentUser.email}`))
      .then(res => res.json())
      .then(data => setDocuments(data))
      .catch(err => console.error("Error fetching documents:", err));

    Promise.all([p1, p2]).finally(() => setLoading(false));
  }, [currentUser, refreshTrigger]);

  const totalChunks = documents.reduce((acc, doc) => acc + doc.chunk_count, 0);
  const activeDocsCount = documents.filter(doc => doc.embedding_status === "Indexed").length;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" }
    })
  } as any;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Enterprise Knowledge Analytics</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time index performance, user interactions, and security diagnostics.</p>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-900/60 border border-white/5 rounded-lg px-4 py-2 text-xs">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-mono">Live Telemetry: Node Active</span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Documents */}
        <motion.div 
          custom={0} initial="hidden" animate="visible" variants={cardVariants}
          className="glass-panel p-6 rounded-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-emerald-500/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Documents</span>
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white tracking-tight">{activeDocsCount}</h3>
            <p className="text-xs text-slate-500 mt-1">Total Uploaded: {documents.length}</p>
          </div>
        </motion.div>

        {/* Total Chunks */}
        <motion.div 
          custom={1} initial="hidden" animate="visible" variants={cardVariants}
          className="glass-panel p-6 rounded-xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-blue-500/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vector Chunks</span>
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white tracking-tight">{totalChunks}</h3>
            <p className="text-xs text-slate-500 mt-1">Avg 500-tokens per chunk</p>
          </div>
        </motion.div>

        {/* Searches */}
        <motion.div 
          custom={2} initial="hidden" animate="visible" variants={cardVariants}
          className="glass-panel p-6 rounded-xl relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-purple-500/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Queries Handled</span>
            <Search className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white tracking-tight">{analytics.total_searches}</h3>
            <p className="text-xs text-slate-500 mt-1">Avg Latency: {analytics.average_latency_ms}ms</p>
          </div>
        </motion.div>

        {/* Security / Compliance */}
        <motion.div 
          custom={3} initial="hidden" animate="visible" variants={cardVariants}
          className="glass-panel p-6 rounded-xl relative overflow-hidden group hover:border-red-500/30 transition-all duration-300"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-red-500/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Compliance Flags</span>
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white tracking-tight">{analytics.flagged_compliance_queries}</h3>
            <p className="text-xs text-slate-500 mt-1">PII / Data Leak Filters Active</p>
          </div>
        </motion.div>
      </div>

      {/* Main Analytics Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Search Trends */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                Semantic Search Trends
              </h4>
              <span className="text-[10px] text-slate-500">Sorted by Search Volume</span>
            </div>
            
            {analytics.top_queries.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No search trends logged yet. Ask questions in the AI Chat tab to populate.
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.top_queries.map((q, idx) => {
                  const maxCount = Math.max(...analytics.top_queries.map(x => x.count));
                  const percentage = (q.count / maxCount) * 100;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium truncate max-w-md">"{q.query}"</span>
                        <span className="text-slate-400 font-mono">{q.count} queries</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Security & Log Feed */}
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Corporate Access Policy Rules (RBAC)
              </h4>
            </div>
            <div className="text-xs text-slate-400 space-y-3">
              <p>The NeuroRAG system enforces dynamic security filters at the embedding chunk-retrieval layer. Users can only query files matching their authorization scopes:</p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                  <span className="font-semibold text-white block mb-1">Scope [HR & General]</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold font-mono">HR USER</span>
                  <p className="mt-1.5 text-[10px] text-slate-500">Accessible for policies, leave structures, onboarding, general guidelines.</p>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                  <span className="font-semibold text-white block mb-1">Scope [Finance & General]</span>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold font-mono">FINANCE USER</span>
                  <p className="mt-1.5 text-[10px] text-slate-500">Accessible for reimbursements, tax files, revenue statements, expense policies.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Knowledge Gaps & Operations */}
        <div className="space-y-6">
          {/* Knowledge Gaps */}
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Detected Knowledge Gaps
              </h4>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              These queries represent searches where the semantic retriever returned low-confidence matching scores. Consider uploading documentation for these topics:
            </p>
            <div className="space-y-2">
              {analytics.knowledge_gaps.map((gap, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-amber-500/[0.02] border border-amber-500/10 rounded-lg text-xs"
                >
                  <span className="text-slate-300 font-mono font-medium truncate">"{gap}"</span>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono font-semibold uppercase">Pending Doc</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick RBAC Switch Guide */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden bg-gradient-to-b from-[#0f131d] to-[#08090d]">
            <h4 className="text-sm font-semibold text-white mb-2">Multi-Tenant Simulation</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Switch users in the bottom-left dropdown of the sidebar. Test RAG behavior by switching to **HR** or **Finance** roles and asking questions in the chat about restricted policies. The AI dynamically shields unauthorized segments.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono p-2.5 bg-black/40 rounded border border-white/5 text-slate-400">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Current Identity: <strong className="text-white">{currentUser?.name || "User"}</strong></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
