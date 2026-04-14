"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#workflow", label: "Workflow" },
  { href: "#capabilities", label: "Features" },
  { href: "#knowledge-base", label: "Knowledge Base" },
  { href: "#contact", label: "Contact" },
];

export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center pt-4 px-4">
      <nav
        className={[
          "flex w-full max-w-5xl items-center justify-between gap-6 rounded-full px-4 py-2.5 transition-all duration-300",
          scrolled
            ? "bg-white/90 shadow-[0_8px_32px_rgba(11,31,58,0.12)] backdrop-blur-xl border border-[#D9E1EC] dark:bg-slate-900/90 dark:border-white/10"
            : "bg-white/70 backdrop-blur-md border border-[#D9E1EC]/60 shadow-[0_4px_16px_rgba(11,31,58,0.06)] dark:bg-slate-900/70 dark:border-white/10",
        ].join(" ")}
      >
        {/* Logo */}
        <Link href="/" className="flex min-w-0 items-center gap-2.5 pl-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#282e63] text-xs font-bold tracking-wide text-white shadow-sm">
            SI
          </div>
          <p className="truncate text-sm font-semibold text-[#282e63] dark:text-white">
            Smart Inspections
          </p>
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-[#4B5565] transition-colors hover:bg-[#F0F4F8] hover:text-[#282e63] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden items-center gap-2 pr-1 lg:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-full border border-[#D9E1EC] px-4 py-1.5 text-sm font-medium text-[#282e63] transition-colors hover:bg-[#F7F9FC] dark:border-white/10 dark:text-white dark:hover:bg-white/10"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[#282e63] px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#282e63]"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex rounded-full border border-[#D9E1EC] bg-white/90 p-2 text-[#282e63] dark:border-white/10 dark:bg-slate-900/90 dark:text-white lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen ? "true" : "false"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile dropdown — outside the pill, below it */}
      {menuOpen ? (
        <div className="absolute top-[72px] left-4 right-4 rounded-2xl border border-[#D9E1EC] bg-white px-4 py-4 shadow-lg dark:border-white/10 dark:bg-slate-900 lg:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-xl px-4 py-2 text-sm font-medium text-[#4B5565] transition-colors hover:bg-[#F0F4F8] hover:text-[#282e63] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-3 border-t border-[#D9E1EC] pt-3 dark:border-white/10">
              <ThemeToggle />
              <Link
                href="/login"
                className="flex-1 rounded-full border border-[#D9E1EC] px-4 py-2 text-center text-sm font-medium text-[#282e63] dark:border-white/10 dark:text-white"
                onClick={() => setMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="flex-1 rounded-full bg-[#282e63] px-4 py-2 text-center text-sm font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
