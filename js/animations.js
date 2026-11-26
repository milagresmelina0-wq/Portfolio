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
})();
