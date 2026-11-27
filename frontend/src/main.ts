import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const win = window as Window & { __bbgDeferredInstallPrompt?: Event | null };
window.addEventListener('beforeinstallprompt', (event: Event) => {
  event.preventDefault();
  win.__bbgDeferredInstallPrompt = event;
});

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const register = () => {
    void navigator.serviceWorker.register('/sw.js');
  };
  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

bootstrapApplication(App, appConfig)
  .then(() => registerServiceWorker())
  .catch((err) => console.error(err));
