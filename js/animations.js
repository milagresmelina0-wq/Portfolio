/* ==========================================================================
   Camada de animações (fase 2).

   Como usar: registre uma função para cada âncora data-anim do HTML.
   Ela recebe o elemento e roda uma vez, só se o visitante aceita movimento.

     PortfolioAnimations.register('hero-avatar', (el) => { ...animação da personagem... });

   Âncoras disponíveis: veja o cabeçalho de css/animations.css.
   Cursor: links, botões, campos e opções de menu o fazem crescer.
   ========================================================================== */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hooks = new Map();

  const api = {
    reduced,
    register(name, init) { hooks.set(name, init); },
    init() {
      if (reduced) return;
      document.documentElement.classList.add('anim-ready');
      document.querySelectorAll('[data-anim]').forEach((el) => {
        const init = hooks.get(el.dataset.anim);
        if (init) init(el);
      });
    },
  };

  window.PortfolioAnimations = api;
  window.addEventListener('load', () => api.init());

  /* ------------------------------------------------------------------------
     Cursor: bolinha azul pastel com brilho e rastro de brilhinhos
     ------------------------------------------------------------------------ */
  const HOT = 'a[href], button, [role="button"], [role="option"], input, textarea, select, summary, label[for], [data-cursor="hover"]';
  const TRAIL_STEP = 26;   /* px de movimento entre um brilhinho do rastro e o próximo */
  const MAX_SPARKS = 46;   /* limite de brilhinhos vivos ao mesmo tempo */

  api.register('cursor', (el) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    el.innerHTML = '<i class="cursor__dot"></i>';
    document.body.classList.add('has-custom-cursor');

    let x = -100; let y = -100;
    let lastX = x; let lastY = y;
    let shown = false;
    let sparks = 0;
    let lastScrollCheck = 0;

    const isHot = (target) => {
      const hit = target && target.closest ? target.closest(HOT) : null;
      return !!hit && hit.getAttribute('aria-disabled') !== 'true' && !hit.disabled;
    };

    /* Brilhinho: nasce pequeno, cresce, gira e some caindo um pouco */
    const sparkle = (px, py, spread, big) => {
      if (sparks > MAX_SPARKS) return;
      sparks += 1;
      const s = document.createElement('i');
      s.className = 'cursor-spark';
      const size = (big ? 10 : 6) + Math.random() * (big ? 16 : 10);
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      s.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
      const ox = (Math.random() - 0.5) * spread;
      const oy = (Math.random() - 0.5) * spread;
      const dx = (Math.random() - 0.5) * 46;
      const dy = 16 + Math.random() * 38;
      document.body.appendChild(s);
      const move = (k, scale, rot) => `translate(${px + ox + dx * k}px, ${py + oy + dy * k}px) scale(${scale}) rotate(${rot}deg)`;
      const anim = s.animate([
        { transform: move(0, 0, 0), opacity: 1 },
        { transform: move(0.4, 1, 90), opacity: 1, offset: 0.35 },
        { transform: move(1, 0, 180), opacity: 0 },
      ], { duration: 650 + Math.random() * 450, easing: 'ease-out' });
      anim.onfinish = () => { s.remove(); sparks -= 1; };
    };

    const updateFrom = (target) => {
      el.classList.toggle('is-hot', isHot(target));
    };

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      el.style.transform = `translate(${x - 7}px, ${y - 7}px)`; /* sem atraso: o centro da bolinha é o mouse */
      if (!shown) { shown = true; el.style.opacity = '1'; lastX = x; lastY = y; }
      updateFrom(e.target);
      if (Math.hypot(x - lastX, y - lastY) > TRAIL_STEP) {
        sparkle(x, y, 10, false);
        lastX = x;
        lastY = y;
      }
    }, { passive: true });

    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      el.classList.add('is-down');
      for (let i = 0; i < 9; i += 1) sparkle(e.clientX, e.clientY, 34, true);
    }, { passive: true });
    document.addEventListener('pointerup', () => el.classList.remove('is-down'), { passive: true });

    /* Ao rolar sem mexer o mouse, o que está sob o cursor muda: reclassifica (no máx. 1x a cada 80ms) */
    window.addEventListener('scroll', () => {
      const now = performance.now();
      if (!shown || now - lastScrollCheck < 80) return;
      lastScrollCheck = now;
      updateFrom(document.elementFromPoint(x, y));
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', () => { el.style.opacity = '0'; shown = false; });
  });

  /* ------------------------------------------------------------------------
     Personagem do hero
       - os olhos acompanham o mouse enquanto ele está sobre o hero;
       - a cabeça inclina de leve na direção do mouse (só a cabeça: o corpo, os ombros e a mão ficam parados);
       - ao clicar nela ou em volta dela, troca para outra imagem, que fica 3 segundos e volta à original.
     Nada aqui mexe a imagem inteira: a original é redesenhada num <canvas> só com a íris deslocada e a
     cabeça levemente inclinada.
     ------------------------------------------------------------------------ */
  const AVATAR = {
    swaps: ['assets/personagem/swap-1.webp', 'assets/personagem/swap-2.webp'], /* imagens da troca, na ordem dos cliques */
    holdMs: 3000,        /* quanto tempo a imagem trocada fica na tela (depois do fade de entrada) */
    clickPad: 90,        /* o clique vale também até 90px em volta da personagem */
    canvas: { w: 1200, h: 896 },                          /* tela das imagens da personagem */
    crop: { left: -28.45, width: 135.49, top: 0.09 },     /* recorte que o hero mostra dela (igual ao CSS .hero__avatar-img) */
    eyeShift: { x: 6, y: 3 },    /* deslocamento máximo da íris, em px da tela de 1200x896 */
    leanDeg: 2.2,                  /* inclinação máxima da cabeça, em graus */
    leanPivotY: 480,               /* altura do pescoço (a inclinação some daí para baixo, então os ombros não se mexem) */
    leanFadeEnd: 620,
    /* "Virar o rosto": as feições (olhos, sobrancelhas, nariz, boca) deslocam um pouco mais que o contorno da cabeça,
       como numa rotação. É uma deformação suave centrada no rosto (sem tocar no cabelo e nas orelhas). */
    face: { x: 604, y: 322, rx: 118, ry: 112 },
    faceShift: { x: 5.5, y: 3 },   /* deslocamento máximo das feições, em px da tela de 1200x896 */
    leanSplitX: 880,               /* à direita desta linha (a mão levantada) nada se mexe */
    /* Olhos (px da tela de 1200x896): bordas do delineado de cima e da linha de baixo, e centro/raio da íris */
    eyes: [
      { iris: [537, 270.5, 12.2],
        top: [[509.5, 267.5], [512, 266.5], [523, 263.7], [534, 263], [545, 264.2], [556.5, 268.5], [567.8, 276], [571, 279]],
        bot: [[509.5, 271], [512, 273], [523, 278.7], [534, 281], [545, 281.2], [556.5, 279.8], [567.8, 278.7], [571, 279]] },
      { iris: [672, 270.5, 12.2],
        top: [[632.5, 278.5], [638.5, 274], [646, 268.8], [652.5, 265.6], [665, 262.5], [677.5, 262.8], [690, 264], [695, 266.5]],
        bot: [[632.5, 278.8], [638.5, 277.8], [646, 279], [652.5, 280.2], [665, 280.8], [677.5, 280.2], [687.5, 277.8], [692.5, 273.5], [695, 268]] },
    ],
  };

  api.register('hero-avatar', (el) => {
    const hero = el.closest('.hero') || el;
    const picture = el.querySelector('picture') || el.querySelector('.hero__avatar-img');
    const firstImg = el.querySelector('.hero__avatar-img');
    if (!picture || !firstImg) return;
    const A = AVATAR;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const make = (tag, cls) => { const n = document.createElement(tag); n.className = cls; return n; };
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    /* camadas: base (original: imagem ou canvas) + uma imagem por troca, empilhadas */
    const base = make('div', 'avatar__base');
    el.insertBefore(base, picture);
    base.appendChild(picture);

    const swaps = A.swaps.map((src) => {
      const img = make('img', 'hero__avatar-img avatar__swap');
      img.alt = '';
      img.decoding = 'async';
      img.width = A.canvas.w;
      img.height = A.canvas.h;
      img.setAttribute('aria-hidden', 'true');
      el.appendChild(img);
      return { img, src };
    });
    /* As imagens da troca só começam a carregar quando o navegador está ocioso, para não competir com o hero */
    const loadSwaps = () => swaps.forEach((s) => { s.img.src = s.src; });
    if ('requestIdleCallback' in window) window.requestIdleCallback(loadSwaps, { timeout: 2500 });
    else setTimeout(loadSwaps, 1200);

    /* Acessibilidade: a personagem é um botão (Enter/Espaço também trocam a imagem) */
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.setAttribute('aria-label', 'Ilustração de Melina. Clique para ver outra expressão.');

    /* ---------- Troca de imagem: entra suave, fica 3s e volta à original ---------- */
    let current = -1; /* última imagem mostrada: a sequência continua de onde parou (não volta à primeira) */
    let holdTimer = 0;
    const restore = () => {
      el.classList.remove('is-swapped');
      swaps.forEach((s) => s.img.classList.remove('is-active'));
    };
    const swapNext = () => {
      current = (current + 1) % swaps.length;
      el.classList.add('is-swapped');
      swaps.forEach((s, i) => s.img.classList.toggle('is-active', i === current));
      clearTimeout(holdTimer);
      holdTimer = setTimeout(restore, A.holdMs + 450); /* + a duração do fade de entrada */
    };
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); swapNext(); } });

    /* Clique na personagem ou até 90px em volta dela (ignora links, botões e campos) */
    document.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, textarea, select, [role="button"]:not(.hero__avatar)')) return;
      const h = hero.getBoundingClientRect();
      if (e.clientX < h.left || e.clientX > h.right || e.clientY < h.top || e.clientY > h.bottom) return;
      const r = el.getBoundingClientRect();
      const p = A.clickPad;
      if (e.clientX >= r.left - p && e.clientX <= r.right + p && e.clientY >= r.top - p && e.clientY <= r.bottom + p) swapNext();
    });

    /* ---------- Olhos e cabeça seguem o mouse (só com mouse) ---------- */
    if (!fine) return;

    const source = new Image();
    source.decoding = 'async';
    source.onload = () => {
      const W = A.canvas.w; const H = A.canvas.h;
      const orig = document.createElement('canvas'); orig.width = W; orig.height = H;
      const og = orig.getContext('2d', { willReadFrequently: true });
      og.drawImage(source, 0, 0);
      const work = document.createElement('canvas'); work.width = W; work.height = H;
      const wg = work.getContext('2d', { willReadFrequently: true });
      wg.drawImage(orig, 0, 0);

      const out = make('canvas', 'hero__avatar-img avatar__canvas');
      out.setAttribute('aria-hidden', 'true');
      const og2 = out.getContext('2d');
      base.appendChild(out);

      let cw = 0; let ch = 0;
      const fit = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const r = el.getBoundingClientRect();
        const nw = Math.max(1, Math.round(r.width * (A.crop.width / 100) * dpr));
        const nh = Math.max(1, Math.round(r.height * dpr));
        if (nw !== cw || nh !== ch) { cw = nw; ch = nh; out.width = cw; out.height = ch; }
      };

      /* abertura do olho (polígono) e cores da esclera amostradas da própria imagem, linha a linha */
      const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i]; const [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
      const data = og.getImageData(0, 0, W, H).data;
      const px = (x, y) => { const i = (Math.round(y) * W + Math.round(x)) * 4; return [data[i], data[i + 1], data[i + 2]]; };
      const eyes = A.eyes.map((e) => {
        const poly = e.top.concat(e.bot.slice().reverse());
        const [ix, iy, ir] = e.iris;
        const rows = [];
        for (let y = Math.floor(iy - ir - 1); y <= Math.ceil(iy + ir + 1); y++) {
          let xa = null; let xb = null;
          for (let x = Math.floor(ix - ir - 8); x <= Math.ceil(ix + ir + 8); x++) if (inPoly(poly, x + 0.5, y + 0.5)) { if (xa === null) xa = x; xb = x; }
          if (xa === null) continue;
          const lx = ix - ir - 3; const rx = ix + ir + 3;
          const left = lx >= xa ? px(lx, y) : null; const right = rx <= xb ? px(rx, y) : null;
          rows.push({ y, xa, xb, left: left || right, right: right || left });
        }
        const xs = poly.map((p) => p[0]); const ys = poly.map((p) => p[1]);
        const box = { x: Math.floor(Math.min(...xs)) - 2, y: Math.floor(Math.min(...ys)) - 2, w: Math.ceil(Math.max(...xs) - Math.min(...xs)) + 5, h: Math.ceil(Math.max(...ys) - Math.min(...ys)) + 5 };
        return { poly, rows, box, ix, iy, ir };
      });

      /* redesenha as íris deslocadas (ox, oy) sobre a imagem original, sem tocar no resto */
      const drawEyes = (ox, oy) => {
        eyes.forEach((e) => {
          const b = e.box;
          wg.drawImage(orig, b.x, b.y, b.w, b.h, b.x, b.y, b.w, b.h); /* volta ao original */
          if (Math.abs(ox) < 0.06 && Math.abs(oy) < 0.06) return;      /* parada: fica exatamente a imagem original */
          wg.save();
          wg.beginPath();
          e.poly.forEach(([x, y], i) => (i ? wg.lineTo(x, y) : wg.moveTo(x, y)));
          wg.closePath();
          wg.clip();
          e.rows.forEach((r) => { /* esclera onde a íris estava (interpolada entre as cores dos dois lados) */
            const g = wg.createLinearGradient(e.ix - e.ir - 3, 0, e.ix + e.ir + 3, 0);
            g.addColorStop(0, `rgb(${r.left[0]},${r.left[1]},${r.left[2]})`);
            g.addColorStop(1, `rgb(${r.right[0]},${r.right[1]},${r.right[2]})`);
            wg.fillStyle = g;
            wg.fillRect(e.ix - e.ir - 3, r.y, 2 * e.ir + 6, 1.2);
          });
          wg.beginPath();
          wg.arc(e.ix + ox, e.iy + oy, e.ir, 0, Math.PI * 2);
          wg.clip();
          wg.drawImage(orig, e.ix - e.ir, e.iy - e.ir, 2 * e.ir, 2 * e.ir, e.ix - e.ir + ox, e.iy - e.ir + oy, 2 * e.ir, 2 * e.ir);
          wg.restore();
        });
      };

      /* "Virar o rosto": deformação suave em torno do rosto. Cada ponto da região volta buscar sua cor um pouco
         deslocada, com peso que cai de 1 no centro do rosto a ~0 nas bordas (então cabelo e orelhas não se mexem). */
      const F = A.face;
      const RX = Math.max(0, Math.floor(F.x - F.rx * 1.7)); const RY = Math.max(0, Math.floor(F.y - F.ry * 1.7));
      const RW = Math.min(W - RX, Math.ceil(F.rx * 3.4)); const RH = Math.min(H - RY, Math.ceil(F.ry * 3.4));
      const weight = new Float32Array(RW * RH);
      for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
        const u = (x + RX - F.x) / F.rx; const v = (y + RY - F.y) / F.ry;
        weight[y * RW + x] = Math.exp(-2 * (u * u + v * v));
      }
      const warped = document.createElement('canvas'); warped.width = W; warped.height = H;
      const wg2 = warped.getContext('2d');
      const warpOut = new ImageData(RW, RH);
      const warpFace = (fx, fy) => {
        if (Math.abs(fx) < 0.015 && Math.abs(fy) < 0.015) return work; /* parada: a imagem original, sem deformar nada */
        const s = wg.getImageData(RX, RY, RW, RH).data; const d = warpOut.data;
        const dx = fx * A.faceShift.x; const dy = fy * A.faceShift.y;
        for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
          const g = weight[y * RW + x];
          let sx = x - dx * g; let sy = y - dy * g;
          sx = sx < 0 ? 0 : (sx > RW - 1.001 ? RW - 1.001 : sx); sy = sy < 0 ? 0 : (sy > RH - 1.001 ? RH - 1.001 : sy);
          const x0 = sx | 0; const y0 = sy | 0; const ax = sx - x0; const ay = sy - y0;
          const i00 = (y0 * RW + x0) * 4; const i10 = i00 + 4; const i01 = i00 + RW * 4; const i11 = i01 + 4;
          const o = (y * RW + x) * 4;
          for (let c = 0; c < 4; c++) d[o + c] = (s[i00 + c] * (1 - ax) + s[i10 + c] * ax) * (1 - ay) + (s[i01 + c] * (1 - ax) + s[i11 + c] * ax) * ay;
        }
        wg2.clearRect(0, 0, W, H);
        wg2.drawImage(work, 0, 0);
        wg2.putImageData(warpOut, RX, RY);
        return warped;
      };

      /* desenha no canvas visível: faixas horizontais deslocadas para a cabeça inclinar; do pescoço para baixo nada se move */
      const STRIP = 4;
      const render = (leanDeg, ox, oy, fx = 0, fy = 0) => {
        fit();
        drawEyes(ox, oy);
        const frameSrc = warpFace(fx, fy);
        const sx = cw / W; const sy = ch / H;
        og2.clearRect(0, 0, cw, ch);
        og2.imageSmoothingEnabled = true;
        og2.imageSmoothingQuality = 'high';
        const t = Math.tan((leanDeg * Math.PI) / 180);
        const fadeStart = A.leanPivotY; const fadeEnd = A.leanFadeEnd;
        for (let y0 = 0; y0 < fadeEnd; y0 += STRIP) {
          const d0 = Math.round(y0 * sy); const d1 = Math.round(Math.min(y0 + STRIP, H) * sy); if (d1 <= d0) continue;
          const yc = y0 + STRIP / 2;
          const dx = yc < fadeStart ? t * (fadeStart - yc) : 0; /* quanto mais alto, mais a cabeça se desloca */
          const srcY = d0 / sy; const srcH = (d1 - d0) / sy;
          og2.drawImage(frameSrc, 0, srcY, A.leanSplitX, srcH, dx * sx, d0, A.leanSplitX * sx, d1 - d0);
          og2.drawImage(frameSrc, A.leanSplitX, srcY, W - A.leanSplitX, srcH, A.leanSplitX * sx, d0, (W - A.leanSplitX) * sx, d1 - d0);
        }
        const dTop = Math.round(fadeEnd * sy);
        og2.drawImage(frameSrc, 0, dTop / sy, W, H - dTop / sy, 0, dTop, cw, ch - dTop);
      };

      /* alvo (-1..1) a partir do mouse; olhos acompanham rápido e a cabeça um pouco depois */
      let tx = 0; let ty = 0; let ex = 0; let ey = 0; let lean = 0; let raf = 0; let visible = true;
      const step = () => {
        raf = 0;
        ex += (tx - ex) * 0.22; ey += (ty - ey) * 0.22;
        lean += (tx - lean) * 0.08;
        render(lean * A.leanDeg, ex * A.eyeShift.x, ey * A.eyeShift.y, lean, ey); /* o rosto vira com a cabeça (lento); sobe/desce com os olhos */
        if (Math.abs(tx - ex) > 0.004 || Math.abs(ty - ey) > 0.004 || Math.abs(tx - lean) > 0.004) raf = requestAnimationFrame(step);
      };
      const kick = () => { if (!raf && visible) raf = requestAnimationFrame(step); };

      render(0, 0, 0);
      el.classList.add('has-canvas'); /* a partir daqui o canvas substitui a imagem (mesma imagem, mesmo lugar) */

      if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) kick(); }, { threshold: 0.05 }).observe(hero);
      window.addEventListener('resize', () => { cw = 0; kick(); });

      document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !visible || el.classList.contains('is-swapped')) return;
        const h = hero.getBoundingClientRect();
        const inside = e.clientX >= h.left && e.clientX <= h.right && e.clientY >= h.top && e.clientY <= h.bottom;
        if (inside) {
          const a = el.getBoundingClientRect();
          /* posição do rosto na tela: os olhos estão em (604, 270) da imagem de 1200x896 */
          const faceX = a.left + (A.crop.left / 100 + (604.5 / W) * (A.crop.width / 100)) * a.width;
          const faceY = a.top + (A.crop.top / 100 + 270 / H) * a.height;
          tx = clamp((e.clientX - faceX) / (h.width * 0.4), -1, 1);
          ty = clamp((e.clientY - faceY) / (h.height * 0.4), -1, 1);
        } else { tx = 0; ty = 0; }
        kick();
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', () => { tx = 0; ty = 0; kick(); });
    };
    source.src = (firstImg.currentSrc || firstImg.src);
  });
})();
