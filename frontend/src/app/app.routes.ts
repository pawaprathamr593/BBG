import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard), title: 'BBG | Overview' },
  { path: 'login', loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login), title: 'Sign in | BBG' },
  { path: 'register', loadComponent: () => import('./features/auth/pages/register/register').then((m) => m.Register), title: 'Create account | BBG' },
  { path: '**', redirectTo: '' },
];
