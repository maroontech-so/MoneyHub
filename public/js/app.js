/**
 * EARNWAVE - Main Application Controller
 * High-performance, modular production controller.
 */
import { store } from './services/store.js';
import { CATALOG, TASK_CATEGORIES } from './data/tasks-catalog.js';
import { DIGITAL_PRODUCTS } from './data/products-catalog.js';
import { AI_CHARACTERS, AI_CHARACTER_CATEGORIES } from './data/characters-catalog.js';
import { ACHIEVEMENTS, INITIAL_LEADERBOARD, LEVELS } from './data/gamification-data.js';
import { KNOWLEDGE_BASE } from './data/knowledge-base.js';
import { TaskEngine } from './components/task-engine.js';
import { ICONS } from './utils/icons.js';

class EarnWaveApp {
  constructor() {
    this.currentView = 'dashboard';
    this.taskFilter = 'all';
    this.taskSearch = '';
    this.taskDifficulty = 'all';
    this.taskSort = 'recommended';
    this.currentPage = 1;
    this.pageSize = 15;
    
    // Active AI chat state (50+ characters)
    this.activeCharacter = AI_CHARACTERS[0];
    this.chatCategoryFilter = 'all';
    this.chatTurns = 0;
    this.chatMessages = [];

    this.init();
  }

  init() {
    this.initTaskRunner();
    this.bindNavigation();
    this.bindMarketplaceControls();
    this.bindWalletEvents();
    this.bindStoreEvents();
    this.bindChatEvents();
    this.bindSupportEvents();
    this.bindAdminEvents();
    this.bindProfileEvents();

    // Subscribe to state updates
    store.subscribe(() => {
      this.updateNavbarStats();
    });

    // Initial render
    this.updateNavbarStats();
    this.renderCurrentView();
  }

