#!/usr/bin/env python3
"""NERO.SEC Module 39 local draft renderer.

Uses one canonical Markdown source.
Patches the existing built route only in draft-preview mode.
No source entry, index, CVE page or live site is overwritten.
"""

from pathlib import Path
from html.parser import HTMLParser
from html import escape, unescape
import os
import re
import sys

SLUG = "htb-metasploit"
REPORT = Path(f"drafts/writeups/{SLUG}/report.md")
TARGETS = [
    Path(f"dist/writeups/{SLUG}/index.html"),
    Path(f"preview/writeups/{SLUG}/index.html"),
]

EXPECTED = [
    "Preface",
    "Introduction to Metasploit",
    "Introduction to MSFconsole",
    "Modules",
    "Targets",
    "Payloads",
    "Encoders",
    "Databases",
    "Plugins & Mixins",
    "Sessions & Jobs",
    "Meterpreter",
    "Writing & Importing Modules",
    "Introduction to MSFVenom",
    "Firewall and IDS/IPS evasion",
    "Metasploit-Framework Updates",
]

def inline(text):
    text = escape(text)

    text = re.sub(
        r"`([^`]+)`",
        lambda m: "<code>" + m.group(1) + "</code>",
        text
    )

    text = re.sub(
        r"\*\*(.+?)\*\*",
        r"<strong>\1</strong>",
        text
    )

    text = re.sub(
        r"\[([^\]]+)\]\((https?://[^)\s]+)\)",
        lambda m: (
            '<a href="' + m.group(2)
            + '" rel="noopener noreferrer">'
            + m.group(1) + "</a>"
        ),
        text
    )

    return text

def render_markdown(md):
    out = []
    para = []
    in_code = False
    code_lang = ""
    listing = None

    def flush_para():
        if para:
            out.append(
                "<p>" + inline(" ".join(para)) + "</p>"
            )
            para.clear()

    def close_list():
        nonlocal listing
        if listing:
            out.append(f"</{listing}>")
            listing = None

    for line in md.splitlines():

        fence = re.match(r"^```([A-Za-z0-9_-]*)\s*$", line)
        if fence:
            flush_para()
            close_list()

            if in_code:
                out.append("</code></pre>")
                in_code = False
                code_lang = ""
            else:
                in_code = True
                code_lang = fence.group(1)
                cls = (
                    f' class="language-{code_lang}"'
                    if code_lang else ""
                )
                out.append("<pre><code" + cls + ">")
            continue

        if in_code:
            out.append(escape(line) + "\n")
            continue

        stripped = line.strip()

        if not stripped:
            flush_para()
            close_list()
            continue

        if stripped == "---":
            flush_para()
            close_list()
            out.append("<hr>")
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading:
            flush_para()
            close_list()
            level = len(heading.group(1))
            value = heading.group(2)
            section = re.match(r"^(0[1-9]|1[0-5])\.\s+", value)
            anchor = (
                f' id="section-{section.group(1)}"'
                if section else ""
            )
            out.append(
                f"<h{level}{anchor}>"
                + inline(value)
                + f"</h{level}>"
            )
            continue

        quote = re.match(r"^>\s*(.*)$", line)
        if quote:
            flush_para()
            close_list()
            out.append(
                "<blockquote><p>"
                + inline(quote.group(1))
                + "</p></blockquote>"
            )
            continue

        bullet = re.match(r"^\s*-\s+(.+)$", line)
        numbered = re.match(r"^\s*\d+\.\s+(.+)$", line)

        if bullet or numbered:
            flush_para()
            required = "ul" if bullet else "ol"
            if listing != required:
                close_list()
                out.append(f"<{required}>")
                listing = required
            value = (bullet or numbered).group(1)
            out.append("<li>" + inline(value) + "</li>")
            continue

        close_list()
        para.append(stripped.rstrip("  "))

    flush_para()
    close_list()

    if in_code:
        raise ValueError("Unclosed Markdown code fence")

    return "\n".join(out)

