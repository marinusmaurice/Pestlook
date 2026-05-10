const routes = [];
let currentRoute = null;
let beforeNavigateHook = null;

export function registerRoute(path, handler) {
  const paramNames = [];
  const pattern = path.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  routes.push({ pattern: new RegExp(`^${pattern}$`), paramNames, handler, path });
}

export function setBeforeNavigate(fn) {
  beforeNavigateHook = fn;
}

export function navigate(path) {
  window.location.hash = '#' + path;
}

/** Returns the path portion of the hash (strips query string). */
export function currentPath() {
  const hash = window.location.hash.slice(1) || '/';
  return hash.split('?')[0] || '/';
}

/** Returns parsed query params from the hash fragment (e.g. #/reset-password?token=abc). */
export function getHashQuery() {
  const hash = window.location.hash.slice(1) || '';
  const idx = hash.indexOf('?');
  if (idx === -1) return {};
  return Object.fromEntries(new URLSearchParams(hash.slice(idx + 1)));
}

function matchRoute(path) {
  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { handler: route.handler, params };
    }
  }
  return null;
}

async function onHashChange() {
  const path = currentPath();

  if (beforeNavigateHook) {
    const allow = beforeNavigateHook(path);
    if (allow === false) return;
  }

  const matched = matchRoute(path);
  if (matched) {
    currentRoute = path;
    await matched.handler(matched.params);
  } else {
    navigate('/');
  }
}

export function startRouter() {
  window.addEventListener('hashchange', onHashChange);
  onHashChange();
}

export function getCurrentRoute() {
  return currentRoute;
}
