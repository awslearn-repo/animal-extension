(() => {
  /** @typedef {{ id: string, name: string, image: string }} Category */
  /** @typedef {{ id: string, name: string, category: string, image: string, sound?: string, description: string[] }} Animal */
  /** @type {{ categories: Category[], animals: Animal[] }} */
  let dataStore = { categories: [], animals: [] };

  const statusEl = document.getElementById('status');
  const categoryBarEl = document.getElementById('categoryBar');
  const gridEl = document.getElementById('grid');
  const cardTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById('cardTemplate'));
  const modalEl = document.getElementById('modal');
  const modalCloseEl = document.getElementById('modalClose');
  const modalImgEl = document.getElementById('modalImage');
  const modalTitleEl = document.getElementById('modalTitle');
  const modalBodyEl = document.getElementById('modalBody');
  const modalCategoryEl = document.querySelector('.modal__category');
  const modalPlayEl = document.getElementById('modalPlay');
  const muteToggleEl = document.getElementById('muteToggle');
  const stopAllEl = document.getElementById('stopAll');

  /** @type {HTMLAudioElement} */
  const audioEl = new Audio();
  audioEl.preload = 'auto';
  // Avoid forcing a CORS fetch which can fail for some third-party hosts
  // Keep playback simple; we don't pipe this element into WebAudio
  audioEl.referrerPolicy = 'no-referrer';
  let currentCategory = 'all';
  let isMuted = false;
  // Reusable AudioContext for synthesized fallback tones
  /** @type {AudioContext | null} */
  let beepContext = null;

  function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', !!isError);
  }

  async function init() {
    try {
      setStatus('Loading animals…');
      const res = await fetch('assets/animals.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load animals.json: ${res.status}`);
      dataStore = await res.json();
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('Failed to load data.', true);
      return;
    }

    setupCategoryBar();
    renderGrid();
    setupControls();
  }

  function setupControls() {
    muteToggleEl.addEventListener('click', () => {
      isMuted = !isMuted;
      audioEl.muted = isMuted;
      muteToggleEl.setAttribute('aria-pressed', String(isMuted));
      muteToggleEl.textContent = isMuted ? '🔈 Sound Off' : '🔊 Sound On';
    });

    if (stopAllEl) {
      stopAllEl.addEventListener('click', () => {
        stopAllSounds();
        if (modalPlayEl) {
          modalPlayEl.textContent = 'Play Sound';
        }
      });
    }

    modalCloseEl.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function setupCategoryBar() {
    categoryBarEl.innerHTML = '';
    const allButton = createCategoryButton({ id: 'all', name: 'All' });
    categoryBarEl.appendChild(allButton);
    for (const cat of dataStore.categories) {
      categoryBarEl.appendChild(createCategoryButton(cat));
    }
    updateCategoryButtons();
  }

  /**
   * @param {Category} cat
   */
  function createCategoryButton(cat) {
    const btn = document.createElement('button');
    btn.className = 'cat';
    btn.type = 'button';
    btn.textContent = cat.name;
    btn.setAttribute('aria-pressed', String(currentCategory === cat.id));
    btn.addEventListener('click', () => {
      currentCategory = cat.id;
      updateCategoryButtons();
      renderGrid(true);
    });
    return btn;
  }

  function updateCategoryButtons() {
    const buttons = categoryBarEl.querySelectorAll('.cat');
    buttons.forEach((b) => {
      const isActive = (b.textContent === 'All' ? 'all' : findCategoryIdByName(b.textContent)) === currentCategory;
      b.setAttribute('aria-pressed', String(isActive));
    });
  }

  function buildWikimediaFallbackUrl(url, width) {
    try {
      const u = new URL(url, location.href);
      if (u.hostname !== 'upload.wikimedia.org') return null;
      const parts = u.pathname.split('/');
      const fileName = parts[parts.length - 1];
      if (!fileName) return null;
      const encoded = encodeURIComponent(fileName);
      const w = width ? `?width=${width}` : '';
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}${w}`;
    } catch {
      return null;
    }
  }

  function setImageWithFallback(img, primaryUrl, name, width = 800, height = 600) {
    const placeholder = `https://placehold.co/${width}x${height}?text=${encodeURIComponent(name || 'Image')}`;
    const candidates = [];
    const wm = buildWikimediaFallbackUrl(primaryUrl, Math.max(width, 800));
    if (wm) candidates.push(wm);
    if (primaryUrl) candidates.push(primaryUrl);
    let index = 0;
    img.referrerPolicy = 'no-referrer';
    const tryNext = () => {
      if (index < candidates.length) {
        img.src = candidates[index++];
      } else {
        img.src = placeholder;
      }
    };
    img.onerror = () => {
      if (img.dataset.fallbackTried === '1') {
        img.onerror = null;
        img.src = placeholder;
        return;
      }
      img.dataset.fallbackTried = '1';
      tryNext();
    };
    tryNext();
  }

  function findCategoryIdByName(name) {
    const match = dataStore.categories.find((c) => c.name === name);
    return match ? match.id : 'all';
  }

  function renderGrid(animate = false) {
    gridEl.innerHTML = '';
    const animals = dataStore.animals.filter((a) => currentCategory === 'all' || a.category === currentCategory);
    if (animals.length === 0) {
      setStatus('No animals found.');
      return;
    }
    setStatus(`Showing ${animals.length} animals`);

    const frag = document.createDocumentFragment();
    animals.forEach((animal, index) => {
      frag.appendChild(createCard(animal, index, animate));
    });
    gridEl.appendChild(frag);
  }

  /**
   * @param {Animal} animal
   */
  function createCard(animal, index, animate) {
    const fragment = cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.card');
    const img = fragment.querySelector('.thumb');
    const name = fragment.querySelector('.name');
    const pill = fragment.querySelector('.pill');
    const play = fragment.querySelector('.play');

    if (animate) {
      card.style.animationDelay = `${Math.min(index * 0.03, 0.6)}s`;
    }

    img.alt = `${animal.name} (${resolveCategoryName(animal.category)})`;
    setImageWithFallback(img, animal.image, animal.name, 800, 600);
    name.textContent = animal.name;
    pill.textContent = resolveCategoryName(animal.category);

    // Keep play button visible; we'll attempt to play an animal or category fallback sound, else beep
    card.addEventListener('click', () => openModal(animal));
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(animal);
      }
    });
    play.addEventListener('click', (e) => {
      e.stopPropagation();
      // Always try to play an actual sound with category fallback before beeping
      playSound(animal);
    });

    enableTilt(card);
    return fragment;
  }

  function resolveCategoryName(id) {
    return dataStore.categories.find((c) => c.id === id)?.name || id;
  }

  function openModal(animal) {
    modalImgEl.alt = animal.name;
    setImageWithFallback(modalImgEl, animal.image, animal.name, 1200, 800);
    modalTitleEl.textContent = animal.name;
    modalCategoryEl.textContent = resolveCategoryName(animal.category);
    modalBodyEl.innerHTML = '';
    for (const p of animal.description) {
      const el = document.createElement('p');
      el.textContent = p;
      modalBodyEl.appendChild(el);
    }
    modalPlayEl.disabled = false;
    // Update label based on availability in animal or category; still calls playSound which handles fallback
    const hasAnySound = !!(animal.sound || findCategoryFallbackSound(animal.category));
    modalPlayEl.textContent = hasAnySound ? 'Play Sound' : 'Play Beep';
    modalPlayEl.onclick = () => { playSound(animal); };
    modalEl.classList.add('show');
    modalEl.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modalEl.classList.remove('show');
    modalEl.setAttribute('aria-hidden', 'true');
  }

  /**
   * Plays sound for an animal; if loading fails, synthesizes a short tone so all animals have sound.
   * @param {Animal} animal
   */
  async function playSound(animal) {
    // Prefer the animal's own sound; otherwise try a category sibling's sound as a proxy
    let source = animal.sound || findCategoryFallbackSound(animal.category);
    if (!source) {
      await synthBeep();
      return;
    }
    try {
      const resolved = new URL(source, location.href).href;
      const isNewSrc = audioEl.src !== resolved;
      if (isNewSrc) {
        audioEl.src = resolved;
        // Force reload to avoid stale network/cache edge cases
        audioEl.load();
      }
      audioEl.muted = isMuted;
      // Always start from the beginning for quick feedback
      try { audioEl.currentTime = 0; } catch {}
      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => { try { synthBeep(); } catch {} });
      }
    } catch {
      // Network or playback failed; provide audible feedback anyway
      try { await synthBeep(); } catch {}
    }
  }

  function stopAllSounds() {
    try { audioEl.pause(); } catch {}
    try { audioEl.currentTime = 0; } catch {}
    if (beepContext) {
      try { beepContext.close(); } catch {}
      beepContext = null;
    }
  }

  function findCategoryFallbackSound(categoryId) {
    const mate = dataStore.animals.find((a) => a.category === categoryId && !!a.sound);
    return mate ? mate.sound : '';
  }

  // Simple WebAudio synth as a guaranteed fallback sound
  async function synthBeep() {
    const AC = /** @type {typeof AudioContext} */ (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    if (!beepContext || beepContext.state === 'closed') {
      beepContext = new AC();
    }
    if (beepContext.state === 'suspended') {
      try { await beepContext.resume(); } catch {}
    }
    const o = beepContext.createOscillator();
    const g = beepContext.createGain();
    o.type = 'triangle';
    o.frequency.value = 660;
    // Slightly louder so users can hear the fallback clearly
    g.gain.value = isMuted ? 0 : 0.06;
    o.connect(g).connect(beepContext.destination);
    o.start();
    await new Promise((r) => setTimeout(r, 200));
    o.frequency.exponentialRampToValueAtTime(330, beepContext.currentTime + 0.15);
    g.gain.exponentialRampToValueAtTime(isMuted ? 0 : 0.0001, beepContext.currentTime + 0.18);
    setTimeout(() => { try { o.stop(); } catch {} }, 220);
  }

  function enableTilt(card) {
    let raf = 0;
    let rect = null;
    const maxTilt = 8;
    function onMove(e) {
      if (!rect) rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (y - 0.5) * -2 * maxTilt;
      const ry = (x - 0.5) * 2 * maxTilt;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `translateY(-4px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });
    }
    function onLeave() {
      rect = null;
      cancelAnimationFrame(raf);
      card.style.transform = '';
    }
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('blur', onLeave);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

