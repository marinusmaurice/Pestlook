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

export function currentPath() {
  return window.location.hash.slice(1) || '/';
}

function matchRoute(path) {
  const [pathPart, queryPart] = path.split('?');
  const queryParams = Object.fromEntries(new URLSearchParams(queryPart || ''));

  for (const route of routes) {
    const match = pathPart.match(route.pattern);
    if (match) {
      const params = { ...queryParams };
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { handler: route.handler, params };
    }
  }
  return null;
}

async function onHashChange() {
  const full = currentPath();
  const path = full.split('?')[0];

  if (beforeNavigateHook) {
    const allow = beforeNavigateHook(path);
    if (allow === false) return;
  }

  const matched = matchRoute(full);
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
