import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { DraftObservation } from '@/types';

interface ObservationEditorProps {
  observation: DraftObservation | null;
  open: boolean;
  onSave: (obs: DraftObservation) => void;
  onClose: () => void;
}

function emptyForm(): DraftObservation {
  return {
    id: '',
    observation_text: '',
    cfr_citation: '',
    evidence_list: [''],
    confidence_score: 0,
    source_notes_excerpt: '',
    review_flags: [],
  };
}

export default function ObservationEditor({
  observation,
  open,
  onSave,
  onClose,
}: ObservationEditorProps) {
  const [form, setForm] = useState<DraftObservation>(emptyForm);

  useEffect(() => {
    if (observation) {
      setForm({
        ...observation,
        evidence_list:
          observation.evidence_list.length > 0
            ? [...observation.evidence_list]
            : [''],
      });
    } else {
      setForm(emptyForm());
    }
  }, [observation, open]);

  if (!open) return null;

  function updateField<K extends keyof DraftObservation>(
    key: K,
    value: DraftObservation[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setEvidence(index: number, value: string) {
    setForm((prev) => {
      const list = [...prev.evidence_list];
      list[index] = value;
      return { ...prev, evidence_list: list };
    });
  }

  function addEvidence() {
    setForm((prev) => ({
      ...prev,
      evidence_list: [...prev.evidence_list, ''],
    }));
  }

  function removeEvidence(index: number) {
    setForm((prev) => ({
      ...prev,
      evidence_list: prev.evidence_list.filter((_, i) => i !== index),
    }));
  }

  function handleSave() {
    onSave({
      ...form,
      evidence_list: form.evidence_list.filter((e) => e.trim() !== ''),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {observation ? 'Edit Observation' : 'New Observation'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Observation Text
            </label>
            <textarea
              rows={5}
              value={form.observation_text}
              onChange={(e) => updateField('observation_text', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              CFR Citation
            </label>
            <input
              type="text"
              value={form.cfr_citation}
              onChange={(e) => updateField('cfr_citation', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Evidence Items
              </label>
              <button
                type="button"
                onClick={addEvidence}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="space-y-2">
              {form.evidence_list.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => setEvidence(i, e.target.value)}
                    placeholder={`Evidence item ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {form.evidence_list.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEvidence(i)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove evidence item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