  // --- Global Toasts ---
  showToast(message, type = 'success') {
    const container = document.getElementById('globalToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `
      ${type === 'error' ? ICONS.alertCircle : ICONS.checkCircle}
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // --- Universal Task Experience Engine Init ---
  initTaskRunner() {
    const overlay = document.getElementById('taskRunnerModal');
    const content = document.getElementById('taskRunnerContent');
    if (overlay && content) {
      this.taskRunner = new TaskEngine(overlay, content, (completedTask) => {
        this.showToast(`Task Complete! +KES ${completedTask.reward.toFixed(2)} added to wallet.`, 'success');
        this.renderMarketplace();
        this.renderDashboard();
      });
    }
  }

  // --- Navigation & View Switching ---
  bindNavigation() {
    // Top logo click -> dashboard
    document.getElementById('brandLogoBtn')?.addEventListener('click', () => this.switchView('dashboard'));
    
    // Top wallet pill click -> wallet
    document.getElementById('navWalletPill')?.addEventListener('click', () => this.switchView('wallet'));

    // Sidebar buttons
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) this.switchView(view);
      });
    });

    // Mobile bottom nav buttons
    document.querySelectorAll('.bottom-nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) this.switchView(view);
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Toggle active classes on nav buttons
    document.querySelectorAll('.sidebar-nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === viewName);
    });
    document.querySelectorAll('.bottom-nav-link').forEach(b => {
      b.classList.toggle('active', b.dataset.view === viewName);
    });

    // Toggle sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-render specific view
    this.renderCurrentView();
  }

  renderCurrentView() {
    switch (this.currentView) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'tasks':
        this.renderMarketplace();
        break;
      case 'wallet':
        this.renderWallet();
        break;
      case 'store':
        this.renderStore();
        break;
      case 'chat':
        this.renderChat();
        break;
      case 'leaderboard':
        this.renderLeaderboard();
        break;
      case 'referrals':
        this.renderReferrals();
        break;
      case 'support':
        this.renderSupport();
        break;
      case 'admin':
        this.renderAdmin();
        break;
      case 'profile':
        this.renderProfile();
        break;
    }
  }

  updateNavbarStats() {
    const wallet = store.getWallet();
    const user = store.getUser();

    const navBal = document.getElementById('navBalanceAmount');
    if (navBal) navBal.textContent = `KES ${wallet.availableBalance.toFixed(2)}`;

    const avatar = document.getElementById('navUserAvatar');
    if (avatar && user.username) {
      avatar.textContent = user.username.charAt(0).toUpperCase();
    }
  }

  // ==========================================
  // VIEW 1: DASHBOARD
  // ==========================================
  renderDashboard() {
    const wallet = store.getWallet();
    const user = store.getUser();
    const txs = store.get('transactions') || [];
    const userTasks = store.get('user_tasks') || {};
    const completedCount = Object.keys(userTasks).length;

    // 1. Dashboard Metrics
    document.getElementById('dashAvailableBalance').textContent = `KES ${wallet.availableBalance.toFixed(2)}`;
    document.getElementById('dashPendingEarnings').textContent = `KES ${wallet.pendingBalance.toFixed(2)}`;
    document.getElementById('dashLifetimeEarned').textContent = `KES ${wallet.lifetimeEarned.toFixed(2)}`;
    document.getElementById('dashTasksCompleted').textContent = `${completedCount} Tasks`;

    // 2. Daily Goal & Streak
    document.getElementById('dashStreakDays').textContent = `${user.streakDays || 1} Days`;
    const streakProgress = Math.min(100, ((user.streakDays || 1) / 7) * 100);
    document.getElementById('dashStreakBar').style.width = `${streakProgress}%`;

    // 3. User Level Badge
    const levelObj = LEVELS.find(l => l.level === user.level) || LEVELS[0];
    document.getElementById('dashLevelName').textContent = `Level ${user.level}: ${levelObj.name}`;
    document.getElementById('dashUserXp').textContent = `${user.xp || 0} XP`;

    // 4. Featured High-Paying Opportunities (top 3)
    const available = CATALOG.filter(t => !userTasks[t.id]).sort((a, b) => b.reward - a.reward).slice(0, 3);
    const oppContainer = document.getElementById('dashFeaturedTasks');
    if (oppContainer) {
      oppContainer.innerHTML = available.map(t => `
        <div class="task-card">
          <div class="task-card-header">
            <span class="task-card-type">${t.category.toUpperCase()}</span>
            <span class="task-card-reward">+KES ${t.reward.toFixed(2)}</span>
          </div>
          <h4 class="task-card-title">${t.title}</h4>
          <p class="task-card-desc">${t.description}</p>
          <div class="task-card-meta">
            <span class="meta-item">${ICONS.clock} ${t.estimatedMinutes} min</span>
            <span class="meta-dot">·</span>
            <span class="meta-item">${ICONS.bolt} ${(t.difficulty || 'medium').toUpperCase()}</span>
          </div>
          <button class="btn-task-action" data-task-id="${t.id}">
            Start Task ${ICONS.arrowRight}
          </button>
        </div>
      `).join('');

      oppContainer.querySelectorAll('.btn-task-action').forEach(btn => {
        btn.addEventListener('click', () => {
          const task = CATALOG.find(x => x.id === btn.dataset.taskId);
          if (task && this.taskRunner) this.taskRunner.open(task);
        });
      });
    }

    // 5. Recent Activity Ledger
    const recentTxContainer = document.getElementById('dashRecentTransactions');
    if (recentTxContainer) {
      if (txs.length === 0) {
        recentTxContainer.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:1.5rem; color:var(--text-muted);">No activity records yet.</td></tr>';
      } else {
        recentTxContainer.innerHTML = txs.slice(0, 5).map(tx => `
          <tr>
            <td style="font-weight:600; color:#fff;">${tx.title}</td>
            <td><span class="status-pill status-${tx.status.toLowerCase()}">${tx.status}</span></td>
            <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
            <td class="${tx.direction === 'CREDIT' ? 'tx-credit' : 'tx-debit'}">
              ${tx.direction === 'CREDIT' ? '+' : '-'}KES ${tx.amount.toFixed(2)}
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // ==========================================
  // VIEW 2: TASK MARKETPLACE (300+ TASKS)
  // ==========================================
  bindMarketplaceControls() {
    // Category chips
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.taskFilter = btn.dataset.category || 'all';
        this.currentPage = 1;
        this.renderMarketplace();
      });
    });

    // Search bar
    const searchInput = document.getElementById('taskSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.taskSearch = e.target.value.toLowerCase().trim();
      this.currentPage = 1;
      this.renderMarketplace();
    });

    // Difficulty filter
    document.getElementById('taskDiffSelect')?.addEventListener('change', (e) => {
      this.taskDifficulty = e.target.value;
      this.currentPage = 1;
      this.renderMarketplace();
    });

    // Sorting
    document.getElementById('taskSortSelect')?.addEventListener('change', (e) => {
      this.taskSort = e.target.value;
      this.renderMarketplace();
    });

    // Pagination buttons
    document.getElementById('taskPrevPage')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderMarketplace();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    });

    document.getElementById('taskNextPage')?.addEventListener('click', () => {
      this.currentPage++;
      this.renderMarketplace();
      window.scrollTo({ top: 300, behavior: 'smooth' });
    });
  }

  renderMarketplace() {
    const userTasks = store.get('user_tasks') || {};

    // Filter pipeline
    let filtered = CATALOG.filter(t => {
      // 1. Category
      if (this.taskFilter !== 'all' && t.category !== this.taskFilter) return false;
      // 2. Search
      if (this.taskSearch && !t.title.toLowerCase().includes(this.taskSearch) && !t.description.toLowerCase().includes(this.taskSearch)) {
        return false;
      }
      // 3. Difficulty
      if (this.taskDifficulty !== 'all' && t.difficulty !== this.taskDifficulty) return false;
      return true;
    });

    // Sorting pipeline
    if (this.taskSort === 'highest_reward') {
      filtered.sort((a, b) => b.reward - a.reward);
    } else if (this.taskSort === 'fastest') {
      filtered.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    } else {
      // Recommended / Default
      filtered.sort((a, b) => (userTasks[a.id] ? 1 : 0) - (userTasks[b.id] ? 1 : 0));
    }

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const pageTasks = filtered.slice(startIdx, startIdx + this.pageSize);

    // Update count indicator
    const counterEl = document.getElementById('marketplaceCountLabel');
    if (counterEl) {
      counterEl.textContent = `Showing ${pageTasks.length} of ${totalCount} opportunities`;
    }

    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;

    if (pageTasks.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 4rem 1rem; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border);">
          <div style="margin-bottom:0.75rem; color:var(--text-muted);">${ICONS.search}</div>
          <h3 style="color:#fff; font-size:1.1rem; margin-bottom:0.25rem;">No matching tasks found</h3>
          <p style="font-size:0.85rem;">Try refining your search query or selecting another category.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = pageTasks.map(t => {
      const isCompleted = !!userTasks[t.id];
      const isLocked = t.unlockFee && t.unlockFee > 0 && !isCompleted;

      return `
        <div class="task-card">
          <div class="task-card-header">
            <span class="task-card-type">${t.category.toUpperCase()}</span>
            <span class="task-card-reward">+KES ${t.reward.toFixed(2)}</span>
          </div>
          <h3 class="task-card-title">${t.title}</h3>
          <p class="task-card-desc">${t.description}</p>
          <div class="task-card-meta">
            <span class="meta-item">${ICONS.clock} ${t.estimatedMinutes} min</span>
            <span class="meta-dot">·</span>
            <span class="meta-item">${ICONS.bolt} ${(t.difficulty || 'medium').toUpperCase()}</span>
            <span class="meta-dot">·</span>
            <span class="meta-item">${ICONS.users} ${t.slotsAvailable || 50} slots</span>
          </div>

          ${isCompleted ? `
            <button class="btn-task-action completed" disabled>
              ${ICONS.check} Completed & Verified
            </button>
          ` : `
            <button class="btn-task-action" data-task-id="${t.id}">
              ${isLocked ? `Unlock (Deposit KES ${t.unlockFee})` : 'Start Task'} ${ICONS.arrowRight}
            </button>
          `}
        </div>
      `;
    }).join('');

    // Bind Start Task buttons
    grid.querySelectorAll('.btn-task-action:not(.completed)').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.dataset.taskId;
        const task = CATALOG.find(t => t.id === taskId);
        if (task && this.taskRunner) {
          this.taskRunner.open(task);
        }
      });
    });

    // Update pagination controls
    const prevBtn = document.getElementById('taskPrevPage');
    const nextBtn = document.getElementById('taskNextPage');
    const pageNum = document.getElementById('taskPageIndicator');

    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    if (pageNum) pageNum.textContent = `Page ${this.currentPage} of ${totalPages}`;
  }

  // ==========================================
  // VIEW 3: WALLET & WITHDRAWALS
  // ==========================================
  bindWalletEvents() {
    // Open withdrawal modal button
    document.getElementById('openWithdrawModalBtn')?.addEventListener('click', () => {
      document.getElementById('withdrawModal')?.classList.add('active');
    });

    // Close withdrawal modal
    document.getElementById('closeWithdrawModalBtn')?.addEventListener('click', () => {
      document.getElementById('withdrawModal')?.classList.remove('active');
    });

    // Withdraw form submission
    document.getElementById('withdrawForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleWithdrawSubmit();
    });

    // Dynamic fee preview
    const amountInput = document.getElementById('withdrawAmountInput');
    amountInput?.addEventListener('input', () => {
      const amt = parseFloat(amountInput.value) || 0;
      const fee = 20.00;
      const net = Math.max(0, amt - fee);
      document.getElementById('withdrawFeePreview').textContent = `KES ${fee.toFixed(2)}`;
      document.getElementById('withdrawNetPreview').textContent = `KES ${net.toFixed(2)}`;
    });
  }

  handleWithdrawSubmit() {
    const wallet = store.getWallet();
    const user = store.getUser();
    const amountInput = document.getElementById('withdrawAmountInput');
    const phoneInput = document.getElementById('withdrawPhoneInput');
    const errorEl = document.getElementById('withdrawErrorMsg');

    errorEl.style.display = 'none';
    const amount = parseFloat(amountInput.value);
    const phone = phoneInput.value.trim();

    // 1. Validation
    if (isNaN(amount) || amount < 100) {
      errorEl.textContent = 'Minimum withdrawal amount is KES 100.00.';
      errorEl.style.display = 'block';
      return;
    }

    if (amount > wallet.availableBalance) {
      errorEl.textContent = `Insufficient balance. Available: KES ${wallet.availableBalance.toFixed(2)}`;
      errorEl.style.display = 'block';
      return;
    }

    // Phone format check (Kenya format)
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 9) {
      errorEl.textContent = 'Please enter a valid Safaricom M-Pesa phone number.';
      errorEl.style.display = 'block';
      return;
    }

    // 2. Execute authoritative ledger debit
    const success = store.adjustWallet(
      amount,
      'DEBIT',
      'WITHDRAWAL',
      `M-Pesa Payout to ${phone}`,
      `MPESA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    );

    if (success) {
      document.getElementById('withdrawModal')?.classList.remove('active');
      amountInput.value = '';
      this.showToast(`Payout Request Submitted! KES ${amount.toFixed(2)} dispatched to ${phone}`, 'success');
      this.renderWallet();
    } else {
      errorEl.textContent = 'Transaction failed. Please check your available funds.';
      errorEl.style.display = 'block';
    }
  }

  renderWallet() {
    const wallet = store.getWallet();
    const user = store.getUser();
    const txs = store.get('transactions') || [];

    document.getElementById('walletHeroBalance').textContent = `KES ${wallet.availableBalance.toFixed(2)}`;
    document.getElementById('walletHeroPending').textContent = `KES ${wallet.pendingBalance.toFixed(2)}`;
    document.getElementById('walletHeroLifetime').textContent = `KES ${wallet.lifetimeEarned.toFixed(2)}`;
    document.getElementById('walletHeroWithdrawn').textContent = `KES ${wallet.lifetimeWithdrawn.toFixed(2)}`;

    // Populate phone placeholder
    const phoneInput = document.getElementById('withdrawPhoneInput');
    if (phoneInput && !phoneInput.value) {
      phoneInput.value = user.phone || '254712345678';
    }

    // Full Transactions Table
    const tableBody = document.getElementById('walletTransactionsTable');
    if (tableBody) {
      if (txs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:2rem; color:var(--text-muted);">No recorded transactions.</td></tr>';
      } else {
        tableBody.innerHTML = txs.map(tx => `
          <tr>
            <td style="font-weight:700; color:#fff;">${tx.title}</td>
            <td style="font-family:monospace; font-size:0.8rem; color:var(--text-muted);">${tx.reference || '-'}</td>
            <td><span class="status-pill status-${tx.status.toLowerCase()}">${tx.status}</span></td>
            <td>${new Date(tx.timestamp).toLocaleString()}</td>
            <td class="${tx.direction === 'CREDIT' ? 'tx-credit' : 'tx-debit'}">
              ${tx.direction === 'CREDIT' ? '+' : '-'}KES ${tx.amount.toFixed(2)}
            </td>
          </tr>
        `).join('');
      }
    }
  }

  // ==========================================
  // VIEW 4: DIGITAL PRODUCTS STORE
  // ==========================================
  bindStoreEvents() {
    document.querySelectorAll('.store-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.store-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('storeBrowseSection').style.display = tab === 'browse' ? 'grid' : 'none';
        document.getElementById('storeLibrarySection').style.display = tab === 'library' ? 'grid' : 'none';
      });
    });
  }

  renderStore() {
    const purchases = store.get('purchases') || [];
    const browseGrid = document.getElementById('storeBrowseSection');
    const libraryGrid = document.getElementById('storeLibrarySection');

    if (browseGrid) {
      browseGrid.innerHTML = DIGITAL_PRODUCTS.map(p => {
        const isOwned = purchases.includes(p.id);
        return `
          <div class="task-card">
            <div class="task-card-header">
              <span class="task-card-type">${p.category}</span>
              <span class="task-card-reward" style="color:#fff;">KES ${p.price.toFixed(2)}</span>
            </div>
            <h3 class="task-card-title">${p.title}</h3>
            <p class="task-card-desc">${p.description}</p>
            <div class="task-card-meta">
              <span class="meta-item" style="color:var(--warning);">${ICONS.star} ${p.rating} (${p.reviewsCount})</span>
              <span class="meta-dot">·</span>
              <span class="meta-item">${ICONS.tag} ${p.badge}</span>
            </div>
            <ul style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem; padding-left:1.2rem; line-height:1.4;">
              ${p.features.map(f => `<li>${f}</li>`).join('')}
            </ul>

            ${isOwned ? `
              <button class="btn btn-outline" style="width:100%; border-color:var(--accent-green); color:var(--accent-green); display:flex; align-items:center; justify-content:center; gap:0.4rem;" onclick="app.downloadProduct('${p.id}')">
                ${ICONS.download} Download Asset
              </button>
            ` : `
              <button class="btn btn-primary" style="width:100%;" onclick="app.buyProduct('${p.id}', ${p.price})">
                Purchase with Wallet (KES ${p.price})
              </button>
            `}
          </div>
        `;
      }).join('');
    }

    if (libraryGrid) {
      const ownedProducts = DIGITAL_PRODUCTS.filter(p => purchases.includes(p.id));
      if (ownedProducts.length === 0) {
        libraryGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">You have not purchased any digital assets yet.</div>';
      } else {
        libraryGrid.innerHTML = ownedProducts.map(p => `
          <div class="task-card">
            <h3 class="task-card-title" style="color:var(--accent-green);">${p.title}</h3>
            <p class="task-card-desc">${p.description}</p>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Verified License • Unlimited Downloads</div>
            <button class="btn btn-primary" style="width:100%; display:flex; align-items:center; justify-content:center; gap:0.4rem;" onclick="app.downloadProduct('${p.id}')">
              ${ICONS.download} Download Files
            </button>
          </div>
        `).join('');
      }
    }
  }

  buyProduct(productId, price) {
    const wallet = store.getWallet();
    const product = DIGITAL_PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    if (wallet.availableBalance < price) {
      return this.showToast(`Insufficient balance. You need KES ${price.toFixed(2)}. Complete a few tasks first!`, 'error');
    }

    // Debit wallet & add to library
    const success = store.adjustWallet(
      price,
      'DEBIT',
      'PRODUCT_PURCHASE',
      `Acquired: ${product.title}`,
      `DL-${productId.toUpperCase()}`
    );

    if (success) {
      const purchases = store.get('purchases') || [];
      purchases.push(productId);
      store.set('purchases', purchases);
      this.showToast(`Success! ${product.title} has been added to your Library.`, 'success');
      this.renderStore();
    }
  }

  downloadProduct(productId) {
    const product = DIGITAL_PRODUCTS.find(p => p.id === productId);
    this.showToast(`Preparing download for ${product ? product.title : 'asset'}...`, 'success');
  }

  // ==========================================
  // VIEW 5: AI CHAT & EARN
  // ==========================================
  bindChatEvents() {
    document.getElementById('sendChatMessageBtn')?.addEventListener('click', () => {
      this.handleSendChatMessage();
    });

    document.getElementById('chatInputMessage')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendChatMessage();
      }
    });
  }

  selectCharacter(charId) {
    const char = AI_CHARACTERS.find(c => c.id === charId);
    if (char) {
      this.activeCharacter = char;
      this.chatTurns = 0;
      this.chatMessages = [
        { sender: 'ai', text: `Jambo! I am ${char.name}, your ${char.role}. How can I assist with your earning or skill goals today?` }
      ];
      this.renderChat();
    }
  }

  handleSendChatMessage() {
    const input = document.getElementById('chatInputMessage');
    const text = input?.value.trim();
    if (!text) return;

    input.value = '';
    this.chatMessages.push({ sender: 'user', text });
    this.chatTurns++;
    this.renderChatMessages();

    // Simulate AI response
    setTimeout(() => {
      let reply = `Great point! When dealing with ${this.activeCharacter.role.toLowerCase()}, consistency and calculated risks are key. Keep documenting your learnings.`;
      if (this.chatTurns === 1) {
        reply = `That is a common hurdle in Kenya. Let me break down the top three steps you can take starting this week with minimal capital.`;
      } else if (this.chatTurns >= this.activeCharacter.turnsRequired) {
        reply = `Excellent session! You have completed the required conversational turns. Your session reward of KES ${this.activeCharacter.rewardPerSession} has been credited to your wallet!`;
        store.adjustWallet(
          this.activeCharacter.rewardPerSession,
          'CREDIT',
          'AI_CHAT_REWARD',
          `AI Session Reward: ${this.activeCharacter.name}`,
          `CHAT-${this.activeCharacter.id}`
        );
        this.showToast(`Chat Reward Claimed: +KES ${this.activeCharacter.rewardPerSession}!`, 'success');
      }

      this.chatMessages.push({ sender: 'ai', text: reply });
      this.renderChatMessages();
    }, 800);
  }

  renderChat() {
    // Character category filter chips
    const catContainer = document.getElementById('chatCategoryChips');
    if (catContainer) {
      catContainer.innerHTML = AI_CHARACTER_CATEGORIES.map(cat => `
        <button class="chip-btn ${this.chatCategoryFilter === cat.id ? 'active' : ''}" data-chat-cat="${cat.id}">
          ${cat.name}
        </button>
      `).join('');

      catContainer.querySelectorAll('[data-chat-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.chatCategoryFilter = btn.dataset.chatCat;
          this.renderChat();
        });
      });
    }

    // Filter characters
    const filteredChars = AI_CHARACTERS.filter(c => 
      this.chatCategoryFilter === 'all' || c.category === this.chatCategoryFilter
    );

    // Character selection strip
    const charList = document.getElementById('chatCharactersList');
    if (charList) {
      charList.innerHTML = filteredChars.map(c => `
        <div class="task-card" style="cursor:pointer; border-color:${c.id === this.activeCharacter.id ? 'var(--accent-green)' : 'var(--border)'};" onclick="app.selectCharacter('${c.id}')">
          <div class="character-avatar-badge" style="background:${c.accentColor}18; color:${c.accentColor}; border:1px solid ${c.accentColor}35;">${c.initials}</div>
          <h4 style="color:#fff; font-size:1rem; margin-bottom:0.25rem;">${c.name}</h4>
          <div style="font-size:0.75rem; color:var(--accent-green); font-weight:600; margin-bottom:0.5rem;">${c.role}</div>
          <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">${c.tagline}</p>
          <div style="margin-top:0.75rem; font-size:0.75rem; color:var(--text-muted);">
            Session Reward: <strong style="color:#fff;">+KES ${c.rewardPerSession}</strong> · ${c.turnsRequired} turns
          </div>
        </div>
      `).join('');
    }

    // Active character header
    document.getElementById('activeCharName').innerHTML = `<span class="character-avatar-badge-sm" style="background:${this.activeCharacter.accentColor}25; color:${this.activeCharacter.accentColor}; border:1px solid ${this.activeCharacter.accentColor}50;">${this.activeCharacter.initials}</span> ${this.activeCharacter.name}`;
    document.getElementById('activeCharRole').textContent = this.activeCharacter.role;
    document.getElementById('activeCharDisclaimer').textContent = this.activeCharacter.disclaimer;
    document.getElementById('activeCharTurnsProgress').textContent = `Session Progress: ${this.chatTurns} / ${this.activeCharacter.turnsRequired} turns`;

    if (this.chatMessages.length === 0) {
      this.chatMessages = [
        { sender: 'ai', text: `Jambo! I am ${this.activeCharacter.name}, your ${this.activeCharacter.role}. How can I assist with your earning or skill goals today?` }
      ];
    }
    this.renderChatMessages();
  }

  renderChatMessages() {
    const box = document.getElementById('chatMessagesBox');
    if (!box) return;

    box.innerHTML = this.chatMessages.map(m => `
      <div style="display:flex; justify-content:${m.sender === 'user' ? 'flex-end' : 'flex-start'}; margin-bottom:0.75rem;">
        <div style="max-width:80%; padding:0.75rem 1rem; border-radius:var(--radius-sm); font-size:0.9rem; line-height:1.45; background:${m.sender === 'user' ? 'var(--accent-green)' : 'var(--bg-card)'}; color:${m.sender === 'user' ? '#000' : '#fff'}; border:1px solid ${m.sender === 'user' ? 'transparent' : 'var(--border)'};">
          ${m.text}
        </div>
      </div>
    `).join('');
    box.scrollTop = box.scrollHeight;
  }

  // ==========================================
  // VIEW 6: LEADERBOARD & ACHIEVEMENTS
  // ==========================================
  renderLeaderboard() {
    const user = store.getUser();
    const achievementsContainer = document.getElementById('leaderboardAchievementsList');
    const boardContainer = document.getElementById('leaderboardTableBody');

    // Render Achievements
    if (achievementsContainer) {
      achievementsContainer.innerHTML = ACHIEVEMENTS.map(ach => `
        <div class="metric-card" style="display:flex; align-items:center; gap:1rem;">
          <div class="achievement-icon-wrapper">
            ${ICONS[ach.iconKey] || ICONS.bolt}
          </div>
          <div style="flex:1;">
            <div style="font-weight:600; color:#fff; font-size:0.95rem;">${ach.name}</div>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.25rem;">${ach.desc}</div>
            <div style="font-size:0.75rem; color:var(--accent-green); font-weight:600;">+${ach.xp} XP · +KES ${ach.rewardKes}</div>
          </div>
        </div>
      `).join('');
    }

    // Render Rankings
    if (boardContainer) {
      boardContainer.innerHTML = INITIAL_LEADERBOARD.map(row => `
        <tr style="${row.username === user.username ? 'background:rgba(255,255,255,0.04); font-weight:600;' : ''}">
          <td style="font-size:0.95rem; font-weight:700; color:${row.rank <= 3 ? 'var(--accent-green)' : 'var(--text-muted)'};">
            #${row.rank}
          </td>
          <td style="display:flex; align-items:center; gap:0.65rem; color:#fff;">
            <span class="user-initials-avatar">${row.initials}</span>
            <span>${row.username}</span>
          </td>
          <td style="color:var(--text-secondary);">Level ${row.level}</td>
          <td>${row.tasksCompleted}</td>
          <td style="font-weight:700; color:var(--accent-green);">KES ${row.earnings.toLocaleString()}</td>
        </tr>
      `).join('');
    }
  }

  // ==========================================
  // VIEW 7: REFERRALS
  // ==========================================
  renderReferrals() {
    const user = store.getUser();
    const code = user.referralCode || 'WAVE1000';
    const link = `https://moneywave.app/?ref=${code}`;

    document.getElementById('referralCodeDisplay').textContent = code;
    document.getElementById('referralLinkInput').value = link;

    const copyBtn = document.getElementById('copyReferralBtn');
    if (copyBtn) {
      copyBtn.innerHTML = `${ICONS.copy} Copy Link`;
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(link).then(() => {
          this.showToast('Referral link copied to clipboard!', 'success');
        });
      };
    }
  }

  // ==========================================
  // VIEW 8: SUPPORT & KNOWLEDGE BASE
  // ==========================================
  bindSupportEvents() {
    document.getElementById('supportSearchInput')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      this.renderSupportArticles(q);
    });

    document.getElementById('newTicketForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const subject = document.getElementById('ticketSubjectInput')?.value.trim();
      const category = document.getElementById('ticketCategorySelect')?.value;
      const message = document.getElementById('ticketMessageInput')?.value.trim();

      if (!subject || !message) return;

      const tickets = store.get('support_tickets') || [];
      tickets.unshift({
        id: 'tkt_' + Math.floor(100 + Math.random() * 900),
        subject,
        category,
        priority: 'NORMAL',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        messages: [{ sender: 'user', text: message, time: 'Just now' }]
      });
      store.set('support_tickets', tickets);

      document.getElementById('ticketSubjectInput').value = '';
      document.getElementById('ticketMessageInput').value = '';
      this.showToast('Support ticket opened! Our moderation desk will respond shortly.', 'success');
      this.renderSupport();
    });
  }

  renderSupport() {
    this.renderSupportArticles('');
    
    // Render My Tickets
    const tickets = store.get('support_tickets') || [];
    const container = document.getElementById('supportTicketsContainer');
    if (container) {
      if (tickets.length === 0) {
        container.innerHTML = '<div class="text-center text-muted" style="padding:1.5rem;">No active support tickets.</div>';
      } else {
        container.innerHTML = tickets.map(t => `
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:1rem; margin-bottom:0.75rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
              <strong style="color:#fff;">#${t.id}: ${t.subject}</strong>
              <span class="status-pill status-${t.status === 'RESOLVED' ? 'completed' : 'pending'}">${t.status}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">Category: ${t.category} • Created ${new Date(t.createdAt).toLocaleDateString()}</div>
            <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">${t.messages[0]?.text || ''}</p>
          </div>
        `).join('');
      }
    }
  }

  renderSupportArticles(query = '') {
    const container = document.getElementById('supportFaqContainer');
    if (!container) return;

    let html = '';
    KNOWLEDGE_BASE.forEach(cat => {
      const filteredArticles = cat.articles.filter(a => 
        !query || a.title.toLowerCase().includes(query) || a.content.toLowerCase().includes(query)
      );

      if (filteredArticles.length > 0) {
        html += `<h4 style="color:var(--accent-green); margin:1.25rem 0 0.5rem 0; font-size:0.95rem;">${cat.category}</h4>`;
        html += filteredArticles.map(a => `
          <details style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.85rem; margin-bottom:0.5rem; cursor:pointer;">
            <summary style="font-weight:600; color:#fff; font-size:0.9rem; outline:none;">${a.title}</summary>
            <p style="margin-top:0.6rem; font-size:0.85rem; color:var(--text-secondary); line-height:1.5;">${a.content}</p>
          </details>
        `).join('');
      }
    });

    container.innerHTML = html || '<div class="text-muted text-center" style="padding:2rem;">No matching help articles found.</div>';
  }

  // ==========================================
  // VIEW 9: ADMIN PORTAL
  // ==========================================
  bindAdminEvents() {
    // Tab switching in admin
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('adminOverviewTab').style.display = tab === 'overview' ? 'block' : 'none';
        document.getElementById('adminQueueTab').style.display = tab === 'queue' ? 'block' : 'none';
        document.getElementById('adminSettingsTab').style.display = tab === 'settings' ? 'block' : 'none';
      });
    });
  }

  renderAdmin() {
    const queue = store.get('admin_submissions') || [];
    const queueBody = document.getElementById('adminSubmissionsQueue');

    // Admin metrics
    document.getElementById('adminMetricUsers').textContent = '1,420';
    document.getElementById('adminMetricActiveTasks').textContent = `${CATALOG.length}`;
    document.getElementById('adminMetricPendingReviews').textContent = `${queue.length}`;
    document.getElementById('adminMetricDisbursed').textContent = 'KES 285,400';

    if (queueBody) {
      if (queue.length === 0) {
        queueBody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:2rem; color:var(--text-muted);">Queue empty. All user task submissions have been audited.</td></tr>';
      } else {
        queueBody.innerHTML = queue.map(item => `
          <tr>
            <td style="font-weight:700; color:#fff;">${item.taskTitle}</td>
            <td>${item.username}</td>
            <td style="max-width:240px; font-size:0.8rem; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${item.submissionData}
            </td>
            <td style="color:var(--accent-green); font-weight:700;">+KES ${item.reward}</td>
            <td>
              <div style="display:flex; gap:0.4rem;">
                <button class="btn btn-sm btn-primary" onclick="app.adminApproveTask('${item.id}', ${item.reward}, '${item.userId}')">
                  Approve
                </button>
                <button class="btn btn-sm btn-outline" style="border-color:var(--danger); color:var(--danger);" onclick="app.adminRejectTask('${item.id}')">
                  Reject
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    }
  }

  adminApproveTask(submissionId, reward, userId) {
    let queue = store.get('admin_submissions') || [];
    queue = queue.filter(q => q.id !== submissionId);
    store.set('admin_submissions', queue);

    this.showToast(`Submission #${submissionId} Approved. KES ${reward} validated.`, 'success');
    this.renderAdmin();
  }

  adminRejectTask(submissionId) {
    let queue = store.get('admin_submissions') || [];
    queue = queue.filter(q => q.id !== submissionId);
    store.set('admin_submissions', queue);

    this.showToast(`Submission #${submissionId} Rejected for quality violation.`, 'error');
    this.renderAdmin();
  }

  // ==========================================
  // VIEW 10: PROFILE & SETTINGS
  // ==========================================
  bindProfileEvents() {
    document.getElementById('profileForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const displayName = document.getElementById('profDisplayName').value.trim();
      const phone = document.getElementById('profPhone').value.trim();
      const county = document.getElementById('profCounty').value.trim();
      const bio = document.getElementById('profBio').value.trim();

      store.updateUser({ displayName, phone, county, bio });
      this.showToast('Profile information updated successfully!', 'success');
      this.renderProfile();
    });
  }

  renderProfile() {
    const user = store.getUser();
    document.getElementById('profUsername').textContent = user.username;
    document.getElementById('profEmail').textContent = user.email;
    document.getElementById('profDisplayName').value = user.displayName || '';
    document.getElementById('profPhone').value = user.phone || '';
    document.getElementById('profCounty').value = user.county || 'Nairobi';
    document.getElementById('profBio').value = user.bio || '';
    document.getElementById('profRoleBadge').textContent = user.role;
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new EarnWaveApp();
});
