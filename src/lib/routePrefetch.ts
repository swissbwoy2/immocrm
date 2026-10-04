// Vite shares these import promises/chunks with the route-level lazy imports in App.
const routeModules = import.meta.glob('../pages/**/*.tsx');
const prefetched = new Set<string>();

export function prefetchSidebarRoute(path: string) {
  const match = path.match(/^\/(admin|agent|client|candidat|coursier|proprietaire|apporteur|closeur)(?:\/([\w-]+))?$/);
  if (!match) return;
  const [, role, page] = match;
  const file = `../pages/${role}/${page ? page.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('') : 'Dashboard'}.tsx`;
  const loader = routeModules[file];
  if (!loader || prefetched.has(file)) return;
  prefetched.add(file);
  loader().catch(() => prefetched.delete(file));
}