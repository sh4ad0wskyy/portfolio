const REPOSITORY = {
  owner: 'sh4ad0wskyy',
  name: 'portfolio',
  branch: 'main',
};

const header = document.querySelector('[data-header]');
const menu = document.querySelector('[data-menu]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const year = document.querySelector('[data-year]');
const pluginsList = document.querySelector('[data-plugins-list]');
const serversList = document.querySelector('[data-servers-list]');

year.textContent = new Date().getFullYear();

const updateHeader = () => {
  header.classList.toggle('is-scrolled', window.scrollY > 10);
};

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

menuToggle.addEventListener('click', () => {
  const isOpen = menu.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

menu.addEventListener('click', (event) => {
  if (event.target.matches('a')) {
    menu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

const observeReveal = (root = document) => {
  root.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
};

observeReveal();

const githubContentsUrl = (path) => {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${REPOSITORY.owner}/${REPOSITORY.name}/contents/${encodedPath}?ref=${REPOSITORY.branch}`;
};

const rawFileUrl = (path) => {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${REPOSITORY.owner}/${REPOSITORY.name}/${REPOSITORY.branch}/${encodedPath}`;
};

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });

  if (!response.ok) {
    throw new Error(`Nie można pobrać danych (${response.status}): ${url}`);
  }

  return response.json();
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const textOr = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback;

const findFirstFile = (files, match) => files.find((file) => file.type === 'file' && match(file.name.toLowerCase()));

const setEmptyState = (container, message) => {
  container.innerHTML = `<article class="empty-state reveal">${message}</article>`;
  observeReveal(container);
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const buildMeta = (items) => items
  .filter(Boolean)
  .map((item) => `<span>${escapeHtml(item)}</span>`)
  .join('');

const loadPluginCards = async () => {
  try {
    const folders = await fetchJson(githubContentsUrl('projekty'));
    const pluginFolders = asArray(folders).filter((item) => item.type === 'dir');

    if (!pluginFolders.length) {
      setEmptyState(pluginsList, 'Brak pluginów. Dodaj katalog w <code>projekty/</code> z plikiem <code>info.json</code>, aby pojawił się tutaj.');
      return;
    }

    const cards = await Promise.all(pluginFolders.map(async (folder) => {
      const files = await fetchJson(githubContentsUrl(folder.path));
      const infoFile = findFirstFile(files, (name) => name === 'info.json');

      if (!infoFile) return '';

      const info = await fetchJson(rawFileUrl(infoFile.path));
      const jarFile = findFirstFile(files, (name) => name.endsWith('.jar'));
      const technologies = asArray(info.technologie || info.technologies);
      const version = textOr(info.wersja || info.version, '');
      const name = textOr(info.nazwa || info.name, folder.name);
      const description = textOr(info.opis || info.description, 'Brak opisu pluginu.');

      return `
        <article class="project-card reveal">
          <div>
            <p class="project-card__tag">Plugin Minecraft</p>
            <h3>${escapeHtml(name)}</h3>
            <p>${escapeHtml(description)}</p>
          </div>
          <div class="project-card__meta">
            ${buildMeta([version && `v${version}`, ...technologies])}
          </div>
          ${jarFile ? `<a class="project-card__download" href="${escapeHtml(jarFile.download_url)}" download>Pobierz .jar</a>` : ''}
        </article>`;
    }));

    const validCards = cards.filter(Boolean);
    pluginsList.innerHTML = validCards.join('');

    if (!validCards.length) {
      setEmptyState(pluginsList, 'Znaleziono katalogi w <code>projekty/</code>, ale brakuje plików <code>info.json</code>.');
      return;
    }

    observeReveal(pluginsList);
  } catch (error) {
    console.error('[Portfolio] Nie udało się załadować pluginów:', error);
    setEmptyState(pluginsList, 'Nie udało się załadować pluginów. Sprawdź konsolę przeglądarki i dostęp do repozytorium GitHub.');
  }
};

const loadServerCards = async () => {
  try {
    const folders = await fetchJson(githubContentsUrl('serwery'));
    const serverFolders = asArray(folders).filter((item) => item.type === 'dir');

    if (!serverFolders.length) {
      setEmptyState(serversList, 'Brak serwerów. Dodaj katalog w <code>serwery/</code> z plikiem <code>info.json</code> i logiem, aby pojawił się tutaj.');
      return;
    }

    const cards = await Promise.all(serverFolders.map(async (folder) => {
      const files = await fetchJson(githubContentsUrl(folder.path));
      const infoFile = findFirstFile(files, (name) => name === 'info.json');

      if (!infoFile) return '';

      const info = await fetchJson(rawFileUrl(infoFile.path));
      const logoFile = findFirstFile(files, (name) => ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp', 'logo.svg'].includes(name));
      const tags = asArray(info.tagi || info.tags);
      const name = textOr(info.nazwa || info.name, folder.name);
      const description = textOr(info.opis || info.description, 'Brak opisu serwera.');
      const mode = textOr(info.tryb || info.mode, '');
      const address = textOr(info.adres || info.address, '');
      const status = textOr(info.status, '');
      const website = textOr(info.strona || info.website, '');

      return `
        <article class="server-card reveal">
          ${logoFile ? `<img class="server-card__logo" src="${escapeHtml(logoFile.download_url)}" alt="Logo serwera ${escapeHtml(name)}">` : ''}
          <div>
            <p class="server-card__tag">Serwer</p>
            <h3>${escapeHtml(name)}</h3>
            <p>${escapeHtml(description)}</p>
          </div>
          <div class="server-card__meta">
            ${buildMeta([mode, address, status, ...tags])}
          </div>
          ${website ? `<a class="server-card__link" href="${escapeHtml(website)}" target="_blank" rel="noreferrer">Odwiedź stronę</a>` : ''}
        </article>`;
    }));

    const validCards = cards.filter(Boolean);
    serversList.innerHTML = validCards.join('');

    if (!validCards.length) {
      setEmptyState(serversList, 'Znaleziono katalogi w <code>serwery/</code>, ale brakuje plików <code>info.json</code>.');
      return;
    }

    observeReveal(serversList);
  } catch (error) {
    console.error('[Portfolio] Nie udało się załadować serwerów:', error);
    setEmptyState(serversList, 'Nie udało się załadować serwerów. Sprawdź konsolę przeglądarki i dostęp do repozytorium GitHub.');
  }
};

loadPluginCards();
loadServerCards();
