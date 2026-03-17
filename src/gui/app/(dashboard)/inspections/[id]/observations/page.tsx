"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  GripVertical,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  BookOpen,
  Eye,
  Lightbulb,
  Scale,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import CitationBadge from "@/components/documents/CitationBadge";
import { inspections, referenceChunks } from "@/lib/mockData";
import { cn, formatDate } from "@/lib/utils";
import type { Observation, Evidence, CFRCitation } from "@/lib/types";

const inspection = inspections[0];

type Significance = Observation["significance"];

const significanceConfig: Record<
  Significance,
  { label: string; bg: string; text: string; border: string }
> = {
  minor: {
    label: "Minor",
    bg: "bg-text-muted/20",
    text: "text-text-secondary",
    border: "border-l-text-muted",
  },
  significant: {
    label: "Significant",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-l-amber-500",
  },
  critical: {
    label: "Critical",
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-l-red-500",
  },
};

interface UploadedFile {
  name: string;
  size: number;
  status: "uploading" | "processing" | "done";
}

const iomGuidelines = [
  "Answer Who, What, When, Where, Why, How Much, How Often",
  "Challenge each observation: 'So What?' regarding significance",
  "Include population ratios: 'X out of Y records reviewed'",
  "Do not cite policy/guidance documents on FDA 483",
  "Do not identify individuals/firms by name",
];

const aiSuggestions = [
  { text: "Missing 'how often' detail", type: "warning" as const },
  { text: "Consider adding population ratio", type: "warning" as const },
  { text: "No CFR citation attached", type: "warning" as const },
  { text: "Observation text exceeds recommended length", type: "info" as const },
];

const sourceColors: Record<string, string> = {
  IOM: "border-l-primary",
  CFR: "border-l-accent",
};

