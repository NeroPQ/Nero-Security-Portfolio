// Read-only GitHub discovery, active nav synchronization & Retro Terminal Web Audio SFX Engine
const repo = 'NeroPQ/CVE-Research-Lab';
const baseKnownCves = ['CVE-2021-44228', 'CVE-2021-4034', 'CVE-2022-0847', 'CVE-2022-22965'];

/* ==========================================================================
   RETRO TERMINAL WEB AUDIO SYNTHESIZER (Zero external audio files required)
   Default: OFF (User-controlled via [SFX: OFF/ON] button in Header)
   ========================================================================== */
const sfx = (() => {
  let ctx = null;
  let enabled = false;
  try {
    enabled = localStorage.getItem('nero_sfx') === 'on';
  } catch {}

  function ensureContext() {
    if (!ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freqStart, freqEnd, durationMs = 28, type = 'square', gainVal = 0.022) {
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const audio = ensureContext();
    if (!audio) return;
    try {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const now = audio.currentTime;
      const dur = durationMs / 1000;
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(freqEnd, now + dur);
      }
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch {}
  }

  return {
    isEnabled: () => enabled,
    toggle() {
      enabled = !enabled;
      try {
        localStorage.setItem('nero_sfx', enabled ? 'on' : 'off');
      } catch {}
      if (enabled) {
        tone(587.33, 1174.66, 55, 'triangle', 0.035);
      }
      return enabled;
    },
    hover() {
      tone(960, 1280, 16, 'sine', 0.015);
    },
    click() {
      tone(520, 1040, 42, 'triangle', 0.028);
    },
    copy() {
      tone(660, 1320, 65, 'square', 0.025);
    },
  };
})();

async function updateResearchIndex() {
  const grid = document.querySelector('#research-grid');
  const note = document.querySelector('#live-note');
  if (!grid || grid.dataset.githubChecked === 'true') return;
  grid.dataset.githubChecked = 'true';

  const knownCves = new Set(baseKnownCves);
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const entries = await response.json();
    if (!Array.isArray(entries)) throw new Error('Invalid response');
    const folders = entries.filter((x) => x.type === 'dir' && /^CVE-\d{4}-\d+/.test(x.name));
    let added = 0;
    for (const entry of folders) {
      const m = entry.name.match(/^(CVE-\d{4}-\d+)(?:-(.*))?$/);
      if (!m || knownCves.has(m[1])) continue;
      knownCves.add(m[1]);
      const article = document.createElement('article');
      article.className = 'entry-card pixel-card';
      const num = document.createElement('div');
      num.className = 'entry-index';
      num.textContent = 'NEW';
      const info = document.createElement('div');
      info.className = 'entry-main';
      const meta = document.createElement('div');
      meta.className = 'entry-meta';
      meta.textContent = m[1] + ' · New repository entry (unreviewed)';
      const title = document.createElement('h3');
      const link = document.createElement('a');
      link.textContent = (m[2] || m[1]).replace(/-/g, ' ') + ' ↗';
      link.href = `https://github.com/${repo}/tree/main/${encodeURIComponent(entry.name)}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      title.append(link);
      const desc = document.createElement('p');
      desc.textContent =
        'A new CVE folder was detected in the public repository. Open the original report to verify scope and evidence.';
      info.append(meta, title, desc);
      article.append(num, info);
      grid.append(article);
      added++;
    }
    if (note) {
      note.textContent = `GitHub checked · ${folders.length} CVE folders found${added ? ` · ${added} new entry added` : ''}. New entries require manual review before being marked Verified.`;
    }
  } catch {
    if (note) note.textContent = 'Showing the curated portfolio snapshot. Live GitHub discovery is temporarily unavailable.';
  }
}

function bindMicroInteractions() {
  const sfxBtn = document.querySelector('#sfx-toggle');
  if (sfxBtn) {
    const syncBtn = () => {
      const on = sfx.isEnabled();
      sfxBtn.setAttribute('aria-pressed', String(on));
      sfxBtn.textContent = on ? 'SFX: ON' : 'SFX: OFF';
    };
    syncBtn();
    if (sfxBtn.dataset.bound !== 'true') {
      sfxBtn.dataset.bound = 'true';
      sfxBtn.addEventListener('click', () => {
        sfx.toggle();
        syncBtn();
      });
    }
  }

  const interactiveSelectors = '.main-header nav a, .entry-card, .project-entry, .wu-card, .primary-action, .secondary-action, .wu-filters button';
  document.querySelectorAll(interactiveSelectors).forEach((el) => {
    if (el.dataset.sfxBound === 'true') return;
    el.dataset.sfxBound = 'true';
    el.addEventListener('mouseenter', () => sfx.hover());
    el.addEventListener('click', () => sfx.click());
  });

  document.querySelectorAll('.wu-copy-code').forEach((btn) => {
    if (btn.dataset.sfxCopyBound === 'true') return;
    btn.dataset.sfxCopyBound = 'true';
    btn.addEventListener('click', () => sfx.copy());
  });
}

function initSitePage() {
  updateResearchIndex();
  const y = document.querySelector('#year');
  if (y) y.textContent = String(new Date().getFullYear());

  const path = location.pathname;
  for (const a of document.querySelectorAll('.main-header nav a')) {
    const u = new URL(a.href, location.origin);
    const isActive =
      (path === '/' && u.pathname === '/') ||
      (path !== '/' && u.pathname !== '/' && path.startsWith(u.pathname));
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  bindMicroInteractions();
}

initSitePage();
document.addEventListener('astro:page-load', initSitePage);
