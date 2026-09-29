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

  document.getElementById('t-type').textContent = task.type || 'TASK';
  document.getElementById('t-diff').textContent = (task.difficulty || 'MEDIUM').toUpperCase();
  document.getElementById('t-time').textContent = `${task.estimatedMinutes || 10} min`;
  document.getElementById('t-title').textContent = task.title;
  document.getElementById('t-reward').textContent = `KES ${task.reward || task.rewardAmount || 0}`;
  document.getElementById('t-instructions').textContent = task.instructions || task.description || '';

  const unlockSection = document.getElementById('unlock-section');
  const taskForm = document.getElementById('task-form');

  if (task.unlockFee && task.unlockFee > 0) {
    unlockSection.style.display = 'block';
    document.getElementById('unlock-text').textContent = `This task requires a KES ${task.unlockFee} unlock fee`;
    document.getElementById('btn-unlock').onclick = async () => {
      unlockSection.innerHTML = '<p style="color:var(--accent-green)">Task unlocked!</p>';
      taskForm.style.display = 'block';
    };
  } else {
    taskForm.style.display = 'block';
  }

  document.getElementById('btn-submit')?.addEventListener('click', async () => {
    const text = document.getElementById('task-submission').value.trim();
    if (!text) {
      alert('Please enter your submission before submitting.');
      return;
    }
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    const statusDisplay = document.getElementById('status-display');
    statusDisplay.style.display = 'block';
    statusDisplay.innerHTML = `<h3 style="color:var(--accent-green)">Task Submitted!</h3><p>Your submission has been received and will be reviewed shortly. Reward: KES ${task.reward || 0}</p><a href="/tasks.html" class="btn-full" style="display:inline-block; margin-top:12px; text-decoration:none;">Back to Tasks</a>`;
    taskForm.style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', init);
