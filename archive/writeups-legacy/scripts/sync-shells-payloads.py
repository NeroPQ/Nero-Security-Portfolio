from pathlib import Path
from urllib.parse import quote
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SLUG = "htb-shells-payloads"

report = ROOT / "notes/writeups" / f"{SLUG}.md"
output = ROOT / "src/data/nero-shells-payloads-report.mjs"
evidence_root = ROOT / "public/writeups/evidence" / SLUG
manifest = evidence_root / "evidence-manifest.json"

markdown = report.read_text(encoding="utf-8")

# Verify that all 17 sections are in the canonical report.
section_matches = re.findall(
    r"(?m)^### (\d{2}) — (.+)$",
    markdown
)

actual_sections = [int(n) for n, _ in section_matches]

if actual_sections != list(range(1, 18)):
    raise SystemExit(
        "[ERROR] Report must contain all 17 "
        "sections in order. Found: " + str(actual_sections)
    )

# Only link files that actually exist and have a
# recognizable image signature.
def valid_image(path):
    try:
        prefix = path.read_bytes()[:12]
        suffix = path.suffix.lower()

        if suffix == ".png":
            return prefix.startswith(b"\x89PNG\r\n\x1a\n")

        if suffix in (".jpg", ".jpeg"):
            return prefix.startswith(b"\xff\xd8")

        if suffix == ".webp":
            return (
                prefix.startswith(b"RIFF")
                and prefix[8:12] == b"WEBP"
            )

    except OSError:
        pass

    return False


images_by_section = {}
evidence_items = []

if evidence_root.exists():
    for path in sorted(evidence_root.rglob("*")):
        if not path.is_file():
            continue

        if not valid_image(path):
            continue

        relative = path.relative_to(evidence_root)
        first_component = relative.parts[0]

        # Examples:
        # 07-metasploit.png
        # 07-metasploit/01-terminal.png
        match = re.match(
            r"^(0[1-9]|1[0-7])(?:[-_ .]|$)",
            first_component
        )

        section_number = int(match.group(1)) if match else None

        asset_url = (
            f"/writeups/evidence/{SLUG}/"
            + quote(relative.as_posix(), safe="/")
        )

        evidence_items.append({
            "filename": relative.as_posix(),
            "section": section_number,
            "url": asset_url,
            "verification": "REQUIRES_MANUAL_REVIEW"
        })

        if section_number:
            images_by_section.setdefault(
                section_number, []
            ).append({
                "url": asset_url,
                "filename": relative.name
            })

# Insert real existing images under their associated
# section heading in the rendered report.
rendered_markdown = markdown

for number in range(1, 18):
    images = images_by_section.get(number, [])

    if not images:
        continue

    insertion = ""

    for item in images:
        insertion += (
            "\n"
            f"![Local lab screenshot for section "
            f"{number:02d}; verification pending]"
            f"({item['url']})"
            "\n\n"
            f"*Evidence file: `{item['filename']}`. "
            "Lab attribution and technical meaning "
            "require manual verification.*\n"
        )

    section_pattern = (
        rf"(?m)^(### {number:02d} — [^\n]+)\n"
    )

    rendered_markdown, count = re.subn(
        section_pattern,
        lambda m: m.group(1) + "\n" + insertion + "\n",
        rendered_markdown,
        count=1
    )

    if count != 1:
        raise SystemExit(
            f"[ERROR] Cannot place images for section {number}"
        )

# Generate JavaScript module without modifying the
# original report text or manually escaping backticks.
output.write_text(
    "export const neroShellsPayloadsMarkdown = "
    + json.dumps(rendered_markdown, ensure_ascii=False)
    + ";\n",
    encoding="utf-8"
)

manifest.parent.mkdir(parents=True, exist_ok=True)

manifest.write_text(
    json.dumps(
        {
            "module": SLUG,
            "status": "EVIDENCE PENDING",
            "images": evidence_items
        },
        indent=2,
        ensure_ascii=False
    ) + "\n",
    encoding="utf-8"
)

print("[OK] Canonical Markdown words:", len(markdown.split()))
print("[OK] Section headings:", len(section_matches))
print("[OK] Existing screenshot files:", len(evidence_items))
print("[OK] Inline section images:", sum(
    len(items) for items in images_by_section.values()
))
print("[OK] Generated module:", output.relative_to(ROOT))
print("[OK] Evidence manifest:", manifest.relative_to(ROOT))
