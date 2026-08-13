import type { ComponentType } from 'react';

import DashboardPage from '../pages/DashboardPage';
import UsersPage from '../pages/users/UsersPage';
import RolesPage from '../pages/roles/RolesPage';
import RegionsPage from '../pages/regions/RegionsPage';
import StoresPage from '../pages/stores/StoresPage';
import StoreDetailPage from '../pages/stores/StoreDetailPage';
import PosDirectoryPage from '../pages/pos/PosDirectoryPage';
import ProductsPage from '../pages/products/ProductsPage';
import ProductStoresPage from '../pages/product-stores/ProductStoresPage';
import VisitsPage from '../pages/visits/VisitsPage';
import VisitDetailPage from '../pages/visits/VisitDetailPage';
import AuditItemsPage from '../pages/audit-items/AuditItemsPage';
import ReportsPage from '../pages/reports/ReportsPage';
import SchedulePage from '../pages/schedule/SchedulePage';
import SellOutPage from '../pages/modules/SellOutPage';
import TrainingPage from '../pages/modules/TrainingPage';
import MarketingPage from '../pages/modules/MarketingPage';
import MarketingDetailPage from '../pages/modules/MarketingDetailPage';
import SettingsPage from '../pages/settings/SettingsPage';
import HrPage from '../pages/modules/HrPage';
import PromosPage from '../pages/promos/PromosPage';
import PriceSurveysPage from '../pages/modules/PriceSurveysPage';

/**
 * The permission-to-page map. This is the single source of truth for the
 * whole access flow: **User → Role → Permissions → Pages/Modules → Actions**.
 *
 * Every route in the app (except `/login`, which is public) is declared here
 * exactly once, alongside the permission codes required to reach it. Three
 * things are generated FROM this one array, so they can never drift apart:
 *
 *   - `App.tsx`      builds every protected `<Route>` from `path` + `element`,
 *                     wrapped in a check against `permissions`.
 *   - `Sidebar.tsx`   renders one link per entry that has a `nav` block and
 *                     whose `permissions` the signed-in user holds.
 *   - `MobileNav.tsx` does the same, split into the bottom bar (`mobilePrimary`)
 *                     and the "More" sheet.
 *
 * `permissions: []` means "any authenticated user" (e.g. the dashboard).
 * Otherwise the user needs **any one** of the listed codes — matching how a
 * single page (like a visit list) can serve several permission levels at
 * once, with the page itself narrowing what it shows internally.
 *
 * A route with no `nav` block (e.g. `/pos/:id`) is reachable but doesn't get
 * its own sidebar entry — it shares its parent page's permission.
 */

export interface NavIcon {
  d: string;
  d2?: string;
}

export type NavSection = 'menu' | 'administration' | 'management' | 'general';

export interface NavPage {
  /** Stable id — used as the React key and for tests; not shown to users. */
  id: string;
  path: string;
  element: ComponentType;
  /** Permission codes; the user needs at least one. Empty = any authenticated user. */
  permissions: string[];
  /** Present only for pages that should appear in the sidebar / mobile nav. */
  nav?: {
    /** i18n key under the `sidebar` namespace. */
    labelKey: string;
    icon: NavIcon;
    section: NavSection;
    /** Shown in the mobile bottom bar; otherwise only in the "More" sheet. */
    mobilePrimary?: boolean;
  };
}

