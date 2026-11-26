export const API_URL = "http://127.0.0.1:8000";

// Login ka token har request ke saath bhejne ke liye
function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Agar token galat ya purana ho to wapas login par bhejo
function checkAuth(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session khatam ho gaya, dobara login karo");
  }
}

export async function signup(email: string, password: string) {
  const res = await fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Signup fail ho gaya");
  return data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login fail ho gaya");
  localStorage.setItem("token", data.access_token);
  return data;
}

export async function generateListing(
  image: File,
  marketplace: string,
  keywords: string
) {
  const form = new FormData();
  form.append("image", image);
  form.append("marketplace", marketplace);
  form.append("keywords", keywords);

  const res = await fetch(`${API_URL}/generate-listing`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  checkAuth(res);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Listing nahi ban saki");
  return data;
}

export async function resizeImages(
  images: File[],
  platforms: string[],
  customWidth: number,
  customHeight: number,
  fit: string,
  bgColor: string,
  fmt: string,
  quality: number,
  removeBg: boolean
) {
  const form = new FormData();
  images.forEach((img) => form.append("images", img));
  form.append("platforms", platforms.join(","));
  form.append("custom_width", String(customWidth));
  form.append("custom_height", String(customHeight));
  form.append("fit", fit);
  form.append("bg_color", bgColor);
  form.append("fmt", fmt);
  form.append("quality", String(quality));
  form.append("remove_bg", String(removeBg));

  const res = await fetch(`${API_URL}/resize`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  checkAuth(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Resize nahi ho saka");
  }
  return await res.blob();
}

export async function vectorizeImage(
  image: File,
  colors: number,
  detail: string
) {
  const form = new FormData();
  form.append("image", image);
  form.append("colors", String(colors));
  form.append("detail", detail);

  const res = await fetch(`${API_URL}/vectorize`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  checkAuth(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Vector nahi ban saka");
  }
  return await res.blob();
}

export type Check = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  points: number;
  tip: string;
};

export type AnalysisResult = {
  score: number;
  grade: string;
  marketplace: string;
  checks: Check[];
};

export type FetchedListing = {
  title: string;
  description: string;
  tags: string[];
  missing: string[];
};

export async function fetchListing(
  marketplace: string,
  url: string
): Promise<FetchedListing> {
  const res = await fetch(`${API_URL}/fetch-listing`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ marketplace, url }),
  });
  checkAuth(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Listing nahi mil saki");
  return data;
}

export async function analyzeListing(
  marketplace: string,
  title: string,
  description: string,
  tags: string[],
  keywords: string[]
): Promise<AnalysisResult> {
  const res = await fetch(`${API_URL}/analyze-listing`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ marketplace, title, description, tags, keywords }),
  });
  checkAuth(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Analyze nahi ho saka");
  return data;
}

export async function createMockup(
  image: File,
  scene: string,
  wallColor: string,
  frameColor: string
) {
  const form = new FormData();
  form.append("image", image);
  form.append("scene", scene);
  form.append("wall_color", wallColor);
  form.append("frame_color", frameColor);

  const res = await fetch(`${API_URL}/mockup`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  checkAuth(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Mockup nahi ban saka");
  }
  return await res.blob();
}

export type ScrapedProduct = {
  id: string;
  title: string;
  price: number | null;
  compare_at_price: number | null;
  currency: string;
  url: string;
  image: string;
  images: string[];
  description: string;
  tags: string[];
  category: string;
  brand: string;
  sku: string;
  in_stock: boolean | null;
};

export type ScrapeSummary = {
  overview: string;
  stats: {
    product_count: number;
    currency: string;
    avg_price: number | null;
    median_price: number | null;
    min_price: number | null;
    max_price: number | null;
    on_sale: number;
    out_of_stock: number;
    avg_title_length: number;
    avg_description_words: number;
  };
  points: { type: "info" | "warn"; text: string }[];
  categories: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  top_tags: { name: string; count: number }[];
  top_keywords: { word: string; count: number }[];
  price_buckets: { label: string; count: number }[];
  cheapest: { title: string; price: number | null; url: string; image: string } | null;
  priciest: { title: string; price: number | null; url: string; image: string } | null;
};

export type ScrapeResult = {
  platform: string;
  store: { name: string; url: string; domain: string; currency?: string };
  products: ScrapedProduct[];
  summary: ScrapeSummary;
};

export type SavedScrapeRow = {
  id: number;
  store_name: string;
  store_url: string;
  platform: string;
  product_count: number;
  created_at: string;
};

async function apiJson<T>(path: string, options: RequestInit, fallback: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  checkAuth(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : fallback);
  }
  return data as T;
}

export function scrapeStore(url: string) {
  return apiJson<ScrapeResult>(
    "/scrape",
    { method: "POST", body: JSON.stringify({ url }) },
    "Store scrape nahi ho saka"
  );
}

export function saveScrape(r: ScrapeResult) {
  return apiJson<{ id: number }>(
    "/scrapes",
    {
      method: "POST",
      body: JSON.stringify({
        store: r.store,
        platform: r.platform,
        products: r.products,
        summary: r.summary,
      }),
    },
    "Save nahi ho saka"
  );
}

export function listScrapes() {
  return apiJson<SavedScrapeRow[]>("/scrapes", {}, "Saved list nahi mil saki");
}

export function getScrape(id: number) {
  return apiJson<ScrapeResult>(`/scrapes/${id}`, {}, "Yeh scrape nahi khul saka");
}

export function deleteScrape(id: number) {
  return apiJson<{ deleted: boolean }>(`/scrapes/${id}`, { method: "DELETE" }, "Delete nahi ho saka");
}

export type KeywordItem = {
  keyword: string;
  score: number;
  sources: string[];
  words: number;
  kind: "question" | "long-tail" | "short";
  fits_etsy_tag: boolean;
};

export type KeywordResult = {
  seed: string;
  mode: "quick" | "deep";
  total: number;
  long_tail: number;
  questions: number;
  etsy_fit: number;
  sources: Record<
    string,
    { status: "ok" | "failed"; ok: number; failed: number; found: number; error: string }
  >;
  keywords: KeywordItem[];
  groups: Record<string, string[]>;
  modifiers: { word: string; count: number }[];
};

export function researchKeywords(seed: string, sources: string[], mode: "quick" | "deep") {
  return apiJson<KeywordResult>(
    "/keywords",
    { method: "POST", body: JSON.stringify({ seed, sources, mode }) },
    "Research nahi ho saka"
  );
}

export async function createVideo(
  images: File[],
  aspect: string,
  seconds: number,
  transition: string,
  motion: boolean,
  fit: string,
  caption: string
) {
  const form = new FormData();
  images.forEach((img) => form.append("images", img));
  form.append("aspect", aspect);
  form.append("seconds", String(seconds));
  form.append("transition", transition);
  form.append("motion", String(motion));
  form.append("fit", fit);
  form.append("caption", caption);

  const res = await fetch(`${API_URL}/video`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  checkAuth(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Video nahi ban saki");
  }
  return await res.blob();
}