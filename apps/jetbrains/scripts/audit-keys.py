#!/usr/bin/env python3
"""Find where a TextAttributesKey external name really exists inside IDE distributions.

A key counts as found when it is
  - a String constant of a class that also calls createTextAttributesKey (the key holder), or
  - an <option name="KEY"> in a scheme XML inside a jar or on disk.

Usage (pure stdlib, any OS):
  audit-keys.py --ide "IC 2025.2.6.4=<dir>" --ide "PY 2025.2=<dir>" [--plugin "Rust 0.5=<dir or zip>"]
                (--keys keys.txt --out verified-keys.json [--merge] | --dump all-keys.json)
"""
import argparse, json, os, re, struct, sys, zipfile

CALL = b"createTextAttributesKey"


def string_constants(data):
    """Return (string constants, whether the class mentions createTextAttributesKey), or None."""
    if data[:4] != b"\xca\xfe\xba\xbe":
        return None
    count = struct.unpack(">H", data[8:10])[0]
    pos, i, utf8, strings, calls = 10, 1, {}, [], False
    while i < count:
        tag = data[pos]
        if tag == 1:
            (n,) = struct.unpack(">H", data[pos + 1 : pos + 3])
            raw = data[pos + 3 : pos + 3 + n]
            utf8[i] = raw
            calls = calls or raw == CALL
            pos += 3 + n
        elif tag == 8:
            strings.append(struct.unpack(">H", data[pos + 1 : pos + 3])[0])
            pos += 3
        elif tag in (3, 4, 9, 10, 11, 12, 17, 18):
            pos += 5
        elif tag in (5, 6):
            pos += 9
            i += 1
        elif tag in (7, 16, 19, 20):
            pos += 3
        elif tag == 15:
            pos += 4
        else:
            return None
        i += 1
    if not calls:
        return [], False
    return [utf8[s].decode("utf-8", "replace") for s in strings if s in utf8], True


KEY = re.compile(r"^[A-Za-z][A-Za-z0-9_.]*$")
OPTION = re.compile(rb'<option name="([A-Za-z][A-Za-z0-9_.]*)"')


def scan_jar(jar, found, label, rel):
    try:
        zf = zipfile.ZipFile(jar)
    except (zipfile.BadZipFile, OSError):
        return
    with zf:
        for info in zf.infolist():
            name = info.filename
            if name.endswith(".class") and info.file_size < 400_000:
                parsed = string_constants(zf.read(name))
                if parsed and parsed[1]:
                    for s in parsed[0]:
                        if KEY.match(s):
                            found.setdefault(s, {}).setdefault(label, []).append(f"{rel}!{name}")
            elif name.endswith(".xml") and ("scheme" in name.lower() or "colors" in name.lower() or "/" not in name):
                for key in OPTION.findall(zf.read(name)):
                    found.setdefault(key.decode(), {}).setdefault(label, []).append(f"{rel}!{name}")


def scan_tree(root, found, label):
    if zipfile.is_zipfile(root):
        scan_jar(root, found, label, os.path.basename(root))
        # a plugin zip holds jars inside it
        with zipfile.ZipFile(root) as zf:
            import io
            for info in zf.infolist():
                if info.filename.endswith(".jar"):
                    scan_jar(io.BytesIO(zf.read(info)), found, label, info.filename)
        return
    for base, _, files in os.walk(root):
        for f in files:
            path = os.path.join(base, f)
            rel = os.path.relpath(path, root).replace(os.sep, "/")
            if f.endswith(".jar"):
                scan_jar(path, found, label, rel)
            elif f.endswith(".xml") and re.search(r"(scheme|colors)", rel, re.I) and os.path.getsize(path) < 4_000_000:
                with open(path, "rb") as fh:
                    for key in OPTION.findall(fh.read()):
                        found.setdefault(key.decode(), {}).setdefault(label, []).append(rel)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ide", action="append", default=[], help='"label=path" (IDE root, plugin dir or plugin zip)')
    ap.add_argument("--keys", help="file with one key per line; output only these")
    ap.add_argument("--out")
    ap.add_argument("--dump", help="write every key found")
    ap.add_argument("--merge", action="store_true", help="add to an existing --out file (one run per machine or OS)")
    args = ap.parse_args()
    found = {}
    for spec in args.ide:
        label, path = spec.split("=", 1)
        print("scanning", label, path, file=sys.stderr)
        scan_tree(path, found, label)
    if args.dump:
        with open(args.dump, "w", encoding="utf-8") as fh:
            json.dump({k: {p: list(dict.fromkeys(v))[:2] for p, v in sorted(w.items())} for k, w in sorted(found.items())}, fh, indent=0)
    if args.keys:
        wanted = [k.strip() for k in open(args.keys, encoding="utf-8") if k.strip()]
        out = {k: {p: list(dict.fromkeys(v))[:2] for p, v in sorted(found.get(k, {}).items())} for k in sorted(set(wanted))}
        if args.merge and os.path.exists(args.out):
            with open(args.out, encoding="utf-8") as fh:
                old = json.load(fh)
            for k in out:
                out[k] = {**old.get(k, {}), **out[k]}
        with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(out, fh, indent=1, ensure_ascii=False)
            fh.write("\n")


if __name__ == "__main__":
    main()
