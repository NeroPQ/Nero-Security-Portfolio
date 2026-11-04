from pathlib import Path
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'preview'

js = """
import { writeups } from './src/data/writeups.mjs';
import {
  writeupIndexMarkup,
  writeupDetailMarkup
} from './src/data/writeups-render.mjs';

console.log(JSON.stringify({
  writeups: writeupIndexMarkup(),
  ...Object.fromEntries(
    writeups.map(w => [
      'writeups/' + w.slug,
      writeupDetailMarkup(w)
    ])
  )
}));
"""

pages = json.loads(
    subprocess.check_output(
        ['node', '--input-type=module', '-e', js],
        cwd=ROOT,
        text=True
    )
)

template = (OUT / 'index.html').read_text(encoding='utf-8')

if '<main>' not in template or '</main>' not in template:
    raise RuntimeError(
        'Could not locate the main element in preview/index.html'
    )

head = template.split('<main>', 1)[0] + '<main>'
tail = '</main>' + template.split('</main>', 1)[1]

for slug, content in pages.items():
    target = OUT / slug / 'index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        head + content + tail,
        encoding='utf-8'
    )

# Đồng bộ navbar của toàn bộ website tĩnh
for page in OUT.rglob('index.html'):
    html = page.read_text(encoding='utf-8')

    if '<a href="/writeups/">Write-ups</a>' not in html:
        html = html.replace(
            '<a href="/about/">About</a>',
            '<a href="/writeups/">Write-ups</a>'
            '<a href="/about/">About</a>'
        )

    page.write_text(html, encoding='utf-8')

# Copy ảnh evidence nếu có
evidence_src = ROOT / 'public/writeups/evidence'
evidence_dst = OUT / 'writeups/evidence'

if evidence_src.exists():
    shutil.copytree(
        evidence_src,
        evidence_dst,
        dirs_exist_ok=True
    )

print(f'[+] Generated {len(pages)} write-up pages')
