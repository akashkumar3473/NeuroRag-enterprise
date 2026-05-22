"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { getApiUrl } from "../utils/api";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  HelpCircle,
  Eye,
  Lock,
  Loader
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DocumentInfo {
  id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  embedding_status: string;
  uploaded_at: string;
  uploaded_by: string;
  chunk_count: number;
  access_role: string;
  summary: string | null;
}

export default function DocumentHub() {
  const { currentUser, refreshTrigger, triggerRefresh } = useApp();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploadRole, setUploadRole] = useState("General");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  
  // Summary modal state
  const [activeSummaryDoc, setActiveSummaryDoc] = useState<DocumentInfo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = () => {
    if (!currentUser) return;
    fetch(getApiUrl(`/api/documents?user_email=${currentUser.email}`))
      .then(res => res.json())
      .then(data => {
        setDocuments(data);
        setLoadingDocs(false);
      })
      .catch(err => {
        console.error("Error fetching docs:", err);
        setLoadingDocs(false);
      });
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentUser, refreshTrigger]);

  // Set up polling for pending/processing documents
  useEffect(() => {
    const hasUnindexed = documents.some(
      doc => doc.embedding_status === "Pending" || doc.embedding_status === "Processing"
    );

    if (hasUnindexed) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = (file: File) => {
    if (!currentUser) return;
    setUploadProgress("uploading");
    setStatusMessage(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("access_role", uploadRole);
    formData.append("user_email", currentUser.email);

    fetch(getApiUrl("/api/upload"), {
      method: "POST",
      body: formData
    })
      .then(res => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      })
      .then(data => {
        setUploadProgress("done");
        setStatusMessage(`Successfully enqueued "${file.name}" for vector indexing!`);
        triggerRefresh();
        fetchDocuments();
        setTimeout(() => setUploadProgress("idle"), 4000);
      })
      .catch(err => {
        console.error(err);
        setUploadProgress("error");
        setStatusMessage("Failed to upload document. Please check backend connection.");
        setTimeout(() => setUploadProgress("idle"), 4000);
      });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin": return "text-red-400 bg-red-500/10 border border-red-500/20";
      case "HR": return "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
      case "Finance": return "text-blue-400 bg-blue-500/10 border border-blue-500/20";
      default: return "text-slate-400 bg-white/5 border border-white/5";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Indexed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            Indexed
          </span>
        );
      case "Processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold animate-pulse">
            <Loader className="w-3.5 h-3.5 animate-spin" />
            Vectorizing
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight font-sans">Document Hub</h2>
        <p className="text-sm text-slate-400 mt-1">Upload company resources and configure tenant security access scopes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upload Zone */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-xl space-y-6">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Index New Resource</h4>

            {/* Role Config */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Security Access Role
              </label>
              <select
                value={uploadRole}
                onChange={(e) => setUploadRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="General">General (Everyone)</option>
                <option value="HR">HR & Management Only</option>
                <option value="Finance">Finance Department Only</option>
                <option value="Admin">Administrators Only</option>
              </select>
              <span className="text-[10px] text-slate-500 block leading-normal">
                Restricts semantic vector retrieval based on the viewer's active RBAC profile.
              </span>
            </div>

            {/* Drag & Drop Target Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
                isDragging 
                  ? "border-emerald-500 bg-emerald-500/5" 
                  : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.02]"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.docx,.pptx,.xlsx,.xls,.csv,.txt"
                className="hidden"
              />

              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                <Upload className="w-5 h-5 text-slate-400" />
              </div>

              <p className="text-sm font-semibold text-white text-center">Drag & drop document</p>
              <p className="text-xs text-slate-500 mt-1 text-center">
                PDF, DOCX, PPTX, XLSX, CSV, TXT (Max 25MB)
              </p>
            </div>

            {/* Uploading progress notification */}
            <AnimatePresence mode="wait">
              {uploadProgress !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-lg flex items-center gap-3 text-xs border ${
                    uploadProgress === "uploading" 
                      ? "bg-blue-500/5 border-blue-500/20 text-blue-400"
                      : uploadProgress === "done"
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/5 border-red-500/20 text-red-400"
                  }`}
                >
                  {uploadProgress === "uploading" && <Loader className="w-4 h-4 animate-spin flex-shrink-0" />}
                  {uploadProgress === "done" && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                  {uploadProgress === "error" && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  <span className="font-medium truncate">{statusMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Indexed Documents list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-xl">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">Uploaded Repository</h4>
            
            {loadingDocs ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading documents index...
              </div>
            ) : documents.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                No documents found in the database. Upload one on the left to start!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Role Scope</th>
                      <th className="pb-3">Indexed Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="group hover:bg-white/[0.01] transition-all">
                        <td className="py-4 pr-3 font-medium text-white max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span className="truncate">{doc.file_name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-slate-400 font-mono">{formatSize(doc.file_size)}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${getRoleColor(doc.access_role)}`}>
                            {doc.access_role}
                          </span>
                        </td>
                        <td className="py-4">{getStatusBadge(doc.embedding_status)}</td>
                        <td className="py-4 text-right">
                          <button
                            disabled={doc.embedding_status !== "Indexed" || !doc.summary}
                            onClick={() => setActiveSummaryDoc(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition text-xs font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Summary
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-over Summary Dialog */}
      <AnimatePresence>
        {activeSummaryDoc && (
          <div className="fixed inset-0 bg-black/60 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg h-full bg-[#0d1017] border-l border-white/10 shadow-2xl p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white text-lg truncate max-w-xs">{activeSummaryDoc.file_name}</h3>
                  </div>
                  <button
                    onClick={() => setActiveSummaryDoc(null)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition"
                  >
                    Close
                  </button>
                </div>

                <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed font-sans space-y-4">
                  {/* Parse summary text markdown styled paragraphs */}
                  {activeSummaryDoc.summary?.split("\n").map((para, idx) => {
                    if (para.startsWith("## ")) {
                      return <h2 key={idx} className="text-white font-bold text-base mt-6 mb-2">{para.replace("## ", "")}</h2>;
                    } else if (para.startsWith("### ")) {
                      return <h3 key={idx} className="text-emerald-400 font-semibold text-sm mt-4 mb-1">{para.replace("### ", "")}</h3>;
                    } else if (para.startsWith("- ")) {
                      return <li key={idx} className="ml-4 list-disc text-slate-300 py-0.5">{para.replace("- ", "")}</li>;
                    } else if (para.trim() === "") {
                      return null;
                    } else {
                      return <p key={idx} className="py-1">{para}</p>;
                    }
                  })}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 mt-6 flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Indexed on {new Date(activeSummaryDoc.uploaded_at).toLocaleDateString()}</span>
                <span>Chunks: {activeSummaryDoc.chunk_count}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
