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

    /* Distância entre dois cards em px locais (offsetLeft ignora o zoom do bloco .fit) */
    const step = () => {
      const [a, b] = track.children;
      if (!a) return 0;
      return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth;
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
    window.addEventListener('portfolio:fit', sync);
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

  /* Select personalizado: o menu aberto de um <select> é desenhado pelo navegador e não aceita estilo.
     Aqui ele é trocado por um combobox com o mesmo visual dos campos. O <select> original continua
     no HTML (escondido) e guarda o valor, então o formulário e a leitura por leitores de tela seguem iguais. */
  $$('select.field__control--select').forEach((select, index) => {
    const uid = `select-${index}`;
    const label = select.closest('.field') ? select.closest('.field').querySelector('label') : null;
    const first = select.options[0];
    const placeholder = first && first.value === '' ? first.textContent : '';
    const items = Array.from(select.options).filter((o) => o.value !== '');

    const wrap = document.createElement('div');
    wrap.className = 'select';

    const button = document.createElement('button');
    button.type = 'button';
    button.id = `${uid}-button`;
    button.className = 'field__control select__button';
    button.setAttribute('role', 'combobox');
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `${uid}-list`);
    if (label) {
      if (!label.id) label.id = `${uid}-label`;
      button.setAttribute('aria-labelledby', `${label.id} ${button.id}`);
      label.setAttribute('for', button.id); /* clicar no rótulo foca o botão (o select original fica escondido) */
    }

    const valueEl = document.createElement('span');
    valueEl.className = 'select__value';
    button.appendChild(valueEl);

    const list = document.createElement('ul');
    list.className = 'select__list';
    list.id = `${uid}-list`;
    list.setAttribute('role', 'listbox');
    if (label) list.setAttribute('aria-labelledby', label.id);

    const lis = items.map((opt, i) => {
      const li = document.createElement('li');
      li.id = `${uid}-option-${i}`;
      li.className = 'select__option';
      li.setAttribute('role', 'option');
      li.textContent = opt.textContent;
      list.appendChild(li);
      return li;
    });

    select.classList.add('select__native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.parentNode.insertBefore(wrap, select);
    wrap.append(button, list, select);

    let active = -1;
    let buffer = '';
    let bufferTimer = 0;
    const isOpen = () => wrap.classList.contains('is-open');
    const selectedIndex = () => items.findIndex((o) => o.value === select.value);

    const render = () => {
      const sel = selectedIndex();
      valueEl.textContent = sel >= 0 ? items[sel].textContent : placeholder;
      valueEl.classList.toggle('is-placeholder', sel < 0);
      lis.forEach((li, i) => li.setAttribute('aria-selected', String(i === sel)));
    };

    const setActive = (i) => {
      active = Math.max(0, Math.min(lis.length - 1, i));
      lis.forEach((li, n) => li.classList.toggle('is-active', n === active));
      button.setAttribute('aria-activedescendant', lis[active].id);
      lis[active].scrollIntoView({ block: 'nearest' });
    };

    const close = () => {
      if (!isOpen()) return;
      wrap.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      button.removeAttribute('aria-activedescendant');
    };

    const open = () => {
      if (isOpen()) return;
      wrap.classList.remove('is-up');
      wrap.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      setActive(Math.max(0, selectedIndex()));
      /* sem espaço embaixo (e com mais espaço em cima): abre para cima */
      const b = button.getBoundingClientRect();
      const l = list.getBoundingClientRect();
      if (l.bottom > window.innerHeight - 8 && b.top > window.innerHeight - b.bottom) wrap.classList.add('is-up');
    };

    const choose = (i) => {
      select.value = items[i].value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      render();
      close();
    };

    button.addEventListener('click', () => (isOpen() ? close() : open()));

    button.addEventListener('keydown', (e) => {
      const { key } = e;
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen()) { open(); return; }
        setActive(active + (key === 'ArrowDown' ? 1 : -1));
      } else if (key === 'Home' || key === 'End') {
        if (!isOpen()) return;
        e.preventDefault();
        setActive(key === 'Home' ? 0 : lis.length - 1);
      } else if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        if (isOpen()) choose(active); else open();
      } else if (key === 'Escape') {
        if (isOpen()) { e.preventDefault(); e.stopPropagation(); close(); }
      } else if (key === 'Tab') {
        close();
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        /* digitar letras salta para a opção que começa com elas */
        buffer += key.toLowerCase();
        clearTimeout(bufferTimer);
        bufferTimer = setTimeout(() => { buffer = ''; }, 600);
        const hit = items.findIndex((o) => o.textContent.trim().toLowerCase().startsWith(buffer));
        if (hit >= 0) { if (!isOpen()) open(); setActive(hit); }
      }
    });

    /* mousedown com preventDefault mantém o foco no botão ao clicar numa opção */
    list.addEventListener('mousedown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => {
      const li = e.target.closest('.select__option');
      if (li) choose(lis.indexOf(li));
    });
    list.addEventListener('pointermove', (e) => {
      const li = e.target.closest('.select__option');
      if (li) setActive(lis.indexOf(li));
    });

    document.addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target)) close(); });
    wrap.addEventListener('focusout', (e) => { if (!wrap.contains(e.relatedTarget)) close(); });

    render();
  });

  /* Encaixe na tela: em desktop, cada seção cabe na altura da janela.
     O bloco [data-fit] ganha um fator --k (zoom proporcional, mínimo K_MIN) quando
     o conteúdo é mais alto que o espaço disponível. Em telas altas k = 1. */
  const desktop = window.matchMedia('(min-width: 1001px) and (min-height: 460px)');
  const K_MIN = 0.66;
  const fitEls = $$('[data-fit]');

  const fitAll = () => {
    fitEls.forEach((el) => {
      el.style.removeProperty('--k');
      if (!desktop.matches) return;

      const host = el.parentElement;
      const cs = getComputedStyle(host);
      /* altura (e margens) dos irmãos que não escalam, como o rodapé da seção de contato */
      const reserved = Array.from(host.children)
        .filter((c) => c !== el && getComputedStyle(c).position !== 'absolute')
        .reduce((sum, c) => {
          const s = getComputedStyle(c);
          return sum + c.getBoundingClientRect().height + (parseFloat(s.marginTop) || 0) + (parseFloat(s.marginBottom) || 0);
        }, 0);
      const avail = window.innerHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) - reserved;

      /* Altura visual cresce com k (o layout reflui quando k muda), então busco o
         maior k em [K_MIN, 1] que ainda cabe, por bisseção. */
      const visualAt = (k) => {
        el.style.setProperty('--k', k.toFixed(4));
        return el.getBoundingClientRect().height;
      };

      let k = 1;
      if (visualAt(1) > avail) {
        if (visualAt(K_MIN) >= avail) {
          k = K_MIN;
        } else {
          let lo = K_MIN;
          let hi = 1;
          for (let i = 0; i < 9; i += 1) {
            const mid = (lo + hi) / 2;
            if (visualAt(mid) <= avail) lo = mid; else hi = mid;
          }
          k = lo;
        }
      }
      if (k >= 0.999) el.style.removeProperty('--k');
      else el.style.setProperty('--k', k.toFixed(4));
    });
    window.dispatchEvent(new Event('portfolio:fit'));
  };

  /* setTimeout (e não rAF): continua rodando mesmo se a aba/quadro estiver oculto */
  let fitTimer = 0;
  const queueFit = (delay = 60) => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitAll, delay);
  };

  window.addEventListener('resize', () => queueFit());
  desktop.addEventListener('change', () => queueFit(0));
  window.addEventListener('load', () => {
    queueFit(0);
    setTimeout(fitAll, 600); /* depois que fontes e imagens assentam */
    setTimeout(fitAll, 1800);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => queueFit(0));
  fitAll();
})();
