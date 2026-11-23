"use client";
import { useMemo, useState } from "react";
import { Check, Copy, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { generateListing } from "@/lib/api";

type Listing = {
  title: string;
  short_description: string;
  description: string;
  tags: string[];
  attributes: Record<string, string>;
  marketplace: string;
};

const MARKETS = [
  { id: "etsy", label: "Etsy", titleMax: 140 },
  { id: "amazon", label: "Amazon", titleMax: 200 },
  { id: "ebay", label: "eBay", titleMax: 80 },
  { id: "shopify", label: "Shopify", titleMax: 70 },
];

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button onClick={handleCopy} className="btn-secondary !px-3 !py-1.5">
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[80, 160, 60].map((h, i) => (
        <div key={i} className="card animate-pulse">
          <div className="h-4 w-32 rounded bg-canvas" />
          <div className="mt-4 rounded-xl bg-canvas" style={{ height: h }} />
        </div>
      ))}
    </div>
  );
}

export default function GeneratePage() {
  const [image, setImage] = useState<File | null>(null);
  const [marketplace, setMarketplace] = useState("etsy");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Listing | null>(null);

  const preview = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image]
  );

  function pick(file: File | null) {
    setImage(file);
    setError("");
  }

  async function handleGenerate() {
    if (!image) return setError("Pehle product ki photo chuno");
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await generateListing(image, marketplace, keywords);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const titleMax =
    MARKETS.find((m) => m.id === result?.marketplace)?.titleMax ?? 140;

  const allText = result
    ? `${result.title}\n\n${result.description}\n\nTags: ${result.tags.join(", ")}`
    : "";

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight">Listing Generator</h1>
      <p className="mt-2 text-sm text-muted">
        Product ki photo do aur marketplace ke rules ke mutabiq poori listing pao.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="card h-fit space-y-6">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-canvas text-center transition hover:border-brand-500"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Product preview"
                className="h-56 w-full object-contain"
              />
            ) : (
              <div className="px-4 py-10">
                <UploadCloud className="mx-auto text-brand-600" size={28} />
                <p className="mt-2 text-sm font-medium">
                  Photo yahan drop karo ya click karo
                </p>
                <p className="mt-1 text-xs text-muted">
                  JPG, PNG ya WebP (8 MB tak)
                </p>
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </label>
          {image && (
            <p className="-mt-3 truncate text-xs text-muted">
              {image.name} (photo badalne ke liye dobara click karo)
            </p>
          )}

          <div>
            <span className="label">Marketplace</span>
            <div className="grid grid-cols-2 gap-2">
              {MARKETS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMarketplace(m.id)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
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
            <label className="label" htmlFor="keywords">
              Keywords (optional)
            </label>
            <input
              id="keywords"
              className="input"
              placeholder="jaise: handmade gift, leather wallet"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {loading ? "AI listing bana raha hai..." : "Listing Banao"}
          </button>
        </div>

        <div>
          {loading && <Skeleton />}

          {!loading && !result && (
            <div className="card flex min-h-80 flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Sparkles size={22} />
              </span>
              <p className="mt-4 font-semibold">Aap ki listing yahan dikhegi</p>
              <p className="mt-1 max-w-xs text-sm text-muted">
                Left side par photo chuno aur Listing Banao dabao.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <CopyButton text={allText} label="Copy all" />
              </div>

              <div className="card">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Title</h2>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium ${
                        result.title.length >= titleMax
                          ? "text-red-600"
                          : "text-muted"
                      }`}
                    >
                      {result.title.length} / {titleMax}
                    </span>
                    <CopyButton text={result.title} />
                  </div>
                </div>
                <p className="mt-3 leading-relaxed">{result.title}</p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Description</h2>
                  <CopyButton text={result.description} />
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
                  {result.description}
                </p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Tags ({result.tags.length})</h2>
                  <CopyButton text={result.tags.join(", ")} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="font-semibold">Attributes</h2>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {Object.entries(result.attributes).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-canvas px-3.5 py-2.5">
                      <p className="text-xs capitalize text-muted">
                        {k.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-sm font-medium">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}