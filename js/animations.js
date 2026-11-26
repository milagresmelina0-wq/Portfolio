/* ==========================================================================
   Camada de animações (fase 2).

   Como usar: registre uma função para cada âncora data-anim do HTML.
   Ela recebe o elemento e roda uma vez, só se o visitante aceita movimento.

     PortfolioAnimations.register('hero-avatar', (el) => { ...animação da personagem... });

   Âncoras disponíveis: veja o cabeçalho de css/animations.css.
   Estados do cursor: links, botões e [data-cursor="hover"] ativam o "hover";
   campos de texto mostram o cursor nativo.
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
     Cursor: estrela da marca
     ------------------------------------------------------------------------ */
  /* Estrela com a silhueta do logo (braço de baixo mais longo, 4 raios curtos nas diagonais), numa versão
     de cursor: braços mais curtos e grossos que o logo, para continuarem visíveis em ~34px.
     Centro em (50,60). */
  const STAR_SVG = `
    <svg class="cursor__star" viewBox="0 0 100 130" aria-hidden="true" focusable="false">
      <path d="M50 0 Q52 46 58 60 L42 60 Q48 46 50 0 Z
               M50 130 Q52 74 58 60 L42 60 Q48 74 50 130 Z
               M100 60 Q72 58 58 51 L58 69 Q72 62 100 60 Z
               M0 60 Q28 58 42 51 L42 69 Q28 62 0 60 Z
               M72 38 L53.5 63.5 L46.5 56.5 Z
               M28 38 L53.5 56.5 L46.5 63.5 Z
               M72 82 L46.5 63.5 L53.5 56.5 Z
               M28 82 L53.5 63.5 L46.5 56.5 Z"/>
    </svg>`;

  const INTERACTIVE = 'a[href], button, [role="button"], summary, label[for], [data-cursor="hover"]';
  const TEXT_FIELD = 'input, textarea, select';

  api.register('cursor', (el) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    el.innerHTML = STAR_SVG;
    document.body.classList.add('has-custom-cursor');

    /* x, y: posição atual (suavizada); tx, ty: onde está o mouse. O resto é igual: valor atual e alvo. */
    const s = { x: -100, y: -100, tx: -100, ty: -100, scale: 1, tscale: 1, rot: 0, trot: 0, tilt: 0 };
    let mode = 'default'; /* default | hover | text */
    let pressed = false;
    let raf = 0;
    let seen = false;
    let lastScrollCheck = 0;

    const classify = (target) => {
      if (!target || !target.closest) return 'default';
      if (target.closest(TEXT_FIELD)) return 'text';
      const hit = target.closest(INTERACTIVE);
      if (hit && hit.getAttribute('aria-disabled') !== 'true' && !hit.disabled) return 'hover';
      return 'default';
    };

    const setMode = (next) => {
      if (next === mode) return;
      mode = next;
      el.classList.toggle('is-hover', mode === 'hover');
      el.classList.toggle('is-text', mode === 'text');
      s.tscale = mode === 'hover' ? 1.5 : 1;
      s.trot = mode === 'hover' ? 45 : 0;
      kick();
    };

    const frame = () => {
      raf = 0;
      const lag = s.tx - s.x; /* quanto o cursor ainda está atrás do mouse: vira inclinação */
      s.x += lag * 0.4;
      s.y += (s.ty - s.y) * 0.4;
      s.scale += ((pressed ? s.tscale * 0.78 : s.tscale) - s.scale) * 0.22;
      s.rot += (s.trot - s.rot) * 0.2;
      const targetTilt = Math.max(-22, Math.min(22, lag * 1.1));
      s.tilt += (targetTilt - s.tilt) * 0.25;

      el.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0) rotate(${(s.rot + s.tilt).toFixed(2)}deg) scale(${s.scale.toFixed(3)})`;

      const settled = Math.abs(s.tx - s.x) < 0.1 && Math.abs(s.ty - s.y) < 0.1
        && Math.abs(s.tilt) < 0.1 && Math.abs((pressed ? s.tscale * 0.78 : s.tscale) - s.scale) < 0.004
        && Math.abs(s.trot - s.rot) < 0.1;
      if (!settled) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const show = () => { el.classList.add('is-visible'); };
    const hide = () => { el.classList.remove('is-visible'); };

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      s.tx = e.clientX;
      s.ty = e.clientY;
      if (!seen) { s.x = s.tx; s.y = s.ty; seen = true; } /* primeira vez: aparece já no lugar certo */
      show();
      setMode(classify(e.target));
      kick();
    }, { passive: true });

    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      pressed = true; kick();
    }, { passive: true });
    document.addEventListener('pointerup', () => { pressed = false; kick(); }, { passive: true });

    /* Ao rolar sem mexer o mouse, o que está sob o cursor muda: reclassifica (no máx. 1x a cada 80ms). */
    window.addEventListener('scroll', () => {
      const now = performance.now();
      if (!seen || now - lastScrollCheck < 80) return;
      lastScrollCheck = now;
      setMode(classify(document.elementFromPoint(s.tx, s.ty)));
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', hide);
    document.documentElement.addEventListener('mouseenter', () => { if (seen) show(); });
    window.addEventListener('blur', hide);
  });
})();
