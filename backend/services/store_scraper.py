import re
from urllib.parse import urlparse

from services.listing_fetcher import (
    FetchError,
    _check_public_host,
    _clean_text,
    _get,
    _json_ld_product,
    _meta,
)

MAX_PRODUCTS_LIMIT = 250
GENERIC_PAGE_LIMIT = 20

MARKETPLACES = {
    "amazon.": "Amazon",
    "ebay.": "eBay",
    "etsy.com": "Etsy",
    "alibaba.com": "Alibaba",
    "aliexpress.": "AliExpress",
}


# ---------- Chhote helpers ----------

def _origin(url: str) -> str:
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}"


def _to_float(value):
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def _tag_list(value) -> list[str]:
    if not value:
        return []
    items = value if isinstance(value, list) else str(value).split(",")
    return [str(t).strip() for t in items if str(t).strip()]


def _blank_product() -> dict:
    return {
        "id": "", "title": "", "price": None, "compare_at_price": None,
        "currency": "", "url": "", "image": "", "images": [],
        "description": "", "tags": [], "category": "", "brand": "",
        "sku": "", "in_stock": None,
    }


def _marketplace_name(host: str):
    host = host.lower()
    for key, name in MARKETPLACES.items():
        if key in host:
            return name
    return None


def _json_get(url: str):
    """JSON jawab laata hai, warna None (galat link, block, ya JSON nahi)."""
    resp = _get(url)
    if resp.status_code != 200:
        return None, resp
    try:
        return resp.json(), resp
    except ValueError:
        return None, resp


# ---------- Shopify ----------

def parse_shopify_products(items: list, origin: str) -> list[dict]:
    out = []
    for p in items:
        prod = _blank_product()
        variants = p.get("variants") or []
        prices = [x for x in (_to_float(v.get("price")) for v in variants) if x is not None]
        compares = [x for x in (_to_float(v.get("compare_at_price")) for v in variants) if x]
        images = [i.get("src", "") for i in (p.get("images") or []) if i.get("src")]
        prod.update({
            "id": str(p.get("id", "")),
            "title": (p.get("title") or "").strip(),
            "price": min(prices) if prices else None,
            "compare_at_price": min(compares) if compares else None,
            "url": f"{origin}/products/{p.get('handle', '')}",
            "image": images[0] if images else "",
            "images": images,
            "description": _clean_text(p.get("body_html") or ""),
            "tags": _tag_list(p.get("tags")),
            "category": (p.get("product_type") or "").strip(),
            "brand": (p.get("vendor") or "").strip(),
            "sku": next((v.get("sku") for v in variants if v.get("sku")), "") or "",
            "in_stock": any(v.get("available") for v in variants) if variants else None,
        })
        out.append(prod)
    return out


def scrape_shopify(origin: str, max_products: int):
    products, store = [], {}
    meta, _ = _json_get(f"{origin}/meta.json")
    if isinstance(meta, dict):
        store = {"name": meta.get("name", ""), "currency": meta.get("currency", "")}

    page = 1
    while len(products) < max_products and page <= 5:
        data, _ = _json_get(f"{origin}/products.json?limit=250&page={page}")
        if not isinstance(data, dict) or "products" not in data:
            return None
        items = data["products"]
        if not items:
            break
        products += parse_shopify_products(items, origin)
        if len(items) < 250:
            break
        page += 1

    for p in products:
        p["currency"] = store.get("currency", "")
    return {"platform": "Shopify", "store": store, "products": products[:max_products]}


# ---------- WooCommerce ----------

def parse_woo_products(items: list) -> list[dict]:
    out = []
    for p in items:
        prod = _blank_product()
        prices = p.get("prices") or {}
        minor = prices.get("currency_minor_unit", 2)
        divisor = 10 ** minor if isinstance(minor, int) else 100

        def money(key):
            v = _to_float(prices.get(key))
            return round(v / divisor, minor if isinstance(minor, int) else 2) if v is not None else None

        regular, current = money("regular_price"), money("price")
        images = [i.get("src", "") for i in (p.get("images") or []) if i.get("src")]
        cats = [c.get("name", "") for c in (p.get("categories") or []) if c.get("name")]
        prod.update({
            "id": str(p.get("id", "")),
            "title": _clean_text(p.get("name") or ""),
            "price": current,
            "compare_at_price": regular if regular and current and regular > current else None,
            "currency": prices.get("currency_code", ""),
            "url": p.get("permalink", ""),
            "image": images[0] if images else "",
            "images": images,
            "description": _clean_text(p.get("description") or p.get("short_description") or ""),
            "tags": [t.get("name", "") for t in (p.get("tags") or []) if t.get("name")],
            "category": cats[0] if cats else "",
            "sku": p.get("sku", "") or "",
            "in_stock": p.get("is_in_stock"),
        })
        out.append(prod)
    return out


