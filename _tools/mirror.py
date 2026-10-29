#!/usr/bin/env python3
"""Mirror psychedigital.com into static files (front end only).

Pages land at <slug>/index.html, assets keep their live paths (wp-content/..., wp-includes/...),
third-party assets (Google Fonts, Highcharts) land in _ext/<host>/. Analytics, cookie banner and
recaptcha scripts are stripped. Re-runnable: assets already on disk are skipped.
"""
import hashlib, html, os, posixpath, re, sys, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LIVE = "https://psychedigital.com"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
DELAY = 0.12
EXCLUDE_PAGES = ("/internal-payment", "/wp-admin", "/wp-login", "/feed", "/wp-json", "/comments", "/cart", "/checkout", "/my-account")
STRIP_SRC = re.compile(r"googletagmanager|datafa\.st|recaptcha|cookie-law-info|frontend-gtag|google-analytics", re.I)
STRIP_INLINE = re.compile(r"gtag\(|googletagmanager|monsterinsights|mi_track|datafast|_ckyConfig|_ckyStyles|cookie-law-info|cky-", re.I)

HOST = r"(?:www\.)?psychedigital\.com"
LIVE_RE = re.compile(
    r"https?:(?:\\?/){2}" + HOST + r"(?P<path>(?:\\?/[^\s\"'<>()\\,;?#&|{}]*)*)(?P<q>\?[^\s\"'<>()\\]*)?")
EXT_RE = re.compile(r"(?:https?:)?//(?P<host>fonts\.googleapis\.com|fonts\.gstatic\.com|code\.highcharts\.com)(?P<path>/[^\s\"'<>()\\]*)")

assets = set()      # live paths to download (/wp-content/...)
ext_assets = {}     # local rel path -> source url
SITEMAP = set()
pages_seen = {}     # live path -> output file
page_queue = []


def fetch(url, want_404=False):
    """curl, because this Mac's system Python can't negotiate TLS with the site."""
    import subprocess
    for attempt in range(3):
        r = subprocess.run(["curl", "-sL", "-A", UA, "--max-time", "60", "-w", "\n%{http_code}", url], capture_output=True)
        body, _, code = r.stdout.rpartition(b"\n")
        if code == b"200" or (want_404 and code == b"404"):
            return body, url
        if code == b"404":
            return None, url
        time.sleep(1.5)
    return None, url


def rel(from_file, to_path):
    """Relative URL from output file `from_file` (root-relative, no leading /) to root path `to_path`."""
    trail = to_path.endswith("/") and len(to_path) > 1
    r = posixpath.relpath(to_path.lstrip("/") or ".", posixpath.dirname(from_file) or ".")
    return r + ("/" if trail else "")


def ext_local(host, path):
    path = html.unescape(path)
    if host == "fonts.googleapis.com":
        name = "css-" + hashlib.md5(path.encode()).hexdigest()[:10] + ".css"
        local = f"_ext/{host}/{name}"
    else:
        local = f"_ext/{host}{path.split('?')[0]}"
    ext_assets[local] = "https://" + host + path
    return local


def localize(text, out_file, kind):
    """Rewrite live/ext asset URLs. kind: html | css | js. out_file is root-relative."""
    def live(m):
        esc = "\\" in m.group(0)
        p = m.group("path").replace("\\", "") or "/"
        if not (p.startswith("/wp-content/") or p.startswith("/wp-includes/")):
            return m.group(0)
        if posixpath.splitext(p)[1]:
            assets.add(p)
        new = p if kind == "js" else rel(out_file, p)
        return new.replace("/", "\\/") if esc else new

    def ext(m):
        local = ext_local(m.group("host"), m.group("path"))
        new = rel(out_file, "/" + local) if kind != "js" else "/" + local
        return new

    text = LIVE_RE.sub(live, text)
    return EXT_RE.sub(ext, text)


def page_out(path):
    p = path.strip("/")
    return (p + "/index.html") if p else "index.html"


_resolved = {}


def resolve(p):
    """Follow live redirects so old URLs (/blog/x/, /free-vision-call/) link to their real target."""
    p = posixpath.normpath(p) + "/" if p != "/" else p
    if p in SITEMAP or p in _resolved:
        return _resolved.get(p, p)
    import subprocess
    r = subprocess.run(["curl", "-sIL", "-A", UA, "-o", "/dev/null", "-w", "%{http_code} %{url_effective}", LIVE + p], capture_output=True, text=True)
    code, _, final = r.stdout.partition(" ")
    m = re.match(r"https?://" + HOST + r"(/[^?#]*)", final)
    out = (m.group(1) if m and code == "200" else None)
    if out and not out.endswith("/") and not posixpath.splitext(out)[1]:
        out += "/"
    _resolved[p] = out
    return out


def is_excluded(path):
    return any(path.startswith(x) for x in EXCLUDE_PAGES)


