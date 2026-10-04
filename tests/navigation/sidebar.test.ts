import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { getMenuForRole, filterMenu, isNavigationItemActive } from '../../src/lib/sidebarNavigation';

const roles = ['admin', 'agent', 'client', 'candidat', 'apporteur', 'proprietaire', 'coursier', 'closeur', 'annonceur', 'automation_operator', 'agent_ia'];
const routes = new Set([...readFileSync('src/App.tsx', 'utf8').matchAll(/<Route path="([^"]+)"/g)].map(match => match[1]));
for (const role of roles) {
  for (const journey of role === 'client' ? ['location', 'achat', 'vente', 'renovation', null] : [null]) {
    const sections = getMenuForRole(role, journey);
    const items = sections.flatMap(section => section.items);
    assert.ok(items.length > 0, `${role}/${journey}: empty menu`);
    assert.equal(new Set(items.map(item => item.path)).size, items.length, `${role}/${journey}: duplicate destination`);
    assert.equal(new Set(sections.map(section => section.label)).size, sections.length, 'Section identifiers must be unique');
    for (const item of items) assert.ok(routes.has(item.path), `Missing application route: ${item.path}`);
    if (!['admin', 'agent', 'automation_operator'].includes(role)) {
      assert.ok(items.every(item => !item.path.startsWith('/admin') && !item.path.startsWith('/agent/')), `${role}: staff link leaked`);
    }
    assert.deepEqual(filterMenu(sections, '   '), sections);
    assert.deepEqual(filterMenu(sections, 'no-such-section-xyz'), []);
  }
}
const candidatePaths = getMenuForRole('candidat').flatMap(section => section.items.map(item => item.path));
for (const path of ['/candidat/messages', '/candidat/agenda', '/candidat/support']) assert.ok(candidatePaths.includes(path));
assert.ok(candidatePaths.every(path => !path.startsWith('/client')));
for (const role of roles.filter(role => !['agent_ia', 'automation_operator', 'annonceur'].includes(role))) {
  assert.equal(isNavigationItemActive(`/${role}/detail`, `/${role}`), false, `${role}: root marked active on child`);
}
assert.equal(isNavigationItemActive('/espace-annonceur/messages/123', '/espace-annonceur/messages'), true);
assert.equal(isNavigationItemActive('/espace-annonceur/messages/123', '/espace-annonceur'), false);
assert.equal(isNavigationItemActive('/admin/offres-auto', '/admin/offres'), false);
assert.equal(isNavigationItemActive('/client/dossier', '/client/dossier'), true);
assert.ok(filterMenu(getMenuForRole('admin'), 'equipe').some(section => section.label === 'Équipe et partenaires'));
assert.ok(filterMenu(getMenuForRole('agent'), 'e-mail').flatMap(section => section.items).length > 0);
assert.deepEqual(getMenuForRole('client', 'relocation'), getMenuForRole('client', 'location'));
assert.deepEqual(getMenuForRole('unknown'), []);
console.log('PASS: all roles and client journeys, route existence, unique links, role isolation, accent-insensitive search and active path boundaries.');
