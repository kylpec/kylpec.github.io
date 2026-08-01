// Full-bleed elements use var(--vw100) instead of 100vw so dividers reach the
// true edge of the visible viewport. Raw 100vw includes the scrollbar track,
// which makes full-bleed borders fall short of (or overshoot) the real edge
// depending on OS/browser scrollbar behavior. document.documentElement.clientWidth
// always excludes the scrollbar, so it's the reliable value to use here.
function setViewportWidthVar(){
  document.documentElement.style.setProperty('--vw100', document.documentElement.clientWidth + 'px');
}
setViewportWidthVar();
document.addEventListener('DOMContentLoaded', setViewportWidthVar);
window.addEventListener('load', setViewportWidthVar);
window.addEventListener('resize', setViewportWidthVar);

// .nav-links is now position:fixed directly (anchored like .theme-toggle,
// so the Work/Play/About links stay put while the page scrolls underneath
// instead of scrolling away). Fixed elements are taken out of normal
// flow, so main needs padding-top equal to the nav's real rendered
// height to keep content from sliding underneath it. Measuring it here
// (rather than hardcoding a pixel value in CSS) keeps it accurate even
// as the nav's own padding/gutter changes across breakpoints.
function setNavHeightVar(){
  const nav = document.querySelector('.nav-links');
  if(!nav) return;
  document.documentElement.style.setProperty('--nav-height', nav.offsetHeight + 'px');
}
setNavHeightVar();
document.addEventListener('DOMContentLoaded', setNavHeightVar);
window.addEventListener('load', setNavHeightVar);
window.addEventListener('resize', setNavHeightVar);

// Plays scroll-triggered diagram animations (e.g. the grid explainer on the
// FirstAm case study) once, the first time each [data-animate] element
// scrolls into view, rather than on page load when it's likely off-screen.
function initScrollAnimations(){
  const targets = document.querySelectorAll('[data-animate]');
  if(!targets.length) return;
  if(!('IntersectionObserver' in window)){
    targets.forEach(t => t.classList.add('in-view'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });
  targets.forEach(t => observer.observe(t));
}
document.addEventListener('DOMContentLoaded', initScrollAnimations);

// Fades/slides page "components" smoothly into place as the user scrolls,
// site-wide. Rather than hand-tagging every block in every HTML file, this
// selects a broad, centrally-maintained set of elements — the hero, work
// list cards, about-page blocks, and every top-level piece of each case
// study body (headings, copy, photo grids, split sections, etc.) — and
// tags them with [data-reveal] at runtime. New sections added later pick
// up the treatment automatically as long as they land inside one of these
// existing containers, without needing any per-page markup changes.
// Separate from initScrollAnimations/[data-animate] above, which drives a
// specific looping diagram animation, not this general fade-up.
function initScrollReveal(){
  const selector = [
    '.hero', '.work-head', '.project-card',
    '.about-intro > *', '.cap-exp-grid > *',
    '.project-detail-head', '.project-detail-hero', '.project-detail-body > *'
  ].join(',');
  const targets = Array.from(document.querySelectorAll(selector));
  if(!targets.length) return;
  targets.forEach(el => el.setAttribute('data-reveal', ''));
  if(!('IntersectionObserver' in window)){
    targets.forEach(el => el.classList.add('reveal-in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('reveal-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(el => observer.observe(el));
}
document.addEventListener('DOMContentLoaded', initScrollReveal);

// Scroll-linked parallax for specific photos (opted in via
// [data-parallax="<px>"], not applied site-wide). Translates each photo
// vertically inside its fixed frame based on how far its center sits from
// the viewport's center, so it drifts inside the frame rather than the
// frame itself moving. Skipped entirely under prefers-reduced-motion,
// matching the rest of the site's motion.
//
// Position is measured with the transform cleared and cached once (on
// load/resize), then every scroll update computes purely from that cached
// value plus the current scrollY — never from a fresh getBoundingClientRect()
// while a transform is already applied. Reading the live rect while a
// transform is active is self-referential (the rect reflects the *previous*
// transform, so the next transform is computed from an already-shifted
// position), which converges to a stuck offset after a screen or two of
// scrolling instead of continuing to track — that was the "stops moving
// after one scroll through" bug.
function initParallax(){
  const els = Array.from(document.querySelectorAll('[data-parallax]'));
  if(!els.length) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function measure(){
    els.forEach(el => { el.style.transform = 'none'; });
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      el._parallaxTop = rect.top + window.scrollY;
      el._parallaxHeight = rect.height;
    });
  }

  let ticking = false;
  function update(){
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const scrollY = window.scrollY;
    els.forEach(el => {
      const requested = parseFloat(el.getAttribute('data-parallax')) || 16;
      // Most frames have a 44%-oversize buffer (22% per side — see
      // style.css), so by default cap the shift at 18% of the frame's
      // own height as a safety margin below that, however large
      // data-parallax asks for. This means the requested strength is
      // honored in full on any frame big enough to support it (e.g. the
      // desktop hero) but never clips a smaller frame (e.g. a narrow
      // mobile scatter photo). Elements with a smaller buffer (e.g. the
      // hero images, zoomed only 30%/15%-per-side so they still read as
      // "the whole photo") specify their own safe fraction via
      // data-parallax-buffer="<percent>" to match.
      const bufferPct = parseFloat(el.getAttribute('data-parallax-buffer'));
      const bufferFraction = isNaN(bufferPct) ? 0.18 : (bufferPct / 100);
      const strength = Math.min(requested, (el._parallaxHeight || 0) * bufferFraction);
      const top = el._parallaxTop - scrollY;
      const center = top + (el._parallaxHeight || 0) / 2;
      const progress = Math.max(-1, Math.min(1, (center - vh / 2) / vh));
      el.style.transform = `translateY(${(progress * strength).toFixed(2)}px)`;
    });
    ticking = false;
  }
  function onScroll(){
    if(!ticking){ window.requestAnimationFrame(update); ticking = true; }
  }
  function onResize(){ measure(); update(); }

  measure();
  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  update();
}
document.addEventListener('DOMContentLoaded', initParallax);

// Shows .scroll-top once the user has scrolled past 20% of the
// scrollable page height, and smooth-scrolls back to top on click
// (falling back to an instant jump under prefers-reduced-motion, matching
// the rest of the site's motion handling).
function initScrollTop(){
  const btns = document.querySelectorAll('.scroll-top');
  if(!btns.length) return;
  function updateVisibility(){
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    btns.forEach(b => b.classList.toggle('is-visible', progress > 0.2));
  }
  btns.forEach(b => b.addEventListener('click', () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top:0, behavior: reduced ? 'auto' : 'smooth' });
  }));
  window.addEventListener('scroll', updateVisibility, { passive:true });
  window.addEventListener('resize', updateVisibility);
  updateVisibility();
}
document.addEventListener('DOMContentLoaded', initScrollTop);

