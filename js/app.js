/* Animal Explorer - Drill-down navigation with modal details */

(function () {
  'use strict';

  const state = {
    data: null,
    audio: null,
    currentCategory: null,
    currentAnimal: null
  };

  const els = {
    grid: document.getElementById('grid'),
    breadcrumb: document.getElementById('breadcrumb'),
    modal: document.getElementById('modal'),
    modalClose: document.getElementById('modal-close'),
    modalImage: document.getElementById('modal-image'),
    modalTitle: document.getElementById('modal-title'),
    modalText: document.getElementById('modal-text'),
    playButton: document.getElementById('play-sound')
  };

  async function loadData() {
    // Load flat assets dataset and transform to explorer's nested shape
    const response = await fetch('assets/animals.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load dataset: ${response.status}`);
    }
    const assets = await response.json();

    const categories = Array.isArray(assets?.categories) ? assets.categories : [];
    const animals = Array.isArray(assets?.animals) ? assets.animals : [];

    // Exclude synthetic 'all' category to avoid empty sections
    const realCategories = categories.filter((c) => c.id !== 'all');

    const nested = {
      categories: realCategories.map((cat) => ({
        name: cat.name,
        animals: animals
          .filter((a) => a.category === cat.id)
          .map((a) => ({
            name: a.name,
            imageUrl: a.image,
            soundUrl: a.sound,
            description: Array.isArray(a.description) ? a.description : []
          }))
      }))
    };

    state.data = nested;
  }

  function navigate(hash) {
    if (hash !== undefined) {
      window.location.hash = hash;
      return;
    }
    renderFromHash();
  }

  function parseHash() {
    const raw = window.location.hash || '#/';
    const segments = raw.replace(/^#/, '').split('/');
    // segments[0] is empty string due to leading '/'
    const route = segments[1] || '';
    const p1 = decodeURIComponentSafe(segments[2] || '');
    const p2 = decodeURIComponentSafe(segments[3] || '');
    return { route, p1, p2 };
  }

  function decodeURIComponentSafe(value) {
    try { return decodeURIComponent(value); } catch { return value; }
  }

  function renderFromHash() {
    const { route, p1, p2 } = parseHash();
    closeModal(true);
    if (!state.data) return;

    if (!route) {
      state.currentCategory = null;
      state.currentAnimal = null;
      renderBreadcrumb();
      renderCategories();
      return;
    }

    if (route === 'category' && p1) {
      state.currentCategory = p1;
      state.currentAnimal = null;
      renderBreadcrumb(p1);
      renderAnimals(p1);
      return;
    }

    if (route === 'animal' && p1 && p2) {
      state.currentCategory = p1;
      renderBreadcrumb(p1, p2);
      renderAnimals(p1, false);
      // open after a tick so images/layout mount
      setTimeout(() => openAnimalModal(p1, p2), 0);
      return;
    }

    // Fallback to home
    navigate('#/');
  }

  function renderBreadcrumb(category, animal) {
    const parts = [];
    parts.push(`<a href="#/" data-link>Home</a>`);
    if (category) {
      parts.push(`<span aria-hidden="true">/</span>`);
      parts.push(`<a href="#/category/${encodeURIComponent(category)}" data-link>${escapeHtml(category)}</a>`);
    }
    if (animal) {
      parts.push(`<span aria-hidden="true">/</span>`);
      parts.push(`<span>${escapeHtml(animal)}</span>`);
    }
    els.breadcrumb.innerHTML = parts.join(' ');
    els.breadcrumb.querySelectorAll('[data-link]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(a.getAttribute('href'));
      });
    });
  }

  function renderCategories() {
    const categories = state.data.categories;
    els.grid.innerHTML = '';
    categories.forEach(category => {
      const firstAnimal = category.animals[0];
      const figure = document.createElement('article');
      figure.className = 'card';
      figure.innerHTML = `
        <div class="card-media">
          <img src="${escapeHtml(firstAnimal.imageUrl)}" alt="${escapeHtml(category.name)} cover" loading="lazy">
        </div>
        <div class="chip">${category.animals.length} animals</div>
        <div class="card-title">${escapeHtml(category.name)}</div>
      `;
      figure.addEventListener('click', () => navigate(`#/category/${encodeURIComponent(category.name)}`));
      els.grid.appendChild(figure);
    });
  }

  function renderAnimals(categoryName, clear = true) {
    const category = state.data.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!category) {
      els.grid.innerHTML = `<p>Category not found.</p>`;
      return;
    }
    if (clear) els.grid.innerHTML = '';
    category.animals.forEach(animal => {
      const card = document.createElement('article');
      card.className = 'card';
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <div class="card-media">
          <img src="${escapeHtml(animal.imageUrl)}" alt="${escapeHtml(animal.name)}" loading="lazy">
        </div>
        <div class="card-title">${escapeHtml(animal.name)}</div>
      `;
      const open = () => navigate(`#/animal/${encodeURIComponent(category.name)}/${encodeURIComponent(animal.name)}`);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      els.grid.appendChild(card);
    });
  }

  function openAnimalModal(categoryName, animalName) {
    const category = state.data.categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!category) return;
    const animal = category.animals.find(a => a.name.toLowerCase() === animalName.toLowerCase());
    if (!animal) return;

    state.currentAnimal = animal.name;
    els.modalTitle.textContent = animal.name;
    els.modalImage.src = animal.imageUrl;
    els.modalImage.alt = `${animal.name} large photo`;
    els.modalText.innerHTML = animal.description.map(p => `<p>${escapeHtml(p)}</p>`).join('');

    if (state.audio) { try { state.audio.pause(); } catch {} }
    state.audio = animal.soundUrl ? new Audio(animal.soundUrl) : null;
    els.playButton.disabled = !state.audio;
    els.playButton.textContent = state.audio ? 'Play Sound' : 'No Sound Available';

    els.modal.classList.remove('hidden');
    els.modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(silent) {
    if (els.modal.classList.contains('hidden')) return;
    els.modal.classList.add('hidden');
    els.modal.setAttribute('aria-hidden', 'true');
    if (state.audio) { try { state.audio.pause(); } catch {} }
    if (!silent) {
      const { route, p1 } = parseHash();
      if (route === 'animal' && p1) {
        navigate(`#/category/${encodeURIComponent(p1)}`);
      }
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // Events
  window.addEventListener('hashchange', renderFromHash);
  els.modal.addEventListener('click', (e) => {
    if (e.target instanceof HTMLElement && (e.target.dataset.close === 'true')) closeModal();
  });
  els.modalClose.addEventListener('click', () => closeModal());
  els.playButton.addEventListener('click', async () => {
    if (!state.audio) return;
    try {
      if (state.audio.paused) {
        await state.audio.play();
        els.playButton.textContent = 'Pause Sound';
      } else {
        state.audio.pause();
        els.playButton.textContent = 'Play Sound';
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Init
  (async function init() {
    try {
      await loadData();
      renderFromHash();
    } catch (err) {
      console.error(err);
      els.grid.innerHTML = `<p>Failed to load data. Please refresh.</p>`;
    }
  })();
})();

