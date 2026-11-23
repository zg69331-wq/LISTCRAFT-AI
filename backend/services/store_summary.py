import re
from collections import Counter
from statistics import mean, median

STOPWORDS = {
    "the", "and", "for", "with", "you", "your", "from", "this", "that", "are", "was",
    "has", "have", "can", "all", "any", "not", "but", "one", "our", "out", "new",
    "set", "pack", "per", "pcs", "inch", "size", "color", "colour", "men", "women",
}


def _money(value, currency: str) -> str:
    if value is None:
        return "-"
    text = f"{value:,.2f}".rstrip("0").rstrip(".") if value % 1 else f"{value:,.0f}"
    return f"{currency} {text}".strip()


def _top(counter: Counter, n: int, key: str = "name") -> list[dict]:
    return [{key: k, "count": c} for k, c in counter.most_common(n)]


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", (text or "").lower())


def _slim(p: dict) -> dict:
    return {"title": p["title"], "price": p["price"], "url": p["url"], "image": p["image"]}


def _price_buckets(prices: list[float], currency: str) -> list[dict]:
    if len(prices) < 2:
        return []
    lo, hi = min(prices), max(prices)
    if lo == hi:
        return [{"label": _money(lo, currency), "count": len(prices)}]
    step = (hi - lo) / 5
    buckets = []
    for i in range(5):
        start, end = lo + step * i, lo + step * (i + 1)
        if i == 4:
            count = sum(1 for p in prices if start <= p <= end)
        else:
            count = sum(1 for p in prices if start <= p < end)
        buckets.append({"label": f"{_money(start, '')}-{_money(end, '')}".strip(), "count": count})
    return buckets


def summarize(products: list[dict], store: dict, platform: str) -> dict:
    n = len(products)
    currency = next((p["currency"] for p in products if p.get("currency")), store.get("currency", ""))
    priced = [p for p in products if p.get("price") is not None]
    prices = [p["price"] for p in priced]

    desc_words = [len(_words(p["description"])) for p in products]
    title_lens = [len(p["title"]) for p in products]
    on_sale = [p for p in products if p.get("compare_at_price")]
    out_of_stock = [p for p in products if p.get("in_stock") is False]

    stats = {
        "product_count": n,
        "currency": currency,
        "avg_price": round(mean(prices), 2) if prices else None,
        "median_price": round(median(prices), 2) if prices else None,
        "min_price": min(prices) if prices else None,
        "max_price": max(prices) if prices else None,
        "on_sale": len(on_sale),
        "out_of_stock": len(out_of_stock),
        "avg_title_length": round(mean(title_lens)) if title_lens else 0,
        "avg_description_words": round(mean(desc_words)) if desc_words else 0,
    }

    categories = Counter(p["category"] for p in products if p.get("category"))
    brands = Counter(p["brand"] for p in products if p.get("brand"))
    tags = Counter(t.lower() for p in products for t in p.get("tags", []))
    keywords = Counter(
        w for p in products for w in set(_words(p["title"]))
        if len(w) > 2 and w not in STOPWORDS and not w.isdigit()
    )

    # ---------- Main points ----------
    points = []

    def add(kind, text):
        points.append({"type": kind, "text": text})

    add("info", f"{n} product{'s' if n != 1 else ''} mile ({platform} store).")

    if prices:
        if n > 1:
            add("info", f"Prices {_money(stats['min_price'], currency)} se {_money(stats['max_price'], currency)} tak hain, "
                        f"average {_money(stats['avg_price'], currency)}.")
        else:
            add("info", f"Price {_money(stats['min_price'], currency)} hai.")
    else:
        add("warn", "Kisi product ka price nahi mila.")

    if on_sale:
        pct = round(len(on_sale) / n * 100)
        add("info", f"{len(on_sale)} products ({pct}%) sale par hain.")
    if out_of_stock:
        add("warn", f"{len(out_of_stock)} products stock mein nahi hain.")

    if categories:
        name, count = categories.most_common(1)[0]
        share = round(count / n * 100)
        if len(categories) > 1 and share >= 50:
            add("info", f'Store ka zyada hissa "{name}" category ka hai ({share}%).')
        else:
            add("info", f"{len(categories)} categories hain, sab se bari: {name}.")

    if keywords:
        add("info", "Titles mein sab se common alfaaz: " + ", ".join(k for k, _ in keywords.most_common(5)) + ".")

    thin = sum(1 for w in desc_words if w < 20)
    if thin:
        add("warn", f"{thin} products ki description bohat chhoti hai ya hai hi nahi (20 alfaaz se kam).")

    tagging_supported = any(p.get("tags") for p in products)
    if tagging_supported:
        no_tags = sum(1 for p in products if not p.get("tags"))
        if no_tags:
            add("warn", f"{no_tags} products par koi tag nahi laga.")
    elif n > 1:
        add("info", "Is store ke products mein tags dikhaye nahi ja rahe.")

    few_images = sum(1 for p in products if len(p.get("images", [])) <= 1)
    if few_images and n > 1:
        add("warn", f"{few_images} products ki sirf 1 ya 0 images hain.")

    if stats["avg_title_length"] and stats["avg_title_length"] < 30 and n > 1:
        add("warn", f"Titles chhote hain (average {stats['avg_title_length']} characters). Zyada keywords ki jagah hai.")

    dupes = [t for t, c in Counter(p["title"].lower() for p in products).items() if c > 1]
    if dupes:
        add("warn", f"{len(dupes)} titles dohraye gaye hain.")

    # ---------- Chhota overview ----------
    parts = [f"Yeh {platform} store {n} products ke saath mila."]
    if prices and n > 1:
        parts.append(f"Zyada tar prices {_money(stats['median_price'], currency)} ke aas paas hain.")
    if categories:
        parts.append("Main categories: " + ", ".join(c for c, _ in categories.most_common(3)) + ".")
    overview = " ".join(parts)

    return {
        "overview": overview,
        "stats": stats,
        "points": points,
        "categories": _top(categories, 8),
        "brands": _top(brands, 5),
        "top_tags": _top(tags, 12),
        "top_keywords": _top(keywords, 15, key="word"),
        "price_buckets": _price_buckets(prices, ""),
        "cheapest": _slim(min(priced, key=lambda p: p["price"])) if priced else None,
        "priciest": _slim(max(priced, key=lambda p: p["price"])) if priced else None,
    }
