/* ==========================================================================
   Comportamentos base do site: menu, carrosséis, marquee, navegação ativa.
   Animações extras ficam em js/animations.js.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Ano do rodapé */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* Links ainda sem destino (CV, LinkedIn, e-mail, case): não saltam para o topo */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-placeholder]');
    if (link) e.preventDefault();
  });

  /* Formulário: por enquanto não envia nada (falta conectar o serviço de envio) */
  $$('form[data-form]').forEach((form) => {
    form.addEventListener('submit', (e) => e.preventDefault());
  });

  /* Header: fundo sólido depois do hero + menu mobile */
  const header = $('.header');
  const hero = $('.hero');
  const toggle = $('[data-menu-toggle]');

  const setMenu = (open) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };

  if (header) {
    let ticking = false;
    const update = () => {
      const limit = (hero ? hero.offsetHeight : 400) - header.offsetHeight;
      header.classList.toggle('is-solid', window.scrollY > limit);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (toggle) {
      toggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
      $$('[data-menu] a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
      window.matchMedia('(min-width: 1001px)').addEventListener('change', () => setMenu(false));
    }
  }

  /* Navegação: destaca a seção visível */
  const links = $$('.nav__link');
  const targets = links
    .map((a) => ({ a, section: $(a.getAttribute('href')) }))
    .filter((t) => t.section);

  if ('IntersectionObserver' in window && targets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        targets.forEach(({ a, section }) => {
          if (section === entry.target) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(({ section }) => io.observe(section));
  }

  /* Carrosséis (serviços e feedbacks) */
  $$('[data-carousel]').forEach((track) => {
    const id = track.dataset.carousel;
    const prev = $(`[data-carousel-prev="${id}"]`);
    const next = $(`[data-carousel-next="${id}"]`);

    const step = () => {
      const card = track.firstElementChild;
      if (!card) return 0;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    };
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: motion.matches ? 'auto' : 'smooth' });

    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      if (prev) prev.setAttribute('aria-disabled', String(track.scrollLeft <= 2));
      if (next) next.setAttribute('aria-disabled', String(track.scrollLeft >= max - 2));
    };

    if (prev) prev.addEventListener('click', () => go(-1));
    if (next) next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', sync, { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    window.addEventListener('resize', sync);
    sync();
  });

  /* Marquee de skills: duplica o grupo para o loop ficar contínuo */
  $$('[data-marquee]').forEach((marquee) => {
    const group = $('[data-marquee-group]', marquee);
    if (!group) return;

    const clone = group.cloneNode(true);
    clone.removeAttribute('data-marquee-group');
    clone.setAttribute('aria-hidden', 'true');
    marquee.appendChild(clone);

    const apply = () => marquee.classList.toggle('is-running', !motion.matches);
    motion.addEventListener('change', apply);
    apply();
  });
})();
