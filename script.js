'use strict';

const REPOSITORY = {
  owner: 'sh4ad0wskyy',
  name: 'portfolio',
  branch: 'main',
};

const CACHE_TTL = 5 * 60 * 1000;
const header = document.querySelector('[data-header]');
const menu = document.querySelector('[data-menu]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const year = document.querySelector('[data-year]');
const pluginsList = document.querySelector('[data-plugins-list]');
const serversList = document.querySelector('[data-servers-list]');

if (year) year.textContent = String(new Date().getFullYear());

const updateHeader = () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 10);
};

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

const closeMenu = () => {
  menu?.classList.remove('is-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
};

menuToggle?.addEventListener('click', () => {
  const isOpen = menu?.classList.toggle('is-open') ?? false;
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

menu?.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

const supportsIntersectionObserver = 'IntersectionObserver' in window;
if (supportsIntersectionObserver) {
  document.documentElement.classList.add('js-enabled');
}

const observer = supportsIntersectionObserver
  ? new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16 })
  : null;

const observeReveal = (root = document) => {
  if (!observer) return;
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
  const cacheKey = `portfolio-cache:${url}`;

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const entry = JSON.parse(cached);
      if (Date.now() - entry.savedAt < CACHE_TTL) return entry.data;
    }
  } catch {
    // Niedostępny lub uszkodzony cache nie może blokować pobierania danych.
  }

  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });

  if (!response.ok) {
    throw new Error(`Nie można pobrać danych (${response.status}): ${url}`);
  }

  const data = await response.json();

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Brak miejsca lub zablokowany sessionStorage — działamy bez cache.
  }

  return data;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const textOr = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const safeHttpUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

const findFirstFile = (files, match) =>
  Array.isArray(files)
    ? files.find((file) => file?.type === 'file' && typeof file.name === 'string' && match(file.name.toLowerCase()))
    : undefined;

const setEmptyState = (container, message) => {
  if (!container) return;
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
  if (!pluginsList) return;

  try {
    const folders = await fetchJson(githubContentsUrl('projekty'));
    const pluginFolders = asArray(folders).filter((item) => item?.type === 'dir');

    if (!pluginFolders.length) {
      setEmptyState(pluginsList, 'Brak pluginów. Dodaj katalog w <code>projekty/</code> z plikiem <code>info.json</code>, aby pojawił się tutaj.');
      return;
    }

    const cards = await Promise.all(pluginFolders.map(async (folder) => {
      try {
        const files = await fetchJson(githubContentsUrl(folder.path));
        const infoFile = findFirstFile(files, (name) => name === 'info.json');
        if (!infoFile) return '';

        const info = await fetchJson(rawFileUrl(infoFile.path));
        const jarFile = findFirstFile(files, (name) => name.endsWith('.jar'));
        const downloadUrl = safeHttpUrl(jarFile?.download_url);
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
            ${downloadUrl ? `<a class="project-card__download" href="${escapeHtml(downloadUrl)}" download>Pobierz .jar</a>` : ''}
          </article>`;
      } catch (error) {
        console.error(`[Portfolio] Nie udało się wczytać projektu ${folder.name}:`, error);
        return '';
      }
    }));

    const validCards = cards.filter(Boolean);
    pluginsList.innerHTML = validCards.join('');

    if (!validCards.length) {
      setEmptyState(pluginsList, 'Nie znaleziono poprawnych projektów. Sprawdź, czy ich katalogi zawierają prawidłowe pliki <code>info.json</code>.');
      return;
    }

    observeReveal(pluginsList);
  } catch (error) {
    console.error('[Portfolio] Nie udało się załadować pluginów:', error);
    setEmptyState(pluginsList, 'Nie udało się załadować pluginów. Sprawdź połączenie z GitHubem i spróbuj ponownie później.');
  }
};

const loadServerCards = async () => {
  if (!serversList) return;

  try {
    const folders = await fetchJson(githubContentsUrl('serwery'));
    const serverFolders = asArray(folders).filter((item) => item?.type === 'dir');

    if (!serverFolders.length) {
      setEmptyState(serversList, 'Brak serwerów. Dodaj katalog w <code>serwery/</code> z plikiem <code>info.json</code>, aby pojawił się tutaj.');
      return;
    }

    const cards = await Promise.all(serverFolders.map(async (folder) => {
      try {
        const files = await fetchJson(githubContentsUrl(folder.path));
        const infoFile = findFirstFile(files, (name) => name === 'info.json');
        if (!infoFile) return '';

        const info = await fetchJson(rawFileUrl(infoFile.path));
        const logoFile = findFirstFile(files, (name) =>
          ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp', 'logo.svg'].includes(name));
        const logoUrl = safeHttpUrl(logoFile?.download_url);
        const tags = asArray(info.tagi || info.tags || info.technologie || info.technologies);
        const name = textOr(info.nazwa || info.name, folder.name);
        const description = textOr(info.opis || info.description, 'Brak opisu serwera.');
        const mode = textOr(info.tryb || info.mode, '');
        const address = textOr(info.adres || info.address, '');
        const status = textOr(info.status, '');
        const website = safeHttpUrl(textOr(info.strona || info.website, ''));

        return `
          <article class="server-card reveal">
            ${logoUrl ? `<img class="server-card__logo" src="${escapeHtml(logoUrl)}" alt="Logo serwera ${escapeHtml(name)}" loading="lazy">` : ''}
            <div>
              <p class="server-card__tag">Serwer</p>
              <h3>${escapeHtml(name)}</h3>
              <p>${escapeHtml(description)}</p>
            </div>
            <div class="server-card__meta">
              ${buildMeta([mode, address, status, ...tags])}
            </div>
            ${website ? `<a class="server-card__link" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Odwiedź stronę</a>` : ''}
          </article>`;
      } catch (error) {
        console.error(`[Portfolio] Nie udało się wczytać serwera ${folder.name}:`, error);
        return '';
      }
    }));

    const validCards = cards.filter(Boolean);
    serversList.innerHTML = validCards.join('');

    if (!validCards.length) {
      setEmptyState(serversList, 'Nie znaleziono poprawnych serwerów. Sprawdź, czy ich katalogi zawierają prawidłowe pliki <code>info.json</code>.');
      return;
    }

    observeReveal(serversList);
  } catch (error) {
    console.error('[Portfolio] Nie udało się załadować serwerów:', error);
    setEmptyState(serversList, 'Nie udało się załadować serwerów. Sprawdź połączenie z GitHubem i spróbuj ponownie później.');
  }
};

loadPluginCards();
loadServerCards();
