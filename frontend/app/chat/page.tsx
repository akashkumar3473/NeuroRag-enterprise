"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { getApiUrl } from "../utils/api";
import { 
  Send, 
  Sparkles, 
  HelpCircle,
  FileText,
  Search,
  AlertTriangle,
  Loader,
  Brain,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Citation {
  source_id: number;
  file_name: string;
  page_number: number;
  snippet: string;
}

interface Message {
  id: number;
  sender_role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations: Citation[] | null;
  agent_used: string | null;
}

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
}

export default function ChatAssistant() {
  const { currentUser, isDemoMode, refreshTrigger } = useApp();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  
  // Controls
  const [selectedAgent, setSelectedAgent] = useState("None"); // None, Research
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Active citation slide-over
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipFetchRef = useRef(false);

  const fetchSessions = () => {
    if (!currentUser) return;
    fetch(getApiUrl(`/api/chat/sessions?user_email=${currentUser.email}`))
      .then(res => res.json())
      .then(data => {
        setSessions(data);
        setLoadingSessions(false);
        if (data.length > 0 && activeSessionId === null) {
          setActiveSessionId(data[0].id);
        }
      })
      .catch(err => {
        console.error("Error loading chat sessions:", err);
        setLoadingSessions(false);
      });
  };

  const fetchMessages = (sessionId: number) => {
    fetch(getApiUrl(`/api/chat/sessions/${sessionId}/messages`))
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(err => console.error("Error fetching messages:", err));
  };

  useEffect(() => {
    fetchSessions();
  }, [currentUser, refreshTrigger]);

  useEffect(() => {
    if (activeSessionId !== null) {
      if (skipFetchRef.current) {
        skipFetchRef.current = false;
        return;
      }
      fetchMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingChat]);

  const handleStartNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loadingChat || !currentUser) return;

    const userMessageContent = query.trim();
    setQuery("");
    setLoadingChat(true);

    // Optimistically insert user message in UI
    const tempUserMsg: Message = {
      id: Date.now(),
      sender_role: "user",
      content: userMessageContent,
      timestamp: new Date().toISOString(),
      citations: null,
      agent_used: null
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Send payload to FastAPI
    fetch(getApiUrl("/api/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: userMessageContent,
        user_email: currentUser.email,
        agent: selectedAgent,
        session_id: activeSessionId
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Chat generation failed");
        return res.json();
      })
      .then(data => {
        // Update active session ID
        if (!activeSessionId) {
          skipFetchRef.current = true;
          setActiveSessionId(data.session_id);
          fetchSessions();
        }
        
        // Add assistant message
        const assistantMsg: Message = {
          id: Date.now() + 1,
          sender_role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString(),
          citations: data.citations,
          agent_used: selectedAgent !== "None" ? selectedAgent : null
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLoadingChat(false);
      })
      .catch(err => {
        console.error(err);
        const errMsg: Message = {
          id: Date.now() + 1,
          sender_role: "assistant",
          content: "❌ Error connecting to RAG backend. Please ensure uvicorn server is running locally.",
          timestamp: new Date().toISOString(),
          citations: null,
          agent_used: null
        };
        setMessages(prev => [...prev, errMsg]);
        setLoadingChat(false);
      });
  };

  // Helper to parse citations inline [1], [2] to clickable spans
  const renderMessageContent = (msg: Message) => {
    const text = msg.content;
    if (msg.sender_role === "user" || !msg.citations || msg.citations.length === 0) {
      return <p className="whitespace-pre-wrap">{text}</p>;
    }

    // Regexp matching brackets [1], [2], etc.
    const parts = text.split(/(\[\d+\])/g);
    return (
      <p className="whitespace-pre-wrap">
        {parts.map((part, idx) => {
          const match = part.match(/\[(\d+)\]/);
          if (match) {
            const citationId = parseInt(match[1]);
            const citation = msg.citations?.find(c => c.source_id === citationId);
            if (citation) {
              return (
                <span
                  key={idx}
                  onClick={() => setActiveCitation(citation)}
                  className="mx-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[10px] cursor-pointer hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
                >
                  {part}
                </span>
              );
            }
          }
          return part;
        })}
      </p>
    );
  };

  return (
    <div className="flex h-full w-full bg-[#08090D] overflow-hidden relative">
      
      {/* Session History Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col h-full bg-[#090b11] relative z-10 flex-shrink-0">
        <div className="p-4 border-b border-white/5">
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-semibold text-[#08090D] shadow-lg shadow-emerald-500/10 transition-all duration-200"
          >
            <Sparkles className="w-4 h-4" />
            New Chat Session
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Recent Threads
          </div>
          {loadingSessions ? (
            <div className="py-8 text-center text-slate-600 text-xs">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-slate-600 text-xs">No recent threads</div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs truncate transition-all ${
                  activeSessionId === s.id 
                    ? "bg-white/5 text-emerald-400 font-semibold border border-white/5" 
                    : "text-slate-400 hover:bg-white/[0.02] hover:text-slate-200 border border-transparent"
                }`}
              >
                {s.title}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#08090D] relative z-10">
        {/* Controls Toolbar */}
        <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-black/10">
          <div className="flex items-center gap-2">
            <Brain className="w-4.5 h-4.5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">AI Knowledge Assistant</h3>
          </div>

          {/* Model & Agent selectors */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Agent Mode:</span>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="None">Direct RAG</option>
                <option value="Research">Research Agent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Message logs */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 && !loadingChat ? (
            <div className="max-w-xl mx-auto py-20 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
                <Brain className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white">Welcome to NeuroRAG Enterprise</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ask policy questions, technical queries, or onboarding info. NeuroRAG retrieves answers directly from the uploaded knowledge documents, respecting security scopes.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-4 text-left">
                <button
                  onClick={() => setQuery("What is our leaves and PTO policy?")}
                  className="p-3 bg-white/[0.01] border border-white/5 rounded-lg text-xs text-slate-400 hover:border-emerald-500/20 hover:text-emerald-400 transition"
                >
                  "What is our leaves and PTO policy?"
                </button>
                <button
                  onClick={() => setQuery("Explain our reimbursement rules.")}
                  className="p-3 bg-white/[0.01] border border-white/5 rounded-lg text-xs text-slate-400 hover:border-emerald-500/20 hover:text-emerald-400 transition"
                >
                  "Explain our reimbursement rules."
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.sender_role === "user" ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-2 mb-1.5 text-[10px] text-slate-500 font-mono">
                    <span>{msg.sender_role === "user" ? (currentUser?.name || "User") : "NeuroRAG AI"}</span>
                    {msg.agent_used && (
                      <span className="bg-emerald-500/10 text-emerald-400 px-1 py-0.1 rounded text-[9px] border border-emerald-500/25">
                        {msg.agent_used} Agent
                      </span>
                    )}
                  </div>
                  
                  <div 
                    className={`max-w-2xl px-4 py-3 rounded-xl text-xs leading-relaxed font-sans border ${
                      msg.sender_role === "user"
                        ? "bg-slate-900 border-white/10 text-slate-200 rounded-tr-none"
                        : "bg-[#0c0f16]/90 border-white/5 text-slate-300 rounded-tl-none shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                    }`}
                  >
                    {renderMessageContent(msg)}

                    {/* Citations index footer */}
                    {msg.sender_role === "assistant" && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-semibold text-slate-500 font-mono">Sources Cited:</span>
                        {msg.citations.map((citation) => (
                          <button
                            key={citation.source_id}
                            onClick={() => setActiveCitation(citation)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-slate-400 hover:text-white transition"
                          >
                            <FileText className="w-3 h-3 text-emerald-400" />
                            <span className="truncate max-w-[120px]">{citation.file_name} (p.{citation.page_number})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loadingChat && (
                <div className="flex flex-col items-start">
                  <div className="text-[10px] text-slate-500 font-mono mb-1.5">NeuroRAG AI</div>
                  <div className="bg-[#0c0f16]/90 border border-white/5 text-slate-400 px-4 py-3 rounded-xl rounded-tl-none text-xs flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Searching vectors and generating response...</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-6 border-t border-white/5 bg-black/10">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center">
            <input
              type="text"
              placeholder="Ask a question about uploaded policies and documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loadingChat}
              className="w-full pl-4 pr-12 py-3 bg-[#0a0d14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/80 transition-all placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!query.trim() || loadingChat}
              className="absolute right-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-20 text-[#08090D] font-bold rounded-lg transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Side drawer for Citations Detail */}
      <AnimatePresence>
        {activeCitation && (
          <div className="fixed inset-0 bg-black/60 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#0d1017] border-l border-white/10 shadow-2xl p-8 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-bold text-white text-base">Citation Details</h4>
                  </div>
                  <button
                    onClick={() => setActiveCitation(null)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Source File</span>
                    <p className="text-white text-sm font-semibold mt-1">{activeCitation.file_name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Source Page</span>
                    <p className="text-white text-sm font-semibold mt-1">Page {activeCitation.page_number}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Retrieved Context Snippet</span>
                    <div className="mt-2 p-4 bg-black/40 rounded-lg border border-white/5 text-xs text-slate-300 font-mono leading-relaxed max-h-[300px] overflow-y-auto">
                      "{activeCitation.snippet}"
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 text-[10px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified vector index citation source</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
