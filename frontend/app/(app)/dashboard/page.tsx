import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Globe,
  ImagePlus,
  Images,
  PenTool,
  Search,
  Video,
} from "lucide-react";

const MODULES = [
  {
    href: "/generate",
    title: "Listing Generator",
    desc: "Product photo se title, description aur tags, marketplace ke rules ke mutabiq.",
    icon: FileText,
  },
  {
    href: "/resize",
    title: "Image Resizer",
    desc: "Bulk photos ko Etsy, Amazon, eBay aur Shopify ke size mein badlo, background hatao.",
    icon: Images,
  },
  {
    href: "/vectorize",
    title: "Vectorizer",
    desc: "Photo ko saaf SVG vector mein convert karo jo har size par sharp rahe.",
    icon: PenTool,
  },
  {
    href: "/analyzer",
    title: "Listing Analyzer",
    desc: "Listing ka link paste karo aur SEO score aur sudhar ke tips pao.",
    icon: Search,
  },
  {
    href: "/mockups",
    title: "Mockup Generator",
    desc: "Artwork ya product photo ko frame, poster ya studio scene mein lagao.",
    icon: ImagePlus,
  },
  {
    href: "/scraper",
    title: "Store Scraper",
    desc: "Store ka link do, products, summary aur main points pao, CSV download karo.",
    icon: Globe,
  },
];

const UPCOMING = [
  { title: "Video Maker", icon: Video },
  { title: "Product Research", icon: Search },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl p-6 sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-muted">
        Apna tool chuno aur kaam shuru karo.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="card group transition hover:border-brand-500 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon size={22} />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
              Open
              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 mt-12 text-sm font-semibold uppercase tracking-wide text-muted">
        Coming soon
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPCOMING.map(({ title, icon: Icon }) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-surface/60 p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-muted">
              <Icon size={20} />
            </span>
            <span className="flex-1 text-sm font-medium text-muted">{title}</span>
            <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">
              Soon
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}