(() => {
  /** @type {import('./animals.json')} */
  let dataStore = { categories: [], animals: [] };

  const contentEl = document.getElementById('content');
  const backButtonEl = document.getElementById('backButton');
  const cardTemplate = /** @type {HTMLTemplateElement} */ (document.getElementById('cardTemplate'));

  /** @type {Array<() => void>} */
  const historyStack = [];
  const audioEl = new Audio();

  async function init() {
    try {
      const response = await fetch('animals.json', { cache: 'no-store' });
      dataStore = await response.json();
    } catch (err) {
      console.error('Failed to load animals.json', err);
      contentEl.textContent = 'Failed to load data.';
      return;
    }

    backButtonEl.addEventListener('click', () => {
      const prev = historyStack.pop();
      if (prev) {
        prev();
      }
      backButtonEl.hidden = historyStack.length === 0;
    });

    showCategories();
  }

  function clearContent() {
    contentEl.innerHTML = '';
  }

  function createCard({ imageSrc, label, onClick, alt = '' }) {
    const fragment = cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.card');
    const img = fragment.querySelector('.card-image');
    const text = fragment.querySelector('.card-label');
    img.src = imageSrc;
    img.alt = alt || label;
    text.textContent = label;
    card.addEventListener('click', onClick);
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    });
    return fragment;
  }

  function showCategories() {
    clearContent();
    backButtonEl.hidden = true;
    const heading = document.createElement('div');
    heading.className = 'section-title';
    heading.textContent = 'Categories';
    const grid = document.createElement('div');
    grid.className = 'grid';

    dataStore.categories.forEach((cat) => {
      grid.appendChild(
        createCard({
          imageSrc: cat.image,
          label: cat.name,
          alt: `${cat.name} category`,
          onClick: () => {
            historyStack.push(() => showCategories());
            showAnimals(cat.id);
            backButtonEl.hidden = false;
          }
        })
      );
    });

    contentEl.appendChild(heading);
    contentEl.appendChild(grid);
  }

  function showAnimals(categoryId) {
    clearContent();
    const category = dataStore.categories.find((c) => c.id === categoryId);
    const heading = document.createElement('div');
    heading.className = 'section-title';
    heading.textContent = category ? category.name : 'Animals';
    const grid = document.createElement('div');
    grid.className = 'grid';

    dataStore.animals
      .filter((a) => a.category === categoryId)
      .forEach((animal) => {
        grid.appendChild(
          createCard({
            imageSrc: animal.image,
            label: animal.name,
            onClick: () => {
              historyStack.push(() => showAnimals(categoryId));
              showDetail(animal.id);
              backButtonEl.hidden = false;
            }
          })
        );
      });

    contentEl.appendChild(heading);
    contentEl.appendChild(grid);
  }

  function showDetail(animalId) {
    clearContent();
    const animal = dataStore.animals.find((a) => a.id === animalId);
    if (!animal) {
      contentEl.textContent = 'Animal not found.';
      return;
    }

    const detail = document.createElement('div');
    detail.className = 'detail';

    const hero = document.createElement('div');
    hero.className = 'detail-hero';
    const img = document.createElement('img');
    img.src = animal.image;
    img.alt = animal.name;
    const name = document.createElement('h2');
    name.className = 'animal-name';
    name.textContent = animal.name;

    const play = document.createElement('button');
    play.className = 'play-button';
    play.type = 'button';
    play.textContent = 'Play Sound';
    play.addEventListener('click', async () => {
      try {
        if (audioEl.src !== new URL(animal.sound, location.href).href) {
          audioEl.src = animal.sound;
        }
        await audioEl.play();
      } catch (err) {
        console.warn('Audio failed to play', err);
        play.disabled = true;
        play.textContent = 'Audio unavailable';
      }
    });

    hero.appendChild(img);
    hero.appendChild(name);
    hero.appendChild(play);

    const paragraphs = document.createElement('div');
    paragraphs.className = 'paragraphs';
    animal.description.forEach((para) => {
      const p = document.createElement('p');
      p.textContent = para;
      paragraphs.appendChild(p);
    });

    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = 'Note: Some sounds are placeholders and may be unavailable in this starter.';

    detail.appendChild(hero);
    detail.appendChild(paragraphs);
    detail.appendChild(note);

    contentEl.appendChild(detail);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

