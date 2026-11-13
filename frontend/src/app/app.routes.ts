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
  { path: '**', redirectTo: '' },
];
