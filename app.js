(() => {
  'use strict';

  const WHATSAPP_PHONE = '5547991132038';
  const $ = selector => document.querySelector(selector);
  const form = $('#survey-form');
  const steps = Array.from(document.querySelectorAll('[data-step]'));
  const screenIds = ['intro', 'survey', 'review', 'handoff'];
  const nextButton = $('#next-button');
  const arrow = nextButton.querySelector('svg').cloneNode(true);
  const error = $('#form-error');
  let currentStep = 0;
  let editing = false;
  let message = '';
  let furthestStep = 0;
  const reader = $('#answer-reader');
  let readerValue = '';
  let readerPages = [];
  let readerPage = 0;
  let readerOrigin = null;
  let readerFrame = 0;

  function updateReaderPage() {
    $('#reader-text').textContent = readerPages[readerPage] || '';
    $('#reader-count').textContent = `${readerPage + 1} / ${readerPages.length}`;
    $('#reader-prev').disabled = readerPage === 0;
    $('#reader-next').disabled = readerPage >= readerPages.length - 1;
  }

  function paginateReader() {
    if (!reader.open) return;
    const area = $('#reader-text');
    const characters = Array.from(readerValue);
    readerPages = [];
    let offset = 0;
    while (offset < characters.length) {
      let low = 1;
      let high = characters.length - offset;
      let fitting = 1;
      while (low <= high) {
        const count = Math.floor((low + high) / 2);
        area.textContent = characters.slice(offset, offset + count).join('');
        if (area.scrollHeight <= area.clientHeight + 1) {
          fitting = count;
          low = count + 1;
        } else high = count - 1;
      }
      let part = characters.slice(offset, offset + fitting).join('');
      const lastSpace = part.lastIndexOf(' ');
      if (offset + fitting < characters.length && lastSpace > part.length * .65) {
        part = part.slice(0, lastSpace + 1);
        fitting = Array.from(part).length;
      }
      readerPages.push(part);
      offset += fitting;
    }
    if (!readerPages.length) readerPages = [''];
    readerPage = Math.min(readerPage, readerPages.length - 1);
    updateReaderPage();
  }

  function openReader(label, value, origin) {
    readerValue = value;
    readerPage = 0;
    readerOrigin = origin;
    $('#reader-title').textContent = label;
    reader.showModal();
    paginateReader();
    focus($('#reader-title'));
  }

  $('#reader-close').addEventListener('click', () => reader.close());
  $('#copy-close').addEventListener('click', () => $('#copy-dialog').close());
  $('#copy-dialog').addEventListener('close', () => focus($('#copy-message')));
  reader.addEventListener('close', () => focus(readerOrigin));
  $('#reader-next').addEventListener('click', () => {
    if (readerPage < readerPages.length - 1) { readerPage++; updateReaderPage(); }
  });
  $('#reader-prev').addEventListener('click', () => {
    if (readerPage > 0) { readerPage--; updateReaderPage(); }
  });
  window.addEventListener('resize', () => {
    cancelAnimationFrame(readerFrame);
    readerFrame = requestAnimationFrame(paginateReader);
  });

  function notifyMotion() {
    document.dispatchEvent(new Event('survey:change'));
  }

  function focus(element, scroll = false) {
    requestAnimationFrame(() => {
      element?.focus({ preventScroll: !scroll });
      if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }

  function showScreen(name) {
    for (const id of screenIds) $(`#${id}-screen`).hidden = id !== name;
    document.body.dataset.screen = name === 'survey' ? 'form' : name;
    window.scrollTo({ top: 0, behavior: 'instant' });
    notifyMotion();
  }

  function clearError() {
    error.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  }

  function showStep(index) {
    document.body.dataset.direction = index < currentStep ? 'back' : 'forward';
    currentStep = index;
    furthestStep = Math.max(furthestStep, index);
    clearError();
    const other = selected('profession') === 'Outro';
    $('#profession-other-wrap').hidden = !other;
    $('#profession-other').required = other;
    $('#story-count').textContent = `${$('#story').value.length} / 1500`;
    showScreen('survey');
    steps.forEach((step, i) => { step.hidden = i !== index; });
    $('#progress-count').textContent = `${String(index + 1).padStart(2, '0')} / 04`;
    $('#progress-label').textContent = `Pergunta ${index + 1} de 4`;
    $('#progress-fill').style.width = `${(index + 1) * 25}%`;
    const label = editing ? 'Salvar alteração' : index === 3 ? 'Revisar minhas respostas' : 'Próxima pergunta';
    const buttonLabel = document.createElement('span');
    buttonLabel.className = 'button-label';
    buttonLabel.textContent = label;
    const buttonArrow = document.createElement('span');
    buttonArrow.className = 'button-arrow';
    buttonArrow.append(arrow.cloneNode(true));
    nextButton.replaceChildren(buttonLabel, buttonArrow);
    document.querySelectorAll('[data-journey-step]').forEach(button => {
      const stepIndex = Number(button.dataset.journeyStep);
      button.disabled = stepIndex > furthestStep;
      button.dataset.complete = String(stepIndex < index);
      if (stepIndex === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    notifyMotion();
    focus(steps[index].querySelector('[data-step-title]'));
  }

  function selected(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || '';
  }

  function values() {
    return {
      profession: selected('profession') === 'Outro' ? $('#profession-other').value.trim() : selected('profession'),
      experience: selected('experience'),
      challenge: selected('challenge'),
      story: $('#story').value.trim(),
      name: $('#respondent-name').value.trim()
    };
  }

  function fail(text, input) {
    error.textContent = text;
    input?.setAttribute('aria-invalid', 'true');
    input?.focus();
    return false;
  }

  function validate(index) {
    clearError();
    if (index === 0) {
      if (!selected('profession')) return fail('Escolha sua área de atuação para continuar.', form.querySelector('[name="profession"]'));
      if (selected('profession') === 'Outro' && !$('#profession-other').value.trim()) return fail('Me conte com qual serviço você trabalha.', $('#profession-other'));
    }
    if (index === 1 && !selected('experience')) return fail('Escolha o momento que mais combina com sua jornada.', form.querySelector('[name="experience"]'));
    if (index === 2 && !selected('challenge')) return fail('Escolha o desafio que mais te trava hoje.', form.querySelector('[name="challenge"]'));
    if (index === 3 && !$('#story').value.trim()) return fail('Me conte um pouco da sua experiência para eu preparar seu conselho.', $('#story'));
    return true;
  }

  function buildMessage(data) {
    return [
      'Oi, Rebeka! Vim responder à sua pesquisa sobre os desafios de vender serviços.',
      data.name ? `Meu nome: ${data.name}` : '',
      `Minha área: ${data.profession}`,
      `Meu momento: ${data.experience}`,
      `Meu maior desafio: ${data.challenge}`,
      `O que acontece na prática:\n${data.story}`,
      'Quero receber meu conselho personalizado em áudio sobre esse desafio.'
    ].filter(Boolean).join('\n\n');
  }

  function reviewRow(label, value, step) {
    const row = document.createElement('section');
    row.className = 'review-item';
    const header = document.createElement('div');
    header.className = 'review-item-header';
    const heading = document.createElement('h3');
    heading.textContent = label;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.dataset.editStep = String(step);
    edit.textContent = 'Editar';
    edit.setAttribute('aria-label', `Editar: ${label.toLowerCase()}`);
    const longAnswer = value.length > 55;
    const answer = document.createElement(longAnswer ? 'button' : 'p');
    if (longAnswer) {
      answer.type = 'button';
      answer.className = 'review-read';
      answer.setAttribute('aria-label', `Ler resposta completa: ${label.toLowerCase()}`);
      const text = document.createElement('span');
      text.textContent = value;
      const icon = arrow.cloneNode(true);
      icon.setAttribute('aria-hidden', 'true');
      answer.append(text, icon);
      answer.addEventListener('click', () => openReader(label, value, answer));
    } else answer.textContent = value;
    header.append(heading, edit);
    row.append(header, answer);
    return row;
  }

  function showReview() {
    const data = values();
    const content = $('#review-content');
    content.replaceChildren(
      reviewRow('Sua área', data.profession, 0),
      reviewRow('Seu momento', data.experience, 1),
      reviewRow('Seu maior desafio', data.challenge, 2),
      reviewRow('Como posso te chamar', data.name || 'Prefiro não informar', 3),
      reviewRow('Sua experiência', data.story, 3)
    );
    message = buildMessage(data);
    const url = new URL('https://api.whatsapp.com/send/');
    url.search = new URLSearchParams({ phone: WHATSAPP_PHONE, text: message, type: 'phone_number', app_absent: '0', utm_source: 'pesquisa_rebeka' }).toString();
    $('#send-whatsapp').href = url.href;
    $('#retry-whatsapp').href = url.href;
    editing = false;
    showScreen('review');
    focus($('#review-title'));
  }

  document.querySelectorAll('[data-start]').forEach(button => button.addEventListener('click', () => {
    editing = false;
    showStep(currentStep);
  }));

  $('#journey-steps').addEventListener('click', event => {
    const button = event.target.closest('[data-journey-step]');
    if (!button || button.disabled) return;
    editing = false;
    showStep(Number(button.dataset.journeyStep));
  });

  $('[data-back]').addEventListener('click', () => {
    if (currentStep === 0) {
      editing = false;
      clearError();
      showScreen('intro');
      focus($('#intro-title'));
    } else {
      editing = false;
      showStep(currentStep - 1);
    }
  });

  form.addEventListener('change', event => {
    if (event.target.name === 'profession') {
      const other = selected('profession') === 'Outro';
      $('#profession-other-wrap').hidden = !other;
      $('#profession-other').required = other;
      if (other) focus($('#profession-other'), true);
    }
    clearError();
  });

  form.addEventListener('input', event => {
    if (event.target.id === 'story') $('#story-count').textContent = `${event.target.value.length} / 1500`;
    clearError();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validate(currentStep)) return;
    if (editing || currentStep === steps.length - 1) {
      for (let index = 0; index < steps.length; index++) {
        if (!validate(index)) {
          showStep(index);
          validate(index);
          return;
        }
      }
      showReview();
    } else showStep(currentStep + 1);
  });

  $('#review-content').addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-step]');
    if (!edit) return;
    editing = true;
    showStep(Number(edit.dataset.editStep));
  });

  $('#send-whatsapp').addEventListener('click', () => {
    // Opening a prefilled conversation does not confirm that a message was sent.
    showScreen('handoff');
    focus($('#handoff-title'));
  });

  $('#copy-message').addEventListener('click', async () => {
    const feedback = $('#copy-feedback');
    try {
      await navigator.clipboard.writeText(message);
      feedback.textContent = 'Respostas copiadas! Agora é só colar na conversa com a Rebeka.';
    } catch {
      // A separate dialog keeps the underlying screen fitted to the viewport.
      const fallback = $('#copy-fallback');
      fallback.value = message;
      $('#copy-dialog').showModal();
      fallback.focus();
      fallback.select();
      feedback.textContent = 'Suas respostas estão prontas para copiar.';
    }
  });

  $('[data-restart]').addEventListener('click', () => {
    form.reset();
    currentStep = 0;
    furthestStep = 0;
    editing = false;
    message = '';
    $('#profession-other-wrap').hidden = true;
    $('#profession-other').required = false;
    $('#story-count').textContent = '0 / 1500';
    $('#copy-feedback').textContent = '';
    $('#copy-fallback').value = '';
    $('#send-whatsapp').href = '#';
    $('#retry-whatsapp').href = '#';
    $('#review-content').replaceChildren();
    clearError();
    showScreen('intro');
    focus($('#intro-title'));
  });
})();
