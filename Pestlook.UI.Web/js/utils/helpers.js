export const SubscriptionPlan = { 0: 'Basic', 1: 'Professional', 2: 'Enterprise' };
export const SubscriptionPlanValues = { Basic: 0, Professional: 1, Enterprise: 2 };

export const PestCategory = { 0: 'Insect', 1: 'Disease', 2: 'Weed', 3: 'Rodent', 4: 'Other' };
export const PestCategoryValues = { Insect: 0, Disease: 1, Weed: 2, Rodent: 3, Other: 4 };

export const CaptureMode = { 0: 'Count', 1: 'Presence' };
export const CaptureModeValues = { Count: 0, Presence: 1 };

export const MonitoringPointType = { 0: 'FixedTrap', 1: 'FixedScouting', 2: 'ScoutingVisit' };
export const MonitoringPointTypeValues = { FixedTrap: 0, FixedScouting: 1, ScoutingVisit: 2 };

export function initials(firstName, lastName) {
  const f = (firstName || '').charAt(0).toUpperCase();
  const l = (lastName || '').charAt(0).toUpperCase();
  return f + l;
}

export function initialsFromName(fullName) {
  if (!fullName) return '??';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function shortName(firstName, lastName) {
  if (!firstName) return '';
  const l = (lastName || '').charAt(0);
  return `${firstName} ${l ? l + '.' : ''}`.trim();
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function todayFormatted() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

export function el(tag, attrs = {}, ...children) {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') elem.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(elem.style, v);
    else if (k.startsWith('on') && typeof v === 'function') elem.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'innerHTML') elem.innerHTML = v;
    else elem.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
    else if (child) elem.appendChild(child);
  }
  return elem;
}

// ── Temperature helpers ───────────────────────────────────────────────────────
// Values are always stored as Celsius. These helpers convert for display/input.

/** Convert Celsius to Fahrenheit. */
export function celsiusToFahrenheit(c) {
  return (c * 9) / 5 + 32;
}

/** Convert Fahrenheit to Celsius. */
export function fahrenheitToCelsius(f) {
  return ((f - 32) * 5) / 9;
}

/**
 * Format a Celsius value for display in the user's preferred unit.
 * @param {number|null|undefined} celsius - stored value in °C
 * @param {string} unit - "C" or "F"
 * @returns {string} e.g. "23.5 °C" or "74.3 °F"
 */
export function formatTemperature(celsius, unit) {
  if (celsius == null) return '—';
  if (unit === 'F') return `${celsiusToFahrenheit(celsius).toFixed(1)} °F`;
  return `${Number(celsius).toFixed(1)} °C`;
}

/**
 * Convert a user-entered value in their preferred unit to Celsius for storage.
 * @param {number} value - the number the user typed
 * @param {string} unit - "C" or "F"
 * @returns {number} value in Celsius
 */
export function toCelsiusForStorage(value, unit) {
  if (unit === 'F') return fahrenheitToCelsius(value);
  return value;
}

/**
 * Convert a stored Celsius value to the user's preferred unit for input fields.
 * @param {number|null|undefined} celsius
 * @param {string} unit - "C" or "F"
 * @returns {string} numeric string or ''
 */
export function celsiusToDisplayValue(celsius, unit) {
  if (celsius == null) return '';
  if (unit === 'F') return celsiusToFahrenheit(celsius).toFixed(1);
  return Number(celsius).toFixed(1);
}

/** Returns the unit label: "°C" or "°F". */
export function temperatureUnitLabel(unit) {
  return unit === 'F' ? '°F' : '°C';
}
