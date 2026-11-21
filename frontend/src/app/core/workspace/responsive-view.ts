import { DestroyRef, inject, signal, WritableSignal } from '@angular/core';

export type DashboardViewMode = 'table' | 'grid';

/**
 * Returns the default view mode based on the current viewport width:
 * - Mobile (< 768px) -> 'grid'
 * - Tablet (768px - 1024px) -> 'grid'
 * - Desktop (> 1024px) -> 'table'
 */
export function getResponsiveDefaultViewMode(): DashboardViewMode {
  if (typeof window === 'undefined') {
    return 'table';
  }
  return window.innerWidth <= 1024 ? 'grid' : 'table';
}

/**
 * Creates a responsive viewMode signal that:
 * 1. Automatically selects the responsive default on page load (grid on mobile/tablet, table on desktop).
 * 2. Allows users to manually toggle between Table and Grid views.
 * 3. Dynamically adapts when resizing or changing orientation if the user hasn't explicitly overridden the view.
 * 4. Ensures desktop tables are never forced on mobile as default.
 */
export function createResponsiveViewMode(
  destroyRef: DestroyRef = inject(DestroyRef),
  storageKey?: string,
): {
  viewMode: WritableSignal<DashboardViewMode>;
  setViewMode: (mode: DashboardViewMode) => void;
} {
  const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth <= 1024;
  let userOverrode = false;

  let initialMode: DashboardViewMode = getResponsiveDefaultViewMode();

  if (storageKey && typeof sessionStorage !== 'undefined') {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved === 'table' || saved === 'grid') {
        // Prevent forcing a saved desktop table onto mobile/tablet
        if (!(isSmallScreen() && saved === 'table')) {
          initialMode = saved;
          userOverrode = true;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  const viewMode = signal<DashboardViewMode>(initialMode);

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mql = window.matchMedia('(max-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (!userOverrode) {
        viewMode.set(e.matches ? 'grid' : 'table');
      }
    };
    mql.addEventListener('change', onChange);
    destroyRef.onDestroy(() => {
      mql.removeEventListener('change', onChange);
    });
  }

  const setViewMode = (mode: DashboardViewMode) => {
    userOverrode = true;
    viewMode.set(mode);
    if (storageKey && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(storageKey, mode);
      } catch {
        // Ignore storage errors
      }
    }
  };

  return { viewMode, setViewMode };
}
