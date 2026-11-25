// Who is signed in, in which organization, with which role and permissions, plus cached reference data
// (sites, categories, item types, suppliers, items, people) that many screens need.
import { db, rpc, auth } from './api.js';

const ORG_KEY = 'gops-org';
export const store = {
  user: null, profile: null, orgs: [], org: null, role: null, perms: new Set(), allSites: true,
  ref: { sites: [], categories: [], types: [], suppliers: [], items: [], people: [] },
  can(perm) { return this.perms.has(perm); },
};
const subs = new Set();
export const onStore = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((fn) => fn(store));

export async function loadSession() {
  store.user = auth.user;
  await rpc('claim_invitations').catch(() => null);        // join organizations this email was invited to
  const [profile, memberships] = await Promise.all([
    db('profiles').select('id,email,full_name,phone').eq('id', store.user.id).one(),
    db('memberships').select('org_id,role,all_sites,active').eq('user_id', store.user.id).eq('active', true).get(),
  ]);
  store.profile = profile;
  store.orgs = memberships.length ? await db('orgs').select('id,name,is_demo,currency,settings').in('id', memberships.map((m) => m.org_id)).order('name').get() : [];
  let wanted = null; try { wanted = localStorage.getItem(ORG_KEY); } catch { /* ignore */ }
  const org = store.orgs.find((o) => o.id === wanted) || store.orgs.find((o) => !o.is_demo) || store.orgs[0] || null;
  if (org) await selectOrg(org.id, memberships);
  emit();
}

export async function selectOrg(orgId, memberships) {
  const m = (memberships || await db('memberships').select('org_id,role,all_sites').eq('user_id', store.user.id).eq('org_id', orgId).get())
    .find((x) => x.org_id === orgId);
  store.org = store.orgs.find((o) => o.id === orgId);
  store.role = m.role; store.allSites = m.all_sites;
  const perms = await db('role_permissions').select('perm').eq('role', m.role).get();
  store.perms = new Set(perms.map((p) => p.perm));
  try { localStorage.setItem(ORG_KEY, orgId); } catch { /* ignore */ }
  await refreshRef();
  emit();
}

// Reference lists. Small enough to keep in memory for thousands of items (selects only the columns lists need).
export async function refreshRef(which) {
  const o = store.org.id;
  const jobs = {
    sites: () => db('sites').select('id,code,name,kind,status,manager_id').eq('org_id', o).order('name').get(),
    categories: () => db('categories').select('id,name,parent_id,active').eq('org_id', o).order('name').get(),
    types: () => db('item_types').select('id,name,tracked,loanable,consumable,active').eq('org_id', o).order('name').get(),
    suppliers: () => (store.can('finance.view') || store.can('suppliers.manage') || store.can('receipts.post'))
      ? db('suppliers').select('id,name,status,payment_terms,credit_days,fixed_discount_pct').eq('org_id', o).order('name').get() : Promise.resolve([]),
    items: () => db('items').select('id,sku,name,uom,category_id,type_id,status,min_qty,max_qty,lead_time_days,barcode').eq('org_id', o).order('name').get(),
    people: async () => {
      const ms = await db('memberships').select('user_id,role,all_sites,active,approval_limit').eq('org_id', o).get();
      const ps = ms.length ? await db('profiles').select('id,email,full_name,deactivated_at').in('id', ms.map((m) => m.user_id)).get() : [];
      return ps.map((p) => ({ ...p, ...ms.find((m) => m.user_id === p.id) }));
    },
  };
  const keys = which ? [].concat(which) : Object.keys(jobs);
  const res = await Promise.all(keys.map((k) => jobs[k]()));
  keys.forEach((k, i) => { store.ref[k] = res[i]; });
}

// Lookups used everywhere
export const site = (id) => store.ref.sites.find((s) => s.id === id);
export const siteName = (id) => site(id)?.name || '—';
export const item = (id) => store.ref.items.find((i) => i.id === id);
export const itemName = (id) => item(id)?.name || '—';
export const supplier = (id) => store.ref.suppliers.find((s) => s.id === id);
export const supplierName = (id) => supplier(id)?.name || '—';
export const category = (id) => store.ref.categories.find((c) => c.id === id);
export const categoryName = (id) => { const c = category(id); if (!c) return '—'; const p = c.parent_id && category(c.parent_id); return p ? `${p.name} › ${c.name}` : c.name; };
export const person = (id) => store.ref.people.find((p) => p.id === id);
export const personName = (id) => { const p = person(id); return p ? (p.full_name || p.email) : '—'; };
export const setting = (k) => store.org?.settings?.[k];
