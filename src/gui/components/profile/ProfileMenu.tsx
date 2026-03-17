"use client";

import { useMemo, useState } from "react";
import { User } from "lucide-react";
import ProfileModal, { type ProfileModalProfile } from "@/components/profile/ProfileModal";

type ProfileMenuProps = {
  profile: ProfileModalProfile | null;
  loading?: boolean;
  onProfileUpdated?: (profile: ProfileModalProfile) => void;
};

export default function ProfileMenu({
  profile,
  loading = false,
  onProfileUpdated,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);

  const displayName = useMemo(() => {
    if (!profile) return "Profile";
    return `${profile.first_name} ${profile.last_name}`.trim() || profile.email;
  }, [profile]);

  const displayInitials = useMemo(() => {
    const segments = displayName.split(" ").filter(Boolean).slice(0, 2);
    return segments.map((segment) => segment[0]?.toUpperCase() ?? "").join("") || "U";
  }, [displayName]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-gradient-to-br from-white to-slate-50 px-4 py-3 text-left shadow-sm transition hover:border-navy-200 hover:shadow-md"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open profile"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-sm font-medium text-navy-700">
          {loading ? <User className="h-4 w-4" /> : displayInitials}
        </div>
        <div className="hidden min-w-[220px] text-left sm:block">
          <p className="text-sm font-semibold text-gray-900">
            {loading ? "Loading profile..." : displayName}
          </p>
          <p className="text-xs font-medium text-navy-700">
            {profile?.fda_position || "FDA Inspector"}
          </p>
          <p className="mt-1 truncate text-[11px] text-gray-500">
            Click to view and edit profile
          </p>
        </div>
      </button>

      <ProfileModal
        open={open}
        onClose={() => setOpen(false)}
        onProfileUpdated={onProfileUpdated}
      />
    </>
  );
}
