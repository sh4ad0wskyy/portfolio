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

const createGalleryDialog = () => {
  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-dialog';
  dialog.setAttribute('aria-label', 'Galeria screenshotów pluginu');
  dialog.innerHTML = [
    '<div class="gallery-dialog__header">',
    '<p class="gallery-dialog__caption" data-gallery-caption></p>',
    '<button class="gallery-dialog__close" type="button" data-gallery-close aria-label="Zamknij galerię">×</button>',
    '</div>',
    '<div class="gallery-dialog__stage">',
    '<button class="gallery-dialog__nav gallery-dialog__nav--prev" type="button" data-gallery-prev aria-label="Poprzednie zdjęcie">‹</button>',
    '<img class="gallery-dialog__image" data-gallery-image alt="">',
    '<button class="gallery-dialog__nav gallery-dialog__nav--next" type="button" data-gallery-next aria-label="Następne zdjęcie">›</button>',
    '<p class="gallery-dialog__error" data-gallery-error hidden>Nie udało się załadować zdjęcia.</p>',
    '</div>',
    '<p class="gallery-dialog__counter" data-gallery-counter aria-live="polite"></p>'
  ].join('');
  document.body.append(dialog);
  return dialog;
};

const galleryDialog = createGalleryDialog();
const galleryImage = galleryDialog.querySelector('[data-gallery-image]');
const galleryCaption = galleryDialog.querySelector('[data-gallery-caption]');
const galleryCounter = galleryDialog.querySelector('[data-gallery-counter]');
const galleryError = galleryDialog.querySelector('[data-gallery-error]');
const galleryPrev = galleryDialog.querySelector('[data-gallery-prev]');
const galleryNext = galleryDialog.querySelector('[data-gallery-next]');
const galleryClose = galleryDialog.querySelector('[data-gallery-close]');
const galleryRegistry = new Map();
let activeGallery = [];
let activeGalleryIndex = 0;
let galleryReturnFocus = null;

const renderGalleryImage = () => {
  const item = activeGallery[activeGalleryIndex];
  if (!item) return;
  galleryImage.hidden = false;
  galleryError.hidden = true;
  galleryImage.src = item.url;
  galleryImage.alt = item.alt;
  galleryCaption.textContent = item.label;
  galleryCounter.textContent = (activeGalleryIndex + 1) + ' / ' + activeGallery.length;
  const hasMultiple = activeGallery.length > 1;
  galleryPrev.hidden = !hasMultiple;
  galleryNext.hidden = !hasMultiple;
};

const openGallery = (galleryId, index, trigger) => {
  const images = galleryRegistry.get(galleryId);
  if (!images || !images.length) return;
  activeGallery = images;
  activeGalleryIndex = Math.max(0, Math.min(index, images.length - 1));
  galleryReturnFocus = trigger;
  renderGalleryImage();
  if (!galleryDialog.open) galleryDialog.showModal();
};

const moveGallery = (direction) => {
  if (activeGallery.length < 2) return;
  activeGalleryIndex = (activeGalleryIndex + direction + activeGallery.length) % activeGallery.length;
  renderGalleryImage();
};

galleryClose.addEventListener('click', () => galleryDialog.close());
galleryPrev.addEventListener('click', () => moveGallery(-1));
galleryNext.addEventListener('click', () => moveGallery(1));
galleryDialog.addEventListener('click', (event) => {
  if (event.target === galleryDialog) galleryDialog.close();
});
galleryDialog.addEventListener('close', () => {
  galleryImage.removeAttribute('src');
  activeGallery = [];
  if (galleryReturnFocus && document.contains(galleryReturnFocus)) galleryReturnFocus.focus();
  galleryReturnFocus = null;
});
galleryImage.addEventListener('error', () => {
  galleryImage.hidden = true;
  galleryError.hidden = false;
});
document.addEventListener('keydown', (event) => {
  if (!galleryDialog.open) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveGallery(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveGallery(1);
  }
});

