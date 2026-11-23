import re

# Har marketplace ke rules (listing_generator.py wale rules se mel khate hain)
RULES = {
    "etsy":    {"title_max": 140, "tags": 13},
    "amazon":  {"title_max": 200, "tags": 7},
    "ebay":    {"title_max": 80,  "tags": 5},
    "shopify": {"title_max": 70,  "tags": 10},
}

TAG_MAX_CHARS = 20


def _words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower())


def _check(id_, label, status, points, tip):
    return {"id": id_, "label": label, "status": status, "points": points, "tip": tip}


def analyze_listing(marketplace, title, description, tags, keywords):
    rules = RULES[marketplace]
    title = title.strip()
    description = description.strip()
    tags = [t.strip() for t in tags if t.strip()]
    keywords = [k.strip().lower() for k in keywords if k.strip()]

    checks = []

    # 1. Title ki lambai
    t_len, t_max = len(title), rules["title_max"]
    if t_len == 0:
        checks.append(_check("title_len", "Title ki lambai", "fail", 20, "Title khali hai."))
    elif t_len > t_max:
        checks.append(_check("title_len", "Title ki lambai", "fail", 20,
                             f"Title {t_len} characters ka hai, {marketplace} par {t_max} tak allowed hai."))
    elif t_len < t_max * 0.4:
        checks.append(_check("title_len", "Title ki lambai", "warn", 20,
                             f"Title chhota hai ({t_len}/{t_max}). Zyada keywords daalo."))
    else:
        checks.append(_check("title_len", "Title ki lambai", "pass", 20,
                             f"Achhi lambai ({t_len}/{t_max})."))

    # 2. Main keyword title mein
    if keywords:
        main = keywords[0]
        pos = title.lower().find(main)
        if pos == -1:
            checks.append(_check("title_kw", "Main keyword title mein", "fail", 20,
                                 f'"{main}" title mein nahi hai.'))
        elif pos > 40:
            checks.append(_check("title_kw", "Main keyword title mein", "warn", 20,
                                 f'"{main}" title mein hai, lekin shuru mein nahi. Pehle 40 characters mein lao.'))
        else:
            checks.append(_check("title_kw", "Main keyword title mein", "pass", 20,
                                 f'"{main}" title ke shuru mein hai.'))

    # 3. Tags ki ginti
    n_tags, max_tags = len(tags), rules["tags"]
    if n_tags > max_tags:
        checks.append(_check("tag_count", "Tags ki ginti", "fail", 15,
                             f"{n_tags} tags hain, {marketplace} par sirf {max_tags} chalte hain."))
    elif n_tags == max_tags:
        checks.append(_check("tag_count", "Tags ki ginti", "pass", 15,
                             f"Poore {max_tags} tags istemal hue hain."))
    elif n_tags >= max_tags * 0.6:
        checks.append(_check("tag_count", "Tags ki ginti", "warn", 15,
                             f"{n_tags}/{max_tags} tags. Baaqi slots bhi bharo."))
    else:
        checks.append(_check("tag_count", "Tags ki ginti", "fail", 15,
                             f"Sirf {n_tags}/{max_tags} tags hain."))

    # 4. Tags ki quality
    lowered = [t.lower() for t in tags]
    too_long = [t for t in tags if len(t) > TAG_MAX_CHARS]
    dupes = len(lowered) - len(set(lowered))
    if too_long or dupes:
        parts = []
        if too_long:
            parts.append(f"{len(too_long)} tag {TAG_MAX_CHARS} characters se lamba hai")
        if dupes:
            parts.append(f"{dupes} tag dohra hai")
        checks.append(_check("tag_quality", "Tags ki quality", "fail", 10, ". ".join(parts) + "."))
    elif tags:
        checks.append(_check("tag_quality", "Tags ki quality", "pass", 10,
                             "Koi tag lamba ya dohra nahi."))
    else:
        checks.append(_check("tag_quality", "Tags ki quality", "fail", 10, "Koi tag nahi diya."))

    # 5. Description ki lambai
    n_words = len(_words(description))
    if n_words >= 120:
        checks.append(_check("desc_len", "Description ki lambai", "pass", 15,
                             f"{n_words} alfaaz, kaafi detail hai."))
    elif n_words >= 60:
        checks.append(_check("desc_len", "Description ki lambai", "warn", 15,
                             f"{n_words} alfaaz. 120 se zyada ho to behtar hai."))
    else:
        checks.append(_check("desc_len", "Description ki lambai", "fail", 15,
                             f"Sirf {n_words} alfaaz. Kam az kam 120 likho."))

    # 6. Keywords description mein
    if keywords:
        desc_lower = description.lower()
        found = [k for k in keywords if k in desc_lower]
        ratio = len(found) / len(keywords)
        missing = [k for k in keywords if k not in desc_lower]
        if ratio >= 0.5:
            checks.append(_check("desc_kw", "Keywords description mein", "pass", 10,
                                 f"{len(found)}/{len(keywords)} keywords description mein hain."))
        else:
            checks.append(_check("desc_kw", "Keywords description mein", "fail", 10,
                                 "Yeh keywords description mein nahi: " + ", ".join(missing[:5]) + "."))

    # 7. Keyword stuffing / ALL CAPS
    t_words = _words(title)
    repeated = sorted({w for w in t_words if len(w) > 3 and t_words.count(w) > 2})
    letters = [c for c in title if c.isalpha()]
    all_caps = len(letters) > 8 and all(c.isupper() for c in letters)
    if repeated or all_caps:
        tip = []
        if repeated:
            tip.append("Title mein yeh alfaaz bohat baar aaye: " + ", ".join(repeated))
        if all_caps:
            tip.append("Poora title CAPITAL mein hai")
        checks.append(_check("stuffing", "Title saaf-suthra hai", "warn", 5, ". ".join(tip) + "."))
    else:
        checks.append(_check("stuffing", "Title saaf-suthra hai", "pass", 5,
                             "Koi lafz zaroorat se zyada dohraya nahi gaya."))

    # 8. Tags aur title ka taalluq
    title_set = set(t_words)
    overlap = [t for t in tags if any(w in title_set for w in _words(t))]
    if tags and overlap:
        checks.append(_check("tag_title", "Tags title se milte hain", "pass", 5,
                             f"{len(overlap)} tags ke alfaaz title mein bhi hain."))
    elif tags:
        checks.append(_check("tag_title", "Tags title se milte hain", "warn", 5,
                             "Kisi tag ka lafz title mein nahi. Title aur tags mein mel rakho."))

    # Score
    total = sum(c["points"] for c in checks)
    earned = sum(
        c["points"] if c["status"] == "pass" else c["points"] * 0.5 if c["status"] == "warn" else 0
        for c in checks
    )
    score = round(earned / total * 100) if total else 0
    if score >= 80:
        grade = "Excellent"
    elif score >= 60:
        grade = "Good"
    elif score >= 40:
        grade = "Needs work"
    else:
        grade = "Poor"

    return {"score": score, "grade": grade, "marketplace": marketplace, "checks": checks}

