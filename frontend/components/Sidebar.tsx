"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Globe,
  Images,
  ImagePlus,
  PenTool,
  Search,
  TrendingUp,
  Video,
  LogOut,
  Menu,
  Sparkles,
  X,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "Listing Generator", icon: FileText },
  { href: "/resize", label: "Image Resizer", icon: Images },
  { href: "/vectorize", label: "Vectorizer", icon: PenTool },
  { href: "/analyzer", label: "Listing Analyzer", icon: Search },
  { href: "/mockups", label: "Mockup Generator", icon: ImagePlus },
  { href: "/scraper", label: "Store Scraper", icon: Globe },
  { href: "/research", label: "Keyword Research", icon: TrendingUp },
  { href: "/video", label: "Video Maker", icon: Video },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <Sparkles size={18} />
      </span>
      <span className="text-lg font-bold tracking-tight">ListCraft AI</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-canvas hover:text-ink"
    >
      <LogOut size={18} />
      Logout
    </button>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <>
      {/* Bari screen: sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface p-4 md:flex">
        <div className="mb-8 px-2 pt-2">
          <Brand />
        </div>
        <NavLinks />
        <LogoutButton onClick={logout} />
      </aside>

      {/* Chhoti screen: upar ki patti */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          aria-label="Menu kholo"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Chhoti screen: side se aane wala menu */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-surface p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between px-2 pt-2">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Menu band karo"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-canvas"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <LogoutButton onClick={logout} />
          </div>
        </div>
      )}
    </>
  );
}