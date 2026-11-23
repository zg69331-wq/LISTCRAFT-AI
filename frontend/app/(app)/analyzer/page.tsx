"use client";
import { useState } from "react";
import { Check, Download, Loader2, Search, X } from "lucide-react";
import { analyzeListing, fetchListing, type AnalysisResult } from "@/lib/api";

const MARKETS = [
  { id: "etsy", label: "Etsy", titleMax: 140, tags: 13, example: "https://www.etsy.com/listing/123456789/product-name" },
  { id: "amazon", label: "Amazon", titleMax: 200, tags: 7, example: "https://www.amazon.com/dp/B0XXXXXXXX" },
  { id: "ebay", label: "eBay", titleMax: 80, tags: 5, example: "https://www.ebay.com/itm/123456789" },
  { id: "shopify", label: "Shopify", titleMax: 70, tags: 10, example: "https://yourstore.com/products/product-name" },
];

const MISSING_LABELS: Record<string, string> = {
  description: "description",
  tags: "tags",
};

function parseList(text: string) {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tone(score: number) {
  if (score >= 80) return { stroke: "#16a34a", text: "text-green-600" };
  if (score >= 60) return { stroke: "#d97706", text: "text-amber-600" };
  if (score >= 40) return { stroke: "#ea580c", text: "text-orange-600" };
  return { stroke: "#dc2626", text: "text-red-600" };
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const t = tone(score);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7ef" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={t.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${t.text}`}>{score}</span>
        <span className="text-xs text-muted">/ 100</span>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass")
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
        <Check size={14} />
      </span>
    );
  if (status === "fail")
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
        <X size={14} />
      </span>
    );
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
      !
    </span>
  );
}

export default function AnalyzerPage() {
  const [marketplace, setMarketplace] = useState("etsy");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [fetching, setFetching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const market = MARKETS.find((m) => m.id === marketplace)!;
  const tagCount = parseList(tagsText).length;
  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0;

  async function handleFetch() {
    if (!url.trim()) return setError("Pehle listing ka link paste karo");
    setError("");
    setNotice("");
    setResult(null);
    setFetching(true);
    try {
      const data = await fetchListing(marketplace, url);
      setTitle(data.title);
      setDescription(data.description);
      setTagsText(data.tags.join(", "));
      if (data.missing.length) {
        const names = data.missing.map((m) => MISSING_LABELS[m] ?? m).join(" aur ");
        setNotice(`Listing mil gayi, lekin ${names} nahi mile. Neeche khud bhar do.`);
      } else {
        setNotice("Listing mil gayi. Check karo aur Analyze dabao.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFetching(false);
    }
  }

  async function handleAnalyze() {
    if (!title.trim()) return setError("Title zaroor do (link se Fetch karo ya khud likho)");
    setError("");
    setAnalyzing(true);
    try {
      const data = await analyzeListing(
        marketplace,
        title,
        description,
        parseList(tagsText),
        parseList(keywordsText)
      );
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  const counts = result
    ? {
        pass: result.checks.filter((c) => c.status === "pass").length,
        warn: result.checks.filter((c) => c.status === "warn").length,
        fail: result.checks.filter((c) => c.status === "fail").length,
      }
    : null;

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight">Listing Analyzer</h1>
      <p className="mt-2 text-sm text-muted">
        Platform chuno, listing ka link paste karo, aur SEO score aur sudhar ke tips pao.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[440px_1fr]">
        <div className="card h-fit space-y-6">
          <div>
            <span className="label">1. Platform</span>
            <div className="grid grid-cols-4 gap-2">
              {MARKETS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMarketplace(m.id)}
                  className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                    marketplace === m.id
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-line bg-white text-muted hover:bg-canvas"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="url">
              2. Listing ka link
            </label>
            <div className="flex gap-2">
              <input
                id="url"
                className="input"
                placeholder={market.example}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              />
              <button
                onClick={handleFetch}
                disabled={fetching}
                className="btn-secondary shrink-0"
              >
                {fetching ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Fetch
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Agar site link se data na de, to neeche khud paste kar sakte ho.
            </p>
          </div>

          {notice && (
            <p className="rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-700">
              {notice}
            </p>
          )}

          <div className="space-y-4 border-t border-line pt-6">
            <span className="label !mb-0">3. Listing check karo ya khud likho</span>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="title">Title</label>
                <span className={`text-xs ${title.length > market.titleMax ? "font-medium text-red-600" : "text-muted"}`}>
                  {title.length} / {market.titleMax}
                </span>
              </div>
              <input
                id="title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Listing ka title"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="desc">Description</label>
                <span className="text-xs text-muted">{wordCount} alfaaz</span>
              </div>
              <textarea
                id="desc"
                rows={6}
                className="input resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Listing ki description"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="tags">Tags (comma se alag karo)</label>
                <span className={`text-xs ${tagCount > market.tags ? "font-medium text-red-600" : "text-muted"}`}>
                  {tagCount} / {market.tags}
                </span>
              </div>
              <textarea
                id="tags"
                rows={3}
                className="input resize-y"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="leather wallet, mens wallet, gift for him"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="kw">
                Target keywords (optional)
              </label>
              <input
                id="kw"
                className="input"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="leather wallet, gift for him"
              />
              <p className="mt-1.5 text-xs text-muted">Pehla keyword main keyword maana jata hai.</p>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary w-full">
            {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {analyzing ? "Check ho raha hai..." : "Analyze Karo"}
          </button>
        </div>

        <div>
          {!result && (
            <div className="card flex min-h-80 flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Search size={22} />
              </span>
              <p className="mt-4 font-semibold">Aap ka score yahan dikhega</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                Link se Fetch karo ya listing khud likho, phir Analyze Karo dabao.
              </p>
            </div>
          )}

          {result && counts && (
            <div className="space-y-4">
              <div className="card flex flex-col items-center gap-6 sm:flex-row">
                <ScoreRing score={result.score} />
                <div className="text-center sm:text-left">
                  <p className={`text-2xl font-bold ${tone(result.score).text}`}>{result.grade}</p>
                  <p className="mt-1 text-sm text-muted">
                    {market.label} ke rules ke hisab se {result.checks.length} cheezein check hui hain.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {counts.pass} theek
                    </span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      {counts.warn} behtar ho sakta hai
                    </span>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      {counts.fail} masla
                    </span>
                  </div>
                </div>
              </div>

              <div className="card divide-y divide-line !p-0">
                {result.checks.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 px-5 py-4">
                    <StatusIcon status={c.status} />
                    <div>
                      <p className="text-sm font-semibold">{c.label}</p>
                      <p className="mt-0.5 text-sm text-muted">{c.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}