pluginsList?.addEventListener('click', (event) => {
  const trigger = event.target instanceof Element
    ? event.target.closest('[data-gallery-id][data-gallery-index]')
    : null;
  if (!trigger) return;
  const index = Number(trigger.dataset.galleryIndex);
  if (!Number.isInteger(index)) return;
  openGallery(trigger.dataset.galleryId, index, trigger);
});

const safeImagePath = (folderPath, relativePath) => {
  if (typeof relativePath !== 'string' || !relativePath.trim()) return '';
  const normalized = relativePath.trim();
  if (normalized.startsWith('/') || normalized.includes('\\') || /[?#]/.test(normalized)) return '';
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return '';
  if (!/\.(png|jpe?g|webp|gif|avif)$/i.test(normalized)) return '';
  return safeHttpUrl(rawFileUrl(folderPath + '/' + normalized));
};

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
        const technologies = asArray(info.technologie || info.technologies);
        const version = textOr(info.wersja || info.version, '');
        const name = textOr(info.nazwa || info.name, folder.name);
        const description = textOr(info.opis || info.description, 'Brak opisu pluginu.');
        const coverPath = safeImagePath(folder.path, info.cover || info.okladka || '');
        const screenshotPaths = asArray(info.screenshots || info.zdjecia);
        const screenshots = screenshotPaths.map((path) => safeImagePath(folder.path, path)).filter(Boolean);
        const galleryImages = (coverPath ? [{ url: coverPath, label: name + ' — zdjęcie główne' }] : [])
          .concat(screenshots.map((url, index) => ({ url, label: name + ' — screenshot ' + (index + 1) })));
        const galleryId = 'plugin-gallery-' + galleryRegistry.size + '-' + folder.name.replace(/[^a-zA-Z0-9_-]/g, '-');
        if (galleryImages.length) {
          galleryRegistry.set(galleryId, galleryImages.map((item) => ({ ...item, alt: item.label })));
        }

        const coverMarkup = coverPath
          ? '<button class="project-card__cover" type="button" data-gallery-id="' + escapeHtml(galleryId) + '" data-gallery-index="0" aria-label="Powiększ zdjęcie główne: ' + escapeHtml(name) + '">' +
              '<img src="' + escapeHtml(coverPath) + '" alt="Podgląd pluginu ' + escapeHtml(name) + '" loading="lazy">' +
              '<span class="project-card__cover-hint">Zobacz zdjęcie</span></button>'
          : '<div class="project-card__cover project-card__cover--placeholder" aria-label="Brak zdjęcia głównego"><span>Brak zdjęcia głównego</span></div>';

        const galleryOffset = coverPath ? 1 : 0;
        const galleryMarkup = screenshots.length
          ? '<div class="project-card__gallery" aria-label="Galeria screenshotów pluginu ' + escapeHtml(name) + '">' +
              '<p class="project-card__gallery-title">Galeria <span>' + screenshots.length + '</span></p>' +
              '<div class="project-card__thumbnails">' +
                screenshots.map((url, index) =>
                  '<button class="project-card__thumbnail" type="button" data-gallery-id="' + escapeHtml(galleryId) + '" data-gallery-index="' + (index + galleryOffset) + '" aria-label="Powiększ screenshot ' + (index + 1) + ' pluginu ' + escapeHtml(name) + '">' +
                  '<img src="' + escapeHtml(url) + '" alt="Screenshot ' + (index + 1) + ' — ' + escapeHtml(name) + '" loading="lazy"></button>'
                ).join('') +
              '</div></div>'
          : '';

        return '<article class="project-card reveal">' +
          coverMarkup +
          '<div class="project-card__info">' +
            '<p class="project-card__tag">Plugin Minecraft</p>' +
            '<h3>' + escapeHtml(name) + '</h3>' +
            '<p>' + escapeHtml(description) + '</p>' +
            '<div class="project-card__meta">' + buildMeta([version && ('v' + version), ...technologies]) + '</div>' +
          '</div>' +
          galleryMarkup +
        '</article>';
      } catch (error) {
        console.error('[Portfolio] Nie udało się wczytać projektu ' + folder.name + ':', error);
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
