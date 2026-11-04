#!/usr/bin/env python3
"""Generate static preview/deploy folder from shared Astro/JS render modules."""
from pathlib import Path
import subprocess, json, shutil
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'preview'
OUT.mkdir(exist_ok=True)
js = """import {homeMarkup,researchMarkup,projectsMarkup,aboutMarkup,caseMarkup} from './src/data/render.mjs'; import {cves} from './src/data/cves.mjs'; console.log(JSON.stringify({home:homeMarkup(), research:researchMarkup(), projects:projectsMarkup(), about:aboutMarkup(), ...Object.fromEntries(cves.map(c=>['research/'+c.slug,caseMarkup(c)]))}))"""
body = json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT,text=True))
head='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#11151d"><meta name="description" content="Nero — Cybersecurity research notes, detection engineering, practical labs and documented CVEs."><link rel="icon" href="/favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/styles.css"><title>Nero Security — Cybersecurity Portfolio</title></head><body><header class="main-header"><div class="header-inner"><a class="brand" href="/">N<span>ERO.</span><small>SECURITY NOTES</small></a><nav aria-label="Primary navigation"><a href="/">Home</a><a href="/research/">Research</a><a href="/projects/">Projects</a><a href="/about/">About</a></nav><a class="header-link" href="https://github.com/NeroPQ" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></header><main>'''
foot='''</main><footer class="main-footer"><div><strong>NERO.SEC</strong><span>Research · Build · Document</span></div><small>© <span id="year">2026</span> Phan Thien Quang · Educational research in authorized labs.</small><a href="#top">Back to top ↑</a></footer><script src="/site.js" defer></script></body></html>'''
for k,text in body.items():
  path=OUT/('index.html' if k=='home' else f'{k}/index.html')
  path.parent.mkdir(parents=True,exist_ok=True)
  path.write_text(head+text+foot,encoding='utf8')
# Retain existing four detailed reports from the previous source package; generate if missing.
for f in ['styles.css','site.js','favicon.svg','robots.txt']:
 shutil.copy2(ROOT/'public'/f,OUT/f)
print('Generated:',*[f'{key}: {len(value)} chars' for key,value in body.items()])


# WRITEUPS_BUILD_EXTENSION_V1
import subprocess as _wu_process

_wu_process.run(
    [
        "python3",
        str(ROOT / "scripts/patch_writeups_static.py")
    ],
    check=True
)
