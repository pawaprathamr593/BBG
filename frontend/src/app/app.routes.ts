import { Routes } from '@angular/router';
import { authenticatedGuard, guestGuard } from './core/auth/auth.guards';
import { AuthLayout } from './core/layouts/auth-layout/auth-layout';
import { PublicLayout } from './core/layouts/public-layout/public-layout';
import { adminWorkspace, consumerWorkspace, entrepreneurWorkspace } from './features/workspaces/workspace.config';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/marketplace/pages/home/home').then((m) => m.Home),
        title: 'BBG | Discover businesses',
      },
      {
        path: 'businesses',
        loadComponent: () => import('./features/marketplace/pages/business-directory/business-directory').then((m) => m.BusinessDirectory),
        title: 'Explore businesses | BBG',
      },
      {
        path: 'businesses/:businessSlug/products/:productId',
        loadComponent: () => import('./features/marketplace/pages/product-detail/product-detail').then((m) => m.ProductDetail),
        title: 'Product details | BBG',
      },
      {
        path: 'businesses/:businessSlug',
        loadComponent: () => import('./features/marketplace/pages/business-storefront/business-storefront').then((m) => m.BusinessStorefront),
        title: 'Business storefront | BBG',
      },
      {
        path: 'promotions/:promotionId',
        loadComponent: () => import('./features/marketplace/pages/promotion-detail/promotion-detail').then((m) => m.PromotionDetail),
        title: 'Promotion details | BBG',
      },
      {
        path: 'promotions',
        loadComponent: () => import('./features/marketplace/pages/promotions/promotions').then((m) => m.Promotions),
        title: 'Promotions | BBG',
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
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./features/workspaces/workspace').then((m) => m.Workspace),
    data: { workspace: adminWorkspace },
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
