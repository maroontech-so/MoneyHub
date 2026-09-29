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

  task.unlockFee = task.unlockFee || Math.max(5, Math.round(((task.reward || 100) * 0.1) / 5) * 5);

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

  // Check if task is unlocked
  let isUnlocked = false;
  const uid = localStorage.getItem('earnwave_user_uid') || '';
  if (uid) {
    try {
      const uRes = await fetch('/api/tasks/unlocked', { headers: { 'x-user-id': uid } });
      if (uRes.ok) {
        const uData = await uRes.json();
        isUnlocked = uData.unlocked && uData.unlocked.some(item => (typeof item === 'string' ? item === task.id : item.taskId === task.id));
      }
    } catch (e) {
      console.warn('Could not check task unlock status:', e);
    }
  }

  if (!isUnlocked && task.unlockFee && task.unlockFee > 0) {
    if (unlockSection) {
      unlockSection.style.display = 'block';
      unlockSection.innerHTML = `
        <div style="font-weight:700; font-size:1.05rem; margin-bottom:0.35rem; color:#fff;">Task Locked</div>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
          This task requires a <strong>KES ${task.unlockFee}</strong> unlock fee to access and claim the <strong>KES ${task.reward}</strong> reward.
        </p>
        <div style="display:flex; flex-direction:column; gap:0.6rem;">
          <button class="btn-full" id="btn-unlock-wallet" style="margin:0; background:rgba(0,212,170,0.15); color:var(--accent-cyan); border:1px solid var(--accent-cyan);">
            Unlock with Wallet Balance (KES ${task.unlockFee})
          </button>
          <button class="btn-full" id="btn-unlock-mpesa" style="margin:0;">
            Unlock with M-Pesa STK (KES ${task.unlockFee})
          </button>
        </div>
        <div id="unlock-msg" style="display:none; margin-top:0.75rem; font-size:0.85rem;"></div>
      `;
    }

    const unlockMsg = document.getElementById('unlock-msg');

    document.getElementById('btn-unlock-wallet')?.addEventListener('click', async () => {
      try {
        const res = await fetch(`/api/tasks/${task.id}/unlock-wallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
          body: JSON.stringify({ taskTitle: task.title, unlockFee: task.unlockFee })
        });
        const d = await res.json();
        if (d.success) {
          if (unlockSection) unlockSection.innerHTML = '<p style="color:var(--accent-green); font-weight:bold;">🎉 Task Unlocked! You can now start and submit.</p>';
          if (taskForm) taskForm.style.display = 'block';
        } else {
          if (unlockMsg) {
            unlockMsg.style.display = 'block';
            unlockMsg.style.color = 'var(--danger)';
            unlockMsg.textContent = d.error || 'Could not unlock task';
          }
        }
      } catch (err) {
        if (unlockMsg) {
          unlockMsg.style.display = 'block';
          unlockMsg.style.color = 'var(--danger)';
          unlockMsg.textContent = err.message;
        }
      }
    });

    document.getElementById('btn-unlock-mpesa')?.addEventListener('click', async () => {
      const phone = prompt('Enter your Safaricom M-Pesa phone number:', localStorage.getItem('earnwave_user_phone') || '07XXXXXXXX');
      if (!phone) return;

      if (unlockMsg) {
        unlockMsg.style.display = 'block';
        unlockMsg.style.color = 'var(--accent-cyan)';
        unlockMsg.textContent = 'Sending M-Pesa STK Prompt to ' + phone + '...';
      }

      try {
        const res = await fetch(`/api/tasks/${task.id}/unlock-mpesa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
          body: JSON.stringify({ phone, unlockFee: task.unlockFee, taskTitle: task.title })
        });
        const d = await res.json();
        if (d.success && d.reference) {
          if (unlockMsg) unlockMsg.textContent = '📲 Prompt sent! Enter M-Pesa PIN on your phone. Awaiting confirmation...';
          const poll = setInterval(async () => {
            const cRes = await fetch(`/api/payhero/status/${encodeURIComponent(d.reference)}`);
            if (cRes.ok) {
              const cData = await cRes.json();
              if (cData.payment?.status === 'COMPLETED') {
                clearInterval(poll);
                if (unlockSection) unlockSection.innerHTML = '<p style="color:var(--accent-green); font-weight:bold;">🎉 Task Unlocked via M-Pesa! Ready to complete.</p>';
                if (taskForm) taskForm.style.display = 'block';
              } else if (cData.payment?.status === 'FAILED') {
                clearInterval(poll);
                if (unlockMsg) {
                  unlockMsg.style.color = 'var(--danger)';
                  unlockMsg.textContent = cData.payment.failureReason || 'Payment failed or timed out.';
                }
              }
            }
          }, 2000);
        }
      } catch (err) {
        if (unlockMsg) {
          unlockMsg.style.color = 'var(--danger)';
          unlockMsg.textContent = err.message;
        }
      }
    });
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
