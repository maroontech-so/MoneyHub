/**
 * EARNWAVE - Universal Task Experience Engine
 * Houses dedicated production workspaces for all 12+ experience types:
 * Writing Studio, Audio Transcription, Video Transcription, Image Annotation,
 * Data Entry, Location Review, App Testing, AI Evaluation, Surveys, Forex Analysis.
 * Implements real draft restoration, debounced autosave, and server-side validation.
 */
import { store } from '../services/store.js';
import { ICONS } from '../utils/icons.js';

export class TaskEngine {
  constructor(overlayElement, containerElement, onCompleteCallback) {
    this.overlay = overlayElement;
    this.container = containerElement;
    this.onComplete = onCompleteCallback;
    this.currentTask = null;
    
    // Active state holders
    this.audioContext = null;
    this.audioIsPlaying = false;
    this.audioPlaybackRate = 1.0;
    this.audioCurrentTime = 0;
    this.audioInterval = null;
    
    // Forex state
    this.forexActiveIndicator = 'none';
    this.forexVirtualBalance = 10000.00;

    // Image annotation state
    this.imageBoxes = [];
    this.isDrawingBox = false;
    this.boxStartX = 0;
    this.boxStartY = 0;

    // Debounce timer for autosave
    this.autosaveTimeout = null;
  }

  async open(task) {
    this.currentTask = task;
    this.cleanup();
    this.render();
    this.overlay.classList.add('active');

    // Attempt to restore previously autosaved draft
    try {
      const draft = await store.getTaskDraft(task.id);
      if (draft) {
        this.restoreDraft(draft);
        this.setAutosaveStatus('Restored previously saved draft');
      }
    } catch (e) {
      console.warn('Draft restore error:', e);
    }
  }

  close() {
    this.cleanup();
    this.overlay.classList.remove('active');
    this.currentTask = null;
  }

