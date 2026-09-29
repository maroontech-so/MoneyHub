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
        { name: 'Dashboard', path: '/dashboard.html', icon: '📊' },
        { name: 'Transactions', path: '/transactions.html', icon: '💳' }
      ]},
      { section: 'EARN', items: [
        { name: 'Microtasks', path: '/tasks.html', icon: '📋' },
        { name: 'Surveys', path: '/surveys.html', icon: '📝' },
        { name: 'Hotel Reviews', path: '/hotels.html', icon: '🏨' },
        { name: 'AI Training', path: '/ai-training.html', icon: '🤖' },
        { name: 'Write & Earn', path: '/write.html', icon: '✍️' },
        { name: 'Chat & Earn', path: '/chat.html', icon: '💬' }
      ]},
      { section: 'STORE', items: [
        { name: 'Digital Products', path: '/store.html', icon: '🛍️' }
      ]},
      { section: 'MONEY', items: [
        { name: 'Wallet', path: '/wallet.html', icon: '💰' },
        { name: 'Withdraw', path: '/withdraw.html', icon: '🏧' },
        { name: 'Payout History', path: '/payouts.html', icon: '📜' }
      ]},
      { section: 'COMMUNITY', items: [
        { name: 'Leaderboard', path: '/leaderboard.html', icon: '🏆' },
        { name: 'Affiliate', path: '/affiliate.html', icon: '🤝' }
      ]},
      { section: 'ACCOUNT', items: [
        { name: 'Profile', path: '/profile.html', icon: '👤' },
        { name: 'Settings', path: '/settings.html', icon: '⚙️' },
        { name: 'Help', path: '/help.html', icon: '❓' }
      ]}
    ];

    let sidebarHtml = `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header d-flex justify-content-between align-items-center">
          <div style="font-weight: 800; color: var(--accent-green); font-size: 1.25rem;">EARNWAVE</div>
          <button id="closeSidebar" class="btn btn-ghost d-md-none" style="padding: 0.25rem;">✕</button>
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
            <button id="logoutBtn" class="btn btn-danger" style="width: 100%; justify-content: flex-start;">
              <span style="margin-right: 1rem;">🚪</span> Logout
            </button>
          </div>
        </nav>
      </aside>
    `;

    // Bottom Nav for Mobile
    let bottomNavHtml = `<nav class="bottom-nav">`;
    const bottomItems = [
      { name: 'Home', path: '/dashboard.html', icon: '📊' },
      { name: 'Earn', path: '/tasks.html', icon: '💰' },
      { name: 'Wallet', path: '/wallet.html', icon: '💳' },
      { name: 'Profile', path: '/profile.html', icon: '👤' }
    ];

    bottomItems.forEach(item => {
      const isActive = currentPath.includes(item.path) ? 'active' : '';
      bottomNavHtml += `
        <a href="${item.path}" class="bottom-nav-item ${isActive}">
          <span style="font-size: 1.25rem; margin-bottom: 0.25rem;">${item.icon}</span>
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
        <button id="openSidebar" class="btn btn-ghost" style="padding: 0.5rem; font-size: 1.25rem;">☰</button>
        <div style="font-weight: 800; color: var(--accent-green); font-size: 1.25rem;">EARNWAVE</div>
        <div class="notification-bell">
          🔔 <span class="notification-badge">3</span>
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
    appShell.innerHTML += bottomNavHtml;

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
        document.getElementById('navUsername').textContent = profile.username;
        document.getElementById('navAvatar').textContent = profile.username.charAt(0).toUpperCase();
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
