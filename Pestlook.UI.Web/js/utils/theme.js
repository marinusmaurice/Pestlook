const STORAGE_KEY = 'pl_theme';

export const THEMES = [
  { id: 'light',   label: 'Light',              swatch: '#2B6E4F' },
  { id: 'dark-a',  label: 'Slate & Amber',      swatch: '#F0B429' },
  { id: 'dark-b',  label: 'Navy & Cyan',        swatch: '#4FD1E8' },
  { id: 'dark-cd', label: 'Stone & Clay',       swatch: '#C98B5E' },
  { id: 'light-e', label: 'Mono Ice',           swatch: '#2D6FE0' },
  { id: 'dark-f',  label: 'Midnight Violet',    swatch: '#A78BFA' },
  { id: 'chaos',   label: 'Neon Hazard',        swatch: '#FF2EEA' },
];

const DEFAULT_THEME = 'light-e';

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
}

export function applyTheme(themeId) {
  if (themeId === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeId);
  }
}

export function setTheme(themeId) {
  localStorage.setItem(STORAGE_KEY, themeId);
  applyTheme(themeId);
}

export function initTheme() {
  applyTheme(getTheme());
}

/** Apply and cache the theme that came back from the server (e.g. after login). */
export function syncThemeFromUser(user) {
  setTheme(user?.theme || DEFAULT_THEME);
}
