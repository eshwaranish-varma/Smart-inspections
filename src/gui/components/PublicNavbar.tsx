'use client';

import Link from "next/link";
import { useState } from "react";

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      style={{ background: "#0D1B3E" }}
      className="fixed top-0 left-0 right-0 z-50 shadow-lg"
    >
      <div
        style={{ background: "#1a2a5e", borderBottom: "1px solid #2a3a6e" }}
        className="px-6 py-1"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span className="text-xs text-gray-400">
            An official FDA AI-assisted inspection tool
          </span>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>🇺🇸 English</span>
            <span>|</span>
            <Link href="/#features" className="hover:text-white transition-colors">
              Help
            </Link>
            <span>|</span>
            <Link href="/#contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 text-white no-underline">
          <div
            style={{ background: "#028090" }}
            className="w-10 h-10 rounded flex items-center justify-center font-bold text-lg"
          >
            SI
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">
              Smart Inspections
            </div>
            <div className="text-xs text-teal-400 leading-tight">
              AI-Assisted FDA Inspection Documentation
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/#about"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            About
          </Link>
          <Link
            href="/#services"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            Services
          </Link>
          <Link
            href="/#features"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            Features
          </Link>
          <Link
            href="/#contact"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            Contact
          </Link>
          <div className="flex gap-2 ml-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm border border-teal-500 text-teal-400 rounded hover:bg-teal-500 hover:text-white transition-all"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              style={{ background: "#028090" }}
              className="px-4 py-2 text-sm text-white rounded hover:opacity-90 transition-all font-semibold"
            >
              Sign Up
            </Link>
          </div>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white text-2xl"
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div
          style={{ background: "#0D1B3E", borderTop: "1px solid #1a2a5e" }}
          className="md:hidden px-6 pb-4"
        >
          {["/#about", "/#services", "/#features", "/#contact"].map((href) => (
            <Link
              key={href}
              href={href}
              className="block py-2 text-gray-300 hover:text-white text-sm"
            >
              {href.replace("/#", "").charAt(0).toUpperCase() +
                href.replace("/#", "").slice(1)}
            </Link>
          ))}
          <div className="flex gap-3 mt-4">
            <Link
              href="/login"
              className="flex-1 text-center py-2 border border-teal-500 text-teal-400 rounded text-sm"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              style={{ background: "#028090" }}
              className="flex-1 text-center py-2 text-white rounded text-sm font-semibold"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

