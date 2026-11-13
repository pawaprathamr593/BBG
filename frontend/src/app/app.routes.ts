import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/marketplace/home/marketplace-home').then((m) => m.MarketplaceHome),
    title: 'BBG | Discover Businesses & Products',
  },
  {
    path: 'businesses',
    loadComponent: () => import('./features/marketplace/businesses/business-directory').then((m) => m.BusinessDirectory),
    title: 'Discover Businesses | BBG',
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
    data: { itemType: 'Product', directoryLink: '/' },
    title: 'Product Details | BBG',
  },
  {
    path: 'categories',
    loadComponent: () => import('./features/marketplace/categories/category-directory').then((m) => m.CategoryDirectory),
    title: 'Marketplace Categories | BBG',
  },
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
