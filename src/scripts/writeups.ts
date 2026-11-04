export {};

function initWriteupsPage() {
  const index = document.querySelector<HTMLElement>('[data-writeups-index]');
  if (index && index.dataset.wuBound !== 'true') {
    index.dataset.wuBound = 'true';
    const cards = [...index.querySelectorAll<HTMLElement>('[data-wu-slug]')];
    const search = index.querySelector<HTMLInputElement>('[data-writeup-search]');
    const buttons = [...index.querySelectorAll<HTMLButtonElement>('[data-writeup-filter]')];
    const count = index.querySelector<HTMLElement>('[data-writeup-count]');
    const empty = index.querySelector<HTMLElement>('[data-writeup-empty]');
    const reset = index.querySelector<HTMLButtonElement>('[data-writeup-reset]');
    const url = new URL(location.href);
    let platform = ['HTB', 'THM'].includes(url.searchParams.get('platform') || '') ? url.searchParams.get('platform')! : 'ALL';
    if (search) search.value = (url.searchParams.get('q') || '').slice(0, search.maxLength);

    function update() {
      const query = search?.value.trim().toLowerCase() || '';
      const terms = query.split(/\s+/).filter(Boolean);
      let visible = 0;
      for (const card of cards) {
        card.hidden = (platform !== 'ALL' && card.dataset.wuPlatform !== platform)
          || !terms.every(term => card.dataset.wuSearch?.includes(term));
        if (!card.hidden) visible++;
      }
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.writeupFilter === platform));
      if (count) count.textContent = visible === cards.length ? `${visible} ${visible === 1 ? 'report' : 'reports'}` : `${visible} of ${cards.length} reports`;
      if (empty) empty.hidden = visible > 0 || cards.length === 0;
      if (reset) reset.hidden = !query && platform === 'ALL';
      const nextUrl = new URL(location.href);
      if (query) nextUrl.searchParams.set('q', search!.value.trim()); else nextUrl.searchParams.delete('q');
      if (platform !== 'ALL') nextUrl.searchParams.set('platform', platform); else nextUrl.searchParams.delete('platform');
      if (nextUrl.href !== location.href) history.replaceState(history.state, '', nextUrl);
    }

    for (const button of buttons) button.addEventListener('click', () => { platform = button.dataset.writeupFilter || 'ALL'; update(); });
    search?.addEventListener('input', update);
    reset?.addEventListener('click', () => { platform = 'ALL'; if (search) { search.value = ''; search.focus(); } update(); });
    const tools = index.querySelector<HTMLElement>('[data-writeup-tools]');
    if (tools) tools.hidden = false;
    update();
  }

  // Code remains ordinary selectable text; copying is an enhancement for supported browsers.
  const status = document.querySelector<HTMLElement>('[data-copy-status]');
  document.querySelectorAll<HTMLElement>('.wu-markdown pre').forEach((pre, position) => {
    if (pre.parentElement?.classList.contains('wu-code-block')) return;
    const block = document.createElement('div');
    block.className = 'wu-code-block';
    pre.before(block);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wu-copy-code';
    button.textContent = 'Copy code';
    button.setAttribute('aria-label', `Copy code block ${position + 1}`);
    block.append(button, pre);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.textContent || pre.textContent || '');
        button.textContent = 'Copied';
        if (status) status.textContent = `Code block ${position + 1} copied to clipboard.`;
      } catch {
        if (status) status.textContent = 'Copy is unavailable. Select the code and copy it manually.';
        button.textContent = 'Select to copy';
      }
      window.setTimeout(() => { button.textContent = 'Copy code'; }, 2500);
    });
  });
}

initWriteupsPage();
document.addEventListener('astro:page-load', initWriteupsPage);