/* NAFC Home v5: project motion (xd-motion skill)
   Loads after motion-core.js and uses window.Motion. Nothing runs in static mode (?static, Playwright). */
(() => {
  if (!window.Motion) return;
  const { $, $$, reduce, fine, clamp, flush, onScroll } = Motion;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const make = (tag, cls) => { const el = document.createElement(tag); el.className = cls; return el; };
  // jump to a new position without the transition, then hand the transition back
  const snap = (el, fn) => { el.style.transition = 'none'; fn(); flush(el); el.style.transition = ''; };
  // pinned scenes only make sense with room and a mouse (sticky + runway feels stuck on phones)
  const canPin = () => !reduce && fine && innerWidth >= 1024;
  const goTo = y => (Motion.lenis ? Motion.lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: y, behavior: 'smooth' }));

  /* ---------- hero intro: skip it on a reload mid-page, or the page would shift under the visitor ---------- */
  if (scrollY > 40) document.documentElement.classList.add('no-intro');

  /* ---------- header: hide on scroll down, show on scroll up ---------- */
  const header = $('.site-header');
  if (header) {
    let lastY = scrollY;
    onScroll(y => {
      header.classList.toggle('is-scrolled', y > 8);
      if (header.classList.contains('is-open') || y < header.offsetHeight) header.classList.remove('is-hidden');
      else if (y > lastY + 4) header.classList.add('is-hidden');
      else if (y < lastY - 4) header.classList.remove('is-hidden');
      lastY = y;
    });
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  }

  /* ---------- buttons: rotating glow (styled in animations.css) ---------- */
  $$('.btn, .hbtn, .finder__submit').forEach(b => b.insertAdjacentHTML('beforeend', '<span class="glow" aria-hidden="true"></span>'));

  /* ---------- impact card links: every row gets the arrow, shown on hover ---------- */
  $$('.program__links').forEach(ul => {
    const arrow = $('.i-arrow-ur', ul);
    if (!arrow) return;
    $$('li', ul).forEach(li => {
      if ($('.i-arrow-ur', li)) return;
      const c = arrow.cloneNode(true);
      c.classList.add('is-clone');
      c.setAttribute('aria-hidden', 'true');
      li.appendChild(c);
    });
  });

  /* =========================================================
     Where do you want to start? One screen of scroll per path.
     ========================================================= */
  const start = $('.start');
  if (start) {
    const sec = start, wrap = $('.wrap', sec), list = $('.paths', sec), items = $$('.paths__item', sec);
    const photo = $('.start__photo', sec), card = $('.start__card', sec), body0 = $('.start__card-body', sec);
    const N = items.length;
    let built = false, on = false, active = 0, runway = 0, stickTop = 0, regions = [];
    let hl, hov;
    const slides = [], bodies = [body0];

    const build = () => {
      built = true;
      hl = make('li', 'paths__hl'); hov = make('li', 'paths__hover');
      [hl, hov].forEach(el => el.setAttribute('aria-hidden', 'true'));
      list.append(hl, hov);

      const arrow0 = $('.i-arrow-bold', items[0]);
      items.forEach((li, i) => {
        const a = $('a', li);
        a.insertAdjacentHTML('afterbegin', `<span class="paths__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`);
        if (i) {
          const c = arrow0.cloneNode(true);
          c.classList.add('paths__arrow-clone');
          a.appendChild(c);
          // photo for this path (PLACEHOLDER images, see index.html)
          const img = new Image();
          img.className = 'start__slide';
          img.decoding = 'async';
          img.src = li.dataset.img;
          img.alt = li.dataset.alt || '';
          photo.appendChild(img);
          slides[i] = img;
          // card copy for this path
          const b = body0.cloneNode(true);
          b.classList.add('is-clone', 'is-off');
          $('h3', b).textContent = li.dataset.title;
          $('p', b).textContent = li.dataset.text;
          card.appendChild(b);
          bodies[i] = b;
        }
        a.addEventListener('click', e => {
          if (!on) return;
          e.preventDefault();
          const top = sec.getBoundingClientRect().top + scrollY - stickTop;
          goTo(top + runway * ((i + .5) / N));
        });
        li.addEventListener('mouseenter', () => {
          if (!on) return;
          li.classList.add('is-hover');
          if (i === active) return;
          if (!hov.classList.contains('is-on')) snap(hov, () => place(hov, i)); else place(hov, i);
          hov.classList.add('is-on');
        });
        li.addEventListener('mouseleave', () => { li.classList.remove('is-hover'); hov.classList.remove('is-on'); });
      });

      // card titles: words in a mask, numbered by line, so each line rises on its own (after fonts: line breaks are final)
      document.fonts.ready.then(() => bodies.forEach(b => {
        const h = $('h3', b);
        let line = 0, top = null;
        Motion.splitWords(h).forEach(w => {
          if (top !== null && Math.abs(w.offsetTop - top) > 4) line++;
          top = w.offsetTop;
          w.style.setProperty('--li', line);
        });
        h.classList.add('is-split');
      }));
    };

    // each row's box runs from the rule above it to its own rule (the static navy row is 108px)
    const measure = () => {
      const lt = list.getBoundingClientRect().top;
      regions = items.map((li, i) => {
        const r = li.getBoundingClientRect();
        const top = i ? items[i - 1].getBoundingClientRect().bottom : r.top;
        return { top: top - lt, h: r.bottom - 1 - top, liTop: r.top - lt };
      });
      items.forEach((li, i) => {
        if (i) li.style.setProperty('--arrow-top', (regions[i].top + regions[i].h / 2 - regions[i].liTop - 19.329).toFixed(2) + 'px');
      });
      const cs = getComputedStyle(card);
      card.style.setProperty('--card-pt', cs.paddingTop);
      card.style.setProperty('--card-pl', cs.paddingLeft);
      card.style.setProperty('--card-pr', cs.paddingRight);
      snap(hl, () => place(hl, active));
    };
    const place = (box, i) => { box.style.translate = `0 ${regions[i].top}px`; box.style.height = regions[i].h + 'px'; };

    const setStep = i => {
      // the white panel wipes away and back up on every real change (layout() re-applies the same step: no wipe)
      if (i !== active) { card.classList.remove('is-swap'); flush(card); card.classList.add('is-swap'); }
      active = i;
      items.forEach((li, k) => {
        li.classList.toggle('is-on', k === i);
        $('a', li).toggleAttribute('aria-current', k === i);
      });
      if (hov && items[i].classList.contains('is-hover')) hov.classList.remove('is-on');   // the navy block takes over
      place(hl, i);
      // photos up to this step are in; the fade itself is a timed CSS transition, so it never stops halfway
      slides.forEach((img, k) => img && img.classList.toggle('is-shown', k <= i));
      bodies.forEach((b, k) => {
        const show = k === i;
        b.classList.toggle('is-off', !show);
        b.toggleAttribute('inert', !show);
        if (k) b.setAttribute('aria-hidden', String(!show));
      });
    };

    const update = (y, vh) => {
      if (!on) return;
      const r = sec.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = clamp((stickTop - r.top) / runway), pp = p * N;
      const step = Math.min(N - 1, Math.floor(pp));
      if (step !== active) setStep(step);
    };

    const layout = () => {
      const want = canPin() && wrap.offsetHeight <= innerHeight * 1.04;
      if (want !== on) {
        on = want;
        sec.classList.toggle('is-pinned', on);
        if (on && !built) build();
        if (!on) {
          sec.style.height = ''; wrap.style.top = '';
          items.forEach(li => { li.classList.remove('is-on', 'is-hover'); $('a', li).removeAttribute('aria-current'); });
          bodies.forEach((b, k) => { b.classList.toggle('is-off', k > 0); b.toggleAttribute('inert', k > 0); });
          active = 0;
        }
      }
      if (!on) return;
      const vh = innerHeight, wh = wrap.offsetHeight;
      runway = vh * (parseFloat(sec.dataset.pinSteps) || 400) / 100;
      sec.style.height = (wh + runway) + 'px';
      stickTop = Math.round((vh - wh) / 2);
      wrap.style.top = stickTop + 'px';
      measure();
      setStep(active);
      update(scrollY, vh);
    };

    onScroll(update);
    addEventListener('resize', layout);
    layout();
    document.fonts && document.fonts.ready.then(() => on && measure());
  }

  /* =========================================================
     By the numbers. One screen of scroll per stat.
     ========================================================= */
  const nums = $('.numbers');
  if (nums) {
    const sec = nums, stage = $('.numbers__stage', sec), wrap = $('.wrap', sec), bgImg = $('.numbers__bg img', sec);
    const big = $('.bignum', sec), val = $('.bignum__value', sec), cap = $('.bignum__caption', sec);
    const stats = $('.stats', sec), items = $$('.stats__item', sec), N = items.length;
    const data = items.map(it => ({
      v: +it.dataset.value, d: +it.dataset.decimals || 0, suf: it.dataset.suffix || '',
      plus: !!it.dataset.plus, comma: it.dataset.format === 'comma', label: $('dd', it).textContent,
    }));
    const val0 = val.textContent, cap0 = cap.textContent;
    const fmt = (s, x) => (s.comma ? Math.round(x).toLocaleString('en-US') : x.toFixed(s.d)) + s.suf;
    let built = false, on = false, runway = 0, active = -1;
    const bars = [];

    const swap = i => {
      const first = active === -1;
      active = i;
      big.classList.toggle('no-plus', !data[i].plus);
      items.forEach((it, k) => it.classList.toggle('is-lit', k <= i));
      if (first) { cap.textContent = data[i].label; return; }
      clearTimeout(cap._t);
      cap.classList.add('is-out');
      cap._t = setTimeout(() => {
        cap.textContent = data[i].label;
        cap.classList.add('is-pre');
        cap.classList.remove('is-out');
        flush(cap);
        cap.classList.remove('is-pre');
      }, 260);
    };

    const update = (y, vh) => {
      if (!on) return;
      const r = sec.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = clamp(-r.top / runway), pp = p * N;
      bgImg.style.scale = (1.2 - .2 * p).toFixed(4);
      const i = Math.min(N - 1, Math.floor(pp)), t = easeOut(clamp((pp - i) / .7));
      if (i !== active) swap(i);
      val.textContent = fmt(data[i], data[i].v * t);
      bars.forEach((b, k) => { b.style.scale = `${(k < i ? 1 : k === i ? t : 0).toFixed(4)} 1`; });
    };

    const layout = () => {
      const want = canPin() && stage.offsetHeight <= innerHeight * 1.02 && wrap.offsetHeight <= innerHeight;
      if (want !== on) {
        on = want;
        sec.classList.toggle('is-pinned', on);
        if (on && !built) {
          built = true;
          items.forEach((it, i) => {
            const b = make('div', 'stats__bar');
            b.style.setProperty('--i', i);
            b.setAttribute('aria-hidden', 'true');
            stats.appendChild(b);
            bars.push(b);
          });
        }
        if (!on) {
          sec.style.height = ''; bgImg.style.scale = '';
          val.textContent = val0; cap.textContent = cap0;
          big.classList.remove('no-plus');
          items.forEach(it => it.classList.remove('is-lit'));
          active = -1;
        }
      }
      if (!on) return;
      // gap between the number's right edge and the +'s (offsets ignore the translate, so this works mid-slide)
      const plus = $('.bignum__plus', big);
      big.style.setProperty('--plus-shift', (plus.offsetLeft + plus.offsetWidth - val.offsetLeft - val.offsetWidth) + 'px');
      runway = innerHeight * (parseFloat(sec.dataset.pinSteps) || 400) / 100;
      sec.style.height = (innerHeight + runway) + 'px';
      update(scrollY, innerHeight);
    };

    onScroll(update);
    addEventListener('resize', layout);
    layout();
    document.fonts && document.fonts.ready.then(() => on && layout());   // the + gap depends on the web font
  }

  /* =========================================================
     Partners: endless logo strip, gray until hovered
     ========================================================= */
  const partners = $('.partners');
  if (partners && !reduce) {
    const ul = $('.logos', partners);
    const lis = $$('li', ul);
    // freeze each logo at its static size before the cells change
    lis.forEach(li => { const img = $('img', li); img.style.width = li.offsetWidth + 'px'; img.style.height = li.offsetHeight + 'px'; });
    const box = make('div', 'marquee');
    ul.before(box);
    box.appendChild(ul);
    $$('.logos__fade', partners).forEach(f => box.appendChild(f));
    // a second copy makes the loop seamless (translate -50%)
    lis.forEach(li => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      $('img', c).alt = '';
      ul.appendChild(c);
    });
    partners.classList.add('is-marquee');
  }
})();
