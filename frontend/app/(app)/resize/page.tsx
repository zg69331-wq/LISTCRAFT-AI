"use client";
import { useMemo, useState } from "react";
import { Check, Download, Loader2, UploadCloud, X } from "lucide-react";
import { resizeImages } from "@/lib/api";

const PLATFORMS = [
  { id: "etsy", label: "Etsy", size: "2000 × 2000" },
  { id: "amazon", label: "Amazon", size: "2000 × 2000, white background" },
  { id: "ebay", label: "eBay", size: "1600 × 1600" },
  { id: "shopify", label: "Shopify", size: "2048 × 2048" },
  { id: "woocommerce", label: "WooCommerce", size: "800 × 800" },
];

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILES = 20;
const MAX_MB = 8;

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
            value === o.id
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-line bg-white text-muted hover:bg-canvas"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ResizePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(["etsy"]);
  const [cw, setCw] = useState(0);
  const [ch, setCh] = useState(0);
  const [fit, setFit] = useState("pad");
  const [bg, setBg] = useState("#ffffff");
  const [fmt, setFmt] = useState("jpg");
  const [quality, setQuality] = useState(90);
  const [removeBg, setRemoveBg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files]
  );

  function addFiles(incoming: File[]) {
    setError("");
    setDone(false);
    const typeOk = incoming.filter((f) => ALLOWED.includes(f.type));
    const valid = typeOk.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    const merged = [...files, ...valid];

    const notes: string[] = [];
    if (typeOk.length < incoming.length) notes.push("Sirf JPG, PNG ya WebP allowed hain");
    if (valid.length < typeOk.length) notes.push(`${MAX_MB} MB se badi photos hata di gayin`);
    if (merged.length > MAX_FILES) notes.push(`Ek baar mein sirf ${MAX_FILES} photos`);

    setFiles(merged.slice(0, MAX_FILES));
    if (notes.length) setError(notes.join(". "));
  }

  function removeFile(index: number) {
    setFiles((f) => f.filter((_, i) => i !== index));
    setDone(false);
  }

  function togglePlatform(id: string) {
    setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function handleResize() {
    if (files.length === 0) return setError("Pehle photos chuno");
    if ((cw > 0) !== (ch > 0))
      return setError("Custom size ke liye width aur height dono do");
    if (platforms.length === 0 && !(cw > 0 && ch > 0))
      return setError("Kam az kam ek platform ya custom size chuno");

    setError("");
    setDone(false);
    setLoading(true);
    try {
      const blob = await resizeImages(files, platforms, cw, ch, fit, bg, fmt, quality, removeBg);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resized-images.zip";
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight">Bulk Image Resizer</h1>
      <p className="mt-2 text-sm text-muted">
        Ek saath kai photos ko marketplace ke size mein badlo aur ZIP download karo.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(Array.from(e.dataTransfer.files));
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface px-4 py-12 text-center transition hover:border-brand-500"
          >
            <UploadCloud className="text-brand-600" size={32} />
            <p className="mt-3 font-medium">Photos yahan drop karo ya click karo</p>
            <p className="mt-1 text-xs text-muted">
              JPG, PNG ya WebP, {MAX_MB} MB tak, ek baar mein {MAX_FILES} photos
            </p>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>

          {files.length > 0 && (
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {files.length} / {MAX_FILES} photos
                </p>
                <button
                  onClick={() => {
                    setFiles([]);
                    setDone(false);
                  }}
                  className="text-sm font-medium text-muted hover:text-ink"
                >
                  Sab hatao
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {previews.map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-canvas"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      aria-label={`${p.name} hatao`}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card h-fit space-y-6 lg:sticky lg:top-6">
          <div>
            <span className="label">Platforms</span>
            <div className="space-y-2">
              {PLATFORMS.map((p) => {
                const on = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                      on
                        ? "border-brand-500 bg-brand-50"
                        : "border-line bg-white hover:bg-canvas"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        on
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-line bg-white"
                      }`}
                    >
                      {on && <Check size={13} />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{p.label}</span>
                      <span className="block text-xs text-muted">{p.size}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="label">Custom size (optional)</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                placeholder="Width (px)"
                value={cw || ""}
                onChange={(e) => setCw(Number(e.target.value))}
                className="input"
              />
              <input
                type="number"
                min={0}
                placeholder="Height (px)"
                value={ch || ""}
                onChange={(e) => setCh(Number(e.target.value))}
                className="input"
              />
            </div>
          </div>

          <div>
            <span className="label">Fit</span>
            <Segmented
              value={fit}
              onChange={setFit}
              options={[
                { id: "pad", label: "Pad" },
                { id: "crop", label: "Crop" },
              ]}
            />
            <p className="mt-1.5 text-xs text-muted">
              Pad: poori photo dikhti hai. Crop: canvas poora bharta hai.
            </p>
          </div>

          <div>
            <span className="label">Format</span>
            <Segmented
              value={fmt}
              onChange={setFmt}
              options={[
                { id: "jpg", label: "JPG" },
                { id: "png", label: "PNG" },
                { id: "webp", label: "WebP" },
              ]}
            />
          </div>

          <div>
            <label className="label" htmlFor="bg">
              Background rang
            </label>
            <div className="flex items-center gap-3">
              <input
                id="bg"
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-white p-1"
              />
              <span className="font-mono text-sm text-muted">{bg}</span>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="quality">
              Quality: {quality}
            </label>
            <input
              id="quality"
              type="range"
              min={40}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-canvas px-3.5 py-3">
            <div>
              <p className="text-sm font-medium">Background hatao</p>
              <p className="text-xs text-muted">AI se, thora slow hai</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={removeBg}
              onClick={() => setRemoveBg(!removeBg)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                removeBg ? "bg-brand-600" : "bg-line"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  removeBg ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}
          {done && (
            <p className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
              <Check size={16} /> ZIP download ho gayi
            </p>
          )}

          <button onClick={handleResize} disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {loading
              ? removeBg
                ? "Background hat raha hai..."
                : "Resize ho raha hai..."
              : `Resize aur ZIP Download${files.length ? ` (${files.length})` : ""}`}
          </button>
        </div>
      </div>
    </main>
  );
}