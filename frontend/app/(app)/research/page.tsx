"use client";
import { useMemo, useState } from "react";
import { Check, Copy, Download, Loader2, Search } from "lucide-react";
import { researchKeywords, type KeywordItem, type KeywordResult } from "@/lib/api";

const SOURCES = [
  { id: "google", label: "Google" },
  { id: "amazon", label: "Amazon" },
  { id: "ebay", label: "eBay" },
  { id: "etsy", label: "Etsy" },
];

const KIND_FILTERS = [
  { id: "all", label: "Sab" },
  { id: "short", label: "Chhote" },
  { id: "long-tail", label: "Long-tail" },
  { id: "question", label: "Sawal" },
];

function csvCell(value: unknown) {
  let s = Array.isArray(value) ? value.join(" / ") : value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(result: KeywordResult) {
  const header = ["Keyword", "Score", "Type", "Words", "Fits Etsy tag (20 chars)", "Sources"];
  const lines = [
    header.map(csvCell).join(","),
    ...result.keywords.map((k) =>
      [k.keyword, k.score, k.kind, k.words, k.fits_etsy_tag ? "yes" : "no", k.sources].map(csvCell).join(",")
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `keywords-${result.seed.replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

export default function ResearchPage() {
  const [seed, setSeed] = useState("");
  const [sources, setSources] = useState<string[]>(["google", "amazon", "ebay", "etsy"]);
  const [mode, setMode] = useState<"quick" | "deep">("quick");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [kind, setKind] = useState("all");
  const [etsyOnly, setEtsyOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(40);

  const filtered: KeywordItem[] = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    return result.keywords.filter(
      (k) =>
        (kind === "all" || k.kind === kind) &&
        (!etsyOnly || k.fits_etsy_tag) &&
        (!q || k.keyword.includes(q))
    );
  }, [result, kind, etsyOnly, query]);

  function toggleSource(id: string) {
    setSources((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleKeyword(k: string) {
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  }

  async function handleResearch() {
    if (seed.trim().length < 2) return setError("Pehle koi keyword likho (jaise leather wallet)");
    if (sources.length === 0) return setError("Kam az kam ek source chuno");
    setError("");
    setResult(null);
    setSelected([]);
    setKind("all");
    setEtsyOnly(false);
    setQuery("");
    setVisible(40);
    setLoading(true);
    try {
      setResult(await researchKeywords(seed, sources, mode));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copySelected() {
    try {
      await navigator.clipboard.writeText(selected.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy nahi ho saka, browser ne rok diya");
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight">Keyword Research</h1>
      <p className="mt-2 text-sm text-muted">
        Ek keyword likho aur Google, Amazon, eBay aur Etsy ki search suggestions se naye keyword ideas pao.
      </p>

      <div className="card mt-8 space-y-5">
        <div>
          <label className="label" htmlFor="seed">
            Keyword
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="seed"
              className="input"
              placeholder="jaise: leather wallet"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            />
            <button onClick={handleResearch} disabled={loading} className="btn-primary shrink-0">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {loading ? "Research ho raha hai..." : "Research Karo"}
            </button>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="label">Sources</span>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSource(s.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    sources.includes(s.id)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-line bg-white text-muted hover:bg-canvas"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Research ka tareeqa</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "quick", label: "Quick", hint: "Kam waqt, mukhtasar list" },
                { id: "deep", label: "Deep", hint: "A se Z tak, bohat zyada ideas (slow)" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id as "quick" | "deep")}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    mode === m.id ? "border-brand-500 bg-brand-50" : "border-line bg-white hover:bg-canvas"
                  }`}
                >
                  <span className="block text-sm font-medium">{m.label}</span>
                  <span className="block text-xs text-muted">{m.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted">
          Yeh suggestions un sites ki search box se aate hain. Asli search volume ke numbers is mein nahi hote.
          Score ka matlab hai ke keyword kitne sources mein aur kitne upar aaya.
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
      )}

      {loading && (
        <div className="card mt-6 flex min-h-60 flex-col items-center justify-center text-center">
          <Loader2 size={28} className="animate-spin text-brand-600" />
          <p className="mt-4 font-semibold">Suggestions jama ho rahi hain...</p>
          <p className="mt-1 text-sm text-muted">
            {mode === "deep" ? "Deep mode mein 20 se 40 second lag sakte hain." : "Kuch seconds lag sakte hain."}
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="mt-6 space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-2 text-lg font-bold">&ldquo;{result.seed}&rdquo;</h2>
              {Object.entries(result.sources).map(([name, s]) => (
                <span
                  key={name}
                  title={s.status === "failed" ? s.error || "Jawab nahi aaya" : ""}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    s.status === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {name}: {s.status === "ok" ? `${s.found} mile` : "nahi chala"}
                </span>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile label="Total keywords" value={String(result.total)} />
              <Tile label="Long-tail (4+ alfaaz)" value={String(result.long_tail)} />
              <Tile label="Sawal" value={String(result.questions)} />
              <Tile label="Etsy tag fit (20 chars)" value={String(result.etsy_fit)} />
            </div>
            {result.total === 0 && (
              <p className="mt-4 text-sm text-muted">
                Is keyword ke liye koi suggestion nahi mili. Koi aur keyword ya Deep mode try karo.
              </p>
            )}
          </div>

          {Object.keys(result.groups).length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {Object.entries(result.groups).map(([name, kws]) => (
                <div key={name} className="card">
                  <h3 className="font-semibold">{name}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {kws.map((k) => (
                      <button
                        key={k}
                        onClick={() => toggleKeyword(k)}
                        className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                          selected.includes(k)
                            ? "bg-brand-600 text-white"
                            : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.modifiers.length > 0 && (
            <div className="card">
              <h3 className="font-semibold">Aam taur par jore jane wale alfaaz</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.modifiers.map((m) => (
                  <span key={m.word} className="rounded-full bg-canvas px-3 py-1 text-sm font-medium">
                    {m.word} <span className="text-muted">{m.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.total > 0 && (
            <div className="card !p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <h3 className="font-semibold">
                  Keywords ({filtered.length}
                  {filtered.length !== result.total ? ` / ${result.total}` : ""})
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={copySelected} disabled={selected.length === 0} className="btn-secondary !px-3 !py-1.5">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : `Copy selected (${selected.length})`}
                  </button>
                  <button onClick={() => downloadCsv(result)} className="btn-secondary !px-3 !py-1.5">
                    <Download size={14} /> CSV
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
                {KIND_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setKind(f.id);
                      setVisible(40);
                    }}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                      kind === f.id ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-canvas"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setEtsyOnly(!etsyOnly);
                    setVisible(40);
                  }}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                    etsyOnly ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-canvas"
                  }`}
                >
                  Etsy tag fit
                </button>
                <input
                  className="input !w-56 sm:ml-auto"
                  placeholder="Dhoondo..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setVisible(40);
                  }}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-canvas text-xs uppercase text-muted">
                    <tr>
                      <th className="w-10 px-5 py-3" />
                      <th className="px-3 py-3 font-semibold">Keyword</th>
                      <th className="px-3 py-3 font-semibold">Score</th>
                      <th className="px-3 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Sources</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.slice(0, visible).map((k) => (
                      <tr key={k.keyword} className="hover:bg-canvas/60">
                        <td className="px-5 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.includes(k.keyword)}
                            onChange={() => toggleKeyword(k.keyword)}
                            className="h-4 w-4 accent-brand-600"
                            aria-label={`${k.keyword} chuno`}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium">
                          {k.keyword}
                          {k.fits_etsy_tag && (
                            <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                              ETSY TAG
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-canvas">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${k.score}%` }} />
                            </div>
                            <span className="w-7 text-xs text-muted">{k.score}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 capitalize text-muted">{k.kind}</td>
                        <td className="px-5 py-2.5 capitalize text-muted">{k.sources.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length > visible && (
                <div className="border-t border-line p-4 text-center">
                  <button onClick={() => setVisible((v) => v + 40)} className="btn-secondary">
                    Aur dikhao ({filtered.length - visible} baaqi)
                  </button>
                </div>
              )}
              {filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-muted">Koi keyword nahi mila.</p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}