class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)

def verify_report(md):
    sections = re.findall(
        r"^##\s+(0[1-9]|1[0-5])\.\s+(.+)$",
        md,
        flags=re.MULTILINE
    )

    if len(sections) != 15:
        raise RuntimeError(
            f"Expected 15 module sections, found {len(sections)}"
        )

    if [int(s[0]) for s in sections] != list(range(1, 16)):
        raise RuntimeError("Incorrect section order")

    for (_, actual), expected in zip(sections, EXPECTED):
        if not actual.startswith(expected):
            raise RuntimeError(
                f"Incorrect section title: {actual}"
            )

    for marker in (
        "FortiLogger version 4.4.2.2",
        "Meterpreter session 2 opened",
        "Incorrect function",
        "EVIDENCE PENDING",
        "EternalRomance",
        "Apache Druid",
        "elFinder",
        "Baron Samedit",
    ):
        if marker.lower() not in md.lower():
            raise RuntimeError(f"Missing report content: {marker}")

    if len(md.split()) < 3000:
        raise RuntimeError("Full report appears truncated")

    print(
        "[OK] Canonical report:",
        len(sections), "sections,",
        len(md.split()), "words"
    )

def build_article(md):
    body = render_markdown(md)

    toc = "\n".join(
        f'<a href="#section-{i:02d}">'
        f'{i:02d}. {escape(name)}</a>'
        for i, name in enumerate(EXPECTED, 1)
    )

    style = """
    <style>
    .nero-module39 {
      color: inherit;
      max-width: 980px;
      margin: 0 auto;
      padding: 2rem 1.25rem 5rem;
      font-family: inherit;
      line-height: 1.8;
      overflow-wrap: anywhere;
    }
    .nero-module39 h1 {
      font-size: clamp(1.9rem, 4vw, 2.8rem);
      line-height: 1.2;
      margin-bottom: 1.4rem;
      letter-spacing: -.025em;
    }
    .nero-module39 h2 {
      font-size: clamp(1.35rem, 3vw, 1.9rem);
      line-height: 1.3;
      margin: 3.5rem 0 1.2rem;
      padding-bottom: .65rem;
      border-bottom: 1px solid currentColor;
    }
    .nero-module39 h3 {
      font-size: 1.15rem;
      margin: 2rem 0 .8rem;
    }
    .nero-module39 p { margin: .85rem 0; }
    .nero-module39 ul,
    .nero-module39 ol {
      padding-left: 1.6rem;
      margin: 1rem 0;
    }
    .nero-module39 li { margin: .45rem 0; }
    .nero-module39 pre {
      background: #111827;
      color: #e5e7eb;
      border-radius: 12px;
      padding: 1.25rem;
      overflow-x: auto;
      font-size: .875rem;
      line-height: 1.65;
      margin: 1.2rem 0;
      white-space: pre;
    }
    .nero-module39 :not(pre)>code {
      background: rgba(128,128,128,.13);
      border-radius: 4px;
      padding: .12rem .3rem;
      font-size: .92em;
      overflow-wrap: anywhere;
    }
    .nero-module39 blockquote {
      border-left: 3px solid currentColor;
      padding: .5rem 1rem;
      margin: 1.2rem 0;
      opacity: .85;
      background: rgba(128,128,128,.06);
    }
    .nero-module39 a {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .nero-module39 nav {
      display: grid;
      grid-template-columns: repeat(auto-fit,minmax(230px,1fr));
      gap: .45rem;
      padding: 1.25rem;
      border: 1px solid rgba(128,128,128,.3);
      border-radius: 12px;
      margin: 2rem 0;
    }
    .nero-module39 nav a {
      text-decoration: none;
      padding: .25rem .5rem;
    }
    .nero-module39 nav a:hover {
      text-decoration: underline;
    }
    .nero-module39 .draft-status {
      margin: 1rem 0 2rem;
      padding: .9rem 1.1rem;
      border: 1px solid rgba(128,128,128,.45);
      border-radius: 10px;
    }
    .nero-module39 hr {
      border: 0;
      border-top: 1px solid rgba(128,128,128,.28);
      margin: 2rem 0;
    }
    @media (max-width: 640px) {
      .nero-module39 { padding: 1rem .6rem 3rem; }
      .nero-module39 pre { font-size: .76rem; }
    }
    </style>
    """

    return (
        '<article class="nero-module39">'
        + style
        + '<div class="draft-status">'
        + '<strong>Local draft — Evidence Pending.</strong> '
        + 'This is not a published or fully verified lab report.'
        + '</div>'
        + '<nav aria-label="Module sections">'
        + toc + '</nav>'
        + body
        + '</article>'
    )

def replace_main(original, article):
    opening = list(
        re.finditer(
            r"<main\b[^>]*>",
            original,
            flags=re.IGNORECASE | re.DOTALL
        )
    )
    closing = list(
        re.finditer(
            r"</main\s*>",
            original,
            flags=re.IGNORECASE
        )
    )

    if len(opening) != 1 or len(closing) != 1:
        raise RuntimeError(
            "Expected exactly one <main> container. "
            "Refusing unsafe page modification."
        )

    start = opening[0].end()
    end = closing[0].start()

    if start >= end:
        raise RuntimeError("Invalid page structure")

    updated = (
        original[:start]
        + "\n" + article + "\n"
        + original[end:]
    )

    if "</head>" not in updated:
        raise RuntimeError("Missing HTML head")

    updated = updated.replace(
        "</head>",
        '<meta name="robots" content="noindex,nofollow">'
        "</head>",
        1
    )

    return updated

def verify_html(html_text, original_md):
    if html_text.count('class="nero-module39"') != 1:
        raise RuntimeError("Duplicate or missing module article")

    if len(re.findall(
        r'<h2 id="section-\d{2}">',
        html_text
    )) != 15:
        raise RuntimeError("Missing module section headings")

    parser = VisibleText()
    parser.feed(html_text)
    visible = unescape(" ".join(parser.parts))

    for marker in (
        "Using the Metasploit Framework",
        "FortiLogger version 4.4.2.2",
        "Meterpreter session 2 opened",
        "Incorrect function",
        "Evidence Pending",
        "EternalRomance",
        "Apache Druid",
        "elFinder",
        "MSFVenom",
    ):
        if marker.lower() not in visible.lower():
            raise RuntimeError(
                f"Missing rendered content: {marker}"
            )

    rendered_words = len(visible.split())
    source_words = len(original_md.split())

    if rendered_words < source_words * 0.85:
        raise RuntimeError(
            "Rendered report is unexpectedly shorter "
            "than canonical Markdown"
        )

    return rendered_words

def main():
    if not REPORT.exists():
        raise RuntimeError("Canonical report missing")

    markdown = REPORT.read_text(encoding="utf-8")
    verify_report(markdown)

    if os.environ.get("NERO_DRAFT_PREVIEW") != "1":
        print("[INFO] Public build: draft override disabled.")
        return

    article = build_article(markdown)

    found = False

    for target in TARGETS:
        if not target.exists():
            continue

        found = True
        original = target.read_text(encoding="utf-8")
        updated = replace_main(original, article)
        words = verify_html(updated, markdown)

        target.write_text(updated, encoding="utf-8")

        print("[OK] Draft rendered:", target)
        print("[OK] Visible text words:", words)
        print("[OK] Sections: 15/15")
        print("[OK] Draft is marked noindex,nofollow")

    if not found:
        raise RuntimeError(
            "Existing htb-metasploit built route missing. "
            "No other route was modified."
        )

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("[ERROR]", error, file=sys.stderr)
        sys.exit(1)
