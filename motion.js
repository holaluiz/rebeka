(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const revealSelector = [
    '.intro-copy > .eyebrow', '.intro-copy h1', '.intro-question',
    '.intro-description', '.reward-note', '.intro-cta', '.intro-meta',
    '.intro-visual', '.audience-strip', '.question-kicker',
    '[data-step-title]', '.question-description', '.option-card',
    '.result-intro', '.review-item', '.handoff-screen > .eyebrow',
    '.handoff-screen h1', '.handoff-screen > p'
  ].join(',');
  const observed = new WeakSet();
  const interactive = new WeakSet();
  const tracked = new Set();
  const selectionTimers = new WeakMap();
  let refreshFrame = 0;
  let scrollFrame = 0;
  let pointerFrame = 0;
  const pointerUpdates = new Map();
  let largestViewportHeight = window.innerHeight;
  let viewportFrame = 0;

  function fitViewport() {
    viewportFrame = 0;
    const viewport = window.visualViewport;
    const height = Math.round(viewport?.height || window.innerHeight);
    const active = document.activeElement;
    const editing = active instanceof HTMLTextAreaElement || (active instanceof HTMLInputElement && active.type !== 'radio');
    if (!editing) largestViewportHeight = window.innerHeight;
    const keyboard = editing && largestViewportHeight - height > 120;
    document.documentElement.style.setProperty('--viewport-height', `${height}px`);
    document.body.classList.toggle('keyboard-open', keyboard);
    document.body.dataset.focusedField = editing ? active.id : '';
    if (window.scrollY) window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function scheduleViewportFit() {
    if (!viewportFrame) viewportFrame = requestAnimationFrame(fitViewport);
  }

  window.visualViewport?.addEventListener('resize', scheduleViewportFit, { passive: true });
  window.visualViewport?.addEventListener('scroll', scheduleViewportFit, { passive: true });
  document.addEventListener('focusin', scheduleViewportFit);
  document.addEventListener('focusout', scheduleViewportFit);
  window.addEventListener('resize', scheduleViewportFit, { passive: true });

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08, rootMargin: '0px 0px -12px 0px' }) : null;

  function readingProgress() {
    scrollFrame = 0;
    const bar = document.getElementById('reading-progress');
    if (!bar) return;
    const remaining = document.documentElement.scrollHeight - window.innerHeight;
    const progress = remaining > 0 ? Math.min(1, Math.max(0, window.scrollY / remaining)) : 0;
    bar.style.width = `${progress * 100}%`;
  }

  function scheduleProgress() {
    if (!document.hidden && !scrollFrame) scrollFrame = requestAnimationFrame(readingProgress);
  }

  function flushPointerUpdates() {
    pointerFrame = 0;
    if (document.hidden) { pointerUpdates.clear(); return; }
    for (const [element, point] of pointerUpdates) {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const x = Math.min(1, Math.max(0, (point.x - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (point.y - rect.top) / rect.height));
      element.style.setProperty('--pointer-x', `${x * 100}%`);
      element.style.setProperty('--pointer-y', `${y * 100}%`);
      if (!reduceMotion.matches && finePointer.matches) {
        if (element.matches('.button')) {
          element.style.setProperty('--magnet-x', `${(x - 0.5) * 7}px`);
          element.style.setProperty('--magnet-y', `${(y - 0.5) * 7}px`);
        } else if (element.matches('.photo-frame')) {
          element.style.setProperty('--photo-x', `${(x - 0.5) * 12}px`);
          element.style.setProperty('--photo-y', `${(y - 0.5) * 12}px`);
          element.style.setProperty('--photo-rotate', `${(x - 0.5) * 0.6}deg`);
        }
      }
    }
    pointerUpdates.clear();
  }

  function queuePointer(element, event) {
    if (!finePointer.matches || event.pointerType === 'touch' || document.hidden) return;
    pointerUpdates.set(element, { x: event.clientX, y: event.clientY });
    if (!pointerFrame) pointerFrame = requestAnimationFrame(flushPointerUpdates);
  }

  function resetPointer(element) {
    pointerUpdates.delete(element);
    element.removeAttribute('data-hover');
    element.style.setProperty('--magnet-x', '0px');
    element.style.setProperty('--magnet-y', '0px');
    element.style.setProperty('--photo-x', '0px');
    element.style.setProperty('--photo-y', '0px');
    element.style.setProperty('--photo-rotate', '0deg');
  }

  function bindInteractions(element) {
    if (interactive.has(element)) return;
    interactive.add(element);
    tracked.add(element);
    element.addEventListener('pointermove', event => queuePointer(element, event), { passive: true });
    element.addEventListener('pointerenter', event => {
      if (finePointer.matches && event.pointerType !== 'touch') element.dataset.hover = 'true';
    }, { passive: true });
    element.addEventListener('pointerleave', () => resetPointer(element), { passive: true });
    element.addEventListener('pointercancel', () => {
      element.classList.remove('is-pressed');
      resetPointer(element);
    }, { passive: true });
    if (element.matches('.button')) {
      element.addEventListener('pointerdown', () => element.classList.add('is-pressed'), { passive: true });
      element.addEventListener('blur', () => element.classList.remove('is-pressed'));
      element.addEventListener('keydown', event => {
        if (event.key === ' ' || event.key === 'Enter') element.classList.add('is-pressed');
      });
      element.addEventListener('keyup', () => element.classList.remove('is-pressed'));
    }
    if (element.matches('.option-card')) {
      element.addEventListener('animationend', event => {
        if (event.target !== element) return;
        element.classList.remove('just-selected');
        clearTimeout(selectionTimers.get(element));
      });
    }
  }

  function refresh() {
    refreshFrame = 0;
    document.querySelectorAll(revealSelector).forEach((element, index) => {
      if (observed.has(element)) return;
      observed.add(element);
      element.classList.add('reveal');
      const group = element.closest('.options-grid');
      const order = group ? Array.from(group.children).indexOf(element) : index;
      element.style.setProperty('--reveal-delay', `${Math.min(Math.max(order, 0), 6) * 55}ms`);
      if (reduceMotion.matches || !observer) element.classList.add('is-visible');
      else observer.observe(element);
    });
    document.querySelectorAll('.button, .option-card, .photo-frame').forEach(bindInteractions);
    scheduleProgress();
  }

  function scheduleRefresh() {
    scheduleViewportFit();
    if (!refreshFrame) refreshFrame = requestAnimationFrame(refresh);
  }

  document.addEventListener('change', event => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'radio' || !event.target.checked) return;
    const card = event.target.closest('.option-card');
    if (!card) return;
    card.classList.add('just-selected');
    clearTimeout(selectionTimers.get(card));
    selectionTimers.set(card, setTimeout(() => card.classList.remove('just-selected'), 750));
    scheduleProgress();
  });

  function releaseButtons() {
    document.querySelectorAll('.button.is-pressed').forEach(button => button.classList.remove('is-pressed'));
  }

  window.addEventListener('pointerup', releaseButtons, { passive: true });
  window.addEventListener('pointercancel', releaseButtons, { passive: true });
  window.addEventListener('blur', releaseButtons);
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress, { passive: true });
  document.addEventListener('survey:change', scheduleRefresh);

  function resetMotion() {
    tracked.forEach(resetPointer);
    releaseButtons();
    if (reduceMotion.matches) {
      document.querySelectorAll('.reveal').forEach(element => {
        element.classList.add('is-visible');
        observer?.unobserve(element);
      });
    }
  }
  reduceMotion.addEventListener('change', resetMotion);
  finePointer.addEventListener('change', resetMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(pointerFrame);
      cancelAnimationFrame(scrollFrame);
      pointerFrame = 0;
      scrollFrame = 0;
      pointerUpdates.clear();
      resetMotion();
    } else scheduleRefresh();
  });

  // Content remains visible when this enhancement cannot run.
  refresh();
  fitViewport();
  document.body.classList.add('motion-ready');
})();
