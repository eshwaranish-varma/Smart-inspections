import { useMemo } from 'react';
import { CheckCircle2, XCircle, X, Send } from 'lucide-react';
import type { DraftObservation, InspectionMetadata } from '@/types';

interface PublishGateProps {
  observations: DraftObservation[];
  metadata: InspectionMetadata;
  signatureImage: string | null;
  onPublish: () => void;
  onCancel: () => void;
}

interface CheckItem {
  label: string;
  passed: boolean;
}

export default function PublishGate({
  observations,
  metadata,
  signatureImage,
  onPublish,
  onCancel,
}: PublishGateProps) {
  const checks = useMemo<CheckItem[]>(() => {
    const hasObservations = observations.length > 0;
    const allHaveCitations = hasObservations && observations.every((o) => o.cfr_citation.trim().length > 0);
    const allHaveEvidence = hasObservations && observations.every((o) => o.evidence_list.length > 0);
    const firmFilled = metadata.firm_name.trim().length > 0;
    const feiFilled = metadata.fei_number.trim().length > 0;
    const hasInvestigator = metadata.investigators.length > 0;
    const hasSig = !!signatureImage;
    const noFlags = observations.every((o) => o.review_flags.length === 0);

    return [
      { label: 'At least 1 observation exists', passed: hasObservations },
      { label: 'All observations have CFR citations', passed: allHaveCitations },
      { label: 'All observations have evidence', passed: allHaveEvidence },
      { label: 'Firm name is filled', passed: firmFilled },
      { label: 'FEI number is filled', passed: feiFilled },
      { label: 'At least 1 investigator listed', passed: hasInvestigator },
      { label: 'Signature captured', passed: hasSig },
      { label: 'No review flags remaining', passed: noFlags },
    ];
  }, [observations, metadata, signatureImage]);

  const allPassed = checks.every((c) => c.passed);
  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pre-Publish Checklist</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {passedCount} of {checks.length} requirements met
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="space-y-1 px-6 py-4">
          {checks.map((check, idx) => (
            <li key={idx} className="flex items-center gap-3 rounded-lg px-3 py-2">
              {check.passed ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-red-500" />
              )}
              <span className={`text-sm ${check.passed ? 'text-gray-700' : 'font-medium text-red-700'}`}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onPublish}
            disabled={!allPassed}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Publish Form FDA 483
          </button>
        </div>
      </div>
    </div>
  );
}
