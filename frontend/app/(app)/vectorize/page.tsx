"use client";
import { useState } from "react";
import { vectorizeImage } from "@/lib/api";

export default function VectorPage() {
  const [image, setImage] = useState<File | null>(null);
  const [colors, setColors] = useState(8);
  const [detail, setDetail] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [svgUrl, setSvgUrl] = useState("");

  async function handleConvert() {
    if (!image) return setError("Pehle photo chuno");
    setError("");
    setSvgUrl("");
    setLoading(true);
    try {
      const blob = await vectorizeImage(image, colors, detail);
      setSvgUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Vector Converter (SVG)</h1>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => setImage(e.target.files?.[0] ?? null)}
        className="mb-4 block"
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <label>
          Colours: {colors}
          <input
            type="range"
            min={2}
            max={16}
            value={colors}
            onChange={(e) => setColors(Number(e.target.value))}
            className="block w-full"
          />
        </label>
        <label>
          Detail
          <select
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="block w-full rounded border p-2 text-black"
          >
            <option value="low">Low (simple)</option>
            <option value="medium">Medium</option>
            <option value="high">High (zyada detail)</option>
          </select>
        </label>
      </div>

      <button
        onClick={handleConvert}
        disabled={loading}
        className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
      >
        {loading ? "Vector ban raha hai..." : "SVG Banao"}
      </button>
      {error && <p className="mt-3 text-red-500">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4">
        {image && (
          <div>
            <h2 className="mb-1 font-semibold">Original</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(image)}
              alt="original"
              className="h-64 w-full rounded border bg-white object-contain"
            />
          </div>
        )}
        {svgUrl && (
          <div>
            <h2 className="mb-1 font-semibold">SVG Vector</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={svgUrl}
              alt="svg"
              className="h-64 w-full rounded border bg-white object-contain"
            />
            <a
              href={svgUrl}
              download="vector.svg"
              className="mt-2 inline-block rounded bg-green-600 px-4 py-2 text-white"
            >
              SVG Download
            </a>
          </div>
        )}
      </div>
    </main>
  );
}