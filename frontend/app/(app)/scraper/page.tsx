"use client";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Download, Globe, Loader2, Search, X } from "lucide-react";
import {
  deleteScrape,
  getScrape,
  listScrapes,
  saveScrape,
  scrapeStore,
  type SavedScrapeRow,
  type ScrapeResult,
  type ScrapedProduct,
} from "@/lib/api";

function money(v: number | null | undefined, cur: string) {
  if (v === null || v === undefined) return "-";
  return `${cur ? cur + " " : ""}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function csvCell(value: unknown) {
  let s = Array.isArray(value) ? value.join(", ") : value === null || value === undefined ? "" : String(value);
  // Excel mein formula ban jane se bachao
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(result: ScrapeResult) {
  const cols: [keyof ScrapedProduct, string][] = [
    ["title", "Title"],
    ["price", "Price"],
    ["compare_at_price", "Compare at price"],
    ["currency", "Currency"],
    ["category", "Category"],
    ["brand", "Brand"],
    ["sku", "SKU"],
    ["in_stock", "In stock"],
    ["tags", "Tags"],
    ["url", "URL"],
    ["image", "Image"],
    ["description", "Description"],
  ];
  const lines = [
    cols.map(([, label]) => csvCell(label)).join(","),
    ...result.products.map((p) => cols.map(([key]) => csvCell(p[key])).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.store.domain || "store"}-products.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Bars({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-muted" title={r.label}>
            {r.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-medium">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

export default function ScraperPage() {
  const [tab, setTab] = useState<"scrape" | "saved">("scrape");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedScrapeRow[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(25);

  const filtered = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    return q ? result.products.filter((p) => p.title.toLowerCase().includes(q)) : result.products;
  }, [result, query]);

  async function handleScrape() {
    if (!url.trim()) return setError("Pehle store ya product ka link paste karo");
    setError("");
    setResult(null);
    setSavedId(null);
    setQuery("");
    setVisible(25);
    setLoading(true);
    try {
      setResult(await scrapeStore(url));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setError("");
    setSaving(true);
    try {
      const r = await saveScrape(result);
      setSavedId(r.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function openSavedTab() {
    setTab("saved");
    setError("");
    setSavedLoading(true);
    try {
      setSaved(await listScrapes());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavedLoading(false);
    }
  }

  async function openSaved(id: number) {
    setError("");
    try {
      const data = await getScrape(id);
      setResult(data);
      setSavedId(id);
      setQuery("");
      setVisible(25);
      setUrl(data.store.url);
      setTab("scrape");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeSaved(id: number) {
    setError("");
    try {
      await deleteScrape(id);
      setSaved((list) => list.filter((s) => s.id !== id));
      if (savedId === id) setSavedId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-xl px-4 py-2 text-sm font-semibold transition ${
      active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-canvas"
    }`;

  const summary = result?.summary;
  const cur = summary?.stats.currency ?? "";

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight">Store Scraper</h1>
      <p className="mt-2 text-sm text-muted">
        Kisi bhi store ka link paste karo, products ki list, summary aur main points pao, aur CSV download karo.
      </p>

      <div className="mt-6 flex gap-2">
        <button onClick={() => setTab("scrape")} className={tabClass(tab === "scrape")}>
          Naya scrape
        </button>
        <button onClick={openSavedTab} className={tabClass(tab === "saved")}>
          Saved
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {tab === "saved" && (
        <div className="card mt-6 !p-0">
          {savedLoading && (
            <p className="flex items-center gap-2 p-6 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" /> Load ho raha hai...
            </p>
          )}
          {!savedLoading && saved.length === 0 && (
            <p className="p-6 text-sm text-muted">Abhi koi scrape save nahi hua.</p>
          )}
          <div className="divide-y divide-line">
            {saved.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.store_name}</p>
                  <p className="truncate text-xs text-muted">
                    {s.platform} · {s.product_count} products · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => openSaved(s.id)} className="btn-secondary !px-3 !py-1.5">
                  Open <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => removeSaved(s.id)}
                  aria-label="Delete"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "scrape" && (
        <>
          <div className="card mt-6">
            <label className="label" htmlFor="url">
              Store ya product ka link
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="url"
                className="input"
                placeholder="https://yourstore.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              />
              <button onClick={handleScrape} disabled={loading} className="btn-primary shrink-0">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {loading ? "Scan ho raha hai..." : "Scrape Karo"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Shopify, WooCommerce aur WordPress stores sab se achha chalte hain. Amazon, eBay, Etsy, Alibaba aur
              AliExpress bots ko rokte hain, un ke liye kisi ek product ka link try karo.
            </p>
          </div>

          {!result && !loading && (
            <div className="card mt-6 flex min-h-60 flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Globe size={22} />
              </span>
              <p className="mt-4 font-semibold">Store ka data yahan dikhega</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Link paste karo aur Scrape Karo dabao. Summary, main points aur products ki list aa jayegi.
              </p>
            </div>
          )}

          {loading && (
            <div className="card mt-6 flex min-h-60 flex-col items-center justify-center text-center">
              <Loader2 size={28} className="animate-spin text-brand-600" />
              <p className="mt-4 font-semibold">Store scan ho raha hai...</p>
              <p className="mt-1 text-sm text-muted">Kuch seconds lag sakte hain.</p>
            </div>
          )}

          {result && summary && !loading && (
            <div className="mt-6 space-y-6">
              <div className="card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold">{result.store.name}</h2>
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                        {result.platform}
                      </span>
                    </div>
                    <a
                      href={result.store.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-muted hover:text-brand-600"
                    >
                      {result.store.domain}
                    </a>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed">{summary.overview}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => downloadCsv(result)} className="btn-secondary">
                      <Download size={16} /> CSV
                    </button>
                    <button onClick={handleSave} disabled={saving || savedId !== null} className="btn-primary">
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : savedId !== null ? (
                        <Check size={16} />
                      ) : null}
                      {savedId !== null ? "Saved" : "Save karo"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Tile label="Products" value={String(summary.stats.product_count)} />
                  <Tile label="Average price" value={money(summary.stats.avg_price, cur)} />
                  <Tile
                    label="Price range"
                    value={
                      summary.stats.min_price === null
                        ? "-"
                        : `${money(summary.stats.min_price, "")} - ${money(summary.stats.max_price, cur)}`
                    }
                  />
                  <Tile label="Sale par" value={String(summary.stats.on_sale)} />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="card">
                  <h3 className="font-semibold">Main points</h3>
                  <ul className="mt-4 space-y-3">
                    {summary.points.map((p, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            p.type === "warn" ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-700"
                          }`}
                        >
                          {p.type === "warn" ? "!" : "i"}
                        </span>
                        <span className="leading-relaxed">{p.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-6">
                  {summary.top_keywords.length > 0 && (
                    <div className="card">
                      <h3 className="font-semibold">Titles ke top keywords</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {summary.top_keywords.map((k) => (
                          <span
                            key={k.word}
                            className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
                          >
                            {k.word} <span className="text-brand-500">{k.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {summary.categories.length > 0 && (
                    <div className="card">
                      <h3 className="mb-3 font-semibold">Categories</h3>
                      <Bars rows={summary.categories.map((c) => ({ label: c.name, count: c.count }))} />
                    </div>
                  )}
                  {summary.price_buckets.length > 0 && (
                    <div className="card">
                      <h3 className="mb-3 font-semibold">Price ka phailao {cur && `(${cur})`}</h3>
                      <Bars rows={summary.price_buckets} />
                    </div>
                  )}
                </div>
              </div>

              {(summary.cheapest || summary.priciest) && result.products.length > 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: "Sab se sasta", item: summary.cheapest },
                    { label: "Sab se mehnga", item: summary.priciest },
                  ].map(
                    ({ label, item }) =>
                      item && (
                        <a
                          key={label}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="card flex items-center gap-4 transition hover:border-brand-500"
                        >
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                          ) : (
                            <div className="h-16 w-16 rounded-xl bg-canvas" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs text-muted">{label}</p>
                            <p className="truncate font-semibold">{item.title}</p>
                            <p className="text-sm text-brand-700">{money(item.price, cur)}</p>
                          </div>
                        </a>
                      )
                  )}
                </div>
              )}

              <div className="card !p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <h3 className="font-semibold">
                    Products ({filtered.length}
                    {filtered.length !== result.products.length ? ` / ${result.products.length}` : ""})
                  </h3>
                  <input
                    className="input !w-64"
                    placeholder="Title mein dhoondo..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setVisible(25);
                    }}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-canvas text-xs uppercase text-muted">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Product</th>
                        <th className="px-3 py-3 font-semibold">Price</th>
                        <th className="px-3 py-3 font-semibold">Category</th>
                        <th className="px-3 py-3 font-semibold">Tags</th>
                        <th className="px-5 py-3 font-semibold">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filtered.slice(0, visible).map((p) => (
                        <tr key={p.id + p.url}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {p.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                              ) : (
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-canvas" />
                              )}
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noreferrer"
                                className="line-clamp-2 font-medium hover:text-brand-600"
                              >
                                {p.title}
                              </a>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {money(p.price, p.currency || cur)}
                            {p.compare_at_price && (
                              <span className="ml-1.5 text-xs text-muted line-through">
                                {money(p.compare_at_price, "")}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-muted">{p.category || "-"}</td>
                          <td className="px-3 py-3 text-muted">{p.tags.length}</td>
                          <td className="px-5 py-3 text-muted">
                            {p.in_stock === null ? "-" : p.in_stock ? "Haan" : "Nahi"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filtered.length > visible && (
                  <div className="border-t border-line p-4 text-center">
                    <button onClick={() => setVisible((v) => v + 25)} className="btn-secondary">
                      Aur dikhao ({filtered.length - visible} baaqi)
                    </button>
                  </div>
                )}
                {filtered.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted">Koi product nahi mila.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}