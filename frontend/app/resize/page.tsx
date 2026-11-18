"use client";
import { useState } from "react";
import { resizeImages } from "@/lib/api";

const PLATFORMS = [
  { id: "etsy", label: "Etsy (2000x2000)" },
  { id: "amazon", label: "Amazon (2000x2000, white)" },
  { id: "ebay", label: "eBay (1600x1600)" },
  { id: "shopify", label: "Shopify (2048x2048)" },
  { id: "woocommerce", label: "WooCommerce (800x800)" },
];

export default function ResizePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(["etsy"]);
  const [cw, setCw] = useState(0);
  const [ch, setCh] = useState(0);
  const [fit, setFit] = useState("pad");
  const [bg, setBg] = useState("#ffffff");
  const [fmt, setFmt] = useState("jpg");
  const [quality, setQuality] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [removeBg, setRemoveBg] = useState(false);

  function toggle(id: string) {
    setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function handleResize() {
    if (files.length === 0) return setError("Pehle photos chuno");
    setError("");
    setLoading(true);
    try {
      const blob = await resizeImages(files, platforms, cw, ch, fit, bg, fmt, quality, removeBg);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resized-images.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Bulk Image Resizer</h1>

      <input
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        className="mb-2 block"
      />
      <p className="mb-4 text-sm">{files.length} photos chuni gayin</p>

      <h2 className="mb-2 font-semibold">Platforms</h2>
      <div className="mb-4 space-y-1">
        {PLATFORMS.map((p) => (
          <label key={p.id} className="block">
            <input
              type="checkbox"
              checked={platforms.includes(p.id)}
              onChange={() => toggle(p.id)}
              className="mr-2"
            />
            {p.label}
          </label>
        ))}
      </div>

      <h2 className="mb-2 font-semibold">Custom size (optional)</h2>
      <div className="mb-4 flex gap-2">
        <input
          type="number"
          placeholder="Width"
          value={cw || ""}
          onChange={(e) => setCw(Number(e.target.value))}
          className="w-1/2 rounded border p-2 text-black"
        />
        <input
          type="number"
          placeholder="Height"
          value={ch || ""}
          onChange={(e) => setCh(Number(e.target.value))}
          className="w-1/2 rounded border p-2 text-black"
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <label>
          Fit
          <select value={fit} onChange={(e) => setFit(e.target.value)} className="block w-full rounded border p-2 text-black">
            <option value="pad">Pad (poori photo dikhe)</option>
            <option value="crop">Crop (canvas bhare)</option>
          </select>
        </label>
        <label>
          Format
          <select value={fmt} onChange={(e) => setFmt(e.target.value)} className="block w-full rounded border p-2 text-black">
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
        <label>
          Background rang
          <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="block h-10 w-full" />
        </label>
        <label>
          Quality: {quality}
          <input type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="block w-full" />
        </label>
      </div>
            <label className="mb-4 block">
        <input
          type="checkbox"
          checked={removeBg}
          onChange={(e) => setRemoveBg(e.target.checked)}
          className="mr-2"
        />
        Background hatao (AI, thora slow hai)
      </label>


      <button
        onClick={handleResize}
        disabled={loading}
        className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
      >
        {loading ? "Resize ho raha hai..." : "Resize Karo aur ZIP Download Karo"}
      </button>
      {error && <p className="mt-3 text-red-500">{error}</p>}
    </main>
  );
}

