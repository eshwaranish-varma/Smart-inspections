import LandingNavbar from "@/components/landing/LandingNavbar";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import Link from "next/link";
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
  Layers3,
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

export const dynamic = "force-dynamic";

const footerLinks = [
  {
    heading: "Product",
    links: [
      { href: "#how-it-works", label: "How It Works" },
      { href: "#features", label: "Features" },
      { href: "#roles", label: "Who It's For" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { href: "#tech", label: "Tech Stack" },
      { href: "#contact", label: "Contact" },
      { href: "/login", label: "Log In" },
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#4B5565] dark:bg-slate-950 dark:text-slate-300">
      <LandingNavbar />

      <main>

        {/* ── HERO ── */}
        <section className="relative flex min-h-[92vh] w-full flex-col items-center justify-center overflow-hidden border-b border-[#D9E1EC] bg-[#F7F9FC] pt-24 pb-16 dark:border-white/10 dark:bg-slate-950">
          {/* subtle grid bg */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(40,46,99,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(99,102,241,0.08),transparent)]" />

          <div className="relative mx-auto w-full max-w-7xl px-6">
            <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

              {/* Left — copy */}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D9E1EC] bg-white px-4 py-1.5 text-xs font-semibold text-[#282e63] shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-indigo-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  FDA-Regulated Documentation · Capstone Project
                </span>

                <h1 className="mt-6 text-5xl font-bold leading-[1.1] tracking-tight text-[#282e63] dark:text-white lg:text-6xl">
                  Turn inspection<br />
                  evidence into<br />
                  <span className="text-indigo-500 dark:text-indigo-400">FDA-ready drafts</span>
                </h1>

                <p className="mt-6 max-w-lg text-lg leading-8 text-[#4B5565] dark:text-slate-400">
                  Smart Inspections takes your notes, scans, and photos through OCR extraction, AI drafting, and regulatory grounding — producing review-ready FDA 483 and EIR documents with full human oversight.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-[#282e63] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-700/30"
                  >
                    Start New Inspection
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 rounded-full border border-[#D9E1EC] bg-white px-6 py-3 text-sm font-semibold text-[#282e63] transition-colors hover:bg-[#F0F4F8] dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-white/10"
                  >
                    See How It Works
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Social proof strip */}
                <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-[#4B5565] dark:text-slate-500">
                  {[
                    { icon: ShieldCheck, label: "Human-reviewed outputs" },
                    { icon: FileCheck2, label: "FDA 483 & EIR ready" },
                    { icon: Waypoints, label: "Full evidence traceability" },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-[#282e63] dark:text-indigo-400" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right — mock product UI */}
              <div className="relative">
                <div className="rounded-[24px] border border-[#D9E1EC] bg-white p-4 shadow-[0_24px_80px_rgba(40,46,99,0.12)] dark:border-white/10 dark:bg-slate-900">
                  {/* mock toolbar */}
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#D9E1EC] bg-[#F7F9FC] px-3 py-2 dark:border-white/10 dark:bg-slate-800">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="mx-auto text-xs text-[#4B5565] dark:text-slate-400">smart-inspections · Evidence Review</div>
                  </div>
                  {/* mock content */}
                  <div className="space-y-2.5 p-2">
                    {/* observation draft row */}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-[#282e63] dark:text-indigo-300">Observation Draft #1</p>
                          <p className="mt-1 text-xs leading-5 text-[#4B5565] dark:text-slate-400">Failure to establish laboratory controls — 21 CFR 211.68. Computerized system lacked input validation for critical data entry fields...</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Pending Review</span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <span className="rounded-md border border-[#D9E1EC] bg-white px-2 py-0.5 text-[10px] text-[#4B5565] dark:border-white/10 dark:bg-slate-800 dark:text-slate-400">21 CFR 211.68</span>
                        <span className="rounded-md border border-[#D9E1EC] bg-white px-2 py-0.5 text-[10px] text-[#4B5565] dark:border-white/10 dark:bg-slate-800 dark:text-slate-400">3 sources cited</span>
                      </div>
                    </div>
                    {/* second row */}
                    <div className="rounded-xl border border-[#D9E1EC] bg-white p-3 dark:border-white/10 dark:bg-slate-800">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#282e63] dark:text-indigo-300">OCR Evidence — lab_inspection_notes.pdf</p>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Extracted</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-[#F0F4F8] dark:bg-slate-700">
                        <div className="h-1.5 w-4/5 rounded-full bg-[#282e63]" />
                      </div>
                      <p className="mt-1 text-[10px] text-[#4B5565] dark:text-slate-500">OCR confidence 94% · 12 fields structured</p>
                    </div>
                    {/* third row */}
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-xl border border-[#D9E1EC] bg-white p-3 dark:border-white/10 dark:bg-slate-800">
                        <p className="text-[10px] font-semibold text-[#282e63] dark:text-indigo-300">CFR Match</p>
                        <p className="mt-1 text-[10px] text-[#4B5565] dark:text-slate-400">21 CFR Part 211 — 4 sections retrieved</p>
                      </div>
                      <div className="flex-1 rounded-xl border border-[#D9E1EC] bg-white p-3 dark:border-white/10 dark:bg-slate-800">
                        <p className="text-[10px] font-semibold text-[#282e63] dark:text-indigo-300">IOM Guidance</p>
                        <p className="mt-1 text-[10px] text-[#4B5565] dark:text-slate-400">Chapter 5 — 2 relevant passages</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* floating badge */}
                <div className="absolute -bottom-4 -left-4 rounded-2xl border border-[#D9E1EC] bg-white px-4 py-3 shadow-lg dark:border-white/10 dark:bg-slate-900">
                  <p className="text-xs font-semibold text-[#282e63] dark:text-white">AI Draft Ready</p>
                  <p className="text-[10px] text-[#4B5565] dark:text-slate-400">2 observations · Awaiting review</p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="scroll-mt-24 bg-white py-20 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">The Workflow</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#282e63] dark:text-white sm:text-4xl">
                From raw evidence to review-ready document
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#4B5565] dark:text-slate-400">
                Six structured steps that move your inspection materials through ingestion, AI drafting, and human sign-off.
              </p>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { step: "01", title: "Upload Evidence", desc: "Drop in notes, scanned forms, PDFs, and photos from your inspection activity.", icon: Upload },
                { step: "02", title: "OCR & Extraction", desc: "Handwritten and scanned content is converted to machine-readable text with field extraction.", icon: ScanText },
                { step: "03", title: "Evidence Structuring", desc: "Findings are normalized into a structured record with metadata and inspection context.", icon: Network },
                { step: "04", title: "AI Observation Drafting", desc: "Claude generates draft observations grounded in evidence and linked to CFR/IOM references.", icon: Sparkles },
                { step: "05", title: "Regulatory Validation", desc: "Draft language is cross-checked against Title 21 CFR and IOM guidance before review.", icon: BookText },
                { step: "06", title: "Investigator Review & Export", desc: "You review, edit, and approve every block — then export a final FDA 483 or EIR draft.", icon: CheckCircle2 },
              ].map(({ step, title, desc, icon: Icon }) => (
                <div
                  key={step}
                  className="group relative rounded-2xl border border-[#D9E1EC] bg-[#F7F9FC] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:border-white/10 dark:bg-slate-800 dark:hover:border-indigo-800"
                >
                  <span className="absolute right-5 top-5 text-3xl font-black text-[#282e63]/6 dark:text-white/5 select-none">{step}</span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#282e63] text-white shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#282e63] dark:text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5565] dark:text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES BENTO ── */}
        <section id="features" className="scroll-mt-24 border-t border-[#D9E1EC] bg-[#F7F9FC] py-20 dark:border-white/10 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">Core Features</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#282e63] dark:text-white sm:text-4xl">
                Everything the inspection workflow needs
              </h2>
            </div>

            <BentoGrid className="mt-12 grid-cols-3 auto-rows-[19rem]">
              <BentoCard
                name="OCR Evidence Pipeline"
                className="col-span-3 md:col-span-2"
                href="#how-it-works"
                cta="See the workflow"
                Icon={ScanText}
                description="Ingest handwritten notes, scanned forms, photos, and PDFs. Automatic text extraction and field normalization creates structured evidence ready for AI drafting."
                background={
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/50">
                    <div className="absolute right-5 top-5 flex flex-col gap-2 opacity-70">
                      {["inspection_notes.pdf", "form_483_scan.png", "lab_records.jpg"].map((f) => (
                        <div key={f} className="flex items-center gap-2 rounded-lg border border-[#D9E1EC] bg-white px-3 py-1.5 text-xs text-[#4B5565] shadow-sm dark:border-white/10 dark:bg-slate-800">
                          <FileSearch className="h-3 w-3 text-[#282e63] dark:text-indigo-300" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                }
              />

              <BentoCard
                name="AI Drafting"
                className="col-span-3 md:col-span-1"
                href="#how-it-works"
                cta="How it works"
                Icon={Bot}
                description="Claude generates observation drafts with regulatory tone, traceable citations, and CFR-grounded language — linked to your actual evidence."
                background={
                  <div className="absolute inset-0 bg-gradient-to-b from-violet-50 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/40">
                    <div className="absolute inset-x-4 top-5 space-y-2 opacity-70">
                      <div className="rounded-lg border border-[#D9E1EC] bg-white p-2.5 text-[10px] dark:border-white/10 dark:bg-slate-800">
                        <span className="font-semibold text-[#282e63] dark:text-indigo-300">Draft generated</span>
                        <p className="mt-0.5 text-[#4B5565] dark:text-slate-400">Linked to 21 CFR 211.68</p>
                      </div>
                      <div className="rounded-lg border border-[#D9E1EC] bg-white p-2.5 text-[10px] dark:border-white/10 dark:bg-slate-800">
                        <span className="font-semibold text-[#282e63] dark:text-indigo-300">Evidence matched</span>
                        <p className="mt-0.5 text-[#4B5565] dark:text-slate-400">3 source records cited</p>
                      </div>
                    </div>
                  </div>
                }
              />

              <BentoCard
                name="Citation & Traceability"
                className="col-span-3 md:col-span-1"
                href="#features"
                cta="Learn more"
                Icon={Waypoints}
                description="Every generated block links back to its evidence source and regulatory reference. Nothing is orphaned — full audit trail from observation to source."
                background={
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-cyan-50/30 dark:from-slate-900 dark:to-slate-900">
                    <div className="absolute right-5 top-5 opacity-40">
                      <div className="h-20 w-20 rounded-full border-[6px] border-[#282e63]/15 dark:border-indigo-400/20 flex items-center justify-center">
                        <div className="h-11 w-11 rounded-full border-[5px] border-[#282e63]/25 dark:border-indigo-400/30 flex items-center justify-center">
                          <div className="h-3 w-3 rounded-full bg-[#282e63] dark:bg-indigo-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />

              <BentoCard
                name="Human-in-the-Loop Review"
                className="col-span-3 md:col-span-2"
                href="/login"
                cta="Start reviewing"
                Icon={ShieldCheck}
                description="Investigators own every output. Edit, reject, or approve AI-drafted observations with full context before anything is finalized or exported."
                background={
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20">
                    <div className="absolute right-5 top-5 flex flex-col gap-1.5 opacity-70">
                      {[
                        { label: "Draft reviewed", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
                        { label: "Citation confirmed", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
                        { label: "Awaiting approval", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
                      ].map((b) => (
                        <span key={b.label} className={`rounded-full px-3 py-1 text-xs font-medium ${b.cls}`}>{b.label}</span>
                      ))}
                    </div>
                  </div>
                }
              />
            </BentoGrid>

            {/* Additional 2-col feature strip */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                { icon: FileOutput, title: "FDA 483 & EIR Export", desc: "Generate structured, review-ready FDA 483 and Establishment Inspection Report drafts from approved observation blocks." },
                { icon: Database, title: "Regulatory Knowledge Base", desc: "Title 21 CFR and IOM embedded as a vector store — every draft is grounded in the actual regulatory text, not hallucinations." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-[#D9E1EC] bg-white p-6 dark:border-white/10 dark:bg-slate-900">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#282e63] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#282e63] dark:text-white">{title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#4B5565] dark:text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TECH STACK + AI EXPLAINED ── */}
        <section id="tech" className="scroll-mt-24 border-t border-[#D9E1EC] bg-white py-20 dark:border-white/10 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-16 lg:grid-cols-2">

              {/* Tech stack */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">Built With</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#282e63] dark:text-white">
                  A production-grade stack
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#4B5565] dark:text-slate-400">
                  Every layer chosen for reliability, regulatory suitability, and developer velocity.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    { cat: "Frontend", items: ["Next.js 16 (App Router)", "TypeScript", "Tailwind CSS", "Shadcn/ui"] },
                    { cat: "Backend", items: ["FastAPI (Python)", "Supabase Auth", "PostgreSQL", "Docker"] },
                    { cat: "AI & ML", items: ["Claude (Anthropic)", "RAG Pipeline", "OpenAI Embeddings", "LangChain"] },
                    { cat: "Infrastructure", items: ["Vercel (frontend)", "Render (backend)", "Supabase (data)", "GitHub Actions"] },
                  ].map((g) => (
                    <div key={g.cat} className="rounded-2xl border border-[#D9E1EC] bg-[#F7F9FC] p-4 dark:border-white/10 dark:bg-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#282e63] dark:text-indigo-300 mb-2">{g.cat}</p>
                      <ul className="space-y-1">
                        {g.items.map((i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-[#4B5565] dark:text-slate-400">
                            <span className="h-1 w-1 rounded-full bg-[#282e63]/40 dark:bg-indigo-400/50" />
                            {i}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* How AI works */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">Under the Hood</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#282e63] dark:text-white">
                  How the AI actually works
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#4B5565] dark:text-slate-400">
                  Not a wrapper. A purpose-built RAG pipeline that grounds every draft in your evidence and the actual regulatory text.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    {
                      step: "01", icon: ScanText,
                      title: "Evidence Grounding",
                      desc: "Raw evidence is OCR-processed and chunked into structured records. Each chunk retains its source so every AI output traces back to its origin.",
                    },
                    {
                      step: "02", icon: Network,
                      title: "Retrieval-Augmented Generation",
                      desc: "Before drafting, relevant CFR sections and IOM guidance are retrieved from a vector store. Claude receives both evidence and regulatory context in one grounded prompt.",
                    },
                    {
                      step: "03", icon: ShieldCheck,
                      title: "Human-in-the-Loop",
                      desc: "Drafts aren't auto-published. Each block shows supporting evidence, citations, and context so investigators can edit or reject before finalization.",
                    },
                  ].map(({ step, icon: Icon, title, desc }) => (
                    <div key={step} className="flex gap-4 rounded-2xl border border-[#D9E1EC] bg-[#F7F9FC] p-5 dark:border-white/10 dark:bg-slate-800">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#282e63] text-white text-xs font-bold">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#282e63] dark:text-white">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-[#4B5565] dark:text-slate-400">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── WHO IT'S FOR ── */}
        <section id="roles" className="scroll-mt-24 border-t border-[#D9E1EC] bg-[#F7F9FC] py-20 dark:border-white/10 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">Who It's For</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#282e63] dark:text-white sm:text-4xl">
                Built around the inspection team
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { icon: Microscope, role: "Investigators", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300", desc: "Capture evidence, draft observations with AI assistance, and finalize inspection documentation with full traceability." },
                { icon: ShieldCheck, role: "Reviewers", color: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300", desc: "Assess evidence linkage, confirm citation grounding, and validate draft quality before any document is finalized." },
                { icon: Users, role: "Stakeholders", color: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300", desc: "Follow workflow progress, consume structured outputs, and review documentation readiness without entering the drafting flow." },
              ].map(({ icon: Icon, role, color, desc }) => (
                <div key={role} className="rounded-2xl border border-[#D9E1EC] bg-white p-8 dark:border-white/10 dark:bg-slate-900">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#282e63] dark:text-white">{role}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#4B5565] dark:text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="contact" className="scroll-mt-24 border-t border-[#D9E1EC] py-20 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="overflow-hidden rounded-[32px] bg-[#282e63] px-8 py-16 text-center shadow-[0_24px_80px_rgba(40,46,99,0.25)] sm:px-14">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Get Started</p>
              <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold text-white md:text-5xl leading-tight">
                Ready to explore AI-assisted inspection drafting?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-300">
                Start your first inspection, upload evidence, and see a review-ready draft in minutes — with full human oversight throughout.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#282e63] shadow-sm transition-colors hover:bg-indigo-50"
                >
                  Start New Inspection
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  View Workflow
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#D9E1EC] bg-white dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#282e63] text-xs font-bold text-white">SI</div>
              <div>
                <p className="text-sm font-semibold text-[#282e63] dark:text-white">Smart Inspections</p>
                <p className="text-xs text-[#4B5565] dark:text-slate-500">AI-Assisted FDA Inspection Documentation</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-6 text-[#4B5565] dark:text-slate-500">
              A capstone project — regulatory-focused drafting platform with OCR, AI assistance, citation grounding, and human review.
            </p>
          </div>

          <div className="flex gap-16">
            {footerLinks.map((s) => (
              <div key={s.heading}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#282e63] dark:text-white">{s.heading}</h3>
                <ul className="mt-4 space-y-2.5">
                  {s.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-[#4B5565] transition-colors hover:text-[#282e63] dark:text-slate-400 dark:hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#282e63] dark:text-white">Contact</h3>
              <div className="mt-4 space-y-2.5 text-sm text-[#4B5565] dark:text-slate-400">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-indigo-500" />
                  smart-inspections@capstone.local
                </p>
                <p className="flex items-center gap-2">
                  <Map className="h-3.5 w-3.5 text-indigo-500" />
                  Regulatory-AI capstone experience
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#D9E1EC] dark:border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-[#4B5565] dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>All outputs require human review before finalization.</p>
            <p>© 2026 Smart Inspections — Capstone Project</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
