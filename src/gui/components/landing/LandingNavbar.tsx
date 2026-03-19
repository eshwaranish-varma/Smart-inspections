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

const utilityLinks = [
  { href: "#workflow", label: "Help" },
  { href: "#architecture", label: "Documentation" },
  { href: "#contact", label: "Contact" },
  { href: "#", label: "English" },
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
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="border-b border-white/10 bg-[#0B1F3A] text-[11px] text-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <p className="truncate text-slate-300">
            AI-assisted inspection drafting platform
          </p>
          <div className="hidden items-center gap-4 text-slate-300 sm:flex">
            {utilityLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <nav
        className={[
          "border-b transition-all duration-200",
          scrolled
            ? "border-[#D9E1EC] bg-white/92 shadow-[0_10px_30px_rgba(11,31,58,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/92"
            : "border-transparent bg-transparent backdrop-blur-none",
        ].join(" ")}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1F3A] text-sm font-bold tracking-wide text-white shadow-sm">
              SI
            </div>
            <div className="min-w-0">
              <p
                className={[
                  "truncate text-sm font-semibold transition-colors",
                  scrolled ? "text-[#13213C] dark:text-white" : "text-white",
                ].join(" ")}
              >
                Smart Inspections
              </p>
              <p
                className={[
                  "truncate text-xs transition-colors",
                  scrolled ? "text-[#4B5565] dark:text-slate-300" : "text-slate-200",
                ].join(" ")}
              >
                AI-Assisted FDA Inspection Documentation
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={[
                  "text-sm font-medium transition-colors",
                  scrolled
                    ? "text-[#4B5565] hover:text-[#13213C] dark:text-slate-300 dark:hover:text-white"
                    : "text-slate-200 hover:text-white",
                ].join(" ")}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle />
            <Link
              href="/login"
              className={[
                "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                scrolled
                  ? "border-[#D9E1EC] text-[#13213C] hover:bg-[#F7F9FC] dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                  : "border-white/25 text-white hover:bg-white/10",
              ].join(" ")}
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10294A]"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex rounded-xl border border-[#D9E1EC] bg-white/90 p-2 text-[#13213C] dark:border-white/10 dark:bg-slate-900/90 dark:text-white lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-[#D9E1EC] bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-900 lg:hidden sm:px-6">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-[#4B5565] transition-colors hover:text-[#13213C] dark:text-slate-300 dark:hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-3">
                <ThemeToggle />
                <Link
                  href="/login"
                  className="flex-1 rounded-xl border border-[#D9E1EC] px-4 py-2 text-center text-sm font-medium text-[#13213C] dark:border-white/10 dark:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="flex-1 rounded-xl bg-[#0B1F3A] px-4 py-2 text-center text-sm font-semibold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
