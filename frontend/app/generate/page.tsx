"use client";
import { useState } from "react";
import { generateListing } from "@/lib/api";

type Listing = {
  title: string;
  short_description: string;
  description: string;
  tags: string[];
  attributes: Record<string, string>;
  marketplace: string;
};

export default function GeneratePage() {
  const [image, setImage] = useState<File | null>(null);
  const [marketplace, setMarketplace] = useState("etsy");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Listing | null>(null);

  async function handleGenerate() {
    if (!image) {
      setError("Pehle photo chuno");
      return;
    }
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

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Listing Generator</h1>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => setImage(e.target.files?.[0] ?? null)}
        className="mb-3 block"
      />

      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={URL.createObjectURL(image)}
          alt="preview"
          className="mb-3 h-40 rounded border object-contain"
        />
      )}

      <select
        value={marketplace}
        onChange={(e) => setMarketplace(e.target.value)}
        className="mb-3 block w-full rounded border p-2 text-black"
      >
        <option value="etsy">Etsy</option>
        <option value="amazon">Amazon</option>
        <option value="ebay">eBay</option>
        <option value="shopify">Shopify</option>
      </select>

      <input
        placeholder="Keywords (optional), jaise: handmade gift"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        className="mb-3 w-full rounded border p-2 text-black"
      />

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
      >
        {loading ? "AI listing bana raha hai... (thora intezar)" : "Listing Banao"}
      </button>

      {error && <p className="mt-3 text-red-500">{error}</p>}

      {result && (
        <section className="mt-8 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Title ({result.title.length} characters)
              </h2>
              <button onClick={() => copy(result.title)} className="text-sm text-blue-500">
                Copy
              </button>
            </div>
            <p className="mt-1">{result.title}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Description</h2>
              <button onClick={() => copy(result.description)} className="text-sm text-blue-500">
                Copy
              </button>
            </div>
            <p className="mt-1 whitespace-pre-line">{result.description}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Tags ({result.tags.length})</h2>
              <button onClick={() => copy(result.tags.join(", "))} className="text-sm text-blue-500">
                Copy
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.tags.map((t) => (
                <span key={t} className="rounded-full border px-3 py-1 text-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold">Attributes</h2>
            <ul className="mt-1 text-sm">
              {Object.entries(result.attributes).map(([k, v]) => (
                <li key={k}>
                  <b>{k}:</b> {v}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
