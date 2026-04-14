"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  Check,
  FileText,
  Image,
  File,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { districtOffices } from "@/lib/mockData";
import { createInspection } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { EstablishmentType } from "@/lib/types";

const STEPS = [
  "Establishment",
  "Inspection Details",
  "Upload Records",
  "Review & Create",
] as const;

const ESTABLISHMENT_TYPES: EstablishmentType[] = [
  "Drug Manufacturer",
  "Food Facility",
  "Medical Device",
  "Biologics",
  "Cosmetics",
  "Tobacco",
  "Veterinary",
  "Other",
];

const INSPECTION_TYPES = [
  "Routine",
  "For-Cause",
  "Follow-Up",
  "Pre-Approval",
] as const;

const REGULATORY_BASIS_OPTIONS = [
  "21 CFR Part 110",
  "21 CFR Part 211",
  "21 CFR Part 820",
  "21 CFR Part 117",
  "21 CFR Part 820 (Subpart C)",
  "21 CFR Part 4",
] as const;

interface TeamMember {
  name: string;
  title: string;
  badge: string;
}

interface UploadedFile {
  id: string;
  file: File;
}

interface FormData {
  firmName: string;
  feiNumber: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  establishmentType: EstablishmentType;
  districtOffice: string;
  individualName: string;
  individualTitle: string;
  startDate: string;
  endDate: string;
  inspectionType: string;
  regulatoryBasis: string[];
  leadInvestigator: string;
  teamMembers: TeamMember[];
}

const initialFormData: FormData = {
  firmName: "",
  feiNumber: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "United States",
  establishmentType: "Drug Manufacturer",
  districtOffice: "",
  individualName: "",
  individualTitle: "",
  startDate: "",
  endDate: "",
  inspectionType: "Routine",
  regulatoryBasis: [],
  leadInvestigator: "Sarah Chen",
  teamMembers: [],
};

const inputClasses =
  "w-full border border-border bg-background px-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

const selectClasses =
  "w-full border border-border bg-background px-3 py-2 font-sans text-sm text-text-primary focus:border-primary focus:outline-none";

const labelClasses = "block font-mono text-xs font-medium uppercase tracking-wider text-text-secondary mb-1.5";

function fileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type === "application/pdf" || type.includes("word")) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewInspectionPage() {
  const router = useRouter();

  useEffect(() => {
    toast.info("Use the Workflow page to create and manage inspections.");
    router.replace("/workflow");
  }, [router]);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRegBasis(value: string) {
    setForm((prev) => ({
      ...prev,
      regulatoryBasis: prev.regulatoryBasis.includes(value)
        ? prev.regulatoryBasis.filter((v) => v !== value)
        : [...prev.regulatoryBasis, value],
    }));
  }

  function addTeamMember() {
    update("teamMembers", [
      ...form.teamMembers,
      { name: "", title: "", badge: "" },
    ]);
  }

  function updateTeamMember(
    index: number,
    field: keyof TeamMember,
    value: string
  ) {
    const updated = [...form.teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    update("teamMembers", updated);
  }

  function removeTeamMember(index: number) {
    update(
      "teamMembers",
      form.teamMembers.filter((_, i) => i !== index)
    );
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
  }

  function addFiles(incoming: File[]) {
    const accepted = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "image/jpeg",
      "image/png",
      "text/csv",
    ];
    const valid = incoming.filter((f) => accepted.includes(f.type));
    if (valid.length < incoming.length) {
      toast.error("Some files were skipped — unsupported format");
    }
    setFiles((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
      })),
    ]);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function validateStep(): boolean {
    if (step === 0) {
      if (!form.firmName.trim()) {
        toast.error("Firm Name is required");
        return false;
      }
      if (form.feiNumber && !/^\d{7}$/.test(form.feiNumber)) {
        toast.error("FEI Number must be exactly 7 digits");
        return false;
      }
    }
    if (step === 1) {
      if (!form.startDate || !form.endDate) {
        toast.error("Start and End dates are required");
        return false;
      }
      if (form.startDate > form.endDate) {
        toast.error("End date must be on or after start date");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      await createInspection({
        firm: {
          name: form.firmName,
          feiNumber: form.feiNumber,
          address: {
            street: form.street,
            city: form.city,
            state: form.state,
            zip: form.zip,
            country: form.country,
          },
          type: form.establishmentType,
        },
        dates: {
          start: new Date(form.startDate),
          end: new Date(form.endDate),
        },
        districtOffice: form.districtOffice,
        reportIssuedTo: {
          name: form.individualName,
          title: form.individualTitle,
        },
        investigators: [
          {
            id: "inv-001",
            name: form.leadInvestigator,
            title: "Consumer Safety Officer",
            badgeNumber: "FDA-2847",
            districtOffice: form.districtOffice,
          },
          ...form.teamMembers.map((m, i) => ({
            id: `inv-new-${i}`,
            name: m.name,
            title: m.title,
            badgeNumber: m.badge,
            districtOffice: form.districtOffice,
          })),
        ],
      });
      toast.success("Inspection created successfully");
      router.push("/inspections");
    } catch {
      toast.error("Failed to create inspection");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="New Inspection"
        description="Create a new inspection record"
      />

      <nav className="mb-8 flex items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={cn(
                    "h-px flex-1",
                    i <= step ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center font-mono text-xs font-bold",
                  i < step && "bg-success text-white",
                  i === step && "bg-primary text-white",
                  i > step && "border border-border bg-surface text-text-muted"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1",
                    i < step ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-wider",
                i <= step ? "text-text-primary" : "text-text-muted"
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </nav>

      <div className="border border-border bg-surface-elevated p-6">
        {step === 0 && (
          <div>
            <h2 className="mb-6 font-serif text-lg font-semibold text-text-primary">
              Establishment Information
            </h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>
                  Firm Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.firmName}
                  onChange={(e) => update("firmName", e.target.value)}
                  placeholder="Enter firm name"
                />
              </div>
              <div>
                <label className={labelClasses}>FEI Number</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.feiNumber}
                  onChange={(e) => update("feiNumber", e.target.value)}
                  placeholder="7 digits"
                  maxLength={7}
                  pattern="\d{7}"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClasses}>Street Address</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.street}
                  onChange={(e) => update("street", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClasses}>City</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClasses}>State</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClasses}>ZIP Code</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.zip}
                  onChange={(e) => update("zip", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClasses}>Country</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClasses}>Type of Establishment</label>
                <select
                  className={selectClasses}
                  value={form.establishmentType}
                  onChange={(e) =>
                    update("establishmentType", e.target.value as EstablishmentType)
                  }
                >
                  {ESTABLISHMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClasses}>District Office</label>
                <select
                  className={selectClasses}
                  value={form.districtOffice}
                  onChange={(e) => update("districtOffice", e.target.value)}
                >
                  <option value="">Select district office</option>
                  {districtOffices.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Name of Individual</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.individualName}
                  onChange={(e) => update("individualName", e.target.value)}
                  placeholder="Person to whom report is issued"
                />
              </div>
              <div>
                <label className={labelClasses}>Title of Individual</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.individualTitle}
                  onChange={(e) => update("individualTitle", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="mb-6 font-serif text-lg font-semibold text-text-primary">
              Inspection Details
            </h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>
                  Start Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className={inputClasses}
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClasses}>
                  End Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className={inputClasses}
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClasses}>Inspection Type</label>
                <select
                  className={selectClasses}
                  value={form.inspectionType}
                  onChange={(e) => update("inspectionType", e.target.value)}
                >
                  {INSPECTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Lead Investigator</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={form.leadInvestigator}
                  onChange={(e) => update("leadInvestigator", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClasses}>Regulatory Basis</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {REGULATORY_BASIS_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 border px-3 py-2 font-mono text-xs transition-colors",
                        form.regulatoryBasis.includes(opt)
                          ? "border-primary bg-primary/10 text-text-primary"
                          : "border-border bg-background text-text-secondary hover:border-primary/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.regulatoryBasis.includes(opt)}
                        onChange={() => toggleRegBasis(opt)}
                      />
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center border",
                          form.regulatoryBasis.includes(opt)
                            ? "border-primary bg-primary"
                            : "border-border bg-background"
                        )}
                      >
                        {form.regulatoryBasis.includes(opt) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-base font-semibold text-text-primary">
                  Team Members
                </h3>
                <button
                  type="button"
                  onClick={addTeamMember}
                  className="flex items-center gap-1.5 bg-surface px-3 py-1.5 font-mono text-xs font-medium text-primary border border-border transition-colors hover:bg-surface-elevated"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Team Member
                </button>
              </div>
              {form.teamMembers.length === 0 && (
                <p className="py-4 text-center font-sans text-sm text-text-muted">
                  No additional team members added
                </p>
              )}
              <div className="space-y-3">
                {form.teamMembers.map((member, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 border border-border bg-background p-3"
                  >
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        className={inputClasses}
                        value={member.name}
                        onChange={(e) =>
                          updateTeamMember(i, "name", e.target.value)
                        }
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        className={inputClasses}
                        value={member.title}
                        onChange={(e) =>
                          updateTeamMember(i, "title", e.target.value)
                        }
                        placeholder="Title"
                      />
                      <input
                        type="text"
                        className={inputClasses}
                        value={member.badge}
                        onChange={(e) =>
                          updateTeamMember(i, "badge", e.target.value)
                        }
                        placeholder="Badge #"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTeamMember(i)}
                      className="mt-1 p-1 text-text-muted transition-colors hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-6 font-serif text-lg font-semibold text-text-primary">
              Upload Prior Records
            </h2>
            <p className="mb-4 font-sans text-sm text-text-secondary">
              Optionally attach inspection notes, photos, checklists, or other
              supporting documents.
            </p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="flex flex-col items-center justify-center border-2 border-dashed border-border bg-background/50 px-6 py-16 transition-colors hover:border-primary/50"
            >
              <Upload className="mb-3 h-10 w-10 text-text-muted" />
              <p className="mb-1 font-sans text-sm font-medium text-text-primary">
                Drop inspection notes, photos, checklists here
              </p>
              <p className="mb-4 font-mono text-xs text-text-muted">
                PDF, DOCX, JPG, PNG, CSV
              </p>
              <label className="cursor-pointer bg-surface-elevated px-4 py-2 font-mono text-xs font-medium text-text-primary border border-border transition-colors hover:bg-surface">
                Browse Files
                <input
                  type="file"
                  className="sr-only"
                  multiple
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.csv"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-4 divide-y divide-border border border-border bg-surface">
                {files.map((f) => {
                  const Icon = fileIcon(f.file.type);
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-sans text-sm text-text-primary">
                          {f.file.name}
                        </p>
                        <p className="font-mono text-xs text-text-muted">
                          {formatFileSize(f.file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="p-1 text-text-muted transition-colors hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-6 font-serif text-lg font-semibold text-text-primary">
              Review & Create
            </h2>

            <div className="space-y-6">
              <section>
                <h3 className="mb-3 border-b border-border pb-2 font-mono text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Establishment
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  <ReviewField label="Firm Name" value={form.firmName} />
                  <ReviewField label="FEI Number" value={form.feiNumber} mono />
                  <ReviewField
                    label="Address"
                    value={[
                      form.street,
                      [form.city, form.state, form.zip]
                        .filter(Boolean)
                        .join(", "),
                      form.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                  <ReviewField label="Type" value={form.establishmentType} />
                  <ReviewField
                    label="District Office"
                    value={form.districtOffice}
                  />
                  <ReviewField
                    label="Report Issued To"
                    value={
                      [form.individualName, form.individualTitle]
                        .filter(Boolean)
                        .join(" — ") || "—"
                    }
                  />
                </dl>
              </section>

              <section>
                <h3 className="mb-3 border-b border-border pb-2 font-mono text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Inspection Details
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  <ReviewField label="Dates" value={`${form.startDate} → ${form.endDate}`} mono />
                  <ReviewField label="Type" value={form.inspectionType} />
                  <ReviewField
                    label="Regulatory Basis"
                    value={
                      form.regulatoryBasis.length > 0
                        ? form.regulatoryBasis.join(", ")
                        : "None selected"
                    }
                    mono
                  />
                  <ReviewField
                    label="Lead Investigator"
                    value={form.leadInvestigator}
                  />
                </dl>
                {form.teamMembers.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 font-mono text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Team Members
                    </p>
                    <div className="space-y-1">
                      {form.teamMembers.map((m, i) => (
                        <p
                          key={i}
                          className="font-sans text-sm text-text-primary"
                        >
                          {m.name}
                          {m.title && (
                            <span className="text-text-muted"> — {m.title}</span>
                          )}
                          {m.badge && (
                            <span className="ml-2 font-mono text-xs text-text-muted">
                              #{m.badge}
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 border-b border-border pb-2 font-mono text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Uploaded Files
                </h3>
                {files.length === 0 ? (
                  <p className="font-sans text-sm text-text-muted">
                    No files attached
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {files.map((f) => (
                      <li
                        key={f.id}
                        className="font-sans text-sm text-text-primary"
                      >
                        {f.file.name}{" "}
                        <span className="font-mono text-xs text-text-muted">
                          ({formatFileSize(f.file.size)})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 0}
          className={cn(
            "flex items-center gap-2 border border-border bg-surface-elevated px-4 py-2.5 font-mono text-sm font-medium text-text-primary transition-colors hover:bg-surface",
            step === 0 && "cursor-not-allowed opacity-40"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className="flex items-center gap-2 bg-primary px-4 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            className={cn(
              "flex items-center gap-2 bg-primary px-6 py-2.5 font-mono text-sm font-bold text-white transition-colors hover:bg-primary/90",
              submitting && "cursor-not-allowed opacity-60"
            )}
          >
            <Check className="h-4 w-4" />
            {submitting ? "Creating…" : "Create Inspection"}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-sm text-text-primary",
          mono ? "font-mono" : "font-sans"
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}