export default function ObservationsPage() {
  const [observations, setObservations] = useState<Observation[]>(
    () => [...inspection.observations].sort((a, b) => a.number - b.number)
  );
  const [uploadExpanded, setUploadExpanded] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"regulatory" | "iom" | "preview" | "ai">("regulatory");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const toggleSet = useCallback((set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).map((f) => ({
      name: f.name,
      size: f.size,
      status: "processing" as const,
    }));
    setUploadedFiles((prev) => [...prev, ...files]);
    setTimeout(() => {
      setUploadedFiles((prev) =>
        prev.map((f) => (f.status === "processing" ? { ...f, status: "done" } : f))
      );
    }, 2000);
  }, []);

  const addObservation = useCallback(() => {
    const maxNum = observations.length
      ? Math.max(...observations.map((o) => o.number))
      : 0;
    const newObs: Observation = {
      id: `obs-new-${Date.now()}`,
      number: maxNum + 1,
      text: "",
      significance: "minor",
      evidence: [],
      citations: [],
      aiGenerated: false,
      lastModified: new Date(),
    };
    setObservations((prev) => [...prev, newObs]);
  }, [observations]);

  const updateObservation = useCallback((id: string, updates: Partial<Observation>) => {
    setObservations((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates, lastModified: new Date() } : o))
    );
  }, []);

  const deleteObservation = useCallback((id: string) => {
    setObservations((prev) => {
      const filtered = prev.filter((o) => o.id !== id);
      return filtered.map((o, i) => ({ ...o, number: i + 1 }));
    });
  }, []);

  const duplicateObservation = useCallback((obs: Observation) => {
    const maxNum = observations.length
      ? Math.max(...observations.map((o) => o.number))
      : 0;
    const dup: Observation = {
      ...obs,
      id: `obs-dup-${Date.now()}`,
      number: maxNum + 1,
      lastModified: new Date(),
    };
    setObservations((prev) => [...prev, dup]);
  }, [observations]);

  const moveObservation = useCallback((id: string, direction: "up" | "down") => {
    setObservations((prev) => {
      const idx = prev.findIndex((o) => o.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((o, i) => ({ ...o, number: i + 1 }));
    });
  }, []);

  const simulateGenerate = useCallback((id: string) => {
    setGeneratingId(id);
    setTimeout(() => setGeneratingId(null), 3000);
  }, []);

  const addEvidence = useCallback((obsId: string) => {
    const newEv: Evidence = {
      id: `ev-new-${Date.now()}`,
      description: "",
      attachments: [],
      sourceType: "record",
    };
    setObservations((prev) =>
      prev.map((o) =>
        o.id === obsId ? { ...o, evidence: [...o.evidence, newEv] } : o
      )
    );
  }, []);

  const tabs = [
    { key: "regulatory" as const, label: "Regulatory Context", icon: Scale },
    { key: "iom" as const, label: "IOM Guidelines", icon: BookOpen },
    { key: "preview" as const, label: "Document Preview", icon: Eye },
    { key: "ai" as const, label: "AI Suggestions", icon: Lightbulb },
  ];

  const contextChunks = referenceChunks.slice(0, 4);

  return (
    <div className="flex gap-6">
      <div className="w-3/5 min-w-0 space-y-6">
        <PageHeader
          title="Observation Workspace"
          description={inspection.firm.name}
        />

        <section className="border border-border bg-surface">
          <button
            type="button"
            onClick={() => setUploadExpanded(!uploadExpanded)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-text-secondary">
              <Upload className="h-4 w-4" />
              Upload Documents
            </span>
            {uploadExpanded ? (
              <ChevronUp className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            )}
          </button>

          {uploadExpanded && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed py-10 transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background"
                )}
              >
                <Upload className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-secondary">
                  Drop inspection notes, photos, checklists, or structured data files here
                </p>
                <p className="text-xs text-text-muted">PDF, DOCX, XLSX, JPG, PNG</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {uploadedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2 text-sm"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                      <span className="flex-1 truncate font-sans text-text-primary">{f.name}</span>
                      <span className="font-mono text-xs text-text-muted">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      {f.status === "processing" && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {f.status === "done" && (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="rounded bg-primary px-4 py-2 font-mono text-xs font-medium text-white transition-colors hover:bg-primary/90"
              >
                Extract &amp; Analyze
              </button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-text-primary">
              Observation Builder
            </h2>
            <button
              type="button"
              onClick={addObservation}
              className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 font-mono text-xs font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Observation
            </button>
          </div>

          <div className="space-y-3">
            {observations.map((obs) => {
              const sig = significanceConfig[obs.significance];
              const evidenceOpen = expandedEvidence.has(obs.id);
              const detailsOpen = expandedDetails.has(obs.id);
              const isGenerating = generatingId === obs.id;

              return (
                <div
                  key={obs.id}
                  className={cn(
                    "border border-border bg-surface border-l-[3px]",
                    sig.border
                  )}
                >
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-text-muted" />
                      <span className="font-serif text-sm font-bold text-text-primary">
                        Observation #{obs.number}
                      </span>
                      {obs.aiGenerated && (
                        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                          AI-ASSISTED
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={5}
                      value={obs.text}
                      onChange={(e) => updateObservation(obs.id, { text: e.target.value })}
                      placeholder="Describe the inspectional observation..."
                      className="w-full resize-y rounded border border-border bg-background px-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => simulateGenerate(obs.id)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 rounded bg-primary/10 px-3 py-1.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {isGenerating ? "Generating..." : "Generate Draft"}
                    </button>

                    {isGenerating && (
                      <div className="rounded border border-primary/20 bg-primary/5 px-3 py-2">
                        <span className="animate-pulse font-sans text-sm text-primary">
                          Based on our inspection of this establishment, the following observation is made pursuant to applicable federal regulations. Specifically...
                        </span>
                        <span className="inline-block h-4 w-0.5 animate-pulse bg-primary" />
                      </div>
                    )}

                    <div className="border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => setExpandedEvidence(toggleSet(expandedEvidence, obs.id))}
                        className="flex items-center gap-1.5 font-mono text-xs font-medium text-text-secondary hover:text-text-primary"
                      >
                        {evidenceOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        Evidence ({obs.evidence.length})
                      </button>

                      {evidenceOpen && (
                        <div className="mt-2 space-y-2 pl-5">
                          {obs.evidence.map((ev) => (
                            <div
                              key={ev.id}
                              className="rounded border border-border bg-background px-3 py-2 text-sm text-text-secondary"
                            >
                              {ev.description || "No description"}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addEvidence(obs.id)}
                            className="font-mono text-xs text-primary hover:text-primary/80"
                          >
                            + Add Evidence
                          </button>
                          {obs.citations.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {obs.citations.map((c) => (
                                <CitationBadge key={c.fullCitation} citation={c} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => setExpandedDetails(toggleSet(expandedDetails, obs.id))}
                        className="flex items-center gap-1.5 font-mono text-xs font-medium text-text-secondary hover:text-text-primary"
                      >
                        {detailsOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        WHO / WHAT / WHEN / WHERE / HOW MUCH / HOW OFTEN
                      </button>

                      {detailsOpen && (
                        <div className="mt-2 grid grid-cols-2 gap-2 pl-5">
                          {(
                            [
                              ["who", "WHO"],
                              ["what", "WHAT"],
                              ["when", "WHEN"],
                              ["where", "WHERE"],
                              ["howMuch", "HOW MUCH"],
                              ["howOften", "HOW OFTEN"],
                            ] as const
                          ).map(([field, label]) => (
                            <div key={field}>
                              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
                                {label}
                              </label>
                              <input
                                type="text"
                                value={(obs[field] as string) ?? ""}
                                onChange={(e) =>
                                  updateObservation(obs.id, { [field]: e.target.value })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1.5 font-sans text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 border-t border-border pt-3">
                      <span className="mr-2 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                        Significance
                      </span>
                      {(["minor", "significant", "critical"] as Significance[]).map((s) => {
                        const cfg = significanceConfig[s];
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateObservation(obs.id, { significance: s })}
                            className={cn(
                              "rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors",
                              obs.significance === s
                                ? cn(cfg.bg, cfg.text)
                                : "text-text-muted hover:text-text-secondary"
                            )}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => duplicateObservation(obs)}
                        title="Duplicate"
                        className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-secondary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteObservation(obs.id)}
                        title="Delete"
                        className="rounded p-1.5 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveObservation(obs.id, "up")}
                        title="Move Up"
                        className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-secondary"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveObservation(obs.id, "down")}
                        title="Move Down"
                        className="rounded p-1.5 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-secondary"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <span className="ml-auto font-mono text-[10px] text-text-muted">
                        Modified {formatDate(obs.lastModified)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="w-2/5 min-w-0">
        <div className="sticky top-6 space-y-4">
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2.5 font-mono text-xs font-medium transition-colors",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {activeTab === "regulatory" && (
              <>
                {contextChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className={cn(
                      "border border-border bg-surface border-l-[3px] px-4 py-3",
                      sourceColors[chunk.source] ?? "border-l-text-muted"
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-surface-elevated px-2 py-0.5 font-mono text-[10px] font-medium text-text-muted">
                        {chunk.source}
                      </span>
                      <span className="font-mono text-[10px] text-text-muted">
                        {chunk.sectionPath.join(" › ")}
                      </span>
                    </div>
                    <h4 className="font-serif text-sm font-semibold text-text-primary">
                      {chunk.title}
                    </h4>
                    <p className="mt-1 font-sans text-xs leading-relaxed text-text-secondary">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </>
            )}

            {activeTab === "iom" && (
              <div className="border border-border bg-surface px-4 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-serif text-sm font-semibold text-text-primary">
                    IOM 5.5.11 — Writing Observations
                  </h3>
                </div>
                <ul className="space-y-2">
                  {iomGuidelines.map((tip, i) => (
                    <li
                      key={i}
                      className="flex gap-2 rounded border border-border bg-background px-3 py-2"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="font-sans text-xs text-text-secondary">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === "preview" && (
              <div className="border border-border bg-white px-6 py-5 space-y-4">
                <div className="border-b-2 border-black pb-2 text-center">
                  <p className="font-serif text-xs font-bold uppercase tracking-widest text-black">
                    Department of Health and Human Services
                  </p>
                  <p className="font-serif text-[10px] text-gray-600">
                    Food and Drug Administration
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-black">
                    FORM FDA 483
                  </p>
                  <p className="font-mono text-[10px] text-gray-500">
                    INSPECTIONAL OBSERVATIONS
                  </p>
                </div>
                <div className="space-y-3">
                  {observations.map((obs) => (
                    <div key={obs.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                      <p className="font-mono text-xs font-bold text-black">
                        Observation {obs.number}
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-gray-800">
                        {obs.text
                          ? obs.text.length > 100
                            ? obs.text.slice(0, 100) + "..."
                            : obs.text
                          : "(No observation text)"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-2">
                {aiSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 border border-border bg-surface px-4 py-3"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span className="font-sans text-sm text-text-secondary">{s.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
