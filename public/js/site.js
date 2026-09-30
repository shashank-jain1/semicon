/* SFA Global — site interactions & scroll animations */
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
    document.addEventListener('pointerover', (e) => {
      const labelEl = e.target.closest('[data-cursor-label]');
      const hov = e.target.closest('a, button, label, [data-tilt], [data-ind-row], summary');
      cur.classList.toggle('is-hover', !!hov && !labelEl);
      cur.classList.toggle('has-label', !!labelEl);
      lbl.textContent = labelEl ? labelEl.dataset.cursorLabel : '';
    });
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
    let lastX = 0;
    sec.addEventListener('pointermove', (e) => {
      xTo(e.clientX); yTo(e.clientY);
      G.to(f, { rotation: Math.max(-25, Math.min(25, (e.clientX - lastX) * 1.2)), duration: 0.4 });
      lastX = e.clientX;
    });
    $$('[data-ind-row]', sec).forEach(row => {
      row.addEventListener('pointerenter', () => {
        f.innerHTML = $('template', row).innerHTML;
        G.to(f, { scale: 1, duration: 0.5, ease: 'back.out(1.7)' });
      });
    });
    $('.ind', sec).addEventListener('pointerleave', () => G.to(f, { scale: 0, duration: 0.4, ease: 'power3.in' }));
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
