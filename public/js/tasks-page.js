import { loadTasks } from './tasks.js';

let currentFilter = 'all';
let currentDiff = 'all';
let allLoadedTasks = [];

const sampleTasks = [
  { id: '1', title: 'Code & Logic: Debug a Snippet', type: 'MICROTASK', description: 'Analyze a short code snippet, identify the bug, and explain the fix.', reward: 650, unlockFee: 0, difficulty: 'hard', status: 'PUBLISHED' },
  { id: '2', title: 'Fact Verification Task', type: 'MICROTASK', description: 'Verify the accuracy of a set of statements using reliable sources.', reward: 500, unlockFee: 0, difficulty: 'medium', status: 'PUBLISHED' },
  { id: '3', title: 'AI Response Evaluation', type: 'MICROTASK', description: 'Evaluate two AI-generated responses and select the more accurate one.', reward: 300, unlockFee: 0, difficulty: 'easy', status: 'PUBLISHED' },
  { id: '4', title: 'Write a Product Review', type: 'WRITING', description: 'Write an honest, detailed review of a consumer product.', reward: 400, unlockFee: 0, difficulty: 'medium', status: 'PUBLISHED' },
  { id: '5', title: 'Consumer Habits Survey', type: 'SURVEY', description: 'Answer questions about your shopping preferences.', reward: 150, unlockFee: 0, difficulty: 'easy', status: 'PUBLISHED' }
];

async function init() {
  setupFilters();
  try {
    const tasks = await loadTasks();
    allLoadedTasks = (tasks && tasks.length > 0) ? tasks : sampleTasks;
  } catch (err) {
    console.warn('Loading fallback tasks:', err);
    allLoadedTasks = sampleTasks;
  }
  render();
}

function setupFilters() {
  document.querySelectorAll('[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      render();
    });
  });

  document.querySelectorAll('[data-diff]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-diff]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentDiff = chip.dataset.diff;
      render();
    });
  });
}

function render() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('task-empty');
  if (!list) return;

  let filtered = allLoadedTasks;
  if (currentDiff !== 'all') {
    filtered = filtered.filter(t => (t.difficulty || '').toLowerCase() === currentDiff.toLowerCase());
  }

  if (filtered.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  list.innerHTML = filtered.map(t => `
    <div class="task-card">
      <div class="task-header">
        <h3 class="task-title">${t.title}</h3>
        <span class="task-reward">+KES ${t.reward || t.rewardAmount || 0}</span>
      </div>
      <p class="task-desc">${t.description || ''}</p>
      <div class="task-meta">
        <span class="meta-item">${t.type || 'TASK'}</span>
        <span class="meta-item">${(t.difficulty || 'medium').toUpperCase()}</span>
      </div>
      <div class="task-footer">
        <span class="unlock-fee">${t.unlockFee ? 'Unlock: KES ' + t.unlockFee : 'Free to start'}</span>
        <a class="btn-view" href="/task.html?id=${t.id}">View Task</a>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', init);
