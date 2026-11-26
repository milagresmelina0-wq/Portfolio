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
     Personagem do hero: respira, pisca sozinha, acompanha o mouse enquanto ele está no hero
     e troca de pose a cada clique (a sequência volta ao início depois da última).
     ------------------------------------------------------------------------ */

  /* Sequência de poses, na ordem dos cliques. A primeira é a imagem que já está no HTML.
     Cada pose nova segue Portfolio/Personagem/Especificacao-Poses.md. Para ligar o piscar de uma pose,
     informe o remendo dos olhos fechados (x, y, w, h em pixels da tela de 1200x896 das poses). Exemplo:
       { src: 'assets/personagem/pose-02.webp', alt: 'Melina sorrindo',
         blink: { src: 'assets/personagem/pose-02-piscando.webp', x: 420, y: 240, w: 360, h: 80 } } */
  /* Remendos do piscar (recortes pequenos com os olhos fechados, em pixels da tela de 1200x896):
     os dois olhos (x 500, y 250, 208x50) e só o olho esquerdo (x 500, y 250, 80x50). */
  const BLINK_BOTH = { src: 'assets/personagem/blink-both.webp', x: 500, y: 250, w: 208, h: 50 };
  const BLINK_LEFT = { src: 'assets/personagem/blink-left.webp', x: 500, y: 250, w: 80, h: 50 };

  const AVATAR_POSES = [
    { alt: 'Melina acenando', blink: BLINK_BOTH },
    { src: 'assets/personagem/pose-02.webp', alt: 'Melina sorrindo, de olhos fechados' },
    { src: 'assets/personagem/pose-03.webp', alt: 'Melina dando uma piscadinha', blink: BLINK_LEFT },
    { src: 'assets/personagem/pose-04.webp', alt: 'Melina olhando de lado', blink: BLINK_BOTH },
    { src: 'assets/personagem/pose-05.webp', alt: 'Melina acenando com a mão inclinada', blink: BLINK_BOTH },
  ];

  /* A tela das poses (1200x896) e o recorte que o hero mostra dela (mesmos números do CSS .hero__avatar-img) */
  const AVATAR_CANVAS = { w: 1200, h: 896 };
  const AVATAR_CROP = { left: -28.45, width: 135.49, top: 0.09 };

  api.register('hero-avatar', (el) => {
    const hero = el.closest('.hero') || el;
    const firstImg = el.querySelector('.hero__avatar-img');
    if (!firstImg) return;
    const poses = (window.PortfolioAvatarPoses || AVATAR_POSES).slice();

    const make = (tag, cls) => { const n = document.createElement(tag); n.className = cls; return n; };
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    /* camadas: stage (segue o mouse) > pop (clique) > poses (respiração + imagens) */
    const stage = make('div', 'avatar__stage');
    const pop = make('div', 'avatar__pop');
    const stack = make('div', 'avatar__poses');
    stack.appendChild(firstImg.closest('picture') || firstImg);
    pop.appendChild(stack);
    stage.appendChild(pop);
    el.appendChild(stage);

    const percent = (value, total, scale) => (value / total) * scale;
    const layers = poses.map((pose, i) => {
      const img = i === 0 ? firstImg : make('img', 'hero__avatar-img');
      img.classList.add('avatar__pose');
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      if (i > 0) { img.decoding = 'async'; img.width = AVATAR_CANVAS.w; img.height = AVATAR_CANVAS.h; stack.appendChild(img); }

      let blinkEl = null;
      if (pose.blink) {
        const b = pose.blink;
        blinkEl = make('img', 'avatar__blink');
        blinkEl.alt = '';
        blinkEl.decoding = 'async';
        blinkEl.style.left = `${AVATAR_CROP.left + percent(b.x, AVATAR_CANVAS.w, AVATAR_CROP.width)}%`;
        blinkEl.style.width = `${percent(b.w, AVATAR_CANVAS.w, AVATAR_CROP.width)}%`;
        blinkEl.style.top = `${AVATAR_CROP.top + percent(b.y, AVATAR_CANVAS.h, 100)}%`;
        blinkEl.style.height = `${percent(b.h, AVATAR_CANVAS.h, 100)}%`;
        stack.appendChild(blinkEl);
      }
      return { img, blinkEl, pose };
    });
    layers[0].img.classList.add('is-active');
    let current = 0;

    /* As poses extras só começam a carregar quando o navegador está ocioso, para não competir com o hero */
    const loadExtras = () => {
      layers.forEach(({ img, blinkEl, pose }, i) => {
        if (i > 0 && pose.src) img.src = pose.src;
        if (blinkEl && pose.blink.src) blinkEl.src = pose.blink.src;
      });
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(loadExtras, { timeout: 2500 });
    else setTimeout(loadExtras, 1200);

    /* Acessibilidade: a personagem inteira é um botão que troca a expressão */
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.setAttribute('data-cursor', 'hover');
    const describe = () => {
      const alt = layers[current].pose.alt || 'Ilustração de Melina';
      el.setAttribute('aria-label', layers.length > 1 ? `${alt}. Clique para mudar a expressão.` : alt);
    };
    describe();

    /* Clique: próxima pose (volta ao início depois da última) + pulinho */
    const next = () => {
      if (layers.length > 1) {
        layers[current].img.classList.remove('is-active');
        current = (current + 1) % layers.length;
        layers[current].img.classList.add('is-active');
        describe();
      }
      pop.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.045)' }, { transform: 'scale(1)' }],
        { duration: 420, easing: 'cubic-bezier(.3, 1.5, .5, 1)' },
      );
    };
    el.addEventListener('click', next);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
    });

    /* Só anima enquanto o hero está na tela e a aba está aberta */
    let visible = true;
    const syncPause = () => el.classList.toggle('is-paused', !visible || document.hidden);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncPause(); }, { threshold: 0.05 }).observe(hero);
    }
    document.addEventListener('visibilitychange', syncPause);

    /* Piscar sozinha, a cada 2,6–6s, se a pose atual tiver o remendo dos olhos fechados */
    const blink = () => {
      const { blinkEl } = layers[current];
      if (blinkEl && visible && !document.hidden) {
        blinkEl.style.opacity = '1';
        setTimeout(() => { blinkEl.style.opacity = '0'; }, 130);
      }
      setTimeout(blink, 2600 + Math.random() * 3400);
    };
    setTimeout(blink, 2200);

    /* Acompanhar o mouse enquanto ele está sobre o hero: inclinação 3D leve + deslocamento.
       tx/ty = alvo (-1..1); fx/fy = valor suavizado. O laço só roda enquanto há movimento. */
    let tx = 0; let ty = 0; let fx = 0; let fy = 0; let raf = 0;
    const apply = () => {
      raf = 0;
      fx += (tx - fx) * 0.12;
      fy += (ty - fy) * 0.12;
      stage.style.transform = `perspective(1000px) rotateY(${(fx * 4).toFixed(2)}deg) rotateX(${(-fy * 2.5).toFixed(2)}deg) translate3d(${(fx * 6).toFixed(2)}px, ${(fy * 3).toFixed(2)}px, 0) scale(1.04)`;
      if (Math.abs(tx - fx) > 0.002 || Math.abs(ty - fy) > 0.002) raf = requestAnimationFrame(apply);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(apply); };

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !visible) return;
      const h = hero.getBoundingClientRect();
      const inside = e.clientX >= h.left && e.clientX <= h.right && e.clientY >= h.top && e.clientY <= h.bottom;
      if (inside) {
        const a = el.getBoundingClientRect();
        tx = clamp((e.clientX - (a.left + a.width / 2)) / (h.width * 0.5), -1, 1);
        ty = clamp((e.clientY - (a.top + a.height * 0.35)) / (h.height * 0.5), -1, 1); /* referência: altura do rosto */
      } else { tx = 0; ty = 0; }
      kick();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { tx = 0; ty = 0; kick(); });
  });
})();
