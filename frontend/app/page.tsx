import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  Images,
  PenTool,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "AI Listing Generator",
    desc: "Product photo upload karo. Title, description aur tags marketplace ke rules ke mutabiq mil jayenge.",
  },
  {
    icon: Images,
    title: "Bulk Image Resizer",
    desc: "Ek saath 20 photos ko Etsy, Amazon, eBay ya Shopify ke size mein badlo, background bhi hatao.",
  },
  {
    icon: PenTool,
    title: "Image Vectorizer",
    desc: "Photo ko saaf SVG vector mein convert karo jo kisi bhi size par sharp rehta hai.",
  },
];

const MARKETS = ["Etsy", "Amazon", "eBay", "Shopify"];

export default function Home() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Sparkles size={18} />
          </span>
          <span className="text-lg font-bold tracking-tight">ListCraft AI</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary">
            Login
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
          <Sparkles size={14} />
          AI tools for e-commerce sellers
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Ek photo se poori{" "}
          <span className="text-brand-600">marketplace listing</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Listings likhna, photos resize karna aur vectors banana, sab ek jagah.
          Kam mehnat, zyada sales.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary !px-6 !py-3 !text-base">
            Free mein shuru karo
            <ArrowRight size={18} />
          </Link>
          <Link href="/login" className="btn-secondary !px-6 !py-3 !text-base">
            Login
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
          {MARKETS.map((m) => (
            <span key={m} className="flex items-center gap-1.5">
              <Check size={14} className="text-brand-600" />
              {m} ready
            </span>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-canvas py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Sab kuch jo ek seller ko chahiye
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted">
            Har tool ek click door hai, aur naye tools jald aa rahe hain.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-brand-700 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight">
            Apni pehli listing aaj hi banao
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-brand-100">
            Account banane mein ek minute lagta hai.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Account Banao
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        ListCraft AI · Final Year Project
      </footer>
    </div>
  );
}