export const NAV_PAGES: NavPage[] = [
  // ── Menu ──────────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    path: '/dashboard',
    element: DashboardPage,
    permissions: [],
    nav: {
      labelKey: 'nav.dashboard',
      icon: { d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', d2: 'M9 22V12h6v10' },
      section: 'menu',
      mobilePrimary: true,
    },
  },
  {
    id: 'visits',
    path: '/visits',
    element: VisitsPage,
    permissions: ['visits.read'],
    nav: {
      labelKey: 'nav.visits',
      icon: {
        d: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z',
      },
      section: 'menu',
      mobilePrimary: true,
    },
  },
  { id: 'visit-detail', path: '/visits/:id', element: VisitDetailPage, permissions: ['visits.read'] },
  {
    id: 'pos-map',
    path: '/pos',
    element: PosDirectoryPage,
    permissions: ['pos.read'],
    nav: {
      labelKey: 'nav.posMap',
      icon: {
        d: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
      },
      section: 'menu',
      mobilePrimary: true,
    },
  },
  { id: 'pos-detail', path: '/pos/:id', element: StoreDetailPage, permissions: ['pos.read'] },
  {
    id: 'schedule',
    path: '/schedule',
    element: SchedulePage,
    permissions: ['schedules.read'],
    nav: {
      labelKey: 'nav.schedule',
      icon: {
        d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      },
      section: 'menu',
      mobilePrimary: true,
    },
  },
  {
    id: 'audit-items',
    path: '/audit-items',
    element: AuditItemsPage,
    permissions: ['audit_items.read'],
    nav: {
      labelKey: 'nav.auditItems',
      icon: { d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      section: 'menu',
      mobilePrimary: true,
    },
  },

  // ── Administration ───────────────────────────────────────────────────────
  {
    id: 'users',
    path: '/users',
    element: UsersPage,
    permissions: ['users.read'],
    nav: {
      labelKey: 'nav.users',
      icon: {
        d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
      },
      section: 'administration',
    },
  },
  {
    id: 'roles',
    path: '/roles',
    element: RolesPage,
    permissions: ['roles.read'],
    nav: {
      labelKey: 'nav.roles',
      icon: { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', d2: 'M9 12l2 2 4-4' },
      section: 'administration',
    },
  },
  {
    id: 'settings',
    path: '/settings',
    element: SettingsPage,
    // `settings.read`/`settings.update` are granted to no ROLE_PRESETS entry,
    // so only super_admin (which bypasses the permission table entirely) can
    // reach this page — matching the "super_admin only" requirement directly
    // through the existing RBAC system instead of a raw role check.
    permissions: ['settings.read'],
    nav: {
      labelKey: 'nav.settings',
      icon: {
        d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        d2: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      },
      section: 'administration',
    },
  },
  {
    id: 'hr',
    path: '/hr',
    element: HrPage,
    // `hr.read` is granted to no ROLE_PRESETS entry, so only super_admin
    // (which bypasses the permission table entirely) can reach this page —
    // same pattern as `settings` above.
    permissions: ['hr.read'],
    nav: {
      labelKey: 'nav.hr',
      icon: {
        d: 'M4 7h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z',
        d2: 'M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M2 13h20',
      },
      section: 'administration',
    },
  },

  // ── Management ───────────────────────────────────────────────────────────
  {
    id: 'regions',
    path: '/regions',
    element: RegionsPage,
    permissions: ['regions.read'],
    nav: {
      labelKey: 'nav.regions',
      icon: {
        d: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      },
      section: 'management',
    },
  },
  {
    id: 'stores-manage',
    path: '/stores',
    element: StoresPage,
    // Deliberately gated on write rights, not `pos.read`: the read-only
    // browsing experience already lives at `/pos` (POS Map). This page is
    // specifically the CRUD management view, so it only needs to appear for
    // whoever can actually create, edit, or delete a point of sale.
    permissions: ['pos.create', 'pos.update', 'pos.delete'],
    nav: {
      labelKey: 'nav.storesManage',
      icon: {
        d: 'M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9M12 3v6',
      },
      section: 'management',
    },
  },
  { id: 'stores-detail', path: '/stores/:id', element: StoreDetailPage, permissions: ['pos.read'] },
  {
    id: 'products',
    path: '/products',
    element: ProductsPage,
    permissions: ['products.read'],
    nav: {
      labelKey: 'nav.products',
      icon: {
        d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      },
      section: 'management',
    },
  },
  {
    id: 'stock',
    path: '/product-stores',
    element: ProductStoresPage,
    // Resource code is `inventory` (predates the "Stock" naming) — see the
    // comment on ProductStoreController.
    permissions: ['inventory.read'],
    nav: {
      labelKey: 'nav.stock',
      icon: {
        d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4',
      },
      section: 'management',
    },
  },

  // ── General ───────────────────────────────────────────────────────────────
  {
    id: 'reports',
    path: '/reports',
    element: ReportsPage,
    permissions: ['reports.read'],
    nav: {
      labelKey: 'nav.reports',
      icon: {
        d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
      section: 'general',
    },
  },
  {
    id: 'sell-out',
    path: '/sell-out',
    element: SellOutPage,
    permissions: ['sell_out.read'],
    nav: {
      labelKey: 'nav.sellOut',
      icon: {
        d: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
      },
      section: 'general',
    },
  },
  {
    id: 'training',
    path: '/training',
    element: TrainingPage,
    permissions: [],
    nav: {
      labelKey: 'nav.training',
      icon: {
        d: 'M12 14l9-5-9-5-9 5 9 5z',
        d2: 'M12 14l6.16-3.42A12.02 12.02 0 0121 12v5M12 14v7',
      },
      section: 'general',
    },
  },
  {
    id: 'marketing',
    path: '/marketing',
    element: MarketingPage,
    // Permission resource is `product_requests` (predates the "Marketing"
    // naming) — see the comment on this permission in auth/permissions.ts,
    // same reasoning as `inventory` staying `inventory` under the "Stock" label.
    permissions: ['product_requests.read'],
    nav: {
      labelKey: 'nav.marketing',
      icon: {
        d: 'M3 11l18-7-7 18-2-8-8-3z',
      },
      section: 'general',
    },
  },
  { id: 'marketing-detail', path: '/marketing/:id', element: MarketingDetailPage, permissions: ['product_requests.read'] },
  {
    id: 'promos',
    path: '/promos',
    element: PromosPage,
    permissions: ['promos.read'],
    nav: {
      labelKey: 'nav.promos',
      icon: {
        d: 'M20.59 13.41L11 3.83A2 2 0 009.59 3.24L4 3a1 1 0 00-1 1l.24 5.59a2 2 0 00.59 1.41l9.58 9.58a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.82z',
        d2: 'M7.5 7.5h.01',
      },
      section: 'general',
    },
  },
  {
    id: 'price-surveys',
    path: '/price-surveys',
    element: PriceSurveysPage,
    permissions: [],
    nav: {
      labelKey: 'nav.priceSurveys',
      icon: {
        d: 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2',
        d2: 'M8 2h8a1 1 0 011 1v2a1 1 0 01-1 1H8a1 1 0 01-1-1V3a1 1 0 011-1zM8 12h8M8 16h5',
      },
      section: 'general',
    },
  },
];

/**
 * The one function that decides page access, used identically by the route
 * guard and both nav components — so "can this user reach it" and "does this
 * user see it in the menu" are structurally the same question.
 */
export function hasPageAccess(granted: ReadonlySet<string>, permissions: string[]): boolean {
  return permissions.length === 0 || permissions.some((p) => granted.has(p));
}
