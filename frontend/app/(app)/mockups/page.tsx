"use client";
import { useMemo, useState } from "react";
import {
  Download,
  ImagePlus,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { createMockup } from "@/lib/api";

const SCENES = [
  { id: "frame", label: "Framed Print", hint: "Deewar par frame, mat ke saath" },
  { id: "poster", label: "Poster", hint: "Tape se lagaya hua poster" },
  { id: "studio", label: "Studio Shot", hint: "Saaf background par product" },
];

const FRAMES = [
  { id: "black", label: "Black", color: "#1e1e20" },
  { id: "white", label: "White", color: "#f6f6f4" },
  { id: "wood", label: "Wood", color: "#9e724a" },
];

const SWATCHES = ["#e9e4dc", "#f3e6d6", "#cfd8dc", "#d9e4f5", "#e8d5d5", "#3a3a3c"];

export default function MockupsPage() {
  const [image, setImage] = useState<File | null>(null);
  const [scene, setScene] = useState("frame");
  const [wall, setWall] = useState("#e9e4dc");
  const [frame, setFrame] = useState("black");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const preview = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image]
  );

  function pick(file: File | null) {
    setImage(file);
    setError("");
  }

  async function handleCreate() {
    if (!image) return setError("Pehle photo chuno");
    setError("");
    setLoading(true);
    try {
      const blob = await createMockup(image, scene, wall, frame);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const bgLabel = scene === "studio" ? "Background rang" : "Deewar ka rang";

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight">Mockup Generator</h1>
      <p className="mt-2 text-sm text-muted">
        Apni artwork ya product photo ko frame, poster ya studio scene mein lagao.
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
              <img src={preview} alt="Artwork" className="h-48 w-full object-contain" />
            ) : (
              <div className="px-4 py-10">
                <UploadCloud className="mx-auto text-brand-600" size={28} />
                <p className="mt-2 text-sm font-medium">
                  Photo yahan drop karo ya click karo
                </p>
                <p className="mt-1 text-xs text-muted">
                  JPG, PNG ya WebP (8 MB tak). Transparent PNG studio scene mein behtar lagta hai.
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
              {image.name} (badalne ke liye dobara click karo)
            </p>
          )}

          <div>
            <span className="label">Scene</span>
            <div className="space-y-2">
              {SCENES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScene(s.id)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                    scene === s.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-line bg-white hover:bg-canvas"
                  }`}
                >
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs text-muted">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">{bgLabel}</span>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setWall(c)}
                  style={{ backgroundColor: c }}
                  className={`h-8 w-8 rounded-full border transition ${
                    wall === c ? "ring-2 ring-brand-500 ring-offset-2" : "border-line"
                  }`}
                />
              ))}
              <input
                type="color"
                value={wall}
                onChange={(e) => setWall(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded-lg border border-line bg-white p-0.5"
                aria-label="Apna rang chuno"
              />
            </div>
          </div>

          {scene === "frame" && (
            <div>
              <span className="label">Frame ka rang</span>
              <div className="grid grid-cols-3 gap-2">
                {FRAMES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrame(f.id)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      frame === f.id
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-line bg-white text-muted hover:bg-canvas"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-line"
                      style={{ backgroundColor: f.color }}
                    />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <button onClick={handleCreate} disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Mockup ban raha hai..." : "Mockup Banao"}
          </button>
        </div>

        <div className="card h-fit">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Aap ka mockup</p>
            {resultUrl && (
              <a href={resultUrl} download="mockup.jpg" className="btn-primary !px-3 !py-1.5">
                <Download size={14} /> Download
              </a>
            )}
          </div>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-canvas">
            {resultUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resultUrl} alt="Mockup" className="h-full w-full object-contain" />
            ) : (
              <div className="px-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <ImagePlus size={22} />
                </span>
                <p className="mt-4 font-semibold">Mockup yahan dikhega</p>
                <p className="mt-1 text-sm text-muted">
                  Photo chuno, scene select karo aur Mockup Banao dabao.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
