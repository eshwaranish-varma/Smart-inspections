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
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2F7A7A] dark:text-cyan-300">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#13213C] dark:text-white sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-base leading-8 text-[#4B5565] dark:text-slate-300">{description}</p>
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
              className="rounded-xl border border-[#D9E1EC] bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5FA] text-[#0B1F3A] dark:bg-slate-800 dark:text-cyan-300">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#13213C] dark:text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#4B5565] dark:text-slate-300">{item.description}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inspection-app min-h-screen bg-[#F7F9FC] text-[#4B5565] transition-colors duration-300 dark:bg-slate-950 dark:text-slate-200">
      <LandingNavbar />

      <main>
        <section
          className="relative flex min-h-[90vh] w-full items-center overflow-hidden border-b border-[#D9E1EC] bg-cover bg-center bg-no-repeat pt-36 py-16 md:py-24"
          style={{ backgroundImage: "url('/landing/smart-inspections-hero.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
            <div className="max-w-3xl">
              <div className="rounded-xl bg-black/20 p-6 backdrop-blur-sm md:p-8">
                <p className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                  FDA-Regulated Documentation Support
                </p>
                <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
                  Transform Inspection Evidence into FDA-Compliant Drafts
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-200 md:text-xl">
                  Smart Inspections helps investigators move from notes, images, and scanned
                  records to review-ready FDA 483 and EIR drafts with OCR extraction,
                  evidence structuring, regulatory grounding, and human review before
                  finalization.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black shadow-[0_12px_24px_rgba(11,31,58,0.18)] transition-colors hover:bg-gray-100"
                  >
                    Start New Inspection
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#workflow"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white bg-transparent px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-white/10"
                  >
                    View Workflow
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

              </div>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-28 py-16 md:py-24">
          <div className="mx-auto grid max-w-5xl gap-12 px-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
            <div>
              <SectionHeader
                eyebrow="Who We Are"
                title="Who We Are"
                description="Smart Inspections helps investigators move from notes, images, and scanned records to review-ready FDA 483 and EIR drafts with OCR extraction, evidence structuring, regulatory grounding, and human review before finalization."
              />
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#4B5565]">
                The platform is designed to support an evidence-first drafting workflow:
                OCR and extraction prepare source material, AI assists with language
                generation, CFR and IOM references ground the draft, and investigators
                review each result before it becomes part of a review-ready document set.
              </p>
            </div>
            <div className="overflow-hidden rounded-[28px] border border-[#D9E1EC] bg-white p-3 shadow-[0_18px_50px_rgba(16,41,74,0.10)]">
              <img
                src="/landing/smart-inspections-hero.png"
                alt="Smart Inspections landing preview"
                className="h-full w-full rounded-[22px] object-cover"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-[#D9E1EC] bg-white/70 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeader
              eyebrow="Core Value We Build"
              title="Core Value We Build"
              description="Inspection teams must turn fragmented evidence, notes, scanned records, and reference material into formal FDA documentation under time pressure. Smart Inspections exists to reduce manual drafting burden while preserving traceability, regulatory grounding, and human judgment before any output is finalized."
            />
            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {whyCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#D9E1EC] bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
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
          </div>
        </section>

        <section id="workflow" className="scroll-mt-28 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <SectionHeader
              eyebrow="Workflow"
              title="How It Works / Workflow"
              description="A structured process designed for evidence ingestion, AI-assisted drafting, regulatory validation, and investigator review."
            />
            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {[workflowSteps[0], workflowSteps[1], workflowSteps[3], workflowSteps[5]].map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="relative rounded-xl border border-[#D9E1EC] bg-white p-6 text-left shadow-md"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5FA] text-[#0B1F3A]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="rounded-full bg-[#0B1F3A] px-3 py-1 text-xs font-semibold text-white">
                        Step {index + 1}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-[#13213C]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#4B5565]">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="capabilities" className="scroll-mt-28 border-y border-[#D9E1EC] bg-white py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeader
              eyebrow="Highlights"
              title="What You Get"
              description="Focused capabilities for transforming inspection evidence into structured, review-ready documentation."
            />
            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {valueStrip.slice(0, 4).map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#D9E1EC] bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
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
          </div>
        </section>

        <section className="bg-[#0B1F3A] py-16 text-white md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F5A623]">
                Platform Preview
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
                Evidence linkage, source visibility, and review checkpoints
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-slate-300">
                Smart Inspections emphasizes evidence linkage, source visibility, and
                review checkpoints. Draft language is not treated as final output until an
                investigator validates the observation, its supporting records, and the
                applicable regulatory context.
              </p>
            </div>

            <div className="mx-auto mt-14 max-w-5xl rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
              <div className="grid gap-6 rounded-[22px] bg-[#10294A] p-4 lg:grid-cols-[minmax(0,1.1fr)_320px] lg:p-6">
                <div className="overflow-hidden rounded-[20px] border border-white/10">
                  <img
                    src="/landing/smart-inspections-hero.png"
                    alt="Platform preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-between rounded-[20px] border border-white/10 bg-white/5 p-6">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F5A623]">
                      Core Capabilities
                    </p>
                    <div className="mt-5 space-y-4">
                      {capabilities.slice(0, 3).map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.title} className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Link
                      href="#workflow"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-[#13213C] transition-colors hover:bg-[#F7F9FC]"
                    >
                      View Workflow
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      Start New Inspection
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="knowledge-base"
          className="scroll-mt-28 border-y border-[#D9E1EC] bg-white py-16 md:py-24"
        >
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeader
              eyebrow="Latest Insights / Data"
              title="Platform Architecture Overview"
              description="A layered architecture designed to support evidence ingestion, drafting services, knowledge grounding, and document output without obscuring review accountability."
            />
            <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
              <div className="rounded-[28px] border border-[#D9E1EC] bg-[#FCFDFE] p-8 shadow-[0_18px_50px_rgba(16,41,74,0.10)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5FA] text-[#0B1F3A]">
                    <Layers3 className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#13213C]">Web Application Layer</p>
                    <p className="mt-1 text-sm text-[#4B5565]">
                      Public landing experience, authenticated inspection workflow, review interfaces, and document preview.
                    </p>
                  </div>
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {architectureLayers.slice(1).map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-2xl border border-[#D9E1EC] bg-white p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF5FA] text-[#0B1F3A]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-base font-semibold text-[#13213C]">{item.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-[#4B5565]">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6">
                {knowledgeSources.slice(0, 2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-[#D9E1EC] bg-white p-6 shadow-md"
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
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHeader
              eyebrow="Recent Inspection Stories / Use Cases"
              title="Built for Different Review Responsibilities"
              description="Smart Inspections supports the different roles involved in inspection drafting, review, and communication."
            />
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {userRoles.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#D9E1EC] bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5FA] text-[#0B1F3A]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-[#13213C]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#4B5565]">{item.description}</p>
                    <Link
                      href="/login"
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1F3A] transition-colors hover:text-[#2F7A7A]"
                    >
                      Read more
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-28 pb-20 pt-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="overflow-hidden rounded-[36px] border border-[#D9E1EC] bg-[linear-gradient(135deg,#10294A_0%,#0B1F3A_56%,#2F7A7A_100%)] px-6 py-16 text-center shadow-[0_24px_60px_rgba(16,41,74,0.16)] sm:px-10">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F5A623]">
                Final CTA
              </p>
              <h2 className="mx-auto mt-3 max-w-4xl text-3xl font-bold text-white md:text-5xl">
                Ready to Explore AI-Assisted Inspection Drafting?
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-slate-200">
                Explore a workflow built for evidence ingestion, regulatory grounding,
                and human-reviewed drafting across FDA inspection documentation.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-[#13213C] shadow-sm transition-colors hover:bg-[#F7F9FC]"
                >
                  Start Inspection
                </Link>
                <Link
                  href="#workflow"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  View Workflow
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#D9E1EC] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md">
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
            <p className="mt-5 text-sm leading-7 text-[#4B5565]">
              Smart Inspections is a regulatory-focused drafting platform designed to help
              investigators move from evidence collection to review-ready documentation
              with OCR support, AI assistance, citation grounding, and investigator review.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

        <div className="border-t border-[#D9E1EC]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-sm text-[#4B5565] lg:flex-row lg:items-center lg:justify-between">
            <p>All outputs require human review before finalization.</p>
            <p>© 2026 Smart Inspections. Designed for high-trust regulatory drafting support.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