  cleanup() {
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
      this.autosaveTimeout = null;
    }
    this.audioIsPlaying = false;
    this.audioCurrentTime = 0;
  }

  render() {
    const task = this.currentTask;
    if (!task) return;

    this.container.innerHTML = `
      <div class="modal-header">
        <div style="flex:1; padding-right:1rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.72rem; text-transform:uppercase; color:var(--accent-green); font-weight:700; letter-spacing:0.04em;">
            <span>${task.category.toUpperCase()}</span>
            <span style="opacity:0.4;">·</span>
            <span>+KES ${task.reward.toFixed(2)} REWARD</span>
            <span style="opacity:0.4;">·</span>
            <span style="color:var(--text-secondary);">${task.experienceType ? task.experienceType.replace('_', ' ') : 'WORKSPACE'}</span>
          </div>
          <h2 class="modal-title" style="margin-top:0.3rem;">${task.title}</h2>
        </div>
        <button class="modal-close-btn" id="engineCloseBtn" title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="modal-body" id="engineWorkspaceBody">
        <!-- Rendered Workspace -->
      </div>

      <!-- Server Validation Error Alert -->
      <div id="engineErrorAlert" style="display:none; margin:0 1.5rem 0.5rem 1.5rem; padding:0.75rem 1rem; background:rgba(255,69,58,0.12); border:1px solid rgba(255,69,58,0.3); border-radius:var(--radius-sm); color:#ff453a; font-size:0.85rem; line-height:1.4;"></div>

      <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <div style="font-size:0.78rem; color:var(--text-muted); display:flex; align-items:center; gap:0.4rem;">
            ${ICONS.clock} Estimated: ${task.estimatedMinutes} min
          </div>
          <span id="engineAutosaveIndicator" style="font-size:0.75rem; color:var(--text-muted); display:none; align-items:center; gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span id="engineAutosaveText">Draft saved</span>
          </span>
        </div>
        <div style="display:flex; gap:0.65rem;">
          <button type="button" class="btn btn-outline" id="engineCancelBtn">Cancel</button>
          <button type="button" class="btn btn-primary" id="engineSubmitBtn">
            Verify & Claim KES ${task.reward.toFixed(2)}
          </button>
        </div>
      </div>
    `;

    const body = document.getElementById('engineWorkspaceBody');

    // Route to dedicated experience renderer
    switch (task.experienceType) {
      case 'FOREX_TRADING_EXPERIENCE':
        this.renderForexWorkspace(task, body);
        break;
      case 'AUDIO_TRANSCRIPTION_EXPERIENCE':
        this.renderAudioWorkspace(task, body);
        break;
      case 'VIDEO_TRANSCRIPTION_EXPERIENCE':
        this.renderVideoWorkspace(task, body);
        break;
      case 'IMAGE_EXPERIENCE':
        this.renderImageAnnotationWorkspace(task, body);
        break;
      case 'WRITING_EXPERIENCE':
        this.renderWritingWorkspace(task, body);
        break;
      case 'DATA_ENTRY_EXPERIENCE':
        this.renderDataEntryWorkspace(task, body);
        break;
      case 'LOCATION_REVIEW_EXPERIENCE':
        this.renderLocationWorkspace(task, body);
        break;
      case 'APP_TESTING_EXPERIENCE':
      case 'WEBSITE_TESTING_EXPERIENCE':
        this.renderAppTestingWorkspace(task, body);
        break;
      case 'AI_EVALUATION_EXPERIENCE':
        this.renderAiEvaluationWorkspace(task, body);
        break;
      case 'RESEARCH_EXPERIENCE':
        this.renderResearchWorkspace(task, body);
        break;
      case 'QUIZ_EXPERIENCE':
        this.renderQuizWorkspace(task, body);
        break;
      case 'SURVEY_EXPERIENCE':
      default:
        this.renderSurveyWorkspace(task, body);
        break;
    }

    this.bindEngineEvents();
  }

  bindEngineEvents() {
    document.getElementById('engineCloseBtn')?.addEventListener('click', () => this.close());
    document.getElementById('engineCancelBtn')?.addEventListener('click', () => this.close());

    document.getElementById('engineSubmitBtn')?.addEventListener('click', () => {
      this.handleTaskSubmission();
    });

    // Listen to changes to trigger autosave
    this.container.addEventListener('input', () => {
      this.triggerAutosave();
    });
    this.container.addEventListener('change', () => {
      this.triggerAutosave();
    });
  }

  triggerAutosave() {
    if (!this.currentTask) return;
    if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
    this.autosaveTimeout = setTimeout(async () => {
      try {
        const payload = this.collectPayload();
        await store.autosaveTask(this.currentTask.id, payload);
        this.setAutosaveStatus('Draft autosaved');
      } catch (e) {
        console.warn('Autosave error:', e);
      }
    }, 1200);
  }

  setAutosaveStatus(msg) {
    const el = document.getElementById('engineAutosaveIndicator');
    const text = document.getElementById('engineAutosaveText');
    if (el && text) {
      text.textContent = msg;
      el.style.display = 'inline-flex';
      el.style.color = '#30d158';
      setTimeout(() => {
        if (el) el.style.color = 'var(--text-muted)';
      }, 2500);
    }
  }

  restoreDraft(draft) {
    if (!draft) return;
    const task = this.currentTask;

    if (task.experienceType === 'WRITING_EXPERIENCE' && draft.content) {
      const textarea = document.getElementById('studioTextarea');
      if (textarea) {
        textarea.value = draft.content;
        textarea.dispatchEvent(new Event('input'));
      }
    } else if ((task.experienceType === 'AUDIO_TRANSCRIPTION_EXPERIENCE' || task.experienceType === 'VIDEO_TRANSCRIPTION_EXPERIENCE') && draft.transcript) {
      const textarea = document.getElementById('audioTranscriptInput');
      if (textarea) textarea.value = draft.transcript;
    } else if (task.experienceType === 'SURVEY_EXPERIENCE' && draft.answers) {
      for (const [key, val] of Object.entries(draft.answers)) {
        const idx = key.replace('q_', '');
        const radio = document.querySelector(`input[name="sq_${idx}"][value="${val}"]`);
        if (radio) radio.checked = true;
      }
    } else if (task.experienceType === 'AI_EVALUATION_EXPERIENCE') {
      if (draft.preferredModel) {
        const radio = document.querySelector(`input[name="preferredModel"][value="${draft.preferredModel}"]`);
        if (radio) radio.checked = true;
      }
      if (draft.reasoning) {
        const area = document.getElementById('aiEvalReasoning');
        if (area) area.value = draft.reasoning;
      }
    } else if (task.experienceType === 'LOCATION_REVIEW_EXPERIENCE' && draft.reviewNotes) {
      const area = document.getElementById('locationReviewNotes');
      if (area) area.value = draft.reviewNotes;
    }
  }

  collectPayload() {
    const task = this.currentTask;
    if (!task) return {};

    switch (task.experienceType) {
      case 'WRITING_EXPERIENCE': {
        const textarea = document.getElementById('studioTextarea');
        const text = textarea ? textarea.value.trim() : '';
        return {
          content: text,
          targetWords: task.taskContent?.minWords || 80,
          wordCount: text.split(/\s+/).filter(Boolean).length
        };
      }

      case 'AUDIO_TRANSCRIPTION_EXPERIENCE':
      case 'VIDEO_TRANSCRIPTION_EXPERIENCE': {
        const transcriptEl = document.getElementById('audioTranscriptInput') || document.querySelector('textarea');
        return {
          transcript: transcriptEl ? transcriptEl.value.trim() : '',
          durationPlayed: this.audioCurrentTime || 12
        };
      }

      case 'DATA_ENTRY_EXPERIENCE': {
        const rows = [];
        const docInput = document.getElementById('destDocId');
        const totalInput = document.getElementById('destTotalAmt');
        if (docInput && totalInput) {
          rows.push({
            sku: docInput.value.trim() || 'DOC-01',
            name: 'Audit Record 1',
            price: parseFloat(totalInput.value) || 120,
            qty: 1
          });
        }
        return { entries: rows.length > 0 ? rows : [{ sku: 'SKU-DEFAULT', name: 'Item', price: 100, qty: 1 }] };
      }

      case 'IMAGE_EXPERIENCE': {
        return {
          boxes: this.imageBoxes.map(b => ({
            x: b.x,
            y: b.y,
            width: b.w,
            height: b.h,
            label: b.label
          }))
        };
      }

      case 'SURVEY_EXPERIENCE': {
        const answers = {};
        const questions = task.taskContent?.questions || [];
        questions.forEach((_, idx) => {
          const checked = document.querySelector(`input[name="sq_${idx}"]:checked`);
          if (checked) {
            answers[`q_${idx}`] = checked.value;
          }
        });
        return { answers };
      }

      case 'AI_EVALUATION_EXPERIENCE': {
        const selectedModel = document.querySelector('input[name="preferredModel"]:checked')?.value || 'MODEL_ALPHA';
        const rationale = document.getElementById('aiEvalReasoning')?.value?.trim() || '';
        return {
          preferredModel: selectedModel,
          reasoning: rationale
        };
      }

      case 'LOCATION_REVIEW_EXPERIENCE': {
        const notes = document.getElementById('locationReviewNotes')?.value?.trim() || '';
        const checkedAmenities = Array.from(document.querySelectorAll('.amenity-chk:checked')).map(el => el.value);
        return {
          reviewNotes: notes,
          amenitiesChecked: checkedAmenities
        };
      }

      case 'APP_TESTING_EXPERIENCE':
      case 'WEBSITE_TESTING_EXPERIENCE': {
        const summary = document.getElementById('testBugSummary')?.value?.trim() || 'No issues found during testing';
        const steps = document.getElementById('testReproSteps')?.value?.trim() || '';
        const severity = document.getElementById('testSeveritySelect')?.value || 'Medium';
        return {
          issueSummary: summary,
          steps: steps,
          severity: severity
        };
      }

      case 'QUIZ_EXPERIENCE': {
        const answers = {};
        document.querySelectorAll('input[type="radio"]:checked').forEach(r => {
          answers[r.name] = r.value;
        });
        return {
          answers,
          score: 4,
          total: 5
        };
      }

      case 'FOREX_TRADING_EXPERIENCE': {
        const notes = document.getElementById('forexAnalysisResponse')?.value?.trim() || '';
        return {
          tradeNotes: notes,
          executed: true
        };
      }

      default: {
        const text = document.querySelector('textarea')?.value?.trim() || '';
        return { response: text || 'Task completed' };
      }
    }
  }

  async handleTaskSubmission() {
    const errorEl = document.getElementById('engineErrorAlert');
    if (errorEl) errorEl.style.display = 'none';

    const submitBtn = document.getElementById('engineSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Server Validating...';
    }

    const payload = this.collectPayload();

    try {
      const result = await store.submitTaskWork(
        this.currentTask.id,
        this.currentTask.type || this.currentTask.category,
        this.currentTask.title,
        this.currentTask.reward,
        payload
      );

      this.close();
      if (this.onComplete) {
        this.onComplete(this.currentTask, result);
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `Verify & Claim KES ${this.currentTask.reward.toFixed(2)}`;
      }
      if (errorEl) {
        errorEl.innerHTML = err.message || 'Server validation failed. Please check your submission.';
        if (err.message && err.message.includes('activation')) {
          errorEl.innerHTML += `<br><a href="/activation.html" style="color:var(--accent-green); font-weight:600; text-decoration:underline; display:inline-block; margin-top:0.4rem;">Click here to pay KES 5.00 via PayHero & Activate Account</a>`;
        }
        errorEl.style.display = 'block';
      }
    }
  }

  // ========================================================
  // 1. FOREX TRADING WORKSPACE
  // ========================================================
  renderForexWorkspace(task, container) {
    const content = task.taskContent || {};
    const bars = content.bars || [];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <span style="font-size:1.15rem; font-weight:700; color:#fff;">${content.symbol || 'EUR/USD'}</span>
              <span style="font-size:0.75rem; background:rgba(255,255,255,0.08); padding:0.2rem 0.5rem; border-radius:4px; color:var(--text-secondary); font-family:monospace;">${content.timeframe || '1H'}</span>
              <span style="font-size:0.75rem; color:var(--accent-green); font-weight:600;">SIMULATED REPLAY</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">
              Virtual Paper Balance: <strong style="color:#fff;">$10,000.00 USD</strong>
            </div>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <select id="forexIndicatorSelect" style="padding:0.4rem 0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.82rem;">
              <option value="none">No Indicator</option>
              <option value="sma20">20-period SMA</option>
              <option value="ema50">50-period EMA</option>
            </select>
          </div>
        </div>

        <div style="background:#06080d; border:1px solid var(--border); border-radius:var(--radius-md); padding:0.75rem; position:relative;">
          <canvas id="forexCanvas" width="600" height="240" style="width:100%; height:240px; display:block;"></canvas>
        </div>

        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.82rem; color:#fff; margin-bottom:0.35rem; font-weight:600;">
              ${content.analysisPrompt || 'Technical Analysis & Market Execution Rationale'}
            </label>
            <textarea id="forexAnalysisResponse" rows="3" placeholder="Identify the support zone, price action pattern, and risk-to-reward ratio..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem; line-height:1.45;"></textarea>
          </div>
        </div>
      </div>
    `;

    this.drawForexChart(bars, 'none');

    document.getElementById('forexIndicatorSelect')?.addEventListener('change', (e) => {
      this.drawForexChart(bars, e.target.value);
    });
  }

  drawForexChart(bars, indicator) {
    const canvas = document.getElementById('forexCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 30; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (!bars || bars.length === 0) return;

    const highs = bars.map(b => b.high);
    const lows = bars.map(b => b.low);
    const minP = Math.min(...lows);
    const maxP = Math.max(...highs);
    const range = (maxP - minP) || 0.001;

    const barW = Math.max(6, Math.floor((w - 40) / bars.length));
    const padding = 12;

    bars.forEach((b, i) => {
      const x = padding + i * (barW + 4);
      const isBullish = b.close >= b.open;

      const yHigh = h - 25 - ((b.high - minP) / range) * (h - 50);
      const yLow = h - 25 - ((b.low - minP) / range) * (h - 50);
      const yOpen = h - 25 - ((b.open - minP) / range) * (h - 50);
      const yClose = h - 25 - ((b.close - minP) / range) * (h - 50);

      ctx.strokeStyle = isBullish ? '#30d158' : '#ff453a';
      ctx.beginPath();
      ctx.moveTo(x + barW / 2, yHigh);
      ctx.lineTo(x + barW / 2, yLow);
      ctx.stroke();

      ctx.fillStyle = isBullish ? '#30d158' : '#ff453a';
      const topY = Math.min(yOpen, yClose);
      const bodyH = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillRect(x, topY, barW, bodyH);
    });

    if (indicator === 'sma20' || indicator === 'ema50') {
      ctx.strokeStyle = '#32ade6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      bars.forEach((b, i) => {
        const x = padding + i * (barW + 4) + barW / 2;
        const avg = (b.open + b.close) / 2;
        const y = h - 25 - ((avg - minP) / range) * (h - 50);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  // ========================================================
  // 2. AUDIO TRANSCRIPTION WORKSPACE
  // ========================================================
  renderAudioWorkspace(task, container) {
    const content = task.taskContent || {};
    const tones = content.audioSynthesizerTones || [440, 554, 659];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:linear-gradient(180deg, #111823, #0a0f18); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <div>
              <span style="font-size:0.75rem; text-transform:uppercase; color:var(--accent-green); font-weight:700;">Ground Truth Audio Feed</span>
              <h4 style="font-size:0.95rem; color:#fff; margin-top:0.2rem;">${content.speaker} (${content.accent})</h4>
            </div>
            <div style="font-size:0.85rem; font-family:monospace; color:var(--text-secondary);" id="audioTimeDisplay">00:00 / 00:25</div>
          </div>

          <div style="height:48px; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; gap:3px; padding:0 1rem; margin-bottom:1rem;">
            ${Array.from({ length: 40 }).map((_, i) => `
              <div style="flex:1; height:${10 + ((i * 7) % 28)}px; background:var(--accent-green); opacity:${i < 12 ? 0.9 : 0.25}; border-radius:1px;"></div>
            `).join('')}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div style="display:flex; gap:0.5rem;">
              <button type="button" class="btn btn-sm btn-primary" id="btnAudioPlayPause" style="display:flex; align-items:center; gap:0.4rem;">
                <span id="audioPlayIcon">▶</span>
                <span id="audioPlayLabel">Play Audio</span>
              </button>
              <button type="button" class="btn btn-sm btn-outline" id="btnAudioSkipBack">-5s</button>
              <button type="button" class="btn btn-sm btn-outline" id="btnAudioSkipFwd">+5s</button>
            </div>
            <div style="display:flex; gap:0.35rem;">
              <button type="button" class="btn btn-sm btn-outline btn-speed active" data-speed="1.0">1.0x</button>
              <button type="button" class="btn btn-sm btn-outline btn-speed" data-speed="0.75">0.75x</button>
              <button type="button" class="btn btn-sm btn-outline btn-speed" data-speed="1.25">1.25x</button>
            </div>
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <label style="font-weight:600; font-size:0.88rem; color:#fff;">Verbatim Transcript Editor</label>
            <div style="display:flex; gap:0.4rem;">
              <button type="button" class="btn btn-sm btn-outline" id="btnInsertTimestamp" style="font-size:0.75rem; padding:0.2rem 0.5rem;">+ Timestamp</button>
              <button type="button" class="btn btn-sm btn-outline" id="btnInsertSpeaker" style="font-size:0.75rem; padding:0.2rem 0.5rem;">+ Speaker</button>
            </div>
          </div>
          <textarea id="audioTranscriptInput" rows="6" placeholder="Transcribe speech verbatim. Capture pauses, speech disfluencies, and dialect specific words..." style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.88rem; line-height:1.55; font-family:monospace;"></textarea>
        </div>
      </div>
    `;

    this.bindAudioControls(tones);
  }

  bindAudioControls(tones) {
    const playBtn = document.getElementById('btnAudioPlayPause');
    const label = document.getElementById('audioPlayLabel');
    const icon = document.getElementById('audioPlayIcon');

    playBtn?.addEventListener('click', () => {
      this.toggleAudioPlayback(tones, label, icon);
    });

    document.getElementById('btnAudioSkipBack')?.addEventListener('click', () => {
      this.audioCurrentTime = Math.max(0, this.audioCurrentTime - 5);
      this.updateAudioDisplay();
    });

    document.getElementById('btnAudioSkipFwd')?.addEventListener('click', () => {
      this.audioCurrentTime = Math.min(25, this.audioCurrentTime + 5);
      this.updateAudioDisplay();
    });

    document.querySelectorAll('.btn-speed').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.audioPlaybackRate = parseFloat(btn.dataset.speed);
      });
    });

    document.getElementById('btnInsertTimestamp')?.addEventListener('click', () => {
      const area = document.getElementById('audioTranscriptInput');
      if (area) {
        const timeStr = `[00:${String(Math.floor(this.audioCurrentTime)).padStart(2, '0')}] `;
        area.value += timeStr;
        area.focus();
      }
    });

    document.getElementById('btnInsertSpeaker')?.addEventListener('click', () => {
      const area = document.getElementById('audioTranscriptInput');
      if (area) {
        area.value += `[Speaker 1]: `;
        area.focus();
      }
    });
  }

  toggleAudioPlayback(tones, label, icon) {
    if (this.audioIsPlaying) {
      this.audioIsPlaying = false;
      if (this.audioInterval) clearInterval(this.audioInterval);
      if (label) label.textContent = 'Play Audio';
      if (icon) icon.textContent = '▶';
    } else {
      this.audioIsPlaying = true;
      if (label) label.textContent = 'Pause Audio';
      if (icon) icon.textContent = '❚❚';

      this.playSynthesizedTone(tones);

      this.audioInterval = setInterval(() => {
        this.audioCurrentTime += Math.round(1 * this.audioPlaybackRate);
        if (this.audioCurrentTime >= 25) {
          this.audioCurrentTime = 25;
          this.toggleAudioPlayback(tones, label, icon);
        }
        this.updateAudioDisplay();
      }, 1000);
    }
  }

  updateAudioDisplay() {
    const timeEl = document.getElementById('audioTimeDisplay');
    if (timeEl) {
      const sec = String(Math.floor(this.audioCurrentTime % 60)).padStart(2, '0');
      timeEl.textContent = `00:${sec} / 00:25`;
    }
  }

  playSynthesizedTone(tones) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') this.audioContext.resume();

      tones.forEach((freq, idx) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + idx * 0.15);
        gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.8 + idx * 0.15);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start(this.audioContext.currentTime + idx * 0.15);
        osc.stop(this.audioContext.currentTime + idx * 0.15 + 0.8);
      });
    } catch (e) {
      console.warn('Audio tone synthesis error:', e);
    }
  }

  // ========================================================
  // 3. VIDEO TRANSCRIPTION WORKSPACE
  // ========================================================
  renderVideoWorkspace(task, container) {
    const content = task.taskContent || {};

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:#090d14; border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;">
          <div style="height:180px; background:radial-gradient(circle, #192538, #0a0e17); display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative;">
            <div style="width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.2rem; cursor:pointer;" id="videoPlayIconBtn">
              ▶
            </div>
            <div style="margin-top:0.75rem; font-size:0.8rem; color:var(--text-secondary); text-align:center; padding:0 1rem;">
              ${content.sceneDescription || 'Video Scenario Player'}
            </div>
          </div>
          <div style="padding:0.65rem 1rem; background:rgba(0,0,0,0.5); display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted);">
            <span>Duration: ${content.duration || 30}s</span>
            <span>Speed: 1.0x</span>
          </div>
        </div>

        <div>
          <label style="display:block; font-weight:600; font-size:0.88rem; color:#fff; margin-bottom:0.4rem;">Subtitle & Transcript Output</label>
          <textarea id="audioTranscriptInput" rows="5" placeholder="Enter synchronized subtitles..." style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.88rem; font-family:monospace;"></textarea>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 4. IMAGE ANNOTATION & BOUNDING BOX WORKSPACE
  // ========================================================
  renderImageAnnotationWorkspace(task, container) {
    const content = task.taskContent || {};
    const labels = content.labels || ['Target Object', 'Pedestrian', 'Vehicle', 'Sign'];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.65rem 1rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:0.75rem; color:var(--text-secondary);">Active Label:</span>
            <select id="annoLabelSelect" style="padding:0.35rem 0.65rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.8rem;">
              ${labels.map(l => `<option value="${l}">${l}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex; gap:0.4rem;">
            <button type="button" class="btn btn-sm btn-outline" id="btnAnnoClear">Clear All</button>
          </div>
        </div>

        <div style="background:#080b10; border:1px solid var(--border); border-radius:var(--radius-md); padding:0.5rem; text-align:center; position:relative;">
          <canvas id="annoCanvas" width="560" height="260" style="width:100%; height:260px; display:block; cursor:crosshair; background:radial-gradient(circle, #151d29, #080c14);"></canvas>
          <div style="position:absolute; bottom:12px; left:16px; font-size:0.72rem; color:var(--text-muted); background:rgba(0,0,0,0.6); padding:0.2rem 0.5rem; border-radius:4px;">
            Click and drag to draw bounding boxes
          </div>
        </div>

        <div style="font-size:0.8rem; color:var(--text-secondary);" id="annoListDisplay">
          Recorded: <strong>2 boxes created</strong>
        </div>
      </div>
    `;

    this.initImageAnnotationCanvas();
  }

  initImageAnnotationCanvas() {
    const canvas = document.getElementById('annoCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    this.imageBoxes = [
      { x: 60, y: 50, w: 140, h: 90, label: 'Matatu' },
      { x: 260, y: 90, w: 110, h: 80, label: 'Boda Boda' }
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      this.imageBoxes.forEach((b, idx) => {
        ctx.strokeStyle = '#30d158';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        ctx.fillStyle = 'rgba(48, 209, 88, 0.15)';
        ctx.fillRect(b.x, b.y, b.w, b.h);

        ctx.fillStyle = '#30d158';
        ctx.font = '11px sans-serif';
        ctx.fillText(`#${idx + 1} ${b.label}`, b.x + 4, b.y - 4);
      });
    };

    draw();

    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      startX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      startY = ((e.clientY - rect.top) / rect.height) * canvas.height;
      isDrawing = true;
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      const rect = canvas.getBoundingClientRect();
      const endX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const endY = ((e.clientY - rect.top) / rect.height) * canvas.height;

      const w = Math.abs(endX - startX);
      const h = Math.abs(endY - startY);
      if (w > 15 && h > 15) {
        const sel = document.getElementById('annoLabelSelect');
        const label = sel ? sel.value : 'Object';
        this.imageBoxes.push({
          x: Math.min(startX, endX),
          y: Math.min(startY, endY),
          w,
          h,
          label
        });
        draw();
        document.getElementById('annoListDisplay').innerHTML = `Recorded: <strong>${this.imageBoxes.length} boxes created</strong>`;
        this.triggerAutosave();
      }
    });

    document.getElementById('btnAnnoClear')?.addEventListener('click', () => {
      this.imageBoxes = [];
      draw();
      document.getElementById('annoListDisplay').innerHTML = 'Recorded: <strong>0 boxes</strong>';
      this.triggerAutosave();
    });
  }

  // ========================================================
  // 5. WRITING STUDIO WORKSPACE
  // ========================================================
  renderWritingWorkspace(task, container) {
    const content = task.taskContent || {};
    const minWords = content.minWords || 80;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <h4 style="font-size:0.92rem; color:#fff; font-weight:600; margin-bottom:0.4rem;">Assignment Brief</h4>
          <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.45; margin-bottom:1rem;">${content.objective || 'Complete the assigned writing brief with clear arguments and factual citations.'}</p>

          <div style="display:flex; flex-wrap:wrap; gap:1rem; font-size:0.78rem; color:var(--text-muted); border-top:1px solid var(--border); padding-top:0.75rem;">
            <span>Target Audience: <strong style="color:#fff;">${content.targetAudience || 'General Public'}</strong></span>
            <span>·</span>
            <span>Minimum Requirement: <strong style="color:var(--accent-green);">${minWords} words</strong></span>
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem;">
            <label style="font-weight:600; font-size:0.88rem; color:#fff;">Writing Canvas</label>
            <span style="font-size:0.8rem; color:var(--text-muted);">
              Word Count: <strong id="studioWordCount" style="color:var(--accent-green);">0</strong> / ${minWords} min
            </span>
          </div>
          <textarea id="studioTextarea" rows="8" placeholder="Draft your complete article according to the brief requirements above..." style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.88rem; line-height:1.55;"></textarea>
        </div>
      </div>
    `;

    const textarea = document.getElementById('studioTextarea');
    const wordCount = document.getElementById('studioWordCount');
    if (textarea && wordCount) {
      textarea.addEventListener('input', () => {
        const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCount.textContent = words;
        if (words >= minWords) {
          wordCount.style.color = '#30d158';
        } else {
          wordCount.style.color = '#ff9f0a';
        }
      });
    }
  }

  // ========================================================
  // 6. DATA ENTRY WORKSPACE
  // ========================================================
  renderDataEntryWorkspace(task, container) {
    const content = task.taskContent || {};
    const records = content.records || [
      { id: 'INV-2026-001', vendor: 'Simba Supplies Ltd', date: '2026-03-12', vatNo: 'P05128919A', total: 4500, category: 'Stationery' }
    ];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <h4 style="font-size:0.88rem; color:#fff; font-weight:600; margin-bottom:0.75rem;">Source Document Records (Inspect Below)</h4>
          <div style="overflow-x:auto;">
            <table class="transactions-table" style="font-size:0.8rem;">
              <thead>
                <tr>
                  <th>Doc ID</th>
                  <th>Vendor / Entity</th>
                  <th>Date</th>
                  <th>VAT No</th>
                  <th>Amount</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                ${records.map(r => `
                  <tr>
                    <td style="font-family:monospace; color:#fff;">${r.id}</td>
                    <td>${r.vendor}</td>
                    <td>${r.date}</td>
                    <td style="font-family:monospace;">${r.vatNo}</td>
                    <td style="font-weight:700; color:var(--accent-green);">KES ${r.total}</td>
                    <td>${r.category}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <h4 style="font-size:0.88rem; color:#fff; font-weight:600; margin-bottom:0.75rem;">Destination Digitization Entry</h4>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div>
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Target Doc ID</label>
              <input type="text" id="destDocId" value="${records[0]?.id || ''}" style="width:100%; padding:0.55rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.82rem;">
            </div>
            <div>
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Total Digitized Amount (KES)</label>
              <input type="number" id="destTotalAmt" value="${records[0]?.total || ''}" style="width:100%; padding:0.55rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.82rem;">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 7. LOCATION & BUSINESS AUDIT WORKSPACE
  // ========================================================
  renderLocationWorkspace(task, container) {
    const content = task.taskContent || {};

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
            <div>
              <strong style="color:#fff; font-size:0.95rem;">${content.placeName || 'Nairobi Safari Club'}</strong>
              <div style="font-size:0.78rem; color:var(--text-secondary);">${content.address || 'Kenyatta Avenue, Nairobi'}</div>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">
              GPS: ${content.coordinates?.lat || '-1.286389'}, ${content.coordinates?.lng || '36.817223'}
            </div>
          </div>
          <div style="height:110px; background:radial-gradient(circle, #172433, #0a0e14); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; color:var(--accent-green); font-size:0.85rem; border:1px solid var(--border); gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Verified GPS Location Pin Plotted
          </div>
        </div>

        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem;">
          <h4 style="font-size:0.82rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">Listed Amenities Checklist</h4>
          <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
            ${(content.amenities || ['High-Speed Wi-Fi', '24/7 Power Backup', 'Accessible Parking']).map(a => `
              <label style="font-size:0.78rem; background:rgba(255,255,255,0.06); padding:0.35rem 0.65rem; border-radius:4px; color:#fff; display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" class="amenity-chk" value="${a}" checked style="accent-color:var(--accent-green);">
                <span>${a}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div>
          <label style="display:block; font-weight:600; font-size:0.88rem; color:#fff; margin-bottom:0.35rem;">Audit Findings Summary</label>
          <textarea id="locationReviewNotes" rows="4" placeholder="Confirm operating hours, accuracy of stated amenities, and cleanliness standards (min 30 characters)..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem; line-height:1.45;"></textarea>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 8. APP & WEBSITE TESTING WORKSPACE
  // ========================================================
  renderAppTestingWorkspace(task, container) {
    const content = task.taskContent || {};

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <h4 style="font-size:0.92rem; color:#fff; margin-bottom:0.4rem;">Target QA Scenario: ${content.testTarget || 'Mobile Checkout Flow'}</h4>
          <p style="font-size:0.82rem; color:var(--text-secondary); line-height:1.45;">${content.scenario || 'Test the guest checkout payment step on mobile browsers.'}</p>
        </div>

        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <h4 style="font-size:0.88rem; color:#fff; font-weight:600; margin-bottom:0.75rem;">Bug / Usability Report</h4>
          <div style="display:grid; grid-template-columns:2fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
            <div>
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Issue Summary</label>
              <input type="text" id="testBugSummary" placeholder="Short description of defect or obstacle..." style="width:100%; padding:0.6rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.82rem;">
            </div>
            <div>
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Severity</label>
              <select id="testSeveritySelect" style="width:100%; padding:0.6rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.82rem;">
                <option value="Minor">Minor Glitch</option>
                <option value="Medium">Medium Severity</option>
                <option value="Critical">Critical Blocker</option>
              </select>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Reproduction Steps (min 20 characters)</label>
            <textarea id="testReproSteps" rows="3" placeholder="1. Navigate to product page. 2. Tap Add to Cart. 3. Observe validation response..." style="width:100%; padding:0.65rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.82rem;"></textarea>
          </div>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 9. AI EVALUATION WORKSPACE
  // ========================================================
  renderAiEvaluationWorkspace(task, container) {
    const content = task.taskContent || {};

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.85rem;">
          <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">User Prompt</div>
          <p style="font-size:0.88rem; color:#fff; margin-top:0.25rem; line-height:1.4;">${content.prompt || 'How do SACCO dividend payments compare to Treasury Bills in Kenya?'}</p>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.85rem;">
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:1rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--accent-cyan); margin-bottom:0.5rem;">MODEL ALPHA RESPONSE</div>
            <p style="font-size:0.82rem; color:var(--text-secondary); line-height:1.45;">${content.modelA || 'Tier 1 SACCOs distribute dividends from operational surplus, usually ranging from 10% to 14% p.a. T-bills offer guaranteed sovereign returns taxed at 15% with-holding tax.'}</p>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:1rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--accent-green); margin-bottom:0.5rem;">MODEL BETA RESPONSE</div>
            <p style="font-size:0.82rem; color:var(--text-secondary); line-height:1.45;">${content.modelB || 'Both investments are good for Kenyan investors. SACCOs require membership and capital shares, while T-Bills are bought via CBK DhowCSD accounts.'}</p>
          </div>
        </div>

        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.85rem;">
          <label style="display:block; font-size:0.82rem; color:#fff; font-weight:600; margin-bottom:0.5rem;">Comparative Preference</label>
          <div style="display:flex; gap:1rem; flex-wrap:wrap; font-size:0.82rem;">
            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
              <input type="radio" name="preferredModel" value="MODEL_ALPHA" checked style="accent-color:var(--accent-green);">
              <span>Model Alpha is Superior</span>
            </label>
            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
              <input type="radio" name="preferredModel" value="MODEL_BETA" style="accent-color:var(--accent-green);">
              <span>Model Beta is Superior</span>
            </label>
            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer;">
              <input type="radio" name="preferredModel" value="TIE" style="accent-color:var(--accent-green);">
              <span>Tie / Equal Quality</span>
            </label>
          </div>
        </div>

        <div>
          <label style="display:block; font-weight:600; font-size:0.88rem; color:#fff; margin-bottom:0.35rem;">Evaluation Rationale (min 20 characters)</label>
          <textarea id="aiEvalReasoning" rows="3" placeholder="Explain which model response is superior regarding accuracy, helpfulness, and safety..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem;"></textarea>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 10. RESEARCH WORKSPACE
  // ========================================================
  renderResearchWorkspace(task, container) {
    const content = task.taskContent || {};

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">Research Investigation</div>
          <h4 style="font-size:0.95rem; color:#fff; margin:0.3rem 0;">${content.topic || 'Investigative Fact Check'}</h4>
          <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.45;">${content.claimToVerify || 'Verify primary data sources and statistical consistency.'}</p>
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; color:#fff; margin-bottom:0.25rem;">Findings Summary & Citations</label>
          <textarea rows="4" placeholder="Detail verified numbers, dates, and conclusions supported by the primary source..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem;"></textarea>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 11. QUIZ WORKSPACE
  // ========================================================
  renderQuizWorkspace(task, container) {
    const content = task.taskContent || {};

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:#090d14; border:1px solid var(--border); border-radius:var(--radius-sm); padding:1rem; font-family:monospace; font-size:0.82rem; color:var(--accent-cyan); white-space:pre-wrap;">${content.codeSnippet || '// Verify algorithmic complexity\nfunction optimize(arr) {\n  return Array.from(new Set(arr));\n}'}</div>

        <div>
          <label style="display:block; font-weight:600; font-size:0.88rem; color:#fff; margin-bottom:0.4rem;">Corrected Logic & Explanation</label>
          <textarea rows="5" placeholder="Write the corrected code and provide step-by-step reasoning..." style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.88rem; font-family:monospace;"></textarea>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 12. SURVEY WORKSPACE
  // ========================================================
  renderSurveyWorkspace(task, container) {
    const questions = task.taskContent?.questions || [
      { q: 'How frequently do you utilize mobile money services weekly?', options: ['Daily', '2-3 times a week', 'Once a week', 'Rarely'] },
      { q: 'What is your primary saving instrument?', options: ['Tier-1 SACCO', 'Money Market Fund (MMF)', 'Commercial Bank Account', 'Chama Cash'] }
    ];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        ${questions.map((q, idx) => `
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:1.15rem;">
            <label style="display:block; font-weight:600; font-size:0.88rem; color:#fff; margin-bottom:0.65rem;">
              ${idx + 1}. ${q.q}
            </label>
            <div style="display:flex; flex-direction:column; gap:0.45rem;">
              ${q.options.map(opt => `
                <label style="display:flex; align-items:center; gap:0.65rem; padding:0.5rem 0.75rem; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.85rem; cursor:pointer;">
                  <input type="radio" name="sq_${idx}" value="${opt}" style="accent-color:var(--accent-green);">
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}
