"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Briefcase,
  CalendarDays,
  Mail,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";

export type ProfileModalProfile = {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  /** App permission: supervisor | investigator (read-only). */
  role?: string;
  fda_position?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  organization?: string;
  created_at?: string;
};

type EditableProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  /** FDA title / position (editable; distinct from account role). */
  fda_position: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
};

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: ProfileModalProfile) => void;
};

const EMPTY_FORM: EditableProfileForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  fda_position: "",
  address: "",
  city: "",
  state: "",
  country: "",
  zip_code: "",
};

const EDITABLE_INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-navy-500 focus:bg-white disabled:text-slate-600";

const READ_ONLY_INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600 outline-none disabled:text-slate-600";

function toFormData(profile: ProfileModalProfile): EditableProfileForm {
  return {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    fda_position: profile.fda_position ?? "",
    address: profile.address ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    country: profile.country ?? "",
    zip_code: profile.zip_code ?? "",
  };
}

function formatCreatedDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAccountRole(role?: string) {
  const r = (role || "").trim().toLowerCase();
  if (r === "supervisor") return "Supervisor";
  if (r === "investigator") return "Investigator";
  return role?.trim() || "—";
}

export default function ProfileModal({
  open,
  onClose,
  onProfileUpdated,
}: ProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [profile, setProfile] = useState<ProfileModalProfile | null>(null);
  const [formData, setFormData] = useState<EditableProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/profile", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch profile.");
      }

      const normalizedProfile: ProfileModalProfile = {
        ...data.profile,
        organization: data.profile?.organization || "FDA",
      };

      setProfile(normalizedProfile);
      setFormData(toFormData(normalizedProfile));
      onProfileUpdated?.(normalizedProfile);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load profile."
      );
    } finally {
      setLoading(false);
    }
  }, [onProfileUpdated]);

  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setError("");
      setSuccessMessage("");
      return;
    }

    loadProfile();
  }, [open, loadProfile]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, open]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, open]);

  useLayoutEffect(() => {
    setPortalEl(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      modalRef.current?.querySelector<HTMLElement>("button")?.focus();
    }
  }, [open]);

  const displayName = useMemo(() => {
    if (!profile) return "Profile";
    return `${profile.first_name} ${profile.last_name}`.trim() || profile.email;
  }, [profile]);

  const initials = useMemo(() => {
    const segments = displayName.split(" ").filter(Boolean).slice(0, 2);
    return segments.map((segment) => segment[0]?.toUpperCase() ?? "").join("") || "U";
  }, [displayName]);

  const handleFieldChange =
    (field: keyof EditableProfileForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleCancelEdit = () => {
    if (profile) {
      setFormData(toFormData(profile));
    }
    setIsEditing(false);
    setError("");
    setSuccessMessage("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile.");
      }

      const updatedProfile: ProfileModalProfile = {
        ...data.profile,
        role: profile?.role ?? data.profile?.role,
        fda_position: data.profile?.fda_position ?? formData.fda_position,
        organization: profile?.organization ?? "FDA",
        created_at: profile?.created_at,
      };

      setProfile(updatedProfile);
      setFormData(toFormData(updatedProfile));
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully.");
      onProfileUpdated?.(updatedProfile);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="User profile"
    >
      <div
        ref={modalRef}
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-navy-800 to-navy-700 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-lg font-semibold text-white">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Profile</h2>
              <p className="mt-1 text-sm text-cyan-100">
                View and update your Smart Inspections account details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close profile modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
              Loading profile...
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[auto,1fr]">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy-100 text-2xl font-semibold text-navy-700">
                  {initials}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <UserIcon className="h-4 w-4" />
                      Name
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{displayName}</p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Shield className="h-4 w-4" />
                      Account role
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {formatAccountRole(profile?.role)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">Set by your administrator — cannot be changed here.</p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Briefcase className="h-4 w-4" />
                      FDA title / position
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {profile?.fda_position || "Not available"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <p className="mt-2 break-all text-sm font-medium text-slate-900">
                      {profile?.email || "Not available"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <CalendarDays className="h-4 w-4" />
                      Account Created Date
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {formatCreatedDate(profile?.created_at)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Profile Information</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {isEditing
                        ? "Update your profile details and save changes."
                        : "Your saved account details from the current profile API."}
                    </p>
                  </div>
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
                    >
                      Edit Profile
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      First Name
                    </label>
                    <input
                      value={formData.first_name}
                      onChange={handleFieldChange("first_name")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Last Name
                    </label>
                    <input
                      value={formData.last_name}
                      onChange={handleFieldChange("last_name")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </label>
                    <input
                      value={formData.email}
                      onChange={handleFieldChange("email")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Phone
                    </label>
                    <input
                      value={formData.phone}
                      onChange={handleFieldChange("phone")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Account role
                    </label>
                    <input
                      value={formatAccountRole(profile?.role)}
                      readOnly
                      disabled
                      className={READ_ONLY_INPUT_CLASS}
                      title="Cannot be changed in the app"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      FDA title
                    </label>
                    <input
                      value={formData.fda_position}
                      onChange={handleFieldChange("fda_position")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Organization
                    </label>
                    <input
                      value={profile?.organization || "FDA"}
                      disabled
                      className={READ_ONLY_INPUT_CLASS}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Address
                    </label>
                    <input
                      value={formData.address}
                      onChange={handleFieldChange("address")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      City
                    </label>
                    <input
                      value={formData.city}
                      onChange={handleFieldChange("city")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      State
                    </label>
                    <input
                      value={formData.state}
                      onChange={handleFieldChange("state")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Country
                    </label>
                    <input
                      value={formData.country}
                      onChange={handleFieldChange("country")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      ZIP Code
                    </label>
                    <input
                      value={formData.zip_code}
                      onChange={handleFieldChange("zip_code")}
                      disabled={!isEditing}
                      className={EDITABLE_INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800 disabled:opacity-70"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Close
                    </button>
                  )}
                </div>
              </section>

            </div>
          )}
        </div>
      </div>
    </div>
  );

  return portalEl ? createPortal(modal, portalEl) : null;
}
