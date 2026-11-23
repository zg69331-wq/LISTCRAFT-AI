import ipaddress
import json
import re
import socket
from html import unescape
from urllib.parse import urljoin, urlparse, urlunparse

import requests

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


class FetchError(Exception):
    pass


# ---------- Safety ----------

def _check_public_host(host: str):
    """Server ko apne andar ke addresses (localhost wagera) par jane se roko."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise FetchError("Is link ki website nahi mili. Link dobara check karo.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise FetchError("Yeh link allowed nahi hai.")


def _check_domain(marketplace: str, host: str):
    host = host.lower()
    ok = True
    if marketplace == "etsy":
        ok = host == "etsy.com" or host.endswith(".etsy.com")
    elif marketplace == "amazon":
        ok = "amazon." in host or host.endswith("amzn.to")
    elif marketplace == "ebay":
        ok = "ebay." in host
    # shopify: har store ka apna domain hota hai, isliye koi rok nahi
    if not ok:
        raise FetchError(f"Yeh link {marketplace.capitalize()} ka nahi lagta. Platform ya link check karo.")


def _get(url: str) -> requests.Response:
    """Redirects ko haath se follow karta hai, har step par safety check ke saath."""
    for _ in range(4):
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            raise FetchError("Sahi link paste karo (https:// se shuru hone wala).")
        _check_public_host(parsed.hostname)
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15, allow_redirects=False)
        except requests.RequestException:
            raise FetchError("Website se rabta nahi ho saka. Baad mein try karo.")
        if resp.status_code in (301, 302, 303, 307, 308) and resp.headers.get("Location"):
            url = urljoin(url, resp.headers["Location"])
            continue
        return resp
    raise FetchError("Link bohat zyada jagah redirect ho raha hai.")


# ---------- Parsing ----------

def _clean_text(html: str) -> str:
    text = re.sub(r"<(br|/p|/li|/div)[^>]*>", "\n", html or "", flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


def _meta(html: str, key: str) -> str:
    for tag in re.findall(r"<meta\b[^>]*>", html, flags=re.I):
        attrs = {m[0].lower(): m[2] for m in re.findall(r'([\w:-]+)\s*=\s*(["\'])(.*?)\2', tag, flags=re.S)}
        if attrs.get("property", attrs.get("name", "")).lower() == key and "content" in attrs:
            return unescape(attrs["content"]).strip()
    return ""


def _json_ld_product(html: str) -> dict:
    blocks = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, flags=re.S | re.I,
    )

    def find(node):
        if isinstance(node, list):
            for n in node:
                found = find(n)
                if found:
                    return found
        elif isinstance(node, dict):
            t = node.get("@type")
            types = t if isinstance(t, list) else [t]
            if "Product" in types:
                return node
            for key in ("@graph", "mainEntity"):
                if key in node:
                    found = find(node[key])
                    if found:
                        return found
        return None

    for b in blocks:
        try:
            data = json.loads(b.strip())
        except ValueError:
            continue
        product = find(data)
        if product:
            return product
    return {}


def _split_tags(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        items = value
    else:
        items = re.split(r"[,;|]", str(value))
    seen, out = set(), []
    for item in items:
        t = _clean_text(str(item)).strip()
        if t and t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    return out


def parse_shopify_json(data: dict) -> dict:
    p = data.get("product", data)
    return {
        "title": (p.get("title") or "").strip(),
        "description": _clean_text(p.get("body_html") or ""),
        "tags": _split_tags(p.get("tags")),
    }


def parse_html(html: str, marketplace: str) -> dict:
    product = _json_ld_product(html)

    title = (product.get("name") or "").strip()
    if marketplace == "amazon":
        m = re.search(r'id=["\']productTitle["\'][^>]*>(.*?)</span>', html, flags=re.S | re.I)
        if m:
            title = _clean_text(m.group(1))
    if not title:
        title = _meta(html, "og:title")
    if not title:
        m = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.S | re.I)
        title = _clean_text(m.group(1)) if m else ""

    description = _clean_text(str(product.get("description") or ""))
    if marketplace == "amazon":
        bullets = re.findall(r'<li[^>]*class="[^"]*a-spacing-mini[^"]*"[^>]*>(.*?)</li>', html, flags=re.S | re.I)
        if bullets:
            description = "\n".join(_clean_text(b) for b in bullets)
    if not description:
        description = _meta(html, "og:description") or _meta(html, "description")

    tags = _split_tags(product.get("keywords")) or _split_tags(_meta(html, "keywords"))
    return {"title": title, "description": description, "tags": tags}


# ---------- Main ----------

def fetch_listing(marketplace: str, url: str) -> dict:
    url = url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise FetchError("Sahi link paste karo (https:// se shuru hone wala).")
    _check_domain(marketplace, parsed.hostname)

    result = None

    if marketplace == "shopify" and "/products/" in parsed.path:
        json_url = urlunparse(parsed._replace(path=parsed.path.rstrip("/") + ".json", query="", fragment=""))
        resp = _get(json_url)
        if resp.status_code == 200:
            try:
                result = parse_shopify_json(resp.json())
            except ValueError:
                result = None

    if result is None or not result["title"]:
        resp = _get(url)
        if resp.status_code in (401, 403, 429, 503):
            raise FetchError(
                f"{marketplace.capitalize()} ne bot ko rok diya (code {resp.status_code}). "
                "Neeche title, description aur tags khud paste kar do."
            )
        if resp.status_code != 200:
            raise FetchError(f"Page nahi khula (code {resp.status_code}). Link check karo.")
        result = parse_html(resp.text, marketplace)

    if not result["title"]:
        raise FetchError(
            "Page se listing nahi nikal saka. Neeche title, description aur tags khud paste kar do."
        )

    missing = [k for k in ("description", "tags") if not result[k]]
    result["missing"] = missing
    return result