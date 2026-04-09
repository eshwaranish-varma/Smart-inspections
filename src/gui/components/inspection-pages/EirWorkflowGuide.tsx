"use client";

import { FileText, ExternalLink } from "lucide-react";

/**
 * Reference content: FDA EIR overview, workflow link, and how Smart Inspections uses IOM/EIR resources.
 * Educational summary; not legal advice.
 */
export default function EirWorkflowGuide() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            FDA EIR — Establishment Inspection Reports (guide)
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Summary for investigators and quality teams. For official requirements, use FDA and IOM sources.
          </p>
        </div>
        <a
          href="/workflow"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 dark:bg-cyan-700 dark:hover:bg-cyan-600"
        >
          Open inspection workflow
          <ExternalLink className="h-4 w-4 opacity-90" />
        </a>
      </div>

      <div className="mt-4 space-y-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Quick answer</h3>
          <p className="mt-2">
            An <strong>FDA EIR</strong> is the internal inspection report prepared after an FDA inspection. It summarizes
            findings, observations, firm responses, and the recommended classification (<strong>NAI</strong>,{" "}
            <strong>VAI</strong>, or <strong>OAI</strong>). Unlike Form 483, the EIR adds narrative context and supports
            post-inspection review. Firms often obtain a copy through <strong>FOIA</strong>; release timing varies.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">How this platform fits (workflow)</h3>
          <p className="mt-2">
            In <strong>Workflow</strong>, investigators draft and review <strong>Form 483</strong> observations, then
            generate <strong>EIR narrative</strong> content through the connected backend. Prompts align with{" "}
            <strong>Title 21 CFR</strong> (citation data) and knowledge-base text from PDFs under{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">data/</code>, including the{" "}
            <strong>Investigations Operations Manual</strong> and EIR reference materials (e.g.{" "}
            <strong>InvestigationsOperationsManualComplete.pdf</strong>,{" "}
            <strong>Establishment_Inspection_Report_(EIR).pdf</strong>). Word output can follow{" "}
            <strong>Establishment_Inspection_Report_(EIR).docx</strong> where configured.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Key takeaways</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>The EIR contains narrative detail, classification recommendations, and analysis beyond Form 483 alone.</li>
            <li>Firms usually request the EIR via FOIA; it is not automatically provided at closeout.</li>
            <li>Release timing depends on FDA review, classification, and FOIA redaction.</li>
          </ul>
        </div>

        <details className="group rounded-lg border border-gray-100 open:border-navy-200 dark:border-gray-700">
          <summary className="cursor-pointer list-none px-4 py-3 font-medium text-navy-800 dark:text-cyan-200 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" />
              What is an FDA EIR?
            </span>
          </summary>
          <div className="space-y-3 border-t border-gray-100 px-4 pb-4 pt-2 dark:border-gray-700">
            <p>
              The EIR documents observations, regulatory issues, firm responses, and the investigator&apos;s recommended
              classification. It is treated as part of FDA&apos;s inspection record. Characteristics: internal working
              document, comprehensive narrative, classification recommendation, and references to samples, photos,
              records, and 483 observations.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Form 483 lists deficiencies at closeout; the EIR provides context, analysis, and recommendations for agency
              follow-up.
            </p>
          </div>
        </details>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Form 483 vs EIR vs warning letter (simplified)</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/80">
                  <th className="p-2 font-semibold">Document</th>
                  <th className="p-2 font-semibold">Role</th>
                  <th className="p-2 font-semibold">Typical timing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                <tr>
                  <td className="p-2 font-medium">Form 483</td>
                  <td className="p-2">Lists inspectional observations.</td>
                  <td className="p-2">End of inspection / closeout.</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">EIR</td>
                  <td className="p-2">Full narrative, evidence, recommended classification.</td>
                  <td className="p-2">After inspection; internal review.</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Warning letter</td>
                  <td className="p-2">Formal notice of serious violations (when warranted).</td>
                  <td className="p-2">After agency decision.</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Classification (NAI/VAI/OAI)</td>
                  <td className="p-2">Official outcome category.</td>
                  <td className="p-2">After EIR review (district).</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Typical EIR sections (ORA-style)</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/80">
                  <th className="p-2 font-semibold">Section</th>
                  <th className="p-2 font-semibold">What to look for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                <tr>
                  <td className="p-2 font-medium">Cover page</td>
                  <td className="p-2">Facility, dates, investigators, programs covered (scope and authority).</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Recommendation summary</td>
                  <td className="p-2">NAI/VAI/OAI recommendation and justification.</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Narrative</td>
                  <td className="p-2">Chronology of activities, observations, context beyond the 483 list.</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Objectionable conditions</td>
                  <td className="p-2">483 items with regulatory citations and detail.</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Firm response</td>
                  <td className="p-2">Verbal and written responses and how FDA characterized them.</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Exhibits</td>
                  <td className="p-2">Samples, photographs, records, lab results referenced.</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Regulatory history</td>
                  <td className="p-2">Prior inspections, warning letters, consent decrees, recalls.</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Refusal documentation</td>
                  <td className="p-2">If access was refused, documentation supporting escalation.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            The EIR may document concerns that did not appear on Form 483 (e.g. below threshold at the time or needing
            follow-up). Cross-reference narrative with your 483 response and CAPA.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Inspection document sequence</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs sm:text-sm">
            <li>During inspection: investigator documents observations.</li>
            <li>End of inspection: Form 483 to the firm when observations exist.</li>
            <li>After closeout: investigator prepares the EIR with classification recommendation.</li>
            <li>After internal review: district finalizes official classification.</li>
            <li>If OAI: possible warning letter, import/refusal, or other enforcement paths.</li>
            <li>If requested under FOIA: firm may receive a redacted EIR later.</li>
          </ol>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Inspection classifications</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs sm:text-sm">
            <li>
              <strong>NAI</strong> — No action indicated: no objectionable conditions (or adequately addressed).
            </li>
            <li>
              <strong>VAI</strong> — Voluntary action indicated: objectionable conditions; firm expected to correct
              voluntarily; follow-up possible.
            </li>
            <li>
              <strong>OAI</strong> — Official action indicated: conditions may warrant formal regulatory action; urgent
              CAPA and management engagement.
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            The investigator recommends a classification; the district may accept, upgrade, downgrade (less common), or
            request more work. Factors include severity and scope of issues, regulatory significance, firm
            responsiveness, compliance history, and public-health risk.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Obtaining an EIR (FOIA)</h3>
          <p className="mt-2">
            FDA does not automatically send the EIR to the firm. Requests generally go through the{" "}
            <strong>Freedom of Information Act</strong>. Use clear scope: inspection dates, facility address, and{" "}
            <strong>FEI number</strong> (often on registration or 483 cover). Processing and redactions vary; timing is
            not fixed.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <a
              href="https://www.fda.gov/regulatory-information/freedom-information/how-make-foia-request"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-navy-700 underline hover:text-navy-900 dark:text-cyan-400"
            >
              How to make a FOIA request
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://www.fda.gov/regulatory-information/freedom-information/foia-request-status"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-navy-700 underline hover:text-navy-900 dark:text-cyan-400"
            >
              FOIA request status
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            You may submit online (e.g. FDA Form 3602), or by email to FOIA-OC@fda.hhs.gov, or mail to FDA&apos;s FOIA
            office in Rockville. After submission, FDA typically issues a tracking number; appeals follow agency
            procedures if a request is denied or heavily redacted.
          </p>
        </div>

        <details className="rounded-lg border border-gray-100 dark:border-gray-700">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-navy-800 dark:text-cyan-200 [&::-webkit-details-marker]:hidden">
            FOIA redactions (common exemption themes)
          </summary>
          <div className="border-t border-gray-100 px-4 pb-4 pt-2 text-xs dark:border-gray-700">
            <p className="mb-2 text-gray-600 dark:text-gray-400">
              Released records may be redacted under FOIA exemptions, for example:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Trade secrets / confidential commercial information.</li>
              <li>Internal deliberations and pre-decisional materials.</li>
              <li>Personal privacy (e.g. certain names or identifiers).</li>
              <li>Law-enforcement-sensitive information in active matters.</li>
            </ul>
          </div>
        </details>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Reading the EIR narrative</h3>
          <p className="mt-2 text-xs sm:text-sm">
            Look for patterns across observations, regulatory significance, how FDA viewed firm responses, and explicit
            recommendations. Cross-check against your 483 response and CAPA; narrative may note concerns not listed on the
            483.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs sm:text-sm">
            <li>
              <strong>Patterns:</strong> repeated failures, inadequate procedures, inadequate oversight.
            </li>
            <li>
              <strong>Significance:</strong> links to product quality, specific CFR citations, potential consequences.
            </li>
            <li>
              <strong>Responses:</strong> language such as inadequate evidence, incomplete CAPA, or limited corrective
              scope.
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Phrases that often signal elevated concern</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/80">
                  <th className="p-2 font-semibold">Example language</th>
                  <th className="p-2 font-semibold">Why it matters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                <tr>
                  <td className="p-2">Significant cGMP violations</td>
                  <td className="p-2">Serious quality-system or product-risk concern.</td>
                </tr>
                <tr>
                  <td className="p-2">Repeat observations</td>
                  <td className="p-2">Possible escalation vs prior cycles.</td>
                </tr>
                <tr>
                  <td className="p-2">Refusal to provide records / access</td>
                  <td className="p-2">Can support stronger agency action.</td>
                </tr>
                <tr>
                  <td className="p-2">Data integrity / falsification concerns</td>
                  <td className="p-2">High enforcement risk.</td>
                </tr>
                <tr>
                  <td className="p-2">Public health risk</td>
                  <td className="p-2">Elevated patient or consumer focus.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Strategic use after you receive an EIR</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs sm:text-sm">
            <li>Compare EIR narrative to CAPA; close gaps where FDA found responses inadequate.</li>
            <li>Prepare for follow-up or re-inspection using explicit follow-up language in the EIR.</li>
            <li>Brief leadership using EIR context that Form 483 alone may not convey.</li>
          </ul>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <strong>Disclaimer:</strong> This panel summarizes public-domain regulatory concepts. It is not legal advice.
          Confirm procedures with FDA, district, and your counsel.
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Sources: FDA Investigations Operations Manual (IOM), 21 CFR Part 20 (public information), 21 CFR Part 211 and
          related program regulations, FOIA (5 U.S.C. 552), FDA FOIA Electronic Reading Room.
        </p>
      </div>
    </section>
  );
}