def rewrite_anchors(text, out_file):
    def a_tag(m):
        tag = m.group(0)
        def href(hm):
            m2 = re.match(r"https?://" + HOST + r"(/[^\s\"'?#]*)?(\?[^\s\"'#]*)?(#[^\s\"']*)?$", html.unescape(hm.group(2)))
            if not m2:
                return hm.group(0)
            p, q, frag = (m2.group(1) or "/"), m2.group(2), m2.group(3) or ""
            if q or is_excluded(p):
                return hm.group(0)
            if not posixpath.splitext(p)[1]:
                p = resolve(p)
                if not p or is_excluded(p):
                    return hm.group(0)
            if posixpath.splitext(p)[1]:
                if p.startswith("/wp-content/"):
                    assets.add(p)
                    return f'{hm.group(1)}{rel(out_file, p)}{frag}"'
                return hm.group(0)
            if not p.endswith("/"):
                p += "/"
            if p not in pages_seen:
                pages_seen[p] = page_out(p)
                page_queue.append(p)
            return f'{hm.group(1)}{rel(out_file, "/" + page_out(p))}{frag}"'
        tag = re.sub(r'(href=)"(/(?!/)[^"]*)"', lambda hm: f'{hm.group(1)}"{LIVE}{hm.group(2)}"', tag)  # root-relative -> absolute, then localised below
        return re.sub(r'(href=)"([^"]*)"', lambda hm: href(hm), tag)
    return re.sub(r"<a\b[^>]*>", a_tag, text)


def process_html(raw, out_file):
    protected = []
    def protect(m):
        protected.append(m.group(0))
        return f"\x00P{len(protected) - 1}\x00"
    raw = re.sub(r"<script[^>]*application/ld\+json[^>]*>.*?</script>", protect, raw, flags=re.S)
    raw = re.sub(r"<meta\b[^>]*>", protect, raw)
    raw = re.sub(r"<link\b[^>]*rel=[\"'](?:canonical|alternate|shortlink|EditURI|https://api\.w\.org/)[\"'][^>]*>", "", raw)
    raw = re.sub(r"<link\b[^>]*(?:xmlrpc|wp-json|oembed)[^>]*>", "", raw)

    def script(m):
        attrs, body = m.group(1), m.group(2)
        src = re.search(r"src=[\"']([^\"']+)", attrs)
        if src and STRIP_SRC.search(src.group(1)):
            return ""
        if not src and STRIP_INLINE.search(body):
            return ""
        return m.group(0)
    raw = re.sub(r"<script\b([^>]*)>(.*?)</script>", script, raw, flags=re.S)
    raw = re.sub(r"<noscript>(?:(?!</noscript>).)*googletagmanager(?:(?!</noscript>).)*</noscript>", "", raw, flags=re.S)

    raw = rewrite_anchors(raw, out_file)
    raw = localize(raw, out_file, "html")
    for i, seg in enumerate(protected):
        raw = raw.replace(f"\x00P{i}\x00", seg)
    return raw


def save(rel_path, data):
    full = os.path.join(ROOT, rel_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "wb") as f:
        f.write(data)


def drain_assets():
    while True:
        todo = [p for p in sorted(assets) if not os.path.exists(os.path.join(ROOT, p.lstrip("/")))]
        todo_ext = [l for l in sorted(ext_assets) if not os.path.exists(os.path.join(ROOT, l))]
        if not todo and not todo_ext:
            break
        for p in todo:
            data, _ = fetch(LIVE + p)
            time.sleep(DELAY)
            if data is None:
                print("  MISSING", p)
                assets.discard(p)
                continue
            ext = posixpath.splitext(p)[1].lower()
            if ext in (".css", ".js"):
                kind = "css" if ext == ".css" else "js"
                data = localize(data.decode("utf8", "replace"), p.lstrip("/"), kind).encode("utf8")
            save(p.lstrip("/"), data)
        for l in todo_ext:
            data, _ = fetch(ext_assets[l])
            if data is None and "code.highcharts.com" in ext_assets[l]:  # blocks curl; jsdelivr mirrors the npm package
                data, _ = fetch("https://cdn.jsdelivr.net/npm/highcharts" + ext_assets[l].split("code.highcharts.com")[1])
            time.sleep(DELAY)
            if data is None:
                print("  MISSING ext", ext_assets[l])
                ext_assets.pop(l)
                continue
            if l.endswith((".css", ".js")):
                kind = "css" if l.endswith(".css") else "js"
                data = localize(data.decode("utf8", "replace"), l, kind).encode("utf8")
            save(l, data)


def main():
    urls_file = sys.argv[1]
    for u in open(urls_file).read().split():
        p = u.replace(LIVE, "") or "/"
        SITEMAP.add(p)
        if p not in pages_seen and not is_excluded(p):
            pages_seen[p] = page_out(p)
            page_queue.append(p)
    pages_seen["/404/"] = "404.html"
    page_queue.append("/404/")
    n = 0
    while page_queue:
        p = page_queue.pop(0)
        out = pages_seen[p]
        url = LIVE + (p if p != "/404/" else "/psyche-static-404-probe/")
        data, final = fetch(url, want_404=(p == "/404/"))
        if data is None:
            print("FAILED", p, flush=True)
            continue
        n += 1
        save(out, process_html(data.decode("utf8", "replace"), out).encode("utf8"))
        print(f"[{n}] {p} -> {out}  (queue {len(page_queue)}, assets {len(assets)})", flush=True)
        time.sleep(DELAY)
        drain_assets()
    drain_assets()
    print("pages:", n, "assets:", len(assets), "ext:", len(ext_assets))


if __name__ == "__main__":
    main()
