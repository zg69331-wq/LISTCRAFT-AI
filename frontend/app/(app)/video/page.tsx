"use client";
import { useMemo, useState } from "react";
import { Download, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import { createVideo } from "@/lib/api";

const MAX_FILES = 8;
const MAX_MB = 8;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const ASPECTS = [
  { id: "square", label: "Square 1:1", hint: "Etsy, Instagram post" },
  { id: "vertical", label: "Vertical 9:16", hint: "Reels, TikTok, Shorts" },
  { id: "landscape", label: "Landscape 16:9", hint: "YouTube, website" },
];

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
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
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

export default function VideoPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [aspect, setAspect] = useState("square");
  const [seconds, setSeconds] = useState(3);
  const [transition, setTransition] = useState("fade");
  const [fit, setFit] = useState("cover");
  const [motion, setMotion] = useState(true);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  const n = files.length;
  const tr = transition === "none" || n <= 1 ? 0 : Math.min(0.6, seconds / 2);
  const total = n > 0 ? n * seconds - (n - 1) * tr : 0;

  function addFiles(incoming: File[]) {
    setError("");
    const typeOk = incoming.filter((f) => ALLOWED.includes(f.type));
    const sizeOk = typeOk.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    const merged = [...files, ...sizeOk];

    const notes: string[] = [];
    if (typeOk.length < incoming.length) notes.push("Sirf JPG, PNG ya WebP allowed hain");
    if (sizeOk.length < typeOk.length) notes.push(`${MAX_MB} MB se badi photos hata di gayin`);
    if (merged.length > MAX_FILES) notes.push(`Zyada se zyada ${MAX_FILES} photos`);
    setFiles(merged.slice(0, MAX_FILES));
    if (notes.length) setError(notes.join(". "));
  }

  function removeFile(i: number) {
    setFiles((f) => f.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    setFiles((f) => {
      const j = i + dir;
      if (j < 0 || j >= f.length) return f;
      const copy = [...f];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function handleCreate() {
    if (n === 0) return setError("Pehle kam az kam ek photo chuno");
    setError("");
    setLoading(true);
    try {
      const blob = await createVideo(files, aspect, seconds, transition, motion, fit, caption);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 sm:p-10">
      <h1 className="text-3xl font-bold tracking-tight">Video Maker</h1>
      <p className="mt-2 text-sm text-muted">
        Product ki photos se chhoti slideshow video banao, listing ya social media ke liye.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="card space-y-4">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(Array.from(e.dataTransfer.files));
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-canvas px-4 py-10 text-center transition hover:border-brand-500"
            >
              <UploadCloud className="text-brand-600" size={30} />
              <p className="mt-2 text-sm font-medium">Photos yahan drop karo ya click karo</p>
              <p className="mt-1 text-xs text-muted">
                JPG, PNG ya WebP, {MAX_MB} MB tak, zyada se zyada {MAX_FILES} photos
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

            {n > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {n} / {MAX_FILES} photos (tarteeb wahi hogi jo yahan hai)
                  </p>
                  <button onClick={() => setFiles([])} className="text-sm font-medium text-muted hover:text-ink">
                    Sab hatao
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {previews.map((src, i) => (
                    <div key={src} className="overflow-hidden rounded-xl border border-line">
                      <div className="relative aspect-square bg-canvas">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                        <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <button
                          onClick={() => removeFile(i)}
                          aria-label={`Photo ${i + 1} hatao`}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex">
                        <button
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          aria-label="Pehle laao"
                          className="flex-1 py-1.5 text-sm text-muted hover:bg-canvas disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => move(i, 1)}
                          disabled={i === n - 1}
                          aria-label="Baad mein bhejo"
                          className="flex-1 border-l border-line py-1.5 text-sm text-muted hover:bg-canvas disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Aap ki video</p>
              {videoUrl && (
                <a href={videoUrl} download="product-video.mp4" className="btn-primary !px-3 !py-1.5">
                  <Download size={14} /> Download MP4
                </a>
              )}
            </div>
            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-canvas text-center">
                <Loader2 size={28} className="animate-spin text-brand-600" />
                <p className="mt-4 font-semibold">Video ban rahi hai...</p>
                <p className="mt-1 px-4 text-sm text-muted">
                  Photos aur length ke hisab se 10 se 40 second lag sakte hain. Page band mat karo.
                </p>
              </div>
            ) : videoUrl ? (
              <video src={videoUrl} controls className="max-h-[70vh] w-full rounded-xl bg-black" />
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-canvas text-center">
                <p className="font-semibold">Video yahan dikhegi</p>
                <p className="mt-1 max-w-xs text-sm text-muted">
                  Photos chuno, settings theek karo aur Video Banao dabao.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card h-fit space-y-6 lg:sticky lg:top-6">
          <div>
            <span className="label">Video ka size</span>
            <div className="space-y-2">
              {ASPECTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAspect(a.id)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                    aspect === a.id ? "border-brand-500 bg-brand-50" : "border-line bg-white hover:bg-canvas"
                  }`}
                >
                  <span className="block text-sm font-medium">{a.label}</span>
                  <span className="block text-xs text-muted">{a.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="secs">
              Har photo kitni der: {seconds} second
            </label>
            <input
              id="secs"
              type="range"
              min={1.5}
              max={6}
              step={0.5}
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            {n > 0 && (
              <p className="mt-1 text-xs text-muted">Video ki lambai takreeban {total.toFixed(1)} second hogi.</p>
            )}
          </div>

          <div>
            <span className="label">Photos ke beech transition</span>
            <Segmented
              value={transition}
              onChange={setTransition}
              options={[
                { id: "fade", label: "Fade" },
                { id: "slide", label: "Slide" },
                { id: "none", label: "Seedha" },
              ]}
            />
          </div>

          <div>
            <span className="label">Photo ka andaaz</span>
            <Segmented
              value={fit}
              onChange={setFit}
              options={[
                { id: "cover", label: "Poori screen" },
                { id: "contain", label: "Poori photo" },
              ]}
            />
            <p className="mt-1.5 text-xs text-muted">
              Poori screen: photo kinaron se kat sakti hai. Poori photo: peeche dhundla background aata hai.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl bg-canvas px-3.5 py-3">
            <div>
              <p className="text-sm font-medium">Halka zoom</p>
              <p className="text-xs text-muted">Har photo mein dheere se zoom</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={motion}
              onClick={() => setMotion(!motion)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${motion ? "bg-brand-600" : "bg-line"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  motion ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="cap">
                Likhai (optional)
              </label>
              <span className="text-xs text-muted">{caption.length} / 60</span>
            </div>
            <input
              id="cap"
              className="input"
              maxLength={60}
              placeholder="jaise: Handmade Leather Wallet"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
          )}

          <button onClick={handleCreate} disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Video ban rahi hai..." : "Video Banao"}
          </button>
        </div>
      </div>
    </main>
  );
}