// Aligns .nav-current-dot under whichever nav link has aria-current="page".
// It's a separate fixed element (not a ::after on the link — see the CSS
// comment on .nav-current-dot for why), so its position has to be measured
// and set in JS rather than just following the link via normal flow.
function positionNavDot(){
  const dot = document.querySelector('.nav-current-dot');
  const active = document.querySelector('.nav-links a[aria-current="page"]');
  if(!dot || !active) return;
  const rect = active.getBoundingClientRect();
  dot.style.left = (rect.left + rect.width / 2) + 'px';
  dot.style.top = (rect.bottom + 6) + 'px';
}
positionNavDot();
document.addEventListener('DOMContentLoaded', positionNavDot);
window.addEventListener('load', positionNavDot);
window.addEventListener('resize', positionNavDot);

// Counts each .stat-number up from 0 to its data-count value the first
// time it scrolls into view (once, like initScrollAnimations above).
// Decimal precision is inferred from data-count itself ("4.9" animates
// with one decimal place, "94" with none) so each stat doesn't need its
// own separate formatting flag. Skips straight to the final value under
// prefers-reduced-motion, matching initParallax's own handling of that
// preference.
function initStatCounters(){
  const stats = document.querySelectorAll('.stat-number[data-count]');
  if(!stats.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animate(el){
    const target = parseFloat(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const decimals = el.getAttribute('data-count').includes('.') ? 1 : 0;
    if(reduced || isNaN(target)){
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    const duration = 1200;
    const start = performance.now();
    function tick(now){
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if(progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if(!('IntersectionObserver' in window)){
    stats.forEach(animate);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  stats.forEach(el => observer.observe(el));
}
document.addEventListener('DOMContentLoaded', initStatCounters);

function toggleTheme(btn){
  const isNowLight = document.documentElement.classList.toggle('light');
  document.querySelectorAll('.theme-toggle').forEach(b => {
    b.setAttribute('aria-label', isNowLight ? 'Switch to dark mode' : 'Switch to light mode');
  });
  // persists the choice so it carries over to whichever page the user
  // navigates to next — the inline script in each page's <head> reads
  // this same key before first paint to avoid a light-then-dark flash
  try{ localStorage.setItem('theme', isNowLight ? 'light' : 'dark'); }catch(e){}
  if(typeof updateBgFade === 'function') updateBgFade();
}

// Removes the bottom border from every card in the true last row of the project
// grid, whichever cards those turn out to be — works for any project count and
// any column layout (1, 2, or 3 columns) since it measures actual rendered
// position rather than assuming a fixed remainder.
function updateLastRowBorders(){
  const cards = document.querySelectorAll('.project-card');
  if(!cards.length) return;
  let maxTop = -Infinity;
  cards.forEach(c => { if(c.offsetTop > maxTop) maxTop = c.offsetTop; });
  cards.forEach(c => {
    c.classList.toggle('no-bottom-border', c.offsetTop === maxTop);
  });
}
updateLastRowBorders();
document.addEventListener('DOMContentLoaded', updateLastRowBorders);
window.addEventListener('load', updateLastRowBorders);
window.addEventListener('resize', updateLastRowBorders);

// Flat, static background matching the current theme — no scroll-based fading.
function isLightMode(){ return document.documentElement.classList.contains('light'); }

function updateBgFade(){
  const color = isLightMode() ? '#F8F3EA' : '#0E0E0E';
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
  // keeps iOS/Android's own browser-chrome color (status bar, address
  // bar) matched to the page background so it doesn't read as a visibly
  // different-colored strip above the site — same color values as above,
  // just applied to the theme-color meta tag rather than an element.
  const themeColorMeta = document.getElementById('theme-color-meta');
  if(themeColorMeta) themeColorMeta.setAttribute('content', color);
}
updateBgFade();
document.addEventListener('DOMContentLoaded', updateBgFade);
window.addEventListener('load', updateBgFade);

// Generic client-side password gate. Note this is a soft deterrent, not
// real security — the password and the gated markup both ship in the
// page source, so anyone determined enough can read them via view-source.
// It's meant to keep NDA'd client work out of casual browsing/search
// indexing (paired with a noindex meta tag on the gated page), not to
// withstand an actual attacker. For content that actually needs to stay
// unreadable without the password, use initEncryptedGates below instead.
// Usage: <div data-password-gate="thepassword" data-gate-content="idOfContentToReveal">
function initPasswordGates(){
  document.querySelectorAll('[data-password-gate]').forEach(gate => {
    const pw = gate.getAttribute('data-password-gate');
    const content = document.getElementById(gate.getAttribute('data-gate-content'));
    const storageKey = 'gate-unlocked:' + (gate.id || pw);
    const form = gate.querySelector('form');
    const input = gate.querySelector('input[type="password"]');
    const error = gate.querySelector('.password-gate-error');

    function unlock(){
      gate.hidden = true;
      if(content) content.hidden = false;
    }

    if(sessionStorage.getItem(storageKey) === 'true'){
      unlock();
      return;
    }

    if(form){
      form.addEventListener('submit', e => {
        e.preventDefault();
        if(input && input.value === pw){
          sessionStorage.setItem(storageKey, 'true');
          unlock();
        } else {
          if(error) error.hidden = false;
          if(input){ input.value = ''; input.focus(); }
        }
      });
    }
  });
}
document.addEventListener('DOMContentLoaded', initPasswordGates);

// Real client-side encryption gate — unlike initPasswordGates above, the
// protected markup never ships in the page source in readable form at
// all. It's AES-GCM ciphertext (key derived from the password via
// PBKDF2-SHA256), embedded in a <script type="application/json"> tag
// alongside the gate. Without the correct password there's nothing to
// view-source or inspect-element your way around — decryption genuinely
// fails (AES-GCM's built-in authentication tag catches a wrong key), so
// there's no separate "check the password" step to bypass.
//
// The ciphertext is generated offline (a Node script using the same
// Web Crypto API, not shipped to the site) — this function only ever
// decrypts, never encrypts.
//
// Because the gated markup doesn't exist in the DOM until decrypted, any
// page behavior that wires itself up by querying the DOM on
// DOMContentLoaded (scroll-reveal, parallax) runs before this content
// exists and finds nothing to do. Re-invoking those init functions after
// a successful unlock (they're written to be safely callable more than
// once) picks up the newly-injected elements so this content gets the
// same enhancements as every other project page.
//
// Deliberately asks for the password on every visit — nothing is
// remembered between page loads (not even for the rest of the browser
// session), so returning to this page later always re-prompts.
//
// Usage: <div data-encrypted-gate data-gate-content="idOfEmptyContainer">
//        + <script type="application/json" id="idOfEmptyContainer-cipher">
//            {"salt":"...","iv":"...","ciphertext":"...","iterations":200000}
//          </script>
function initEncryptedGates(){
  document.querySelectorAll('[data-encrypted-gate]').forEach(gate => {
    const contentId = gate.getAttribute('data-gate-content');
    const content = document.getElementById(contentId);
    const cipherEl = document.getElementById(contentId + '-cipher');
    if(!content || !cipherEl) return;

    let payload;
    try { payload = JSON.parse(cipherEl.textContent); }
    catch(e){ return; }

    const form = gate.querySelector('form');
    const input = gate.querySelector('input[type="password"]');
    const error = gate.querySelector('.password-gate-error');

    function fromBase64(str){
      const bin = atob(str);
      const bytes = new Uint8Array(bin.length);
      for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }

    async function tryUnlock(password){
      try {
        const enc = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
          'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
        );
        const aesKey = await crypto.subtle.deriveKey(
          { name:'PBKDF2', salt: fromBase64(payload.salt), iterations: payload.iterations, hash:'SHA-256' },
          baseKey, { name:'AES-GCM', length:256 }, false, ['decrypt']
        );
        const plainBuf = await crypto.subtle.decrypt(
          { name:'AES-GCM', iv: fromBase64(payload.iv) }, aesKey, fromBase64(payload.ciphertext)
        );
        content.innerHTML = new TextDecoder().decode(plainBuf);
        content.hidden = false;
        gate.hidden = true;
        if(typeof initScrollReveal === 'function') initScrollReveal();
        if(typeof initParallax === 'function') initParallax();
        return true;
      } catch(e){
        // Wrong password (or corrupt data) — AES-GCM's auth tag makes
        // decrypt itself fail rather than silently returning garbage.
        return false;
      }
    }

    if(form){
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        if(btn) btn.disabled = true;
        const ok = await tryUnlock(input ? input.value : '');
        if(btn) btn.disabled = false;
        if(!ok){
          if(error) error.hidden = false;
          if(input){ input.value = ''; input.focus(); }
        }
      });
    }
  });
}
document.addEventListener('DOMContentLoaded', initEncryptedGates);

/* Click-to-expand lightbox — scoped to any grid container marked with
   data-lightbox (currently: .report-pages-grid on the Editorial Campaign
   page's "Full Report" spread, and the "Research Synthesis" .photo-grid
   on the Ethnographic Research page), rather than every image on the
   site, since most of the site's photo grids are meant to stay inline.
   A single overlay/modal pair is built once and reused for every click
   rather than creating one per image. The clicked <img>'s src/alt are
   copied into the modal's own <img>, which uses object-fit:contain (the
   source grids crop with cover) so the full, uncropped photo is what
   actually shows enlarged. */
function initLightbox(){
  const triggers = document.querySelectorAll('[data-lightbox] img');
  if(!triggers.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <button class="lightbox-close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
    </button>
    <img class="lightbox-img" alt="">
  `;
  document.body.appendChild(overlay);
  const img = overlay.querySelector('.lightbox-img');
  const closeBtn = overlay.querySelector('.lightbox-close');
  let lastFocused = null;

  function open(src, alt){
    img.src = src;
    img.alt = alt || '';
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    lastFocused = document.activeElement;
    closeBtn.focus();
  }
  function close(){
    overlay.hidden = true;
    img.src = '';
    document.body.style.overflow = '';
    if(lastFocused) lastFocused.focus();
  }

  triggers.forEach(el => {
    el.style.cursor = 'zoom-in';
    el.addEventListener('click', () => open(el.currentSrc || el.src, el.alt));
  });
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && !overlay.hidden) close();
  });
}
document.addEventListener('DOMContentLoaded', initLightbox);

function updateClocks(){
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
  }).formatToParts(now);
  const get = t => parts.find(p => p.type === t)?.value || '';
  const timeStr = `${get('hour')}:${get('minute')}:${get('second')} ${get('dayPeriod')} CST`;
  document.querySelectorAll('.clock-time').forEach(el => el.textContent = timeStr);
}
updateClocks();
setInterval(updateClocks, 1000);
