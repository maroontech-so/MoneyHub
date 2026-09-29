import { getCurrentUser, logoutUser, getUserProfile } from './auth.js';

class NavigationManager {
  constructor() {
    this.render();
    this.bindEvents();
    this.loadUserProfile();
  }

  render() {
    const appShell = document.createElement('div');
    appShell.className = 'app-container';
    
    // Determine active page
    const currentPath = window.location.pathname;

    const navItems = [
      { section: 'MAIN', items: [
        { name: 'Dashboard', path: '/dashboard.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>' },
        { name: 'Transactions', path: '/transactions.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2.5"/><line x1="2" y1="10" x2="22" y2="10"/></svg>' }
      ]},
      { section: 'EARN', items: [
        { name: 'Microtasks', path: '/tasks.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
        { name: 'Surveys', path: '/surveys.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
        { name: 'Hotel Reviews', path: '/hotels.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>' },
        { name: 'AI Training', path: '/ai-training.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>' },
        { name: 'Write & Earn', path: '/write.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' },
        { name: 'Chat & Earn', path: '/chat.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' }
      ]},
      { section: 'STORE', items: [
        { name: 'Digital Products', path: '/store.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>' }
      ]},
      { section: 'MONEY', items: [
        { name: 'Wallet', path: '/wallet.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2.5"/><circle cx="17" cy="12" r="1.5"/></svg>' },
        { name: 'Withdraw', path: '/withdraw.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>' },
        { name: 'Payout History', path: '/payouts.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>' }
      ]},
      { section: 'COMMUNITY', items: [
        { name: 'Leaderboard', path: '/leaderboard.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M6 4h12v7a6 6 0 0 1-12 0V4z"/></svg>' },
        { name: 'Affiliate', path: '/affiliate.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>' }
      ]},
      { section: 'ACCOUNT', items: [
        { name: 'Profile', path: '/profile.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
        { name: 'Settings', path: '/settings.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
        { name: 'Help', path: '/help.html', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' }
      ]}
    ];

    let sidebarHtml = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header d-flex justify-content-between align-items-center">
          <div style="font-weight: 800; color: var(--accent-green); font-size: 1.25rem;">EARNWAVE</div>
          <button id="closeSidebar" class="btn btn-ghost d-md-none" style="padding: 0.25rem; display:inline-flex; align-items:center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        
        <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border);" class="d-flex align-items-center">
          <div class="avatar mr-3" id="navAvatar">U</div>
          <div style="margin-left: 1rem;">
            <div id="navUsername" style="font-weight: 600; font-size: 0.875rem;">Loading...</div>
            <div id="navBalance" class="text-secondary" style="font-size: 0.75rem;">KES 0.00</div>
          </div>
        </div>

        <nav class="nav-links">
    `;

    navItems.forEach(group => {
      sidebarHtml += `<div class="nav-section-title">${group.section}</div>`;
      group.items.forEach(item => {
        const isActive = currentPath.includes(item.path) ? 'active' : '';
        sidebarHtml += `
          <a href="${item.path}" class="nav-item ${isActive}">
            <span style="margin-right: 1rem;">${item.icon}</span>
            ${item.name}
          </a>
        `;
      });
    });

    sidebarHtml += `
          <div style="padding: 1rem 1.5rem;">
            <button id="logoutBtn" class="btn btn-danger" style="width: 100%; justify-content: flex-start; display:flex; align-items:center; gap:0.5rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </nav>
      </aside>
    `;

    // Bottom Nav for Mobile
    let bottomNavHtml = `<nav class="bottom-nav">`;
    const bottomItems = [
      { name: 'Home', path: '/dashboard.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>' },
      { name: 'Earn', path: '/tasks.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
      { name: 'Wallet', path: '/wallet.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2.5"/><circle cx="17" cy="12" r="1.5"/></svg>' },
      { name: 'Profile', path: '/profile.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }
    ];

    bottomItems.forEach(item => {
      const isActive = currentPath.includes(item.path) ? 'active' : '';
      bottomNavHtml += `
        <a href="${item.path}" class="bottom-nav-item ${isActive}">
          <span style="display:inline-flex; align-items:center; justify-content:center; margin-bottom: 0.25rem;">${item.icon}</span>
          ${item.name}
        </a>
      `;
    });
    bottomNavHtml += `</nav>`;

    // Wrap existing body content
    const mainContent = document.createElement('main');
    mainContent.className = 'main-content';
    
    // Header for mobile
    const mobileHeader = document.createElement('header');
    mobileHeader.innerHTML = `
      <div class="d-flex justify-content-between align-items-center d-md-none mb-4" style="padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
        <button id="openSidebar" class="btn btn-ghost" style="padding: 0.5rem; display:inline-flex; align-items:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div style="font-weight: 800; color: var(--accent-green); font-size: 1.25rem;">EARNWAVE</div>
        <div class="notification-bell" style="display:inline-flex; align-items:center; position:relative;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notification-badge">3</span>
        </div>
      </div>
    `;

    // Move existing body content into mainContent
    while (document.body.firstChild) {
      mainContent.appendChild(document.body.firstChild);
    }
    
    mainContent.insertBefore(mobileHeader, mainContent.firstChild);

    appShell.innerHTML = sidebarHtml;
    appShell.appendChild(mainContent);
    const bottomNavWrapper = document.createElement('div');
    bottomNavWrapper.innerHTML = bottomNavHtml;
    if (bottomNavWrapper.firstElementChild) {
      appShell.appendChild(bottomNavWrapper.firstElementChild);
    }

    document.body.appendChild(appShell);
  }

  bindEvents() {
    const sidebar = document.getElementById('sidebar');
    
    document.getElementById('openSidebar')?.addEventListener('click', () => {
      sidebar.classList.add('open');
    });

    document.getElementById('closeSidebar')?.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      logoutUser();
    });
  }

  async loadUserProfile() {
    const user = getCurrentUser();
    if (!user) return; // Auth listener will handle redirect

    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        const nameEl = document.getElementById('navUsername');
        if (nameEl) nameEl.textContent = profile.username;
        const avEl = document.getElementById('navAvatar');
        if (avEl) avEl.textContent = profile.username.charAt(0).toUpperCase();
        // Balance would be loaded from wallets collection in a real implementation
      }
    } catch (err) {
      console.error('Error loading nav profile', err);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only init if not on auth pages
  const path = window.location.pathname;
  if (!path.includes('login') && !path.includes('register') && path !== '/' && path !== '/index.html') {
    new NavigationManager();
  }
});
