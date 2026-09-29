import { loadTask, requestTaskUnlock, submitTask } from './tasks.js';
import { getCurrentUser } from './auth.js';

const urlParams = new URLSearchParams(window.location.search);
const taskId = urlParams.get('id');

const fallbackTask = {
  id: taskId || '1',
  title: 'Code & Logic: Debug a Snippet',
  type: 'MICROTASK',
  difficulty: 'HIGH',
  estimatedMinutes: 15,
  reward: 650,
  unlockFee: 0,
  instructions: 'Analyze the provided code, find the error, and submit the corrected logic with a brief explanation.',
  status: 'PUBLISHED'
};

async function init() {
  let task = null;
  if (taskId) {
    try {
      task = await loadTask(taskId);
    } catch (e) {
      console.warn('Error fetching task from Firestore:', e);
    }
  }
  task = task || fallbackTask;

  const typeEl = document.getElementById('t-type');
  if (typeEl) typeEl.textContent = task.type || 'TASK';
  const diffEl = document.getElementById('t-diff');
  if (diffEl) diffEl.textContent = (task.difficulty || 'MEDIUM').toUpperCase();
  const timeEl = document.getElementById('t-time');
  if (timeEl) timeEl.textContent = `${task.estimatedMinutes || 10} min`;
  const titleEl = document.getElementById('t-title');
  if (titleEl) titleEl.textContent = task.title;
  const rewardEl = document.getElementById('t-reward');
  if (rewardEl) rewardEl.textContent = `KES ${task.reward || task.rewardAmount || 0}`;
  const instEl = document.getElementById('t-instructions');
  if (instEl) instEl.textContent = task.instructions || task.description || '';

  const unlockSection = document.getElementById('unlock-section');
  const taskForm = document.getElementById('task-form');
  const unlockText = document.getElementById('unlock-text');

  if (task.unlockFee && task.unlockFee > 0) {
    if (unlockSection) unlockSection.style.display = 'block';
    if (unlockText) unlockText.textContent = `This task requires a KES ${task.unlockFee} unlock fee`;
    const btnUnlock = document.getElementById('btn-unlock');
    if (btnUnlock) {
      btnUnlock.onclick = async () => {
        if (unlockSection) unlockSection.innerHTML = '<p style="color:var(--accent-green)">Task unlocked!</p>';
        if (taskForm) taskForm.style.display = 'block';
      };
    }
  } else {
    if (taskForm) taskForm.style.display = 'block';
  }

  document.getElementById('btn-submit')?.addEventListener('click', async () => {
    const textInput = document.getElementById('task-submission');
    const text = textInput ? textInput.value.trim() : '';
    if (!text) {
      alert('Please enter your submission before submitting.');
      return;
    }
    const btn = document.getElementById('btn-submit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Submitting...';
    }

    const statusDisplay = document.getElementById('status-display');
    if (statusDisplay) {
      statusDisplay.style.display = 'block';
      statusDisplay.innerHTML = `<h3 style="color:var(--accent-green)">Task Submitted!</h3><p>Your submission has been received and will be reviewed shortly. Reward: KES ${task.reward || 0}</p><a href="/tasks.html" class="btn-full" style="display:inline-block; margin-top:12px; text-decoration:none;">Back to Tasks</a>`;
    }
    if (taskForm) taskForm.style.display = 'none';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
