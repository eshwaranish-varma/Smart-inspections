import type { Metadata } from "next";
import { Toaster } from "sonner";
import QueryProvider from "@/components/providers/QueryProvider";
import "./globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Smart Inspections — FDA Investigator Portal",
  description: "FDA regulatory inspection management and document intelligence platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-text-primary antialiased transition-colors duration-300">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem('smart-inspections-theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=stored||(prefersDark?'dark':'light');document.documentElement.classList.toggle('dark',theme==='dark');}catch(e){}})();`,
          }}
        />
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--surface-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            },
          }}
        />
      </body>
    </html>
  );
}
