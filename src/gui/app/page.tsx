import LandingNavbar from "@/components/landing/LandingNavbar";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookText,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Database,
  FileCheck2,
  FileOutput,
  FileSearch,
  Files,
  FolderSearch,
  Layers3,
  LibraryBig,
  Mail,
  Map,
  Microscope,
  Network,
  ScanText,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Waypoints,
} from "lucide-react";

type IconCardItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export default function LandingPage() {
  const trustChips = ["Evidence-based", "Citation-aware", "Human reviewed"];

  const valueStrip = [
    {
      title: "OCR-Ready Evidence Pipeline",
      description: "Ingest notes, scans, photos, and PDFs into a structured drafting workflow.",
      icon: ScanText,
    },
    {
      title: "CFR / IOM Guided Drafting",
      description: "Draft observations with explicit grounding in inspection evidence and regulatory context.",
      icon: BookText,
    },
    {
      title: "Evidence Traceability Enabled",
      description: "Maintain links between generated language, source records, and citations.",
      icon: Waypoints,
    },
    {
      title: "Human-in-the-Loop Review",
      description: "Investigators retain control with edit, review, and approval steps before output.",
      icon: ShieldCheck,
    },
    {
      title: "Review-Ready Structured Output",
      description: "Support FDA 483 and EIR drafting with structured, reviewable content blocks.",
      icon: FileOutput,
    },
  ];

  const whyCards: IconCardItem[] = [
    {
      title: "FDA-Aligned",
      description: "Built for regulated inspection documentation where tone, structure, and review discipline matter.",
      icon: ShieldCheck,
    },
    {
      title: "Traceable",
      description: "Connect draft observations back to evidence sources and supporting references.",
      icon: Waypoints,
    },
    {
      title: "AI-Assisted",
      description: "Use AI to accelerate drafting while keeping investigators in control of decisions.",
      icon: BrainCircuit,
    },
    {
      title: "Review-Driven",
      description: "Outputs are meant for human scrutiny, refinement, and final regulatory judgment.",
      icon: FileCheck2,
    },
  ];

  const workflowSteps: IconCardItem[] = [
    {
      title: "Upload Evidence",
      description: "Collect notes, scanned forms, PDFs, and photo evidence from inspection activity.",
      icon: Upload,
    },
    {
      title: "OCR & Extraction",
      description: "Convert handwritten or scanned evidence into machine-readable text and extracted fields.",
      icon: ScanText,
    },
    {
      title: "Evidence Structuring",
      description: "Normalize findings into a usable evidence record with inspection context and metadata.",
      icon: Network,
    },
    {
      title: "AI Drafting",
      description: "Generate draft observations and narrative language using evidence-linked prompts.",
      icon: Sparkles,
    },
    {
      title: "Regulatory Validation",
      description: "Ground draft language against CFR and IOM references before review.",
      icon: BookText,
    },
    {
      title: "Investigator Review",
      description: "Review, edit, and approve content before generating final FDA 483 or EIR outputs.",
      icon: CheckCircle2,
    },
  ];

  const capabilities: IconCardItem[] = [
    {
      title: "OCR Ingestion",
      description: "Support evidence intake from handwritten notes, scanned pages, and field documentation.",
      icon: FileSearch,
    },
    {
      title: "AI Observation Drafting",
      description: "Turn structured evidence into initial observation drafts with regulatory tone support.",
      icon: Bot,
    },
    {
      title: "Citation & Traceability",
      description: "Keep generated text linked to evidence sources and regulatory references.",
      icon: Waypoints,
    },
    {
      title: "Human Review Workflow",
      description: "Enable investigator edits, reviewer checkpoints, and final approval discipline.",
      icon: Users,
    },
    {
      title: "Document Generation",
      description: "Prepare draft-ready FDA 483 and EIR outputs from reviewed inspection content.",
      icon: FileOutput,
    },
    {
      title: "Regulatory Knowledge Support",
      description: "Use CFR and IOM knowledge to strengthen defensibility and drafting context.",
      icon: LibraryBig,
    },
  ];

  const knowledgeSources: IconCardItem[] = [
    {
      title: "Title 21 CFR",
      description: "Reference statutory and regulatory language relevant to inspection observations.",
      icon: BookText,
    },
    {
      title: "Investigations Operations Manual",
      description: "Support investigators with procedural and operational inspection guidance.",
      icon: Files,
    },
    {
      title: "Form FDA 483 Examples",
      description: "Model observation structure and drafting patterns against expected inspection outputs.",
      icon: FileCheck2,
    },
    {
      title: "Establishment Inspection Reports",
      description: "Support longer-form inspection narratives and review-ready documentation.",
      icon: FolderSearch,
    },
  ];

  const architectureLayers = [
    {
      title: "Web Application Layer",
      description: "Public landing experience, authenticated inspection workflow, review interfaces, and document preview.",
      icon: Layers3,
    },
    {
      title: "API & Services Layer",
      description: "Authentication, profile management, OCR orchestration, draft generation, and workflow APIs.",
      icon: Network,
    },
    {
      title: "Knowledge & Data Layer",
      description: "Inspection records, user data, reference libraries, CFR mappings, and knowledge sources.",
      icon: Database,
    },
    {
      title: "Output Layer",
      description: "Structured observations, review-ready drafts, FDA 483 documents, and EIR deliverables.",
      icon: FileOutput,
    },
  ];

  const userRoles: IconCardItem[] = [
    {
      title: "Investigators",
      description: "Capture evidence, review AI-assisted drafts, and finalize inspection documentation with traceable support.",
      icon: Microscope,
    },
    {
      title: "Reviewers",
      description: "Assess evidence linkage, confirm citation grounding, and validate draft quality before finalization.",
      icon: ShieldCheck,
    },
    {
      title: "Stakeholders",
      description: "Consume structured outputs, follow workflow progress, and review documentation readiness.",
      icon: Users,
    },
  ];

  const footerSections = [
    {
      heading: "Platform",
      links: [
        { href: "#about", label: "About" },
        { href: "#workflow", label: "Workflow" },
        { href: "#capabilities", label: "Capabilities" },
      ],
    },
    {
      heading: "Knowledge",
      links: [
        { href: "#knowledge-base", label: "Knowledge Base" },
        { href: "#architecture", label: "Architecture" },
        { href: "#traceability", label: "Traceability" },
      ],
    },
    {
      heading: "Access",
      links: [
        { href: "/login", label: "Log In" },
        { href: "/signup", label: "Create Account" },
        { href: "#contact", label: "Contact" },
      ],
    },
  ];

  function SectionHeader({
    eyebrow,
    title,
    description,
  }: {
    eyebrow: string;
    title: string;
    description?: string;
  }) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2F7A7A]">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#13213C] sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-base leading-8 text-[#4B5565]">{description}</p>
        ) : null}
      </div>
    );
  }

  function CardGrid({
    items,
    columns = "md:grid-cols-2 xl:grid-cols-4",
  }: {
    items: IconCardItem[];
    columns?: string;
  }) {
    return (
      <div className={`grid gap-6 ${columns}`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-3xl border border-[#D9E1EC] bg-white p-6 shadow-[0_10px_25px_rgba(16,41,74,0.06)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5FA] text-[#0B1F3A]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#13213C]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#4B5565]">{item.description}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inspection-app min-h-screen bg-[#F7F9FC] text-[#4B5565]">
      <LandingNavbar />

      <main>
        <section className="relative overflow-hidden border-b border-[#D9E1EC] bg-[linear-gradient(180deg,#f7f9fc_0%,#eef4fb_56%,#f7f9fc_100%)] pt-36">
          <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_right,rgba(47,122,122,0.12),transparent_34%),radial-gradient(circle_at_left,rgba(11,31,58,0.10),transparent_30%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:px-8">
            <div className="max-w-2xl">
              <p className="inline-flex items-center rounded-full border border-[#D9E1EC] bg-white px-4 py-2 text-sm font-semibold text-[#2F7A7A] shadow-sm">
                FDA-Regulated Documentation Support
              </p>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#13213C] sm:text-5xl lg:text-6xl">
                Transform Inspection Evidence into FDA-Compliant Drafts
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4B5565]">
                Smart Inspections helps investigators move from notes, images, and scanned
                records to review-ready FDA 483 and EIR drafts with OCR extraction,
                evidence structuring, regulatory grounding, and human review before
                finalization.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0B1F3A] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(11,31,58,0.18)] transition-colors hover:bg-[#10294A]"
                >
                  Start New Inspection
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#workflow"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D9E1EC] bg-white px-6 py-3.5 text-sm font-semibold text-[#13213C] shadow-sm transition-colors hover:bg-[#F7F9FC]"
                >
                  View Workflow
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {trustChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[#D9E1EC] bg-white px-4 py-2 text-sm font-medium text-[#13213C] shadow-sm"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 top-14 hidden h-24 w-24 rounded-full bg-[#F5A623]/15 blur-3xl lg:block" />
              <div className="absolute -right-4 -top-4 hidden h-24 w-24 rounded-full bg-[#2F7A7A]/15 blur-3xl lg:block" />
              <div className="relative rounded-[32px] border border-[#D9E1EC] bg-white p-6 shadow-[0_24px_60px_rgba(16,41,74,0.12)]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D9E1EC] pb-5">
                  <div>
                    <p className="text-sm font-semibold text-[#13213C]">Inspection Drafting Workflow</p>
                    <p className="mt-1 text-sm text-[#4B5565]">
                      Evidence ingestion through investigator-reviewed output.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#EEF5FA] px-3 py-1 text-xs font-semibold text-[#2F7A7A]">
                    Review-ready pipeline
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    { label: "Inspection Notes / Photos / PDFs", icon: Upload, tone: "bg-[#EEF5FA] text-[#0B1F3A]" },
                    { label: "OCR Extraction", icon: ScanText, tone: "bg-[#EAF8F8] text-[#2F7A7A]" },
                    { label: "Evidence Structuring", icon: Network, tone: "bg-[#FFF7E8] text-[#A86610]" },
                    { label: "AI Draft Observation", icon: Sparkles, tone: "bg-[#EEF5FA] text-[#0B1F3A]" },
                    { label: "CFR / IOM Validation", icon: BookText, tone: "bg-[#EAF8F8] text-[#2F7A7A]" },
                    { label: "Investigator Review", icon: ShieldCheck, tone: "bg-[#FFF7E8] text-[#A86610]" },
                    { label: "FDA 483 / EIR Output", icon: FileOutput, tone: "bg-[#EEF5FA] text-[#0B1F3A]" },
                  ].map((step, index, steps) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.label}>
                        <div className="flex items-center gap-4 rounded-2xl border border-[#D9E1EC] bg-[#FCFDFE] px-4 py-4 shadow-sm">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${step.tone}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[#13213C]">{step.label}</p>
                          </div>
                        </div>
                        {index < steps.length - 1 ? (
                          <div className="flex justify-center py-1.5">
                            <div className="h-5 w-px bg-gradient-to-b from-[#D9E1EC] to-[#2F7A7A]/50" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#D9E1EC] bg-[#0B1F3A]">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-5 lg:px-8">
            {valueStrip.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <Icon className="h-5 w-5 text-[#F5A623]" />
                  <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="about" className="scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div>
              <SectionHeader
                eyebrow="Why Smart Inspections Exists"
                title="Why Smart Inspections Exists"
                description="Inspection teams must turn fragmented evidence, notes, scanned records, and reference material into formal FDA documentation under time pressure. Smart Inspections exists to reduce manual drafting burden while preserving traceability, regulatory grounding, and human judgment before any output is finalized."
              />
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#4B5565]">
                The platform is designed to support an evidence-first drafting workflow:
                OCR and extraction prepare source material, AI assists with language
                generation, CFR and IOM references ground the draft, and investigators
                review each result before it becomes part of a review-ready document set.
              </p>
            </div>
            <CardGrid items={whyCards} columns="sm:grid-cols-2" />
          </div>
        </section>

        <section
          id="workflow"
          className="scroll-mt-28 border-y border-[#D9E1EC] bg-white px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Workflow"
              title="How the Inspection Drafting Workflow Works"
              description="A structured process designed for evidence ingestion, AI-assisted drafting, regulatory validation, and investigator review."
            />

            <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
              <div className="absolute left-8 top-8 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-[#D9E1EC] via-[#2F7A7A]/50 to-[#D9E1EC] lg:block" />
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="relative rounded-3xl border border-[#D9E1EC] bg-[#FCFDFE] p-6 shadow-[0_12px_32px_rgba(16,41,74,0.06)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5FA] text-[#0B1F3A]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="rounded-full bg-[#0B1F3A] px-3 py-1 text-xs font-semibold text-white">
                        Step {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-[#13213C]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#4B5565]">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="capabilities" className="scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Core Capabilities"
              title="Core Capabilities"
              description="Focused capabilities for transforming inspection evidence into structured, review-ready documentation."
            />
            <div className="mt-14">
              <CardGrid items={capabilities} columns="md:grid-cols-2 xl:grid-cols-3" />
            </div>
          </div>
        </section>

        <section
          id="knowledge-base"
          className="scroll-mt-28 border-y border-[#D9E1EC] bg-white px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="Regulatory Knowledge"
              title="Built on Regulatory Knowledge Sources"
              description="The drafting experience is informed by inspection-relevant reference sources that support grounded review."
            />
            <div className="mt-14">
              <CardGrid items={knowledgeSources} columns="md:grid-cols-2 xl:grid-cols-4" />
            </div>
          </div>
        </section>

        <section id="traceability" className="scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <SectionHeader
                eyebrow="Evidence Traceability"
                title="Every Draft Must Be Defensible"
                description="Generated observations should remain linked to supporting evidence and regulatory references so investigators can defend the rationale behind each draft statement."
              />
              <p className="mt-6 text-base leading-8 text-[#4B5565]">
                Smart Inspections emphasizes evidence linkage, source visibility, and
                review checkpoints. Draft language is not treated as final output until an
                investigator validates the observation, its supporting records, and the
                applicable regulatory context.
              </p>
            </div>

            <div className="rounded-[32px] border border-[#D9E1EC] bg-white p-6 shadow-[0_20px_50px_rgba(16,41,74,0.10)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#D9E1EC] pb-5">
                <div>
                  <p className="text-sm font-semibold text-[#13213C]">Observation Review Panel</p>
                  <p className="mt-1 text-sm text-[#4B5565]">
                    Linked evidence and citation context for investigator review.
                  </p>
                </div>
                <span className="rounded-full bg-[#FFF7E8] px-3 py-1 text-xs font-semibold text-[#A86610]">
                  Pending Review
                </span>
              </div>

              <div className="mt-6 rounded-3xl border border-[#D9E1EC] bg-[#FCFDFE] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2F7A7A]">
                  Observation Title
                </p>
                <h3 className="mt-3 text-lg font-semibold text-[#13213C]">
                  Inadequate microbial contamination prevention controls for sterile product handling
                </h3>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#D9E1EC] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#4B5565]">
                      Supporting Evidence
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-[#13213C]">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#2F7A7A]" />
                        EM Log #2024-047
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#2F7A7A]" />
                        Batch record image set
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#2F7A7A]" />
                        Investigator note transcript
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-[#D9E1EC] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#4B5565]">
                      CFR Citation
                    </p>
                    <p className="mt-3 text-sm font-semibold text-[#13213C]">21 CFR 211.113(b)</p>
                    <p className="mt-2 text-sm leading-6 text-[#4B5565]">
                      Procedures to prevent microbiological contamination of sterile drug
                      products were not established or followed.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#EEF5FA] px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2F7A7A]">
                      Review Status
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#13213C]">
                      Evidence linked, citation identified, awaiting investigator sign-off
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="rounded-xl border border-[#D9E1EC] bg-white px-4 py-2 text-sm font-medium text-[#13213C]"
                    >
                      View Evidence
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Review Observation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="architecture"
          className="scroll-mt-28 border-y border-[#D9E1EC] bg-[#0B1F3A] px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F5A623]">
                Platform Architecture
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Platform Architecture Overview
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                A layered architecture designed to support evidence ingestion, drafting
                services, knowledge grounding, and document output without obscuring
                review accountability.
              </p>
            </div>

            <div className="mt-14 space-y-5">
              {architectureLayers.map((layer, index) => {
                const Icon = layer.icon;
                return (
                  <div key={layer.title}>
                    <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:grid-cols-[auto,1fr]">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#F5A623]">
                        <Icon className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{layer.title}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-300">{layer.description}</p>
                      </div>
                    </div>
                    {index < architectureLayers.length - 1 ? (
                      <div className="flex justify-center py-2">
                        <div className="h-6 w-px bg-gradient-to-b from-white/20 to-[#F5A623]/40" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              eyebrow="User Roles"
              title="Built for Different Review Responsibilities"
              description="Smart Inspections supports the different roles involved in inspection drafting, review, and communication."
            />
            <div className="mt-14">
              <CardGrid items={userRoles} columns="md:grid-cols-3" />
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-28 px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-[36px] border border-[#D9E1EC] bg-[linear-gradient(135deg,#10294A_0%,#0B1F3A_56%,#2F7A7A_100%)] px-6 py-12 shadow-[0_24px_60px_rgba(16,41,74,0.16)] sm:px-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F5A623]">
                    Ready to Explore
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                    Ready to Explore AI-Assisted Inspection Drafting?
                  </h2>
                  <p className="mt-4 text-base leading-8 text-slate-200">
                    Explore a workflow built for evidence ingestion, regulatory grounding,
                    and human-reviewed drafting across FDA inspection documentation.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-[#13213C] shadow-sm transition-colors hover:bg-[#F7F9FC]"
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#D9E1EC] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,0.7fr))] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1F3A] text-sm font-bold text-white">
                SI
              </div>
              <div>
                <p className="text-sm font-semibold text-[#13213C]">Smart Inspections</p>
                <p className="text-xs text-[#4B5565]">
                  AI-Assisted FDA Inspection Documentation
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-[#4B5565]">
              Smart Inspections is a regulatory-focused drafting platform designed to help
              investigators move from evidence collection to review-ready documentation
              with OCR support, AI assistance, citation grounding, and investigator review.
            </p>
            <p className="mt-5 text-sm leading-7 text-[#4B5565]">
              Built as a capstone collaboration with Precise Software Solutions, Inc. and
              George Mason University.
            </p>
          </div>

          {footerSections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-sm font-semibold text-[#13213C]">{section.heading}</h3>
              <ul className="mt-4 space-y-3 text-sm text-[#4B5565]">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-colors hover:text-[#13213C]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-semibold text-[#13213C]">Contact</h3>
            <div className="mt-4 space-y-3 text-sm text-[#4B5565]">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#2F7A7A]" />
                smart-inspections@capstone.local
              </p>
              <p className="flex items-center gap-2">
                <Map className="h-4 w-4 text-[#2F7A7A]" />
                Regulatory-AI product experience
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#D9E1EC]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-[#4B5565] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>All outputs require human review before finalization.</p>
            <p>© 2026 Smart Inspections. Designed for high-trust regulatory drafting support.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

