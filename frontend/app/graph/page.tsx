"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { getApiUrl } from "../utils/api";
import { Network, FileText, Info, HelpCircle, ShieldCheck, Loader } from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: "document" | "category" | "query";
  val: number; // size
  color: string;
  details: any;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export default function KnowledgeGraph() {
  const { currentUser, refreshTrigger } = useApp();
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<any>(null);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  
  // Dragging states
  const isDraggingRef = useRef(false);
  const draggedNodeRef = useRef<GraphNode | null>(null);

  // Fetch graph data from backend
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    fetch(getApiUrl(`/api/graph?user_email=${currentUser.email}`))
      .then(res => res.json())
      .then(data => {
        // Seed initial positions
        const nodes = data.nodes.map((node: any) => ({
          ...node,
          x: Math.random() * 500 + 100,
          y: Math.random() * 300 + 100,
          vx: 0,
          vy: 0
        }));
        setGraphData({ nodes, links: data.links });
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading graph:", err);
        setLoading(false);
      });
  }, [currentUser, refreshTrigger]);

  // Force-directed simulation loop
  useEffect(() => {
    if (loading || graphData.nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const nodes = graphData.nodes;
    const links = graphData.links;

    const runSimulation = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Calculate Forces
      // Many-body charge force (repulsion)
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeB.x! - nodeA.x!;
          const dy = nodeB.y! - nodeA.y!;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          
          if (dist < 300) {
            // Repulsion strength
            const force = (nodeA.val * nodeB.val * 0.15) / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (nodeA !== draggedNodeRef.current) {
              nodeA.vx! -= fx;
              nodeA.vy! -= fy;
            }
            if (nodeB !== draggedNodeRef.current) {
              nodeB.vx! += fx;
              nodeB.vy! += fy;
            }
          }
        }

        // Center gravity force
        const cx = width / 2;
        const cy = height / 2;
        const cdx = cx - nodeA.x!;
        const cdy = cy - nodeA.y!;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
        nodeA.vx! += (cdx / cdist) * 0.05;
        nodeA.vy! += (cdy / cdist) * 0.05;
      }

      // Link force (attraction)
      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        if (sourceNode && targetNode) {
          const dx = targetNode.x! - sourceNode.x!;
          const dy = targetNode.y! - sourceNode.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 120; // desired link length
          const k = 0.015; // spring constant
          const force = (dist - targetDist) * k;
          
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          if (sourceNode !== draggedNodeRef.current) {
            sourceNode.vx! += fx;
            sourceNode.vy! += fy;
          }
          if (targetNode !== draggedNodeRef.current) {
            targetNode.vx! -= fx;
            targetNode.vy! -= fy;
          }
        }
      });

      // Update positions and damp velocities
      nodes.forEach(node => {
        if (node === draggedNodeRef.current) return;
        node.x! += node.vx!;
        node.y! += node.vy!;
        node.vx! *= 0.85; // friction damping
        node.vy! *= 0.85;
        
        // Bounce off bounds
        const padding = 30;
        if (node.x! < padding) { node.x! = padding; node.vx! = 0; }
        if (node.x! > width - padding) { node.x! = width - padding; node.vx! = 0; }
        if (node.y! < padding) { node.y! = padding; node.vy! = 0; }
        if (node.y! > height - padding) { node.y! = height - padding; node.vy! = 0; }
      });

      // 2. Render Canvas
      ctx.clearRect(0, 0, width, height);

      // Draw Grid lines background
      ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw links
      ctx.lineWidth = 1.5;
      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x!, sourceNode.y!);
          ctx.lineTo(targetNode.x!, targetNode.y!);
          ctx.strokeStyle = link.type === "queries" ? "rgba(139, 92, 246, 0.15)" : "rgba(255, 255, 255, 0.06)";
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        const isHovered = hoveredNodeRef.current?.id === node.id;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, node.val + (isHovered ? 3 : 0), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isHovered ? 15 : 4;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Text label
        ctx.fillStyle = isHovered ? "#FFFFFF" : "#94A3B8";
        ctx.font = isHovered ? "bold 11px sans-serif" : "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x!, node.y! + node.val + 14);
      });

      animationFrameId = requestAnimationFrame(runSimulation);
    };

    runSimulation();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [loading, graphData]);

  // Mouse interactivity helpers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDraggingRef.current && draggedNodeRef.current) {
      draggedNodeRef.current.x = x;
      draggedNodeRef.current.y = y;
      return;
    }

    // Check hit test for hover
    let hitNode = null;
    const nodes = graphData.nodes;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = node.x! - x;
      const dy = node.y! - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < node.val + 8) {
        hitNode = node;
        break;
      }
    }
    hoveredNodeRef.current = hitNode;
    canvas.style.cursor = hitNode ? "pointer" : "default";
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNodeRef.current) {
      isDraggingRef.current = true;
      draggedNodeRef.current = hoveredNodeRef.current;
      setSelectedNode(hoveredNodeRef.current);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    draggedNodeRef.current = null;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 flex flex-col h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Network className="w-6 h-6 text-emerald-400" />
          Interactive Knowledge Graph
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Visual mapping of semantically connected enterprise files, categories, and recent inquiries.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-0">
        
        {/* Left Column: Legend / Tips */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Graph Legend</h4>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-[#EC4899] shadow-lg shadow-pink-500/20" />
                <span className="text-slate-300 font-medium">Domain Categories</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-[#10B981] shadow-lg shadow-emerald-500/20" />
                <span className="text-slate-300 font-medium">HR & Policy Files</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-[#3B82F6] shadow-lg shadow-blue-500/20" />
                <span className="text-slate-300 font-medium">Finance Reports</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-[#8B5CF6] shadow-lg shadow-purple-500/20" />
                <span className="text-slate-300 font-medium">Technical Documents</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-[#E5E7EB] shadow-lg shadow-white/20" />
                <span className="text-slate-300 font-medium">User Search Queries</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500 space-y-1">
              <p>💡 Click and drag nodes to adjust the spring layout.</p>
              <p>💡 Hover over nodes to highlight relationships.</p>
              <p>💡 Select a node to view metadata properties.</p>
            </div>
          </div>

          {/* Node Details Overlay Panel */}
          <div className="glass-panel p-6 rounded-xl min-h-[220px] flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">Node Details</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Label / Name</span>
                  <p className="text-white text-xs font-bold mt-0.5">{selectedNode.label}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Entity Type</span>
                  <p className="text-slate-300 text-xs font-medium capitalize mt-0.5">{selectedNode.type}</p>
                </div>
                {selectedNode.type === "document" && selectedNode.details && (
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500 font-bold block">FILE SIZE</span>
                      <span className="text-white font-mono">{selectedNode.details.size}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">CHUNKS</span>
                      <span className="text-white font-mono">{selectedNode.details.chunks}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">ROLE REQUIRED</span>
                      <span className="text-emerald-400 font-mono font-bold uppercase">{selectedNode.details.role}</span>
                    </div>
                  </div>
                )}
                {selectedNode.type === "query" && selectedNode.details && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold font-mono">Search Latency</span>
                    <p className="text-white text-xs font-semibold mt-0.5">{selectedNode.details.latency}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-600 text-xs flex flex-col items-center justify-center gap-2">
                <HelpCircle className="w-8 h-8 text-slate-700" />
                <span>Select a node on the network map to inspect properties</span>
              </div>
            )}
            
            {selectedNode?.type === "document" && (
              <div className="border-t border-white/5 pt-3 mt-3 text-[10px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Enforced RBAC filter check</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Canvas Map */}
        <div className="lg:col-span-3 glass-panel rounded-xl overflow-hidden relative bg-[#07090f] border border-white/5 flex flex-col items-center justify-center">
          {loading ? (
            <div className="text-center text-slate-500 text-xs flex flex-col items-center gap-3">
              <Loader className="w-8 h-8 animate-spin text-emerald-400" />
              <span>Mapping semantic relationships...</span>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={750}
              height={500}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>
    </div>
  );
}
