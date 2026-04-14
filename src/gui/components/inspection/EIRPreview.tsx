"use client";

import type { DraftObservation, InspectionMetadata } from '@/types/inspection';

function pickEirText(
  eir: Record<string, string>,
  ...keys: string[]
): string {
  for (const k of keys) {
    const v = eir[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

function fallbackDiscussion(observations: DraftObservation[]): string {
  if (!observations.length) return '';
  return observations
    .map(
      (o, i) =>
        `Observation ${i + 1} (${o.cfr_citation?.trim() || 'CFR pending'}): ${o.observation_text?.trim() || '(no text)'}`,
    )
    .join('\n\n');
}

function fallbackEvidence(observations: DraftObservation[]): string {
  const lines: string[] = [];
  observations.forEach((o, i) => {
    const ev = (o.evidence_list || []).filter(Boolean).join('; ');
    if (ev) lines.push(`Observation ${i + 1}: ${ev}`);
  });
  return lines.join('\n');
}

function fallbackRefs(observations: DraftObservation[]): string {
  const set = new Set<string>();
  observations.forEach((o) => {
    const c = o.cfr_citation?.trim();
    if (c) set.add(c);
  });
  if (!set.size) return '';
  return [...set].sort().map((c) => `• ${c}`).join('\n');
}

export default function EIRPreview({
  metadata,
  eir,
  observations = [],
}: {
  metadata: InspectionMetadata;
  eir: Record<string, string>;
  observations?: DraftObservation[];
}) {
  const discussion =
    pickEirText(eir, 'observations_summary', 'observationsSummary') ||
    fallbackDiscussion(observations) ||
    '';
  const evidence =
    pickEirText(eir, 'evidence_descriptions', 'evidenceDescriptions') ||
    fallbackEvidence(observations) ||
    '';
  const chronology =
    pickEirText(eir, 'chronological_account', 'chronologicalAccount') ||
    (observations.length > 0
      ? 'Inspection activities and sequence follow the observations and source notes excerpts above.'
      : '');
  const refs =
    pickEirText(eir, 'references_and_citations', 'referencesAndCitations') || fallbackRefs(observations) || '';

  const cov = eir as Record<string, unknown>;
  const coveragePct =
    typeof cov.coverage === 'number' ? Math.round(Number(cov.coverage) * 100) : null;
  const totalObs =
    typeof cov.eir_total_observations === 'number'
      ? Number(cov.eir_total_observations)
      : observations.length;
  const includedObs =
    typeof cov.eir_observations_included === 'number'
      ? Number(cov.eir_observations_included)
      : totalObs;
  const coverageOk = cov.observation_coverage_valid === true;
  const recovered = cov.eir_coverage_recovered === true;
  const llmMissing = Array.isArray(cov.eir_llm_missing_observation_ids)
    ? (cov.eir_llm_missing_observation_ids as string[])
    : [];

  return (
    <div className="mx-auto space-y-6">
      {coveragePct !== null ? (
        <div
          className={`mx-auto w-[8.5in] rounded-lg border px-4 py-3 text-sm ${
            coverageOk && !recovered
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}
        >
          <p className="font-semibold">483 → EIR observation coverage</p>
          <p className="mt-1">
            Total observations (483): {totalObs} · Included in EIR: {includedObs} · Coverage: {coveragePct}%
          </p>
          {recovered ? (
            <p className="mt-2 text-xs">
              Recovery applied: the model did not emit full traceability; missing rows were synthesized from the 483
              text. IDs: {llmMissing.length ? llmMissing.join(', ') : '—'}
            </p>
          ) : null}
          {!coverageOk ? (
            <p className="mt-2 text-xs font-medium">
              Review before approval: coverage was not fully produced by the model without recovery.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mx-auto w-[8.5in] min-h-[11in] bg-white px-[0.7in] py-[0.8in] shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <h1 className="text-center text-xl font-semibold text-gray-900">ESTABLISHMENT INSPECTION REPORT</h1>
        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <p><span className="font-semibold">Firm:</span> {metadata.firm_name}</p>
          <p><span className="font-semibold">FEI:</span> {metadata.fei_number}</p>
          <p><span className="font-semibold">District Office:</span> {metadata.district_office}</p>
          <p><span className="font-semibold">Inspection Dates:</span> {metadata.inspection_start} to {metadata.inspection_end}</p>
        </div>
        {pickEirText(eir, 'cover_info', 'coverInfo') ? (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-gray-900">Cover / identification</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
              {pickEirText(eir, 'cover_info', 'coverInfo')}
            </p>
          </section>
        ) : null}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">1. Purpose and scope</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {pickEirText(eir, 'purpose_scope', 'purposeScope') || '(To be completed)'}
          </p>
        </section>
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">2. Regulatory framework (CFR / IOM)</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {pickEirText(eir, 'regulatory_framework', 'regulatoryFramework') || '(To be completed)'}
          </p>
        </section>
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">3. Background</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {pickEirText(eir, 'background_scope', 'backgroundScope') || '(To be completed)'}
          </p>
        </section>
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">4. Inspection methodology</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {pickEirText(eir, 'inspection_methodology', 'inspectionMethodology') || '(To be completed)'}
          </p>
        </section>
        {observations.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-gray-900">Detailed findings (483 alignment)</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-xs text-gray-800">
                <thead className="bg-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="border-b border-gray-200 px-2 py-2">#</th>
                    <th className="border-b border-gray-200 px-2 py-2">CFR</th>
                    <th className="border-b border-gray-200 px-2 py-2">Observation</th>
                    <th className="border-b border-gray-200 px-2 py-2">Evidence</th>
                    <th className="border-b border-gray-200 px-2 py-2">Notes excerpt</th>
                  </tr>
                </thead>
                <tbody>
                  {observations.map((obs, idx) => (
                    <tr key={obs.id || idx} className="align-top">
                      <td className="border-b border-gray-100 px-2 py-2 font-medium">{idx + 1}</td>
                      <td className="border-b border-gray-100 px-2 py-2 whitespace-pre-wrap">{obs.cfr_citation || '—'}</td>
                      <td className="border-b border-gray-100 px-2 py-2 whitespace-pre-wrap">{obs.observation_text || '—'}</td>
                      <td className="border-b border-gray-100 px-2 py-2 whitespace-pre-wrap">
                        {(obs.evidence_list || []).filter(Boolean).join('; ') || '—'}
                      </td>
                      <td className="border-b border-gray-100 px-2 py-2 whitespace-pre-wrap text-gray-600">
                        {obs.source_notes_excerpt || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">5. Discussion of findings</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {discussion || '(To be completed)'}
          </p>
        </section>
      </div>
      <div className="mx-auto w-[8.5in] min-h-[11in] bg-white px-[0.7in] py-[0.8in] shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <section>
          <h2 className="text-base font-semibold text-gray-900">6. Evidence descriptions</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {evidence || '(To be completed)'}
          </p>
        </section>
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">7. Chronological account</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {chronology || '(To be completed)'}
          </p>
        </section>
        <section className="mt-8">
          <h2 className="text-base font-semibold text-gray-900">8. References and citations</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {refs || '(To be completed)'}
          </p>
        </section>
        <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-base font-semibold text-gray-900">9. Signatures and Approval</h2>
          <div className="mt-4 space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold">Investigator:</span> {metadata.investigator_signed_name || 'Pending'}{' '}
              {metadata.investigator_signed_at ? `| ${metadata.investigator_signed_at}` : ''}
            </p>
            <p>
              <span className="font-semibold">Supervisor:</span> {metadata.supervisor_signed_name || 'Pending'}{' '}
              {metadata.supervisor_signed_at ? `| ${metadata.supervisor_signed_at}` : ''}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
