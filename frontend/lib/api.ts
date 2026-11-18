export const API_URL = "http://127.0.0.1:8000";

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
    body: form,
  });
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

  const res = await fetch(`${API_URL}/resize`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Resize nahi ho saka");
  }
  return await res.blob();
}

