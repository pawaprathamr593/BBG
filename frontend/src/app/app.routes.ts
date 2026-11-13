import { Routes } from '@angular/router';
import { authenticatedGuard, guestGuard } from './core/auth/auth.guards';
import { AuthLayout } from './core/layouts/auth-layout/auth-layout';
import { PublicLayout } from './core/layouts/public-layout/public-layout';
import { StorefrontLayout } from './core/layouts/storefront-layout/storefront-layout';
import { permissionScopeGuard } from './core/permissions/permission.guard';
import { adminWorkspace, consumerWorkspace, entrepreneurWorkspace } from './features/workspaces/workspace.config';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/marketplace/pages/home/home').then((m) => m.Home),
        title: 'Discover local businesses, products and services | BBG',
        data: { description: 'Explore local businesses, discover products and services, and connect directly with business owners on BBG.' },
      },
      {
        path: 'businesses',
        loadComponent: () => import('./features/marketplace/pages/business-directory/business-directory').then((m) => m.BusinessDirectory),
        title: 'Explore businesses near you | BBG',
        data: { description: 'Search the BBG business directory by name, category and location to discover published local businesses.' },
      },
      {
        path: 'promotions/:promotionId',
        loadComponent: () => import('./features/marketplace/pages/promotion-detail/promotion-detail').then((m) => m.PromotionDetail),
        title: 'Business promotion | BBG',
      },
      {
        path: 'promotions',
        loadComponent: () => import('./features/marketplace/pages/promotions/promotions').then((m) => m.Promotions),
        title: 'Latest business promotions | BBG',
        data: { description: 'Explore current promotions and updates published by businesses in the BBG marketplace.' },
      },
    ],
  },
  {
    path: 'businesses/:businessSlug',
    component: StorefrontLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/marketplace/pages/business-storefront/business-storefront').then((m) => m.BusinessStorefront),
        title: 'Business storefront | BBG',
      },
      {
        path: 'cart',
        canActivate: [authenticatedGuard],
        loadComponent: () => import('./features/marketplace/pages/storefront-cart/storefront-cart').then((m) => m.StorefrontCart),
        title: 'Your cart | BBG',
      },
      {
        path: 'about',
        loadComponent: () => import('./features/marketplace/pages/storefront-section/storefront-section').then((m) => m.StorefrontSection),
        data: { storefrontSection: 'about' },
        title: 'About this business | BBG',
      },
      {
        path: 'products',
        loadComponent: () => import('./features/marketplace/pages/storefront-section/storefront-section').then((m) => m.StorefrontSection),
        data: { storefrontSection: 'products' },
        title: 'Products | BBG',
      },
      {
        path: 'promotions/:promotionId',
        loadComponent: () => import('./features/marketplace/pages/promotion-detail/promotion-detail').then((m) => m.PromotionDetail),
        title: 'Business promotion | BBG',
      },
      {
        path: 'promotions',
        loadComponent: () => import('./features/marketplace/pages/storefront-section/storefront-section').then((m) => m.StorefrontSection),
        data: { storefrontSection: 'promotions' },
        title: 'Offers and promotions | BBG',
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/marketplace/pages/storefront-section/storefront-section').then((m) => m.StorefrontSection),
        data: { storefrontSection: 'contact' },
        title: 'Contact this business | BBG',
      },
      {
        path: 'products/:productId',
        loadComponent: () => import('./features/marketplace/pages/product-detail/product-detail').then((m) => m.ProductDetail),
        title: 'Product details | BBG',
      },
    ],
  },
  {
    path: '',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
        title: 'Sign in | BBG',
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/pages/register/register').then((m) => m.Register),
        title: 'Create account | BBG',
      },
    ],
  },
  {
    path: 'consumer',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./features/workspaces/workspace').then((m) => m.Workspace),
    data: { workspace: consumerWorkspace },
    title: 'Consumer workspace | BBG',
  },
  {
    path: 'entrepreneur',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./features/workspaces/workspace').then((m) => m.Workspace),
    data: { workspace: entrepreneurWorkspace },
    title: 'Business workspace | BBG',
  },
  {
    path: 'admin',
    canActivate: [authenticatedGuard, permissionScopeGuard],
    loadComponent: () => import('./features/workspaces/workspace').then((m) => m.Workspace),
    data: { workspace: adminWorkspace, requiredScope: 'PLATFORM' },
    title: 'Platform administration | BBG',
  },
  {
    path: 'access-denied',
    loadComponent: () => import('./features/marketplace/pages/info-page/info-page').then((m) => m.InfoPage),
    data: {
      title: 'Access is not available',
      message: 'This area requires an approved permission. Your access has not been assumed from your account or URL.',
      actionLabel: 'Return to marketplace',
      actionPath: '/',
    },
    title: 'Access denied | BBG',
  },
  {
    path: '**',
    loadComponent: () => import('./features/marketplace/pages/info-page/info-page').then((m) => m.InfoPage),
    data: {
      title: 'We can’t find that page',
      message: 'The page may have moved, or the address may be incorrect.',
      actionLabel: 'Back to home',
      actionPath: '/',
    },
    title: 'Page not found | BBG',
  },
];