def scrape_woocommerce(origin: str, max_products: int):
    products, page = [], 1
    while len(products) < max_products and page <= 5:
        data, _ = _json_get(f"{origin}/wp-json/wc/store/v1/products?per_page=100&page={page}")
        if not isinstance(data, list):
            return None if page == 1 else {"platform": "WooCommerce", "store": {}, "products": products}
        if not data:
            break
        products += parse_woo_products(data)
        if len(data) < 100:
            break
        page += 1
    if not products:
        return None
    currency = next((p["currency"] for p in products if p["currency"]), "")
    return {"platform": "WooCommerce", "store": {"currency": currency}, "products": products[:max_products]}


# ---------- Koi bhi aur site (structured data) ----------

def product_from_html(html: str, url: str) -> dict | None:
    data = _json_ld_product(html)
    title = (data.get("name") or "").strip() or _meta(html, "og:title")
    if not title:
        return None

    offers = data.get("offers") or {}
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    images = data.get("image") or _meta(html, "og:image") or []
    images = images if isinstance(images, list) else [images]
    images = [i if isinstance(i, str) else i.get("url", "") for i in images if i]
    brand = data.get("brand") or ""
    if isinstance(brand, dict):
        brand = brand.get("name", "")

    prod = _blank_product()
    prod.update({
        "id": str(data.get("sku") or url),
        "title": title,
        "price": _to_float(offers.get("price")) if isinstance(offers, dict) else None,
        "currency": offers.get("priceCurrency", "") if isinstance(offers, dict) else "",
        "url": url,
        "image": images[0] if images else "",
        "images": images,
        "description": _clean_text(str(data.get("description") or "")) or _meta(html, "og:description"),
        "tags": _tag_list(data.get("keywords")) or _tag_list(_meta(html, "keywords")),
        "category": str(data.get("category") or ""),
        "brand": str(brand),
        "sku": str(data.get("sku") or ""),
    })
    return prod


def _sitemap_product_urls(origin: str) -> list[str]:
    resp = _get(f"{origin}/sitemap.xml")
    if resp.status_code != 200:
        return []
    locs = re.findall(r"<loc>\s*(.*?)\s*</loc>", resp.text)
    if "<sitemapindex" in resp.text:
        product_maps = [u for u in locs if "product" in u.lower()]
        if not product_maps:
            return []
        resp = _get(product_maps[0])
        if resp.status_code != 200:
            return []
        locs = re.findall(r"<loc>\s*(.*?)\s*</loc>", resp.text)
    host = urlparse(origin).netloc
    return [u for u in locs if urlparse(u).netloc == host and not u.lower().endswith((".jpg", ".png", ".webp"))]


def scrape_generic(origin: str, url: str, max_products: int):
    limit = min(max_products, GENERIC_PAGE_LIMIT)
    path = urlparse(url).path.strip("/")
    urls = [url] if path else _sitemap_product_urls(origin)[:limit]
    if not urls:
        return None

    products = []
    for u in urls[:limit]:
        try:
            resp = _get(u)
        except FetchError:
            continue
        if resp.status_code == 200:
            prod = product_from_html(resp.text, u)
            if prod:
                products.append(prod)
    if not products:
        return None
    return {"platform": "Website", "store": {}, "products": products}


# ---------- Main ----------

def scrape_store(url: str, max_products: int = MAX_PRODUCTS_LIMIT) -> dict:
    url = url.strip()
    if not re.match(r"^https?://", url, flags=re.I):
        url = "https://" + url
    parsed = urlparse(url)
    if not parsed.hostname or "." not in parsed.hostname:
        raise FetchError("Sahi link paste karo (jaise https://mystore.com).")
    _check_public_host(parsed.hostname)

    max_products = max(1, min(max_products, MAX_PRODUCTS_LIMIT))
    origin = _origin(url)

    market = _marketplace_name(parsed.hostname)
    if market:
        result = scrape_generic(origin, url, 1) if parsed.path.strip("/") else None
        if not result:
            raise FetchError(
                f"{market} bots ko rokta hai, is liye yahan se data nahi mila. "
                f"Kisi ek product ka seedha link try karo, ya {market} ki official API use karo."
            )
    else:
        result = scrape_shopify(origin, max_products) or scrape_woocommerce(origin, max_products)
        if not result:
            result = scrape_generic(origin, url, max_products)
        if not result:
            raise FetchError(
                "Is link se products nahi nikal sake. Store ka main link ya kisi product ka link try karo."
            )

    store = result["store"]
    store.setdefault("name", "")
    store["url"] = origin
    store["domain"] = parsed.netloc
    if not store["name"]:
        store["name"] = parsed.netloc.replace("www.", "")
    result["store"] = store
    return result