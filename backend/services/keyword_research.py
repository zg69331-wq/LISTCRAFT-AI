import json
import math
import re
import string
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote

import requests

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "application/json,text/javascript,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Sirf yeh fixed websites bulayi jati hain (user ka diya hua koi link nahi)
SOURCES = {
    "google": "https://suggestqueries.google.com/complete/search?client=firefox&q={q}",
    "amazon": "https://completion.amazon.com/search/complete?search-alias=aps&client=amazon-search-ui&mkt=1&q={q}",
    "ebay": "https://autosug.ebay.com/autosug?kwd={q}&_jgr=1&sId=0&_ch=0",
    "etsy": "https://www.etsy.com/suggestions_ajax.php?search_query={q}",
}

QUICK_MODIFIERS = ["for", "best", "with", "gift", "personalized", "handmade", "how to", "vintage"]
QUESTION_WORDS = ("who", "what", "where", "when", "why", "how", "can", "does", "do", "is", "are", "which", "should")
BUYING_WORDS = {"best", "cheap", "buy", "price", "sale", "discount", "online", "affordable", "top", "near"}
GIFT_WORDS = {"gift", "gifts", "present", "presents"}
STOPWORDS = {"the", "and", "for", "with", "you", "your", "from", "that", "this", "are", "how", "what", "can", "to", "of", "in", "on", "a", "an", "is"}

MAX_SEED_LENGTH = 80
MAX_KEYWORDS = 300


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower())


# ---------- Jawab samajhna (har site ka alag format) ----------

def extract_suggestions(text: str) -> list[str]:
    """Kisi bhi suggestion jawab (JSON ya JSONP) se alfaaz ki list nikaalta hai."""
    text = (text or "").strip()
    data = None
    try:
        data = json.loads(text)
    except ValueError:
        m = re.search(r"(\{.*\}|\[.*\])", text, flags=re.S)
        if m:
            try:
                data = json.loads(m.group(1))
            except ValueError:
                data = None
    return _walk(data)


def _item_text(item) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        for key in ("value", "query", "suggestion", "term", "text"):
            if isinstance(item.get(key), str):
                return item[key]
    return ""


def _walk(data) -> list[str]:
    out = []
    if isinstance(data, list):
        # Google/Amazon: ["query", ["s1", "s2", ...], ...]
        if len(data) >= 2 and isinstance(data[0], str) and isinstance(data[1], list):
            out = [_item_text(i) for i in data[1]]
        else:
            out = [_item_text(i) for i in data]
    elif isinstance(data, dict):
        if isinstance(data.get("res"), dict) and isinstance(data["res"].get("sug"), list):
            out = [_item_text(i) for i in data["res"]["sug"]]          # eBay
        else:
            for key in ("suggestions", "results", "sug", "items"):
                if isinstance(data.get(key), list):
                    out = [_item_text(i) for i in data[key]]            # Amazon/Etsy
                    break
    return [s.strip() for s in out if s and s.strip()]


def fetch_source(source: str, query: str) -> list[str]:
    url = SOURCES[source].format(q=quote(query))
    resp = requests.get(url, headers=HEADERS, timeout=6)
    if resp.status_code != 200:
        raise RuntimeError(f"code {resp.status_code}")
    return extract_suggestions(resp.text)


# ---------- Research ----------

def _queries(seed: str, deep: bool) -> list[str]:
    if deep:
        return [seed] + [f"{seed} {c}" for c in string.ascii_lowercase]
    return [seed] + [f"{seed} {m}" for m in QUICK_MODIFIERS]


def _clean_seed(seed: str) -> str:
    return re.sub(r"\s+", " ", seed or "").strip().lower()[:MAX_SEED_LENGTH]


def research(seed: str, sources: list[str], deep: bool = False, fetcher=fetch_source) -> dict:
    seed = _clean_seed(seed)
    if len(seed) < 2:
        raise ValueError("Keyword kam az kam 2 harf ka ho.")
    sources = [s for s in dict.fromkeys(sources) if s in SOURCES]
    if not sources:
        raise ValueError("Kam az kam ek source chuno.")

    seed_tokens = set(_words(seed))
    need = max(1, math.ceil(len(seed_tokens) / 2))
    seed_l = seed.lower()

    status = {s: {"ok": 0, "failed": 0, "found": 0, "error": ""} for s in sources}
    raw = defaultdict(lambda: {"sources": set(), "weight": 0.0})

    def job(src, q):
        return src, q, fetcher(src, q)

    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = [ex.submit(job, s, q) for s in sources for q in _queries(seed, deep)]
        # future ko dobara (src, q) se jorne ke liye order yaad rakho
        meta = {}
        for fut, (s, q) in zip(futures, [(s, q) for s in sources for q in _queries(seed, deep)]):
            meta[fut] = (s, q)
        for fut in as_completed(futures):
            src, q = meta[fut]
            try:
                _, _, suggestions = fut.result()
            except Exception as e:
                status[src]["failed"] += 1
                status[src]["error"] = str(e)[:80]
                continue
            status[src]["ok"] += 1
            for rank, sug in enumerate(suggestions):
                kw = re.sub(r"\s+", " ", sug.lower()).strip()
                if not kw or kw == seed_l or len(kw) > 120:
                    continue
                if len(seed_tokens & set(_words(kw))) < need:
                    continue
                weight = (12 - min(rank, 10)) if q == seed else 3
                raw[kw]["sources"].add(src)
                raw[kw]["weight"] += weight

    for s in sources:
        status[s]["found"] = sum(1 for v in raw.values() if s in v["sources"])
        status[s]["status"] = "ok" if status[s]["ok"] else "failed"

    items = []
    for kw, v in raw.items():
        v["score_raw"] = v["weight"] + 8 * (len(v["sources"]) - 1)
        items.append((kw, v))
    top_raw = max((v["score_raw"] for _, v in items), default=1) or 1

    keywords = []
    for kw, v in items:
        words = _words(kw)
        is_q = bool(words) and words[0] in QUESTION_WORDS
        keywords.append({
            "keyword": kw,
            "score": round(v["score_raw"] / top_raw * 100),
            "sources": sorted(v["sources"]),
            "words": len(words),
            "kind": "question" if is_q else ("long-tail" if len(words) >= 4 else "short"),
            "fits_etsy_tag": len(kw) <= 20,
        })
    keywords.sort(key=lambda k: (-k["score"], k["keyword"]))
    keywords = keywords[:MAX_KEYWORDS]

    def pick(pred, n=15):
        return [k["keyword"] for k in keywords if pred(k)][:n]

    groups = {
        "Sawalon wale (questions)": pick(lambda k: k["kind"] == "question"),
        "Kis ke liye (for ...)": pick(lambda k: " for " in f" {k['keyword']} " and k["kind"] != "question"),
        "Gift ideas": pick(lambda k: bool(GIFT_WORDS & set(_words(k["keyword"])))),
        "Khareedne ka irada (best, buy, cheap ...)": pick(lambda k: bool(BUYING_WORDS & set(_words(k["keyword"])))),
    }
    groups = {name: kws for name, kws in groups.items() if kws}

    mod_counter = Counter(
        w for k in keywords for w in set(_words(k["keyword"]))
        if w not in seed_tokens and w not in STOPWORDS and len(w) > 2 and not w.isdigit()
    )

    return {
        "seed": seed,
        "mode": "deep" if deep else "quick",
        "total": len(keywords),
        "long_tail": sum(1 for k in keywords if k["kind"] == "long-tail"),
        "questions": sum(1 for k in keywords if k["kind"] == "question"),
        "etsy_fit": sum(1 for k in keywords if k["fits_etsy_tag"]),
        "sources": status,
        "keywords": keywords,
        "groups": groups,
        "modifiers": [{"word": w, "count": c} for w, c in mod_counter.most_common(15)],
    }