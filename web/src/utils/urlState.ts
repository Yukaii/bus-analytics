// Utility helpers to sync app state with URL query params and history
// State schema:
// - route: routeId (string)
// - all: 1 or 0 (show all routes toggle)
// - lat,lng,zoom: map viewport center and zoom (numbers)
//
// We avoid full SPA router to keep things simple and compatible with CRA.

export type UrlState = {
  route?: string | null;
  all?: boolean;
  lat?: number;
  lng?: number;
  zoom?: number;
};

const num = (v: string | null): number | undefined => {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export function parseUrlState(search: string = window.location.search): UrlState {
  const p = new URLSearchParams(search);
  const route = p.get('route');
  const all = p.get('all');
  const lat = num(p.get('lat'));
  const lng = num(p.get('lng'));
  const zoom = num(p.get('zoom'));
  return {
    route: route || null,
    all: all === '1' ? true : all === '0' ? false : undefined,
    lat,
    lng,
    zoom,
  };
}

export function buildSearch(state: UrlState, base: string = window.location.search): string {
  const current = new URLSearchParams(base);

  const setOrDelete = (key: string, v: string | null | undefined) => {
    if (v == null || v === '') current.delete(key);
    else current.set(key, v);
  };

  setOrDelete('route', state.route ?? null);
  if (typeof state.all === 'boolean') setOrDelete('all', state.all ? '1' : '0');
  if (typeof state.lat === 'number') setOrDelete('lat', state.lat.toFixed(5));
  if (typeof state.lng === 'number') setOrDelete('lng', state.lng.toFixed(5));
  if (typeof state.zoom === 'number') setOrDelete('zoom', String(Math.round(state.zoom)));

  // Remove empty keys to keep URL clean
  ['route', 'all', 'lat', 'lng', 'zoom'].forEach(k => {
    if (!current.get(k)) current.delete(k);
  });

  const s = current.toString();
  return s ? `?${s}` : '';
}

export function pushUrlState(state: UrlState, replace = false) {
  // Always merge with existing params so we never drop unrelated keys like 'route'
  const search = buildSearch(state, window.location.search);
  const url = `${window.location.pathname}${search}`;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}
