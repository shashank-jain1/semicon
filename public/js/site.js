/* SFA Semicon — site interactions & scroll animations */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const body = document.body;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap;
  const animate = !!G && !reduce;

  if (!animate) root.classList.add('no-anim');
  if (G) G.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage unavailable */ } }
  };

  // ---------- Smooth scroll ----------
  let lenis = null;
  if (animate && body.dataset.smooth === '1' && window.Lenis) {
    lenis = new Lenis({ lerp: 0.095, smoothWheel: true, wheelMultiplier: 1 });
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }

  const scroll = { y: window.scrollY, v: 0, dir: 1 };
  const onScrollFns = [];
  const emitScroll = () => onScrollFns.forEach(fn => fn(scroll));
  if (lenis) {
    lenis.on('scroll', (e) => {
      scroll.v = e.velocity; scroll.dir = e.direction || scroll.dir; scroll.y = e.scroll;
      ScrollTrigger.update(); emitScroll();
    });
  } else {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      scroll.v = y - scroll.y; scroll.dir = Math.sign(scroll.v) || scroll.dir; scroll.y = y;
      emitScroll();
    }, { passive: true });
    if (G) G.ticker.add(() => { scroll.v *= 0.9; });
  }

  // Hover effects only hear about mouse movement, but scrolling slides content under a still
  // cursor. Track the last pointer position and re-evaluate what is under it after each scroll.
  const pointer = { x: -1, y: -1, active: false };
  const hoverCheckers = [];
  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = e.pointerType === 'mouse'; }, { passive: true });
  document.addEventListener('mouseleave', () => { pointer.active = false; });
  let hoverQueued = false;
  const recheckHover = () => {
    if (hoverQueued || !pointer.active || !hoverCheckers.length) return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      const target = document.elementFromPoint(pointer.x, pointer.y);
      hoverCheckers.forEach(fn => fn(target));
    });
  };
  onScrollFns.push(recheckHover);

  const headerOffset = () => ($('[data-header]')?.offsetHeight || 70) + 10;
  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : -headerOffset(), duration: 1.6 });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerOffset(), behavior: reduce ? 'auto' : 'smooth' });
  }

  // Same-page anchor links scroll smoothly.
  const inPreview = body.classList.contains('is-preview') && location.protocol === 'about:';
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    if (inPreview) {
      // Admin live preview: only same-page anchors scroll; other links are disabled.
      e.preventDefault();
      const hash = (a.getAttribute('href').split('#')[1] || '');
      const el = hash && document.getElementById(hash);
      if (el) scrollToTarget(el);
      return;
    }
    if (a.target === '_blank' || e.metaKey || e.ctrlKey) return;
    const url = new URL(a.getAttribute('href'), document.baseURI);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    const el = url.hash === '#main' ? ($('[data-hero]')?.nextElementSibling || $('#main')) : document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(el);
    history.replaceState(null, '', url.hash);
  });

  // ---------- Announcement ----------
  const ann = $('[data-announce]');
  if (ann) {
    if (store.get('sfa-ann') === ann.textContent.trim().slice(0, 60)) ann.remove();
    else {
      body.classList.add('has-announce');
      $('[data-announce-close]', ann).addEventListener('click', () => {
        store.set('sfa-ann', ann.textContent.trim().slice(0, 60));
        body.classList.remove('has-announce');
        ann.remove();
      });
    }
  }

  // ---------- Header, progress, active nav ----------
  const hdr = $('[data-header]');
  const bar = $('[data-progress-bar]');
  let lastY = 0;
  function onScroll({ y }) {
    body.classList.toggle('is-scrolled', y > 40);
    if (hdr && !body.classList.contains('menu-open')) {
      if (y > 500 && y > lastY + 4) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 500) hdr.classList.remove('is-hidden');
    }
    lastY = y;
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }
  }
  onScrollFns.push(onScroll);
  onScroll(scroll);

  const navLinks = $$('.nav__link').filter(a => { const u = new URL(a.href); return u.pathname === location.pathname && u.hash; });
  if (navLinks.length && 'IntersectionObserver' in window) {
    const map = new Map();
    navLinks.forEach(a => { const el = document.getElementById(new URL(a.href).hash.slice(1)); if (el) map.set(el, a); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { navLinks.forEach(l => l.classList.remove('is-active')); map.get(en.target)?.classList.add('is-active'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, el) => io.observe(el));
  }

  // ---------- Mobile menu ----------
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  function closeMenu() {
    if (!body.classList.contains('menu-open')) return;
    body.classList.remove('menu-open');
    burger?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-hidden', 'true');
    lenis?.start();
  }
  burger?.addEventListener('click', () => {
    const open = !body.classList.contains('menu-open');
    if (!open) return closeMenu();
    body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    hdr?.classList.remove('is-hidden');
    lenis?.stop();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  $$('.menu__link').forEach(a => a.addEventListener('click', closeMenu));

  // ---------- Custom cursor ----------
  if (finePointer && animate && body.dataset.cursor === '1') {
    body.classList.add('has-cursor');
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), lbl = $('.cursor__label');
    const dx = G.quickTo(dot, 'x', { duration: 0.08 }), dy = G.quickTo(dot, 'y', { duration: 0.08 });
    const rx = G.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = G.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    G.set([dot, ring], { xPercent: -50, yPercent: -50 });
    window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('pointerdown', () => cur.classList.add('is-down'));
    document.addEventListener('pointerup', () => cur.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => G.to(cur, { opacity: 0, duration: 0.3 }));
    document.addEventListener('mouseenter', () => G.to(cur, { opacity: 1, duration: 0.3 }));
    const applyHover = (target) => {
      const el = target && target.closest ? target : null;
      const labelEl = el?.closest('[data-cursor-label]');
      const hov = el?.closest('a, button, label, [data-tilt], [data-ind-row], summary');
      cur.classList.toggle('is-hover', !!hov && !labelEl);
      cur.classList.toggle('has-label', !!labelEl);
      lbl.textContent = labelEl ? labelEl.dataset.cursorLabel : '';
    };
    document.addEventListener('pointerover', (e) => applyHover(e.target));
    hoverCheckers.push(applyHover);
  }

  // ---------- Magnetic buttons ----------
  if (finePointer && animate) {
    $$('[data-magnetic]').forEach(el => {
      const xTo = G.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      const yTo = G.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  // ---------- Spotlight + tilt ----------
  if (finePointer) {
    $$('[data-spot]').forEach(el => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }
  if (finePointer && animate) {
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', (e) => {
        if (el.hasAttribute('data-reveal')) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        G.to(el, { rotationY: px * 8, rotationX: -py * 8, transformPerspective: 1000, duration: 0.6, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => G.to(el, { rotationY: 0, rotationX: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' }));
    });
  }

  // ---------- Reveal on scroll ----------
  function setupReveals() {
    const els = $$('[data-reveal]');
    if (!animate || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        io.unobserve(el);
        el.classList.add('is-in');
        // Hand the element back to its own hover transitions once revealed.
        const delay = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
        setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); }, 1250 + delay * 1000);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  // ---------- Count-up numbers ----------
  function setupCounters() {
    const fmt = (v, d) => v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
    $$('[data-count]').forEach(el => {
      const end = parseFloat(el.dataset.count) || 0, dec = parseInt(el.dataset.decimals, 10) || 0;
      if (!animate) { el.textContent = fmt(end, dec); return; }
      el.textContent = fmt(0, dec);
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => G.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v, dec); } })
      });
    });
  }

  // ---------- Split headings ----------
  function markGradWords(split) {
    split.words.forEach(w => { if (w.parentElement?.closest('.grad')) w.classList.add('grad'); });
  }
  function setupSplits() {
    $$('[data-split]').forEach(el => {
      if (!animate) { el.classList.add('split-ready'); return; }
      SplitText.create(el, {
        type: 'words,lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit(self) {
          markGradWords(self);
          el.classList.add('split-ready');
          return G.from(self.lines, {
            yPercent: 110, rotate: 2, duration: 1.2, stagger: 0.09, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          });
        }
      });
    });

    // About statement: words light up while scrolling.
    $$('[data-highlight]').forEach(el => {
      if (!animate) return;
      SplitText.create(el, {
        type: 'words', autoSplit: true,
        onSplit(self) {
          markGradWords(self);
          return G.fromTo(self.words, { opacity: 0.14 }, {
            opacity: 1, stagger: 0.1, ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: 0.6 }
          });
        }
      });
    });
  }

  // ---------- Preloader + hero intro ----------
  function heroIntro() {
    window.sfaIntroDone = true;
    window.dispatchEvent(new Event('sfa:intro'));
    const hero = $('[data-hero]');
    if (!hero) return;
    if (!animate) { $$('[data-hud]', hero).forEach(h => { h.style.opacity = 1; }); return; }
    const tl = G.timeline({ defaults: { ease: 'expo.out' } });
    tl.to($$('.hero__title .line__inner', hero), { y: 0, duration: 1.5, stagger: 0.12 }, 0.1)
      .fromTo($$('[data-hero-in]', hero), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.45)
      .fromTo($$('[data-hud]', hero), { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 1, stagger: 0.15 }, 1.1)
      .fromTo('.hdr', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, clearProps: 'transform,opacity' }, 0.2);
    $$('[data-scramble]', hero).forEach((el, i) => {
      tl.to(el, { duration: 1.4, scrambleText: { text: el.dataset.scramble, chars: '0123456789ABCDEF<>/', speed: 0.6 } }, 1.2 + i * 0.15);
    });
  }

  function runPreloader(done) {
    const pl = $('[data-preloader-el]');
    if (!pl) { body.classList.add('is-ready'); done(); return; }
    const count = $('[data-preloader-count]'), barEl = $('[data-preloader-bar]'), label = $('[data-preloader-label]');
    if (!animate) { pl.remove(); body.classList.add('is-ready'); done(); return; }
    const labels = ['Initialising silicon', 'Loading tensor cores', 'Routing interconnect', 'Calibrating models', 'System ready'];
    const o = { p: 0 };
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; });
    lenis?.stop();
    const tick = G.to(o, {
      p: 100, duration: 2.4, ease: 'power2.inOut',
      onUpdate() {
        // Hold at 90% until the page has actually loaded.
        if (!loaded && o.p > 90) { o.p = 90; tick.pause(); const wait = () => { if (loaded) tick.resume(); else setTimeout(wait, 80); }; wait(); }
        count.textContent = Math.round(o.p);
        barEl.style.transform = `scaleX(${o.p / 100})`;
        label.textContent = labels[Math.min(labels.length - 1, Math.floor(o.p / 20.5))];
      },
      onComplete() {
        G.timeline()
          .to('.preloader__chip, .preloader__meta, .preloader__bar', { opacity: 0, y: -20, duration: 0.5, stagger: 0.05, ease: 'power2.in' })
          .to(pl, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=0.1')
          .add(() => { body.classList.add('is-ready'); lenis?.start(); done(); }, '-=0.55')
          .add(() => pl.remove());
      }
    });
  }

  // ---------- Hero scroll ----------
  function setupHero() {
    const hero = $('[data-hero]');
    window.sfaHero = { progress: 0 };
    if (!hero || !animate) return;
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top',
      onUpdate: (self) => { window.sfaHero.progress = self.progress; }
    });
    G.to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '85% top', scrub: true } });
    G.to('.hero__hud', { opacity: 0, y: -60, ease: 'none', scrollTrigger: { trigger: hero, start: '5% top', end: '50% top', scrub: true } });
    $('[data-scroll-next]')?.addEventListener('click', (e) => { e.preventDefault(); scrollToTarget(hero.nextElementSibling || hero); });
  }

  // ---------- Marquee ----------
  function setupMarquees() {
    $$('[data-marquee]').forEach(track => {
      const group = track.children[0];
      let x = 0, visible = false, skew = 0;
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(track);
      const tick = (time, dt) => {
        if (!visible) return;
        const w = group.offsetWidth;
        const boost = 1 + Math.min(Math.abs(scroll.v) / 3, 12);
        const dir = scroll.dir >= 0 ? -1 : 1;
        x += dir * 70 * boost * (dt / 1000);
        if (x <= -w) x += w;
        if (x > 0) x -= w;
        skew += ((Math.max(-12, Math.min(12, -scroll.v * 0.35))) - skew) * 0.1;
        track.style.transform = `translate3d(${x}px,0,0) skewX(${animate ? skew : 0}deg)`;
      };
      if (G && !reduce) G.ticker.add(tick);
    });
  }

  // ---------- Chip anatomy ----------
  function setupAnatomy() {
    const sec = $('[data-anatomy]');
    if (!sec) return;
    const stack = $('[data-stack]', sec), slabs = $$('[data-slab]', sec), items = $$('[data-alayer]', sec), meter = $('[data-anatomy-meter]', sec);
    const stage = $('.anatomy__stage', sec);
    const n = Math.max(1, Math.min(items.length || 5, slabs.length));
    let lastActive = -1;
    const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
    function update(p) {
      const maxGap = Math.min(stage.clientHeight * 0.17, 125);
      const e = smooth(0, 0.28, p);
      stack.style.setProperty('--gap', `${16 + (maxGap - 16) * e}px`);
      stack.style.setProperty('--rz', `${-42 + p * 18}deg`);
      stack.classList.toggle('is-exploded', e > 0.35);
      const active = e > 0.35 ? Math.min(n - 1, Math.floor(smooth(0.25, 0.95, p) * n)) : 0;
      if (active !== lastActive) {
        lastActive = active;
        slabs.forEach((s, i) => s.classList.toggle('is-active', i === active));
        items.forEach((s, i) => s.classList.toggle('is-active', i === active));
        if (meter) meter.textContent = String(active + 1).padStart(2, '0');
      }
    }
    update(0);
    if (!animate) { update(0.3); return; }
    const mm = G.matchMedia();
    mm.add('(min-width: 961px)', () => {
      ScrollTrigger.create({
        trigger: sec, start: 'top top', end: () => `+=${window.innerHeight * 2.6}`, pin: true, scrub: true, anticipatePin: 1,
        onUpdate: (self) => update(self.progress)
      });
    });
    mm.add('(max-width: 960px)', () => {
      ScrollTrigger.create({ trigger: stage, start: 'top 75%', end: 'bottom 15%', onUpdate: (self) => update(self.progress) });
    });
  }

  // ---------- Process (horizontal scroll) ----------
  function setupProcess() {
    const sec = $('[data-process]');
    if (!sec) return;
    const track = $('[data-process-track]', sec), rail = $('[data-process-rail]', sec), count = $('[data-process-count]', sec);
    const steps = $$('[data-step]', sec);
    const markSteps = () => {
      let on = 0;
      steps.forEach(st => { const hit = st.getBoundingClientRect().left < window.innerWidth * 0.62; st.classList.toggle('is-on', hit); if (hit) on++; });
      if (count) count.textContent = String(Math.max(1, on)).padStart(2, '0');
    };
    if (!animate) { steps.forEach(s => s.classList.add('is-on')); return; }
    const mm = G.matchMedia();
    mm.add('(min-width: 961px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 40);
      G.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: () => { const r = track.getBoundingClientRect(); rail.style.transform = `scaleX(${Math.min(1, Math.max(0, (window.innerWidth * 0.62 - r.left) / r.width))})`; markSteps(); }
        }
      });
      markSteps();
    });
    mm.add('(max-width: 960px)', () => {
      G.fromTo(rail, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: track, start: 'top 70%', end: 'bottom 70%', scrub: true } });
      steps.forEach(st => ScrollTrigger.create({ trigger: st, start: 'top 72%', toggleClass: { targets: st, className: 'is-on' } }));
    });
  }

  // ---------- Industries follower ----------
  function setupIndustries() {
    const sec = $('[data-industries]');
    if (!sec || !finePointer || !animate) return;
    const f = $('[data-ind-follower]', sec);
    const xTo = G.quickTo(f, 'x', { duration: 0.5, ease: 'power3' }), yTo = G.quickTo(f, 'y', { duration: 0.5, ease: 'power3' });
    let currentRow = null;
    const sync = (target) => {
      const row = target && target.closest ? target.closest('[data-ind-row]') : null;
      if (row === currentRow) return;
      const wasShown = !!currentRow;
      currentRow = row;
      G.killTweensOf(f, 'scale');
      if (row) {
        f.innerHTML = $('template', row).innerHTML;
        if (!wasShown) G.set(f, { x: pointer.x, y: pointer.y }); // appear under the cursor, not where it was last hidden
        G.to(f, { scale: 1, duration: 0.45, ease: 'back.out(1.7)' });
      } else {
        G.to(f, { scale: 0, duration: 0.3, ease: 'power3.in' });
      }
    };
    sec.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); sync(e.target); });
    sec.addEventListener('pointerleave', () => sync(null));
    hoverCheckers.push(sync);
  }

  // ---------- Training console ----------
  function setupTerminal() {
    $$('[data-terminal]').forEach(term => {
      const log = $('[data-term-log]', term);
      let lines = [];
      try { lines = JSON.parse($('[data-term-lines]', term).textContent); } catch { lines = []; }
      const canvas = $('[data-term-chart]', term), ctx = canvas.getContext('2d');
      const mEpoch = $('[data-m-epoch]', term), mLoss = $('[data-m-loss]', term), mAcc = $('[data-m-acc]', term), mTp = $('[data-m-tp]', term);
      const gpus = $$('[data-gpu]', term);
      const EPOCHS = 40;
      const cs = getComputedStyle(root);
      const cA = cs.getPropertyValue('--accent').trim() || '#22d3ee', cB = cs.getPropertyValue('--accent-2').trim() || '#8b5cf6';
      let visible = false, running = false, timer = null;
      const loss = [], acc = [];
      const seedNoise = (i) => (Math.sin(i * 12.9898) * 43758.5453) % 1;

      function resize() {
        const r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = r.width * d; canvas.height = r.height * d;
        ctx.setTransform(d, 0, 0, d, 0, 0);
        draw();
      }
      function draw() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, (h / 4) * i); ctx.lineTo(w, (h / 4) * i); ctx.stroke(); }
        const plot = (arr, color, fill) => {
          if (arr.length < 2) return;
          const px = (i) => 16 + (i / EPOCHS) * (w - 32), py = (v) => h - 14 - v * (h - 34);
          ctx.beginPath();
          arr.forEach((v, i) => i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v)));
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
          if (fill) {
            ctx.lineTo(px(arr.length - 1), h); ctx.lineTo(px(0), h); ctx.closePath();
            const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00');
            ctx.fillStyle = g; ctx.fill();
          }
          const lx = px(arr.length - 1), ly = py(arr[arr.length - 1]);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
        };
        plot(acc, cA, true);
        plot(loss, cB, false);
      }
      function setMetrics(ep) {
        const l = 2.3 * Math.exp(-ep / 9) + 0.1 + seedNoise(ep) * 0.03;
        const a = 0.968 - 0.72 * Math.exp(-ep / 7) + seedNoise(ep + 3) * 0.006;
        loss.push(Math.min(1, l / 2.4)); acc.push(Math.max(0, a));
        mEpoch.textContent = `${String(ep).padStart(2, '0')}/${EPOCHS}`;
        mLoss.textContent = l.toFixed(3);
        mAcc.textContent = `${(a * 100).toFixed(1)}%`;
        mTp.textContent = `${Math.round(900 + ep * 14 + seedNoise(ep) * 40)} fps`;
        draw();
      }
      function reset() {
        loss.length = 0; acc.length = 0; log.innerHTML = '';
        mEpoch.textContent = `00/${EPOCHS}`; mLoss.textContent = mAcc.textContent = mTp.textContent = '—';
        draw();
      }
      const wait = (ms) => new Promise(r => { timer = setTimeout(r, ms); });
      const whenVisible = () => new Promise(r => { const chk = () => (visible ? r() : setTimeout(chk, 250)); chk(); });

      async function run() {
        if (running) return;
        running = true;
        for (;;) {
          reset();
          let ep = 0;
          const epPerLine = EPOCHS / Math.max(1, lines.length);
          for (let i = 0; i < lines.length; i++) {
            await whenVisible();
            const text = lines[i];
            const div = document.createElement('div');
            div.className = text.startsWith('$') ? 't-cmd' : text.startsWith('✓') ? 't-ok' : '';
            log.appendChild(div);
            const caret = document.createElement('span'); caret.className = 't-caret';
            const speed = text.startsWith('$') ? 28 : 8;
            for (let c = 1; c <= text.length; c++) {
              div.textContent = text.slice(0, c); div.appendChild(caret);
              if (c % 2 === 0 || speed > 10) await wait(speed);
            }
            caret.remove();
            while (log.children.length > 9) log.firstChild.remove();
            const target = Math.round((i + 1) * epPerLine);
            while (ep < target) { ep++; setMetrics(ep); await wait(60); }
            await wait(text.startsWith('$') ? 500 : 260);
          }
          await wait(4500);
        }
      }
      if (!reduce) {
        setInterval(() => { if (visible) gpus.forEach(b => { b.style.height = `${55 + Math.random() * 43}%`; }); }, 700);
      }
      new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
        if (visible && !running) {
          if (reduce) { lines.forEach(t => { const d = document.createElement('div'); d.textContent = t; log.appendChild(d); }); for (let e = 1; e <= EPOCHS; e++) setMetrics(e); running = true; }
          else run();
        }
      }, { threshold: 0.25 }).observe(term);
      window.addEventListener('resize', resize);
      resize();
    });
  }

  // ---------- EDA flow: sticky workbench that visualises each stage ----------
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const prng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const RTL = `// npu_mac.sv — drafted with the SFA RTL copilot
module npu_mac #(parameter W = 8) (
  input  logic           clk, rst_n,
  input  logic [W-1:0]   a, b,
  input  logic           valid_in,
  output logic [2*W+7:0] acc
);
  always_ff @(posedge clk or negedge rst_n)
    if (!rst_n)        acc <= '0;
    else if (valid_in) acc <= acc + a * b;
endmodule`;
  function highlightVerilog(src) {
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return src.split('\n').map(line => {
      const ci = line.indexOf('//');
      const code = ci >= 0 ? line.slice(0, ci) : line, comment = ci >= 0 ? line.slice(ci) : '';
      const hl = esc(code)
        .replace(/\b(module|endmodule|parameter|input|output|always_ff|posedge|negedge|or|if|else)\b/g, '<span class="k">$1</span>')
        .replace(/\b(logic)\b/g, '<span class="t">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="n">$1</span>');
      return hl + (comment ? `<span class="c">${esc(comment)}</span>` : '');
    }).join('\n');
  }

  function buildSim(svg) {
    const R = prng(21), L = 320, x0 = 70, rows = ['clk', 'rst_n', 'valid_in', 'a[7:0]', 'b[7:0]', 'acc'];
    const clip = svgEl('clipPath', { id: 'evSimClip' }, svgEl('defs', {}, svg));
    svgEl('rect', { x: x0 - 4, y: 0, width: 340, height: 300 }, clip);
    rows.forEach((r, i) => { const t = svgEl('text', { x: 6, y: 34 + i * 44, class: 'ev-sig' }, svg); t.textContent = r; });
    const g = svgEl('g', { 'clip-path': 'url(#evSimClip)' }, svg);
    const track = svgEl('g', { class: 'ev-wave-track' }, g);
    const hi = (i) => 18 + i * 44, lo = (i) => 38 + i * 44;
    const stroke = { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.3 };
    // Pre-compute one period so the loop is seamless.
    const valid = Array.from({ length: 16 }, () => R() > 0.35);
    const busA = Array.from({ length: 8 }, () => Math.floor(R() * 256).toString(16).toUpperCase().padStart(2, '0'));
    const busB = Array.from({ length: 8 }, () => Math.floor(R() * 256).toString(16).toUpperCase().padStart(2, '0'));
    for (let copy = 0; copy < 2; copy++) {
      const ox = x0 + copy * L;
      let d = '';
      for (let x = 0; x < L; x += 20) d += `M${ox + x} ${lo(0)}V${hi(0)}H${ox + x + 10}V${lo(0)}H${ox + x + 20}`;
      svgEl('path', { d, ...stroke }, track);
      svgEl('path', { d: `M${ox} ${copy ? hi(1) : lo(1)}H${ox + (copy ? 0 : 30)}V${hi(1)}H${ox + L}`, ...stroke }, track);
      d = `M${ox} ${lo(2)}`;
      valid.forEach((v, k) => { const y = v ? hi(2) : lo(2); d += `V${y}H${ox + (k + 1) * 20}`; });
      svgEl('path', { d, ...stroke, stroke: 'var(--accent-2)' }, track);
      [busA, busB].forEach((bus, bi) => {
        const row = 3 + bi;
        bus.forEach((val, k) => {
          const bx = ox + k * 40, m = (hi(row) + lo(row)) / 2;
          svgEl('path', { d: `M${bx + 3} ${hi(row)}H${bx + 37}L${bx + 40} ${m}L${bx + 37} ${lo(row)}H${bx + 3}L${bx} ${m}Z`, fill: 'rgba(255,255,255,.04)', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1 }, track);
          const t = svgEl('text', { x: bx + 20, y: m + 3, 'text-anchor': 'middle', class: 'ev-bus' }, track); t.textContent = val;
        });
      });
      for (let k = 0; k < 4; k++) {
        const bx = ox + k * 80, m = (hi(5) + lo(5)) / 2;
        svgEl('path', { d: `M${bx + 3} ${hi(5)}H${bx + 77}L${bx + 80} ${m}L${bx + 77} ${lo(5)}H${bx + 3}L${bx} ${m}Z`, fill: 'color-mix(in srgb, var(--accent) 12%, transparent)', stroke: 'var(--accent)', 'stroke-width': 1 }, track);
        const t = svgEl('text', { x: bx + 40, y: m + 3, 'text-anchor': 'middle', class: 'ev-bus' }, track); t.textContent = `0x${(0x1a40 + k * 0x3f7).toString(16).toUpperCase()}`;
      }
    }
    svgEl('line', { x1: 290, y1: 8, x2: 290, y2: 290, stroke: 'var(--accent-2)', 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg);
    const ts = svgEl('text', { x: 294, y: 290, class: 'ev-sig' }, svg); ts.textContent = 't = 1.28 µs';
  }

  function buildSyn(svg) {
    const R = prng(8), cols = 5, colX = (c) => 30 + c * 78, gates = [];
    const types = ['AND2', 'XOR2', 'OR2', 'NAND2', 'MUX2', 'DFF', 'INV', 'AOI21'];
    let gi = 0;
    for (let c = 0; c < cols; c++) {
      const n = c === cols - 1 ? 3 : 4 + Math.floor(R() * 2);
      for (let r = 0; r < n; r++) {
        const y = 30 + (r + 0.5) * (240 / n) - 12;
        gates.push({ c, x: colX(c), y, type: c === cols - 1 ? 'DFF' : types[Math.floor(R() * types.length)], i: gi++ });
      }
    }
    const wires = svgEl('g', {}, svg);
    let wi = 0;
    gates.forEach(g => {
      if (g.c === cols - 1) return;
      const next = gates.filter(o => o.c === g.c + 1);
      const k = 1 + Math.floor(R() * 2);
      for (let j = 0; j < k; j++) {
        const t = next[Math.floor(R() * next.length)];
        const sx = g.x + 40, sy = g.y + 12, ex = t.x, ey = t.y + 6 + j * 12, mx = sx + 12 + (wi % 4) * 5;
        svgEl('path', { d: `M${sx} ${sy}H${mx}V${ey}H${ex}`, class: 'ev-wire', pathLength: 1, style: `--i:${wi++}` }, wires);
      }
    });
    gates.forEach(g => {
      const grp = svgEl('g', { class: 'ev-gate', style: `--i:${g.i}` }, svg);
      if (g.type === 'DFF') svgEl('rect', { x: g.x, y: g.y - 4, width: 40, height: 32, rx: 3 }, grp);
      else svgEl('path', { d: `M${g.x} ${g.y}H${g.x + 24}A16 12 0 0 1 ${g.x + 24} ${g.y + 24}H${g.x}Z` }, grp);
      const t = svgEl('text', { x: g.x + 20, y: g.y + 15 }, grp); t.textContent = g.type;
    });
  }

  function buildLayout(svg, R, { cellsOnly = false } = {}) {
    svgEl('rect', { x: 14, y: 14, width: 372, height: 272, rx: 4, class: 'ev-core' }, svg);
    if (!cellsOnly) for (let x = 40; x < 380; x += 48) svgEl('line', { x1: x, y1: 16, x2: x, y2: 284, class: 'ev-strap' }, svg);
    const macros = [[24, 24, 104, 78, 'SRAM 64K'], [24, 196, 104, 78, 'SRAM 64K'], [24, 112, 60, 74, 'PLL']];
    macros.forEach(([x, y, w, hh, label]) => {
      svgEl('rect', { x, y, width: w, height: hh, rx: 3, class: 'ev-macro' }, svg);
      const t = svgEl('text', { x: x + 8, y: y + 16, class: 'ev-macro-t' }, svg); t.textContent = label;
    });
    const cells = svgEl('g', {}, svg);
    let ci = 0;
    for (let y = 24; y < 276; y += 11) {
      let x = y > 110 && y < 188 ? 92 : 136;
      while (x < 376) {
        const w = 5 + Math.floor(R() * 14);
        if (x + w > 376) break;
        if (R() > 0.12) svgEl('rect', { x, y, width: w, height: 9, class: 'ev-cell', style: `--d:${Math.floor(R() * 900)}` }, cells);
        x += w + 1; ci++;
      }
    }
    return cells;
  }

  function buildPnr(svg) {
    const R = prng(4);
    buildLayout(svg, R);
    const routes = svgEl('g', {}, svg), metals = ['ev-m1', 'ev-m2', 'ev-m3'];
    for (let i = 0; i < 70; i++) {
      let x = 90 + R() * 285, y = 24 + R() * 250, d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      const segs = 2 + Math.floor(R() * 3);
      for (let s = 0; s < segs; s++) {
        if (s % 2) { y = Math.min(280, Math.max(20, y + (R() - 0.5) * 120)); d += `V${y.toFixed(1)}`; }
        else { x = Math.min(380, Math.max(20, x + (R() - 0.5) * 160)); d += `H${x.toFixed(1)}`; }
      }
      svgEl('path', { d, class: `ev-route ${metals[i % 3]}`, pathLength: 1, style: `--i:${i}` }, routes);
    }
  }

  function buildSign(svg) {
    const R = prng(4);
    const defs = svgEl('defs', {}, svg);
    const grad = (id, c) => {
      const g = svgEl('radialGradient', { id }, defs);
      svgEl('stop', { offset: '0', 'stop-color': c, 'stop-opacity': '.85' }, g);
      svgEl('stop', { offset: '1', 'stop-color': c, 'stop-opacity': '0' }, g);
    };
    grad('evHot', '#ef4444'); grad('evWarm', '#f59e0b'); grad('evCool', '#22c55e');
    const cells = buildLayout(svg, R, { cellsOnly: true });
    cells.querySelectorAll('rect').forEach(r => r.style.setProperty('--d', '0'));
    const blobs = [[250, 90, 70], [320, 200, 60], [180, 230, 55], [300, 60, 40], [200, 140, 45]];
    const hot = svgEl('g', { class: 'ev-hot' }, svg), cool = svgEl('g', { class: 'ev-cool' }, svg);
    blobs.forEach(([x, y, r], i) => {
      svgEl('circle', { cx: x, cy: y, r, fill: `url(#${i % 2 ? 'evWarm' : 'evHot'})` }, hot);
      svgEl('circle', { cx: x, cy: y, r: r * 0.9, fill: 'url(#evCool)' }, cool);
    });
  }

  function buildGds(svg) {
    const R = prng(13), defs = svgEl('defs', {}, svg);
    const hatch = (id, color, angle) => {
      const p = svgEl('pattern', { id, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: `rotate(${angle})` }, defs);
      svgEl('rect', { width: 5, height: 5, fill: color, 'fill-opacity': '.18' }, p);
      svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: color, 'stroke-width': 1.4, 'stroke-opacity': '.8' }, p);
    };
    hatch('gM1', '#3b82f6', 45); hatch('gM2', '#d946ef', -45); hatch('gM3', '#eab308', 0);
    const layer = (cls) => svgEl('g', { class: cls }, svg);
    const diff = layer(), poly = layer(), m1 = layer(), m2 = layer(), m3 = layer(), via = layer();
    for (let row = 0; row < 7; row++) {
      const y = 18 + row * 38;
      for (let x = 16; x < 380;) {
        const w = 26 + Math.floor(R() * 34);
        if (x + w > 386) break;
        svgEl('rect', { x, y: y + 6, width: w, height: 9, fill: '#22c55e', 'fill-opacity': '.35', stroke: '#22c55e', 'stroke-opacity': '.7', 'stroke-width': .6 }, diff);
        svgEl('rect', { x, y: y + 20, width: w, height: 9, fill: '#22c55e', 'fill-opacity': '.25', stroke: '#22c55e', 'stroke-opacity': '.6', 'stroke-width': .6 }, diff);
        for (let px = x + 4; px < x + w - 2; px += 7) svgEl('rect', { x: px, y: y + 2, width: 2.4, height: 31, fill: '#ef4444', 'fill-opacity': '.8' }, poly);
        x += w + 6;
      }
      svgEl('rect', { x: 14, y: y - 1, width: 372, height: 4, fill: 'url(#gM1)' }, m1);
      for (let k = 0; k < 5; k++) svgEl('rect', { x: 20 + R() * 300, y: y + 14, width: 30 + R() * 60, height: 3.5, fill: 'url(#gM1)' }, m1);
    }
    for (let k = 0; k < 16; k++) {
      const x = 22 + k * 23 + R() * 6, y0 = 16 + R() * 120, h = 60 + R() * 150;
      svgEl('rect', { x, y: y0, width: 4, height: Math.min(h, 280 - y0), fill: 'url(#gM2)' }, m2);
      svgEl('rect', { x: x + 0.5, y: y0 + 2, width: 3, height: 3, fill: '#fff', 'fill-opacity': '.85' }, via);
      svgEl('rect', { x: x + 0.5, y: y0 + Math.min(h, 280 - y0) - 5, width: 3, height: 3, fill: '#fff', 'fill-opacity': '.85' }, via);
    }
    for (let k = 0; k < 6; k++) svgEl('rect', { x: 14, y: 30 + k * 46 + R() * 10, width: 372, height: 6, fill: 'url(#gM3)' }, m3);
  }

  function setupEdaFlow() {
    $$('[data-edaflow]').forEach(sec => {
      const steps = $$('[data-estep]', sec), views = $$('[data-ev]', sec), tools = $$('[data-ewin-tool]', sec);
      const stageEl = $('[data-ewin-stage]', sec), metricEl = $('[data-ewin-metric]', sec), countEl = $('[data-ewin-count]', sec), prog = $('[data-ewin-progress]', sec);
      const code = $('[data-ev-code]', sec);
      buildSim($('[data-ev-sim]', sec));
      buildSyn($('[data-ev-syn]', sec));
      buildPnr($('[data-ev-pnr]', sec));
      buildSign($('[data-ev-sign]', sec));
      buildGds($('[data-ev-gds]', sec));
      let typer = null, current = -1;
      function typeCode() {
        clearInterval(typer);
        if (reduce) { code.innerHTML = highlightVerilog(RTL); return; }
        let n = 0;
        typer = setInterval(() => {
          n = Math.min(RTL.length, n + 6);
          code.innerHTML = highlightVerilog(RTL.slice(0, n)) + '<span class="caret"></span>';
          if (n >= RTL.length) clearInterval(typer);
        }, 22);
      }
      function activate(i) {
        if (i === current || !steps[i]) return;
        current = i;
        steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
        tools.forEach((t, k) => t.classList.toggle('is-active', k === i));
        views.forEach((v, k) => {
          v.classList.toggle('is-active', k === i);
          v.classList.remove('is-play');
        });
        const v = views[i];
        if (v) { void v.offsetWidth; v.classList.add('is-play'); }
        if (i === 0) typeCode();
        stageEl.textContent = steps[i].dataset.name || '';
        metricEl.textContent = steps[i].dataset.metric || '';
        countEl.textContent = String(i + 1).padStart(2, '0');
        prog.style.width = `${((i + 1) / steps.length) * 100}%`;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach(en => { if (en.isIntersecting) activate(Number(en.target.dataset.estep)); });
      }, {
        // On small screens the sticky workbench covers the top ~40%, so trigger lower down.
        rootMargin: matchMedia('(max-width: 960px)').matches ? '-68% 0px -30% 0px' : '-48% 0px -48% 0px'
      });
      steps.forEach(s => io.observe(s));
      // Start typing the first stage when the window first comes into view.
      new IntersectionObserver(([en], obs) => { if (en.isIntersecting) { if (current === -1) activate(0); else if (current === 0) typeCode(); obs.disconnect(); } }, { threshold: 0.3 }).observe($('[data-ewin]', sec));
    });
  }

  // ---------- EDA suite tabs ----------
  function setupEdaSuite() {
    $$('[data-edasuite]').forEach(sec => {
      const tabs = $$('[data-etab]', sec), panels = $$('[data-epanel]', sec), ink = $('[data-etabs-ink]', sec), wrap = $('.etabs-wrap', sec);
      let active = 0;
      const moveInk = () => {
        const t = tabs[active]; if (!t || !ink) return;
        ink.style.width = `${t.offsetWidth}px`;
        ink.style.transform = `translateX(${t.offsetLeft}px)`;
      };
      const select = (i, focus) => {
        active = (i + tabs.length) % tabs.length;
        tabs.forEach((t, k) => { const on = k === active; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
        panels.forEach((p, k) => { const on = k === active; p.hidden = !on; p.classList.toggle('is-active', on); });
        moveInk();
        const t = tabs[active];
        if (wrap && t) wrap.scrollTo({ left: t.offsetLeft - wrap.clientWidth / 2 + t.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
        if (focus) t.focus();
      };
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(i));
        t.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); select(active + 1, true); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); select(active - 1, true); }
        });
      });
      window.addEventListener('resize', moveInk);
      if (document.fonts) document.fonts.ready.then(moveInk);
      moveInk();
    });
  }

  // ---------- Testimonials ----------
  function setupQuotes() {
    $$('[data-quotes]').forEach(wrap => {
      const quotes = $$('[data-quote]', wrap), dots = $$('[data-quote-dot]', wrap);
      if (quotes.length < 2) return;
      const DUR = 6500;
      wrap.style.setProperty('--dur', `${DUR}ms`);
      let i = 0, timer = null, paused = false, remaining = DUR, started = Date.now();
      const show = (n) => {
        i = (n + quotes.length) % quotes.length;
        quotes.forEach((q, k) => q.classList.toggle('is-active', k === i));
        dots.forEach((d, k) => { d.classList.remove('is-active'); if (k === i) { void d.offsetWidth; d.classList.add('is-active'); } });
        schedule(DUR);
      };
      const schedule = (ms) => { clearTimeout(timer); remaining = ms; started = Date.now(); if (!paused) timer = setTimeout(() => show(i + 1), ms); };
      dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
      wrap.addEventListener('pointerenter', () => { paused = true; clearTimeout(timer); remaining -= Date.now() - started; wrap.classList.add('is-paused'); });
      wrap.addEventListener('pointerleave', () => { paused = false; wrap.classList.remove('is-paused'); schedule(Math.max(remaining, 600)); });
      show(0);
    });
  }

  // ---------- FAQ ----------
  function setupAccordion() {
    $$('[data-acc]').forEach(acc => {
      $$('[data-acc-btn]', acc).forEach(btn => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.acc__item');
          const open = !item.classList.contains('is-open');
          $$('.acc__item', acc).forEach(it => { it.classList.remove('is-open'); $('[data-acc-btn]', it).setAttribute('aria-expanded', 'false'); });
          if (open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
          setTimeout(() => ScrollTrigger?.refresh?.(), 600);
        });
      });
    });
  }

  // ---------- CTA ----------
  function setupCta() {
    $$('[data-cta]').forEach(cta => {
      const orb = $('[data-cta-orb]', cta);
      if (finePointer && animate && orb) {
        const xTo = G.quickTo(orb, 'x', { duration: 1, ease: 'power3' }), yTo = G.quickTo(orb, 'y', { duration: 1, ease: 'power3' });
        const r0 = cta.getBoundingClientRect();
        G.set(orb, { x: r0.width / 2, y: r0.height / 2 });
        cta.addEventListener('pointermove', (e) => { const r = cta.getBoundingClientRect(); xTo(e.clientX - r.left); yTo(e.clientY - r.top); });
      } else if (orb) { orb.style.left = '50%'; orb.style.top = '50%'; }
      const paths = $$('[data-draw]', cta);
      if (!animate) return;
      paths.forEach(p => { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
      G.to(paths, { strokeDashoffset: 0, duration: 2.2, stagger: 0.12, ease: 'power2.inOut', scrollTrigger: { trigger: cta, start: 'top 75%', once: true } });
    });
  }

  // ---------- Contact form ----------
  function setupForms() {
    $$('[data-contact-form]').forEach(form => {
      const status = $('[data-form-status]', form);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = ''; status.classList.remove('is-error');
        let bad = false;
        $$('[required]', form).forEach(inp => {
          const ok = inp.type === 'email' ? /^\S+@\S+\.\S+$/.test(inp.value) : inp.value.trim().length > 1;
          inp.closest('.field')?.classList.toggle('is-invalid', !ok);
          if (!ok) bad = true;
        });
        if (bad) { status.textContent = 'Please complete the highlighted fields.'; status.classList.add('is-error'); return; }
        const data = Object.fromEntries(new FormData(form).entries());
        data.page = location.pathname;
        form.classList.add('is-sending');
        status.textContent = 'Sending…';
        try {
          const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          const out = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(out.error || 'Something went wrong');
          $('[data-form-done] p', form).textContent = form.dataset.success || 'Thank you — we’ll be in touch.';
          form.classList.add('is-done');
          form.reset();
          status.textContent = '';
        } catch (err) {
          status.textContent = err.message; status.classList.add('is-error');
        } finally { form.classList.remove('is-sending'); }
      });
      $$('input, textarea', form).forEach(inp => inp.addEventListener('input', () => inp.closest('.field')?.classList.remove('is-invalid')));
    });
  }

  // ---------- Parallax, footer, misc ----------
  function setupParallax() {
    if (!animate) return;
    $$('[data-parallax-wrap]').forEach(wrap => {
      const img = $('[data-parallax]', wrap);
      if (img) G.fromTo(img, { yPercent: -9 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }
  function setupFooter() {
    const big = $('[data-footer-big]');
    if (big) {
      big.addEventListener('pointermove', (e) => {
        const r = big.getBoundingClientRect();
        big.style.setProperty('--fx', `${((e.clientX - r.left) / r.width) * 100}%`);
      });
      if (animate) G.from('.footer__big-text', { yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: big, start: 'top 95%', once: true } });
    }
    $('[data-to-top]')?.addEventListener('click', () => scrollToTarget(0));
    const code = $('[data-scramble-in]');
    if (code && animate) G.to(code, { duration: 1.6, scrambleText: { text: code.textContent, chars: '01', revealDelay: 0.4 } });
  }

  // ---------- Boot ----------
  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
  let introQueued = false;
  const preloaderDone = new Promise(res => runPreloader(res));

  fontsReady.then(() => {
    setupHero();
    setupSplits();
    setupAnatomy();
    setupProcess();
    setupCounters();
    setupCta();
    setupParallax();
    setupFooter();
    if (animate) { ScrollTrigger.sort(); ScrollTrigger.refresh(); }
    setupReveals();
    preloaderDone.then(() => { if (!introQueued) { introQueued = true; heroIntro(); } });
  });
  setupMarquees();
  setupIndustries();
  setupTerminal();
  setupEdaFlow();
  setupEdaSuite();
  setupQuotes();
  setupAccordion();
  setupForms();

  // If the page opens on a #hash, go there after layout settles.
  if (location.hash.length > 1) {
    window.addEventListener('load', () => setTimeout(() => {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) scrollToTarget(el);
    }, 400));
  }
  window.addEventListener('load', () => animate && ScrollTrigger.refresh());
  window.sfaScrollTo = (el, instant) => {
    if (lenis) lenis.scrollTo(el, { offset: -headerOffset(), immediate: !!instant });
    else window.scrollTo({ top: (typeof el === 'number' ? el : el.getBoundingClientRect().top + window.scrollY - headerOffset()) });
  };
})();
