import { useState, useEffect } from 'react';
import { Save, Key, Cpu, Sliders, Info } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'smart-inspections-settings';

interface AppSettings {
  apiKey: string;
  model: string;
  temperature: number;
  districtOffice: string;
  includeIomCitations: boolean;
}

const defaultSettings: AppSettings = {
  apiKey: '',
  model: 'gpt-4o',
  temperature: 0.15,
  districtOffice: '',
  includeIomCitations: true,
};

const districtOffices = [
  'New York District',
  'New Jersey District',
  'Philadelphia District',
  'Baltimore District',
  'Florida District',
  'Southeast District',
  'Chicago District',
  'Dallas District',
  'Denver District',
  'Los Angeles District',
  'San Francisco District',
  'Pacific Northwest District',
];

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [settings]);

  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    toast.success('Settings saved');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure AI parameters and application defaults.</p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <Cpu className="h-5 w-5 text-navy-600" />
          <h2 className="text-sm font-semibold text-gray-900">AI Configuration</h2>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Key className="h-4 w-4 text-gray-400" />
              OpenAI API Key
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => patch('apiKey', e.target.value)}
              placeholder="sk-…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
            />
            <p className="mt-1 text-xs text-gray-400">Stored locally in your browser. Never sent to our servers.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Model</label>
            <select
              value={settings.model}
              onChange={(e) => patch('model', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
            >
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Temperature</label>
              <span className="text-sm font-mono text-navy-700">{settings.temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.05}
              value={settings.temperature}
              onChange={(e) => patch('temperature', parseFloat(e.target.value))}
              className="w-full accent-navy-700"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0.00 (Deterministic)</span>
              <span>0.50 (Creative)</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <Sliders className="h-5 w-5 text-navy-600" />
          <h2 className="text-sm font-semibold text-gray-900">Defaults</h2>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Default District Office</label>
            <select
              value={settings.districtOffice}
              onChange={(e) => patch('districtOffice', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
            >
              <option value="">Select district…</option>
              {districtOffices.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Include IOM Citations</p>
              <p className="text-xs text-gray-400">Reference IOM guidance when drafting observations.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.includeIomCitations}
              onClick={() => patch('includeIomCitations', !settings.includeIomCitations)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.includeIomCitations ? 'bg-navy-700' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  settings.includeIomCitations ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <Info className="h-5 w-5 text-navy-600" />
          <h2 className="text-sm font-semibold text-gray-900">About</h2>
        </div>
        <div className="space-y-3 p-6 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Version</span>
            <span className="font-medium text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Build</span>
            <span className="font-mono text-xs text-gray-600">2025-capstone-release</span>
          </div>
          <hr className="border-gray-100" />
          <p className="text-gray-500">
            Smart Inspections is a DAEN Capstone project that leverages AI to assist FDA investigators
            in drafting 483 observations and EIR narratives from inspection notes, built on top of
            the FY2025 observations dataset and IOM knowledge base.
          </p>
        </div>
      </section>
    </div>
  );
}
