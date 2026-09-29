/**
 * EARNWAVE - Dynamic Task Execution Runner
 * Renders interactive task completion forms tailored to each task category.
 */
import { store } from '../services/store.js';
import { ICONS } from '../utils/icons.js';

export class TaskRunner {
  constructor(modalOverlay, modalContent, onCompleteCallback) {
    this.overlay = modalOverlay;
    this.container = modalContent;
    this.onComplete = onCompleteCallback;
    this.currentTask = null;
  }

  open(task) {
    this.currentTask = task;
    this.render();
    this.overlay.classList.add('active');
  }

  close() {
    this.overlay.classList.remove('active');
    this.currentTask = null;
  }

  render() {
    const task = this.currentTask;
    if (!task) return;

    let formBodyHtml = '';

    switch (task.template) {
      case 'survey':
        formBodyHtml = this.renderSurveyForm(task);
        break;
      case 'ai_evaluation':
        formBodyHtml = this.renderAiEvaluationForm(task);
        break;
      case 'writing':
        formBodyHtml = this.renderWritingForm(task);
        break;
      case 'usability':
        formBodyHtml = this.renderUsabilityForm(task);
        break;
      case 'research':
        formBodyHtml = this.renderResearchForm(task);
        break;
      case 'local_review':
        formBodyHtml = this.renderLocalReviewForm(task);
        break;
      case 'transcription':
        formBodyHtml = this.renderTranscriptionForm(task);
        break;
      case 'data_entry':
        formBodyHtml = this.renderDataEntryForm(task);
        break;
      case 'code_logic':
        formBodyHtml = this.renderCodeLogicForm(task);
        break;
      default:
        formBodyHtml = this.renderDefaultForm(task);
    }

    this.container.innerHTML = `
      <div class="modal-header">
        <div>
          <div style="font-size:0.75rem; text-transform:uppercase; color:var(--accent-green); font-weight:700;">
            ${task.category.toUpperCase()} • KES ${task.reward.toFixed(2)} REWARD
          </div>
          <h2 class="modal-title" style="margin-top:0.25rem;">${task.title}</h2>
        </div>
        <button class="modal-close-btn" id="runnerCloseBtn">&times;</button>
      </div>

      <div class="modal-body">
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:var(--radius-sm); padding:1rem; margin-bottom:1.25rem;">
          <h4 style="font-size:0.9rem; color:#fff; margin-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
            ${ICONS.instructions} Task Instructions
          </h4>
          <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.45;">${task.instructions}</p>
        </div>

        <form id="taskSubmissionForm">
          ${formBodyHtml}

          <div id="runnerError" style="display:none; color:var(--danger); font-size:0.85rem; margin-top:1rem; padding:0.75rem; background:rgba(248,81,73,0.1); border-radius:var(--radius-sm);"></div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-outline" id="runnerCancelBtn">Cancel</button>
        <button type="button" class="btn btn-primary" id="runnerSubmitBtn">
          Submit Task & Claim KES ${task.reward.toFixed(2)}
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('runnerCloseBtn')?.addEventListener('click', () => this.close());
    document.getElementById('runnerCancelBtn')?.addEventListener('click', () => this.close());

    document.getElementById('runnerSubmitBtn')?.addEventListener('click', () => {
      this.handleSubmit();
    });

    // Real-time word counter for writing & review tasks
    const textarea = document.getElementById('runnerTextarea');
    const wordCountSpan = document.getElementById('liveWordCount');
    if (textarea && wordCountSpan) {
      textarea.addEventListener('input', () => {
        const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCountSpan.textContent = words;
      });
    }
  }

  handleSubmit() {
    const errorDiv = document.getElementById('runnerError');
    errorDiv.style.display = 'none';

    try {
      const submissionData = this.collectFormData();
      const submitBtn = document.getElementById('runnerSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying & Recording...';

      setTimeout(() => {
        // Record in store & immutable ledger
        store.submitTaskWork(this.currentTask.id, submissionData, this.currentTask);

        // Immediate reward approval for verified task
        store.adjustWallet(
          this.currentTask.reward,
          'CREDIT',
          'TASK_REWARD',
          `Completed: ${this.currentTask.title}`,
          `TSK-${this.currentTask.id.toUpperCase()}`
        );

        this.close();
        if (this.onComplete) {
          this.onComplete(this.currentTask);
        }
      }, 700);
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    }
  }

  collectFormData() {
    const task = this.currentTask;

    if (task.template === 'writing' || task.template === 'local_review') {
      const text = document.getElementById('runnerTextarea')?.value.trim() || '';
      const words = text.split(/\s+/).filter(w => w.length > 0).length;
      const minWords = task.minWords || 60;
      if (words < minWords) {
        throw new Error(`Minimum ${minWords} words required. Current: ${words} words.`);
      }
      return { text, wordCount: words };
    }

    if (task.template === 'survey') {
      const answers = [];
      const questions = task.questions || [];
      questions.forEach((_, idx) => {
        const selected = document.querySelector(`input[name="q_${idx}"]:checked`);
        if (!selected) {
          throw new Error(`Please answer question #${idx + 1}.`);
        }
        answers.push(selected.value);
      });
      return { answers };
    }

    if (task.template === 'research') {
      const source1 = document.getElementById('researchSource1')?.value.trim();
      const findings = document.getElementById('researchFindings')?.value.trim();
      if (!source1 || !findings) {
        throw new Error('Please provide at least 1 verified source URL and your findings summary.');
      }
      return { source1, findings };
    }

    if (task.template === 'ai_evaluation') {
      const choice = document.querySelector('input[name="ai_pref"]:checked')?.value;
      const reason = document.getElementById('aiReasoning')?.value.trim();
      if (!choice || !reason) {
        throw new Error('Please select which AI response is superior and provide your evaluation rationale.');
      }
      return { preferredResponse: choice, rationale: reason };
    }

    // Default general input
    const genericText = document.getElementById('genericInput')?.value.trim();
    if (!genericText) {
      throw new Error('Please fill in your task completion response.');
    }
    return { response: genericText };
  }

  // --- Template Form Renderers ---
  renderSurveyForm(task) {
    const questions = task.questions || [];
    return questions.map((q, qIndex) => `
      <div style="margin-bottom:1.25rem;">
        <label style="display:block; font-weight:600; font-size:0.9rem; margin-bottom:0.5rem; color:#fff;">
          ${qIndex + 1}. ${q.q}
        </label>
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          ${q.options.map((opt, oIndex) => `
            <label style="display:flex; align-items:center; gap:0.6rem; padding:0.5rem 0.75rem; background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.85rem; cursor:pointer;">
              <input type="radio" name="q_${qIndex}" value="${opt}" style="accent-color:var(--accent-green);">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  renderAiEvaluationForm(task) {
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:0.85rem; border-radius:var(--radius-sm);">
          <div style="font-weight:700; color:#38bdf8; font-size:0.8rem; margin-bottom:0.4rem;">MODEL ALPHA RESPONSE</div>
          <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">
            "To safeguard household savings against double-digit inflation in Kenya, consider low-risk money market funds (MMFs) with daily compounding yield, or Central Bank Treasury Bills via DhowCSD."
          </p>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:0.85rem; border-radius:var(--radius-sm);">
          <div style="font-weight:700; color:var(--accent-green); font-size:0.8rem; margin-bottom:0.4rem;">MODEL BETA RESPONSE</div>
          <p style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">
            "Just put all your money in crypto or forex trading apps. They provide 500% monthly returns without any risk if you follow signals."
          </p>
        </div>
      </div>

      <div style="margin-bottom:1rem;">
        <label style="display:block; font-weight:600; font-size:0.9rem; margin-bottom:0.4rem; color:#fff;">Which response is more accurate, helpful, and safe?</label>
        <div style="display:flex; gap:1rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; cursor:pointer;">
            <input type="radio" name="ai_pref" value="Alpha" checked style="accent-color:var(--accent-green);"> Model Alpha
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; cursor:pointer;">
            <input type="radio" name="ai_pref" value="Beta" style="accent-color:var(--accent-green);"> Model Beta
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; cursor:pointer;">
            <input type="radio" name="ai_pref" value="Equal" style="accent-color:var(--accent-green);"> Both Equal
          </label>
        </div>
      </div>

      <div>
        <label style="display:block; font-weight:600; font-size:0.9rem; margin-bottom:0.4rem; color:#fff;">Evaluation Rationale</label>
        <textarea id="aiReasoning" rows="3" placeholder="Explain why your chosen response is better formatted, factually sound, and compliant with safety guidelines..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem;"></textarea>
      </div>
    `;
  }

  renderWritingForm(task) {
    const minWords = task.minWords || 80;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
        <label style="font-weight:600; font-size:0.9rem; color:#fff;">Your Draft Content</label>
        <span style="font-size:0.8rem; color:var(--text-muted);">
          Words: <strong id="liveWordCount" style="color:var(--accent-green);">0</strong> / ${minWords} minimum
        </span>
      </div>
      <textarea id="runnerTextarea" rows="7" placeholder="Compose original, professional content meeting all task requirements..." style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.9rem; line-height:1.5;"></textarea>
    `;
  }

  renderLocalReviewForm(task) {
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
        <div>
          <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.3rem;">Service & Quality Rating</label>
          <select id="reviewRating" style="width:100%; padding:0.6rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;">
            <option value="5">5 / 5 - Exceptional Experience</option>
            <option value="4">4 / 5 - Very Good</option>
            <option value="3">3 / 5 - Average / Met Expectations</option>
            <option value="2">2 / 5 - Substandard</option>
            <option value="1">1 / 5 - Unsatisfactory</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.3rem;">Verified Visit Timeframe</label>
          <select style="width:100%; padding:0.6rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;">
            <option>Within past 3 months</option>
            <option>Within past 6 months</option>
            <option>Within past year</option>
          </select>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <label style="font-weight:600; font-size:0.9rem; color:#fff;">Detailed Review</label>
        <span style="font-size:0.8rem; color:var(--text-muted);">
          Words: <strong id="liveWordCount" style="color:var(--accent-green);">0</strong> / 70 minimum
        </span>
      </div>
      <textarea id="runnerTextarea" rows="5" placeholder="Detail your experience with staff courtesy, pricing transparency, cleanliness, and facilities..." style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.9rem;"></textarea>
    `;
  }

  renderResearchForm() {
    return `
      <div style="margin-bottom:1rem;">
        <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.3rem;">Primary Verification URL / Citation</label>
        <input type="url" id="researchSource1" placeholder="https://example.org/report-or-bulletin" style="width:100%; padding:0.65rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;">
      </div>
      <div>
        <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.3rem;">Summary of Verified Findings</label>
        <textarea id="researchFindings" rows="4" placeholder="Briefly state what the source confirms or refutes regarding this research statement..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;"></textarea>
      </div>
    `;
  }

  renderTranscriptionForm() {
    return `
      <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:var(--radius-sm); padding:1rem; margin-bottom:1rem;">
        <div style="font-size:0.75rem; font-weight:700; color:#38bdf8; margin-bottom:0.25rem;">SIMULATED AUDIO CLIP (SPEECH SAMPLE)</div>
        <p style="font-size:0.85rem; font-style:italic; color:#e0f2fe;">"Habari zenu, ningependa kuuliza kuhusu huduma za Lipa na M-Pesa kwa biashara yangu ndogo..."</p>
      </div>
      <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.3rem;">Transcribed Text</label>
      <textarea id="genericInput" rows="4" placeholder="Type verbatim what is spoken above with proper punctuation..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;"></textarea>
    `;
  }

  renderDataEntryForm() {
    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
        <div>
          <label style="display:block; font-size:0.8rem; color:#fff; margin-bottom:0.25rem;">Merchant / Entity Name</label>
          <input type="text" placeholder="e.g. QuickMart Supermarket" style="width:100%; padding:0.6rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;">
        </div>
        <div>
          <label style="display:block; font-size:0.8rem; color:#fff; margin-bottom:0.25rem;">Total Amount (KES)</label>
          <input type="number" placeholder="e.g. 1450.00" style="width:100%; padding:0.6rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;">
        </div>
      </div>
      <div style="margin-top:0.75rem;">
        <label style="display:block; font-size:0.8rem; color:#fff; margin-bottom:0.25rem;">Receipt / Invoice Number</label>
        <input type="text" id="genericInput" placeholder="e.g. INV-9812-2026" style="width:100%; padding:0.6rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;">
      </div>
    `;
  }

  renderUsabilityForm() {
    return `
      <div style="margin-bottom:0.75rem;">
        <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.25rem;">Test Device & Operating System</label>
        <input type="text" placeholder="e.g. Samsung Galaxy A14 / Android 14" style="width:100%; padding:0.6rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;">
      </div>
      <div style="margin-bottom:0.75rem;">
        <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.25rem;">Did you encounter any bugs, lag, or layout defects?</label>
        <select style="width:100%; padding:0.6rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;">
          <option>No issues found - Flow was smooth</option>
          <option>Minor visual glitch / slow loading</option>
          <option>Critical error / couldn't finish step</option>
        </select>
      </div>
      <div>
        <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.25rem;">Detailed Feedback & Recommendations</label>
        <textarea id="genericInput" rows="4" placeholder="Detail any friction experienced and suggest usability improvements..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff;"></textarea>
      </div>
    `;
  }

  renderCodeLogicForm() {
    return `
      <div style="background:#090d14; border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.85rem; font-family:monospace; font-size:0.8rem; color:#38bdf8; margin-bottom:1rem;">
        def calculate_discount(price, coupon):<br>
        &nbsp;&nbsp;if coupon == "WAVE20":<br>
        &nbsp;&nbsp;&nbsp;&nbsp;return price * 0.20 # Bug: returns discount amount instead of discounted price<br>
        &nbsp;&nbsp;return price
      </div>
      <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.3rem;">Provide Explanation & Corrected Logic</label>
      <textarea id="genericInput" rows="4" placeholder="Explain what is wrong with the function above and write the corrected return statement..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-family:monospace; font-size:0.85rem;"></textarea>
    `;
  }

  renderDefaultForm() {
    return `
      <div>
        <label style="display:block; font-size:0.85rem; color:#fff; margin-bottom:0.3rem;">Task Submission Details</label>
        <textarea id="genericInput" rows="5" placeholder="Enter your response according to the instructions above..." style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.9rem;"></textarea>
      </div>
    `;
  }
}
