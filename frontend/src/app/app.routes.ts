import { Routes } from '@angular/router';
import { WorkspaceLayout } from './features/workspace/workspace-layout';
import { authenticatedWorkspaceGuard } from './core/auth/authenticated-workspace.guard';
import { workspacePermissionGuard } from './core/workspace/workspace-permission.guard';

export const routes: Routes = [
  { path: 'business/register', loadComponent: () => import('./features/business-registration/business-registration').then((m) => m.BusinessRegistration), title: 'Register your business | BBG' },
  { path: 'invite/accept', loadComponent: () => import('./features/team-invitation/team-invitation-acceptance').then((m) => m.TeamInvitationAcceptance), title: 'Accept team invitation | BBG' },
  { path: 'workspace', loadComponent: () => import('./features/business-workspace/business-workspace').then((m) => m.BusinessWorkspace), title: 'Business registration status | BBG' },
  { path: 'dashboard', component: WorkspaceLayout, canActivate: [authenticatedWorkspaceGuard], canActivateChild: [workspacePermissionGuard], children: [
    { path: '', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard), title: 'BBG Dashboard | BBG' },
    { path: 'catalogue', loadComponent: () => import('./features/catalogue/catalogue').then((m) => m.Catalogue), title: 'Product Catalogue | BBG' },
    { path: ':section', loadComponent: () => import('./features/dashboard/dashboard-module').then((m) => m.DashboardModule), title: 'BBG Account & Business Module | BBG' },
  ] },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/marketplace/home/marketplace-home').then((m) => m.MarketplaceHome),
    title: 'BBG | Discover Businesses & Products',
  },
  {
    path: 'businesses',
    pathMatch: 'full',
    loadComponent: () => import('./features/marketplace/businesses/business-directory').then((m) => m.BusinessDirectory),
    title: 'Discover Businesses | BBG',
  },
  {
    path: 'store/:businessSlug',
    loadComponent: () => import('./features/storefront/storefront-layout').then((m) => m.StorefrontLayout),
    children: [
      { path: '', loadComponent: () => import('./features/storefront/storefront-home').then((m) => m.StorefrontHome), title: 'Business storefront | BBG' },
      { path: 'products', loadComponent: () => import('./features/storefront/storefront-section').then((m) => m.StorefrontSection), data: { section: 'products' }, title: 'Products | BBG' },
      { path: 'products/:productSlug', loadComponent: () => import('./features/storefront/storefront-product-detail').then((m) => m.StorefrontProductDetail), title: 'Product details | BBG' },
      { path: 'about', loadComponent: () => import('./features/storefront/storefront-section').then((m) => m.StorefrontSection), data: { section: 'about' }, title: 'About the business | BBG' },
      { path: 'contact', loadComponent: () => import('./features/storefront/storefront-section').then((m) => m.StorefrontSection), data: { section: 'contact' }, title: 'Contact the business | BBG' },
      { path: 'login', loadComponent: () => import('./features/storefront/storefront-login').then((m) => m.StorefrontLogin), title: 'Sign in | Storefront' },
    ],
  },
  {
    path: 'businesses/:identifier',
    loadComponent: () => import('./features/marketplace/details/marketplace-item-placeholder').then((m) => m.MarketplaceItemPlaceholder),
    data: { itemType: 'Business', directoryLink: '/businesses' },
    title: 'Business Details | BBG',
  },
  {
    path: 'products/:identifier',
    loadComponent: () => import('./features/marketplace/details/marketplace-item-placeholder').then((m) => m.MarketplaceItemPlaceholder),
    data: { itemType: 'Product', directoryLink: '/products' },
    title: 'Product Details | BBG',
  },
  {
    path: 'products',
    pathMatch: 'full',
    loadComponent: () => import('./features/marketplace/products/product-directory').then((m) => m.ProductDirectory),
    title: 'Explore Products | BBG',
  },
  { path: 'categories', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'promotions',
    loadComponent: () => import('./features/marketplace/promotions/promotion-feed').then((m) => m.PromotionFeed),
    title: 'Business Promotions | BBG',
  },
  {
    path: 'about',
    loadComponent: () => import('./features/marketplace/about/marketplace-about').then((m) => m.MarketplaceAbout),
    title: 'About BBG',
  },
  { path: 'login', loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login), title: 'Sign in | BBG' },
  { path: 'register', loadComponent: () => import('./features/auth/pages/register/register').then((m) => m.Register), title: 'Create account | BBG' },
  { path: 'auth/social/callback', loadComponent: () => import('./features/auth/pages/social-callback/social-callback').then((m) => m.SocialAuthCallback), title: 'Complete sign-in | BBG' },
  { path: '**', redirectTo: '' },
];
