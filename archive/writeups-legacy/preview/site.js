// Read-only GitHub discovery; known entries are curated from src/data/cves.mjs.
const repo='NeroPQ/CVE-Research-Lab';
const knownCves=new Set(['CVE-2021-44228','CVE-2021-4034','CVE-2022-0847','CVE-2022-22965']);
const grid=document.querySelector('#research-grid');
const note=document.querySelector('#live-note');
async function updateResearchIndex(){
 if(!grid)return;
 try{
  const response=await fetch(`https://api.github.com/repos/${repo}/contents/`,{headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const entries=await response.json();
  if(!Array.isArray(entries))throw new Error('Invalid response');
  const folders=entries.filter(x=>x.type==='dir'&&/^CVE-\d{4}-\d+/.test(x.name));
  let added=0;
  for(const entry of folders){
   const m=entry.name.match(/^(CVE-\d{4}-\d+)(?:-(.*))?$/);
   if(!m||knownCves.has(m[1]))continue;
   knownCves.add(m[1]);
   const article=document.createElement('article');article.className='entry-card';
   const num=document.createElement('div');num.className='entry-index';num.textContent='NEW';
   const info=document.createElement('div');info.className='entry-main';
   const meta=document.createElement('div');meta.className='entry-meta';meta.textContent=m[1]+' · New repository entry (unreviewed)';
   const title=document.createElement('h3');const link=document.createElement('a');link.textContent=(m[2]||m[1]).replace(/-/g,' ')+' ↗';link.href=`https://github.com/${repo}/tree/main/${encodeURIComponent(entry.name)}`;link.target='_blank';link.rel='noopener noreferrer';title.append(link);
   const desc=document.createElement('p');desc.textContent='A new CVE folder was detected in the public repository. Open the original report to verify scope and evidence.';
   info.append(meta,title,desc);article.append(num,info);grid.append(article);added++;
  }
  if(note)note.textContent=`GitHub checked · ${folders.length} CVE folders found${added?` · ${added} new entry added`:''}. New entries require manual review before being marked Verified.`;
 }catch{if(note)note.textContent='Showing the curated portfolio snapshot. Live GitHub discovery is temporarily unavailable.';}
}
updateResearchIndex();
const y=document.querySelector('#year');if(y)y.textContent=new Date().getFullYear();
const path=location.pathname;
for(const a of document.querySelectorAll('.main-header nav a')){
 const u=new URL(a.href,location.origin);
 if((path==='/'&&u.pathname==='/')||(path!=='/'&&u.pathname!=='/'&&path.startsWith(u.pathname)))a.classList.add('active');
}

// WRITEUPS_FILTER_V1
document.querySelectorAll('[data-writeup-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const selected = button.dataset.writeupFilter;

    document.querySelectorAll('[data-writeup-filter]').forEach(b => {
      b.setAttribute('aria-pressed', String(b === button));
    });

    document.querySelectorAll('[data-wu-platform]').forEach(card => {
      card.hidden =
        selected !== 'ALL' &&
        card.dataset.wuPlatform !== selected;
    });
  });
});
