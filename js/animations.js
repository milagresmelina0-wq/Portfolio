/* ==========================================================================
   Camada de animações (fase 2) — ainda sem efeitos ativos.

   Como usar: registre uma função para cada âncora data-anim do HTML.
   Ela recebe o elemento e roda uma vez, só se o visitante aceita movimento.

     PortfolioAnimations.register('hero-avatar', (el) => { ...GIF/Lottie... });
     PortfolioAnimations.register('cursor', (el) => { ...segue o mouse... });

   Âncoras disponíveis: veja o cabeçalho de css/animations.css.
   Elementos que o cursor deve tratar como "hover": [data-cursor="hover"].
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
})();
