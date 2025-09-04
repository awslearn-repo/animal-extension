(() => {
  /** @typedef {{ name: string; category: string; image: string; sound: string; description: string[] }} Animal */

  /** @type {{ view: 'categories'|'animals'|'detail'; category: string|null; animal: Animal|null; animals: Animal[] }} */
  const state = {
    view: 'categories',
    category: null,
    animal: null,
    animals: []
  };

  const content = document.getElementById('content');
  const backButton = document.getElementById('backButton');

  backButton.addEventListener('click', () => {
    if (state.view === 'detail' && state.category) {
      setView('animals', state.category);
    } else {
      setView('categories');
    }
  });

  async function loadAnimals() {
    const url = chrome.runtime.getURL('animals.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load animals.json: ${res.status}`);
    /** @type {Animal[]} */
    const data = await res.json();
    state.animals = data;
  }

  function uniqueCategories() {
    const set = new Set(state.animals.map(a => a.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function setView(view, value) {
    state.view = view;
    if (view === 'categories') {
      state.category = null;
      state.animal = null;
      renderCategories();
      backButton.hidden = true;
    } else if (view === 'animals') {
      state.category = value || state.category;
      state.animal = null;
      renderAnimals(state.category);
      backButton.hidden = false;
    } else if (view === 'detail') {
      state.animal = value || state.animal;
      renderDetail(state.animal);
      backButton.hidden = false;
    }
  }

  function renderCategories() {
    const cats = uniqueCategories();
    const grid = document.createElement('div');
    grid.className = 'grid';

    cats.forEach(cat => {
      const card = document.createElement('button');
      card.className = 'card';
      card.setAttribute('aria-label', `Open ${cat}`);
      card.innerHTML = `<div class="label">${cat}</div>`;
      card.addEventListener('click', () => setView('animals', cat));
      grid.appendChild(card);
    });

    content.replaceChildren(grid);
    setFooterHint('Tap an animal to see details.');
  }

  function renderAnimals(category) {
    const animals = state.animals.filter(a => a.category === category);
    const grid = document.createElement('div');
    grid.className = 'grid';

    animals.forEach(animal => {
      const card = document.createElement('button');
      card.className = 'card';
      card.setAttribute('aria-label', `Open ${animal.name}`);

      const img = document.createElement('img');
      img.src = chrome.runtime.getURL(animal.image);
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'lazy';

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = animal.name;

      card.appendChild(img);
      card.appendChild(label);
      card.addEventListener('click', () => setView('detail', animal));
      grid.appendChild(card);
    });

    content.replaceChildren(grid);
    setFooterHint(`Category: ${category}`);
  }

  function renderDetail(animal) {
    const wrapper = document.createElement('div');
    wrapper.className = 'detail';

    const img = document.createElement('img');
    img.className = 'hero';
    img.src = chrome.runtime.getURL(animal.image);
    img.alt = `${animal.name}`;

    const title = document.createElement('h2');
    title.className = 'detail-title';
    title.textContent = animal.name;

    const play = document.createElement('button');
    play.className = 'play';
    play.textContent = '▶ Play Sound';
    play.addEventListener('click', () => playAnimalSound(animal.sound));

    const paras = animal.description.map(text => {
      const p = document.createElement('p');
      p.className = 'para';
      p.textContent = text;
      return p;
    });

    wrapper.appendChild(img);
    wrapper.appendChild(title);
    wrapper.appendChild(play);
    paras.forEach(p => wrapper.appendChild(p));

    content.replaceChildren(wrapper);
    setFooterHint('Use Back to return to the list.');
  }

  function setFooterHint(text) {
    const footerHint = document.querySelector('.footer .hint');
    if (footerHint) footerHint.textContent = text;
  }

  async function playAnimalSound(relativePath) {
    const url = chrome.runtime.getURL(relativePath);
    try {
      const audio = new Audio(url);
      audio.volume = 1.0;
      await audio.play();
    } catch (err) {
      // Fallback: quick beep via WebAudio so the user gets feedback
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880; // A5
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.22);
      } catch {}
    }
  }

  // Init
  (async function init() {
    try {
      await loadAnimals();
      setView('categories');
    } catch (e) {
      content.textContent = 'Failed to load data. Please reopen the popup.';
      console.error(e);
    }
  })();
})();

