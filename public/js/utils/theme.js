/**
 * EARNWAVE - Theme Manager
 * Supports Light, Dark, and System preference with persistence and zero flash of unstyled content.
 */

const THEME_KEY = 'earnwave_theme';

export class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || 'dark';
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.handleSystemChange = this.handleSystemChange.bind(this);
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.mediaQuery.addEventListener('change', this.handleSystemChange);
    this.updateUI();
  }

  getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  setStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // ignore storage errors
    }
  }

  getEffectiveTheme(theme = this.currentTheme) {
    if (theme === 'system') {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return theme;
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    this.setStoredTheme(theme);

    const effective = this.getEffectiveTheme(theme);
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', effective);
    if (effective === 'light') {
      root.classList.add('light-theme');
      body?.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      body?.classList.remove('light-theme');
    }

    // Set meta theme-color for mobile browser frames
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', effective === 'light' ? '#f5f5f7' : '#000000');

    this.updateUI();

    window.dispatchEvent(new CustomEvent('earnwave:themechange', {
      detail: { theme, effective }
    }));
  }

  toggleTheme() {
    const effective = this.getEffectiveTheme();
    const next = effective === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    return next;
  }

  setTheme(theme) {
    if (['dark', 'light', 'system'].includes(theme)) {
      this.applyTheme(theme);
    }
  }

  handleSystemChange() {
    if (this.currentTheme === 'system') {
      this.applyTheme('system');
    }
  }

  updateUI() {
    const effective = this.getEffectiveTheme();

    // 1. Update topbar quick toggle icon & title
    const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
    toggleBtns.forEach(btn => {
      btn.setAttribute('aria-label', `Switch to ${effective === 'dark' ? 'light' : 'dark'} theme`);
      btn.setAttribute('title', `Switch to ${effective === 'dark' ? 'light' : 'dark'} theme`);

      const sunIcon = btn.querySelector('.theme-icon-sun');
      const moonIcon = btn.querySelector('.theme-icon-moon');
      if (sunIcon && moonIcon) {
        if (effective === 'dark') {
          sunIcon.style.display = 'block';
          moonIcon.style.display = 'none';
        } else {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'block';
        }
      }
    });

    // 2. Update settings selector buttons if present in Profile & Settings view
    const themeOptionBtns = document.querySelectorAll('.theme-choice-btn');
    themeOptionBtns.forEach(btn => {
      const mode = btn.dataset.themeMode;
      const isActive = mode === this.currentTheme;
      btn.classList.toggle('active', isActive);
      const indicator = btn.querySelector('.theme-choice-indicator');
      if (indicator) {
        indicator.textContent = isActive ? 'Active' : '';
      }
    });
  }
}

export const themeManager = new ThemeManager();
