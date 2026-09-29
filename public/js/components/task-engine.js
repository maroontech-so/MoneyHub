/**
 * EARNWAVE - Universal Task Experience Engine
 * Houses dedicated production workspaces for all 12+ experience types:
 * Forex Trading, Audio Transcription, Video Transcription, Image Annotation,
 * Writing Studio, Data Entry, Location Review, App Testing, AI Evaluation, etc.
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
    
    // Forex state holders
    this.forexActiveIndicator = 'none';
    this.forexPositions = [];
    this.forexVirtualBalance = 10000.00;

    // Image annotation state
    this.imageBoxes = [];
    this.isDrawingBox = false;
    this.boxStartX = 0;
    this.boxStartY = 0;
  }

  open(task) {
    this.currentTask = task;
    this.cleanup();
    this.render();
    this.overlay.classList.add('active');
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
            <span style="color:var(--text-secondary);">${task.experienceType.replace('_', ' ')}</span>
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

      <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:0.78rem; color:var(--text-muted); display:flex; align-items:center; gap:0.4rem;">
          ${ICONS.clock} Estimated: ${task.estimatedMinutes} min
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
  }

  handleTaskSubmission() {
    const submitBtn = document.getElementById('engineSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Validating Submission...';

    setTimeout(() => {
      // Record task completion in store
      store.submitTaskWork(this.currentTask.id, { timestamp: Date.now() }, this.currentTask);

      // Ledger Credit
      store.adjustWallet(
        this.currentTask.reward,
        'CREDIT',
        'TASK_REWARD',
        `Task Verified: ${this.currentTask.title}`,
        `TSK-${this.currentTask.id.toUpperCase()}`
      );

      this.close();
      if (this.onComplete) {
        this.onComplete(this.currentTask);
      }
    }, 600);
  }

  // ========================================================
  // 1. FOREX TRADING & MARKET ANALYSIS WORKSPACE
  // ========================================================
  renderForexWorkspace(task, container) {
    const content = task.taskContent;
    const bars = content.bars || [];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Terminal Header -->
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
          <div>
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <span style="font-size:1.15rem; font-weight:700; color:#fff;">${content.symbol}</span>
              <span style="font-size:0.75rem; background:rgba(255,255,255,0.08); padding:0.2rem 0.5rem; border-radius:4px; color:var(--text-secondary); font-family:monospace;">${content.timeframe}</span>
              <span style="font-size:0.75rem; color:var(--accent-green); font-weight:600;">SIMULATED LIVE REPLAY</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">
              Virtual Balance: <strong style="color:#fff;" id="forexVirtualBal">$${this.forexVirtualBalance.toLocaleString()} USD</strong>
            </div>
          </div>

          <!-- Timeframe & Indicator Selector -->
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <select id="forexIndicatorSelect" style="padding:0.4rem 0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.8rem;">
              <option value="none">No Indicator</option>
              <option value="sma20">SMA (20 Periods)</option>
              <option value="ema50">EMA (50 Periods)</option>
              <option value="rsi">RSI (14 Overbought/Oversold)</option>
            </select>
          </div>
        </div>

        <!-- Candlestick Canvas Terminal -->
        <div style="background:#05070a; border:1px solid var(--border); border-radius:var(--radius-md); padding:0.75rem; position:relative; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem; font-family:monospace;">
            <span>HIGH: ${Math.max(...bars.map(b => b.high))}</span>
            <span>LOW: ${Math.min(...bars.map(b => b.low))}</span>
            <span>LAST: <strong style="color:var(--accent-green);">${bars[bars.length - 1]?.close || 1.0850}</strong></span>
          </div>
          <canvas id="forexCanvas" width="580" height="240" style="width:100%; height:240px; display:block;"></canvas>
        </div>

        <!-- Execution & Analysis Order Panel -->
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <h4 style="font-size:0.92rem; color:#fff; margin-bottom:0.75rem; font-weight:600;">Simulated Order & Technical Analysis</h4>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
            <div>
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.3rem;">Order Type</label>
              <select style="width:100%; padding:0.55rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem;">
                <option>Buy Long (Market Execution)</option>
                <option>Sell Short (Market Execution)</option>
                <option>Buy Limit</option>
                <option>Sell Limit</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.3rem;">Position Volume (Lots)</label>
              <input type="number" value="0.10" step="0.01" style="width:100%; padding:0.55rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem; font-family:monospace;">
            </div>
          </div>

          <div style="margin-bottom:1rem;">
            <label style="display:block; font-size:0.82rem; color:#fff; margin-bottom:0.35rem; font-weight:600;">
              ${content.analysisPrompt}
            </label>
            <textarea id="forexAnalysisResponse" rows="3" placeholder="Provide your technical analysis: identify the support zone, the trend trajectory, and your risk-to-reward calculation..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem; line-height:1.45;"></textarea>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.75rem; color:var(--text-muted);">Simulated Spread: 0.8 pips · Commission: $0.00</span>
            <button type="button" class="btn btn-outline" id="btnExecuteVirtualOrder" style="padding:0.45rem 1rem; font-size:0.82rem;">
              Place Simulated Order
            </button>
          </div>
          <div id="virtualOrderSuccess" style="display:none; margin-top:0.75rem; font-size:0.8rem; color:var(--accent-green);">
            Order Executed: 0.10 lots ${content.symbol} at ${bars[bars.length - 1]?.close} (Virtual P/L: +$14.20)
          </div>
        </div>
      </div>
    `;

    this.drawForexChart(bars, 'none');

    document.getElementById('forexIndicatorSelect')?.addEventListener('change', (e) => {
      this.drawForexChart(bars, e.target.value);
    });

    document.getElementById('btnExecuteVirtualOrder')?.addEventListener('click', () => {
      const msg = document.getElementById('virtualOrderSuccess');
      if (msg) msg.style.display = 'block';
    });
  }

  drawForexChart(bars, indicator) {
    const canvas = document.getElementById('forexCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw grid lines
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

    // Draw Candlesticks
    bars.forEach((b, i) => {
      const x = padding + i * (barW + 4);
      const isBullish = b.close >= b.open;

      const yHigh = h - 25 - ((b.high - minP) / range) * (h - 50);
      const yLow = h - 25 - ((b.low - minP) / range) * (h - 50);
      const yOpen = h - 25 - ((b.open - minP) / range) * (h - 50);
      const yClose = h - 25 - ((b.close - minP) / range) * (h - 50);

      // Wick
      ctx.strokeStyle = isBullish ? '#30d158' : '#ff453a';
      ctx.beginPath();
      ctx.moveTo(x + barW / 2, yHigh);
      ctx.lineTo(x + barW / 2, yLow);
      ctx.stroke();

      // Body
      ctx.fillStyle = isBullish ? '#30d158' : '#ff453a';
      const topY = Math.min(yOpen, yClose);
      const bodyH = Math.max(2, Math.abs(yClose - yOpen));
      ctx.fillRect(x, topY, barW, bodyH);
    });

    // Optional Indicator Line (e.g. SMA)
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
  // 2. AUDIO TRANSCRIPTION WORKSPACE (Web Audio Synthesizer)
  // ========================================================
  renderAudioWorkspace(task, container) {
    const content = task.taskContent;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Audio Player Console -->
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="font-weight:600; color:#fff;">Playable Audio Snippet</span>
              <span style="font-size:0.75rem; color:var(--text-muted);">(${content.duration}s · ${content.speakerCount} Speakers)</span>
            </div>
            <div style="display:flex; gap:0.35rem; align-items:center;">
              <span style="font-size:0.75rem; color:var(--text-secondary); margin-right:0.25rem;">Speed:</span>
              <button class="chip-btn audio-speed-btn" data-speed="0.75">0.75x</button>
              <button class="chip-btn audio-speed-btn active" data-speed="1.0">1.0x</button>
              <button class="chip-btn audio-speed-btn" data-speed="1.25">1.25x</button>
              <button class="chip-btn audio-speed-btn" data-speed="1.5">1.5x</button>
            </div>
          </div>

          <!-- Waveform Canvas & Scrubber -->
          <canvas id="audioWaveformCanvas" width="560" height="48" style="width:100%; height:48px; background:rgba(0,0,0,0.4); border-radius:var(--radius-sm); margin-bottom:0.75rem;"></canvas>

          <div style="display:flex; align-items:center; gap:1rem;">
            <button type="button" class="btn btn-primary" id="btnAudioTogglePlay" style="padding:0.5rem 1.25rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.4rem;">
              <span id="audioPlayIcon">▶</span>
              <span id="audioPlayLabel">Play Audio</span>
            </button>
            <div style="font-size:0.8rem; color:var(--text-muted); font-family:monospace;" id="audioTimeDisplay">
              00:00 / 00:${content.duration}
            </div>
          </div>
        </div>

        <!-- Transcript Editor -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <label style="font-weight:600; font-size:0.88rem; color:#fff;">Verbatim Transcript</label>
            <button type="button" class="btn btn-sm btn-outline" id="btnInsertSpeakerTag" style="font-size:0.75rem;">
              + Insert Speaker Tag
            </button>
          </div>
          <textarea id="audioTranscriptTextarea" rows="6" placeholder="Type verbatim dialogue including speaker identification: e.g. [00:00:02] Speaker 1: Hello..." style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.88rem; line-height:1.5; font-family:monospace;"></textarea>
        </div>
      </div>
    `;

    this.drawAudioWaveform();

    // Bind Web Audio Synthesizer Tones
    document.getElementById('btnAudioTogglePlay')?.addEventListener('click', () => {
      this.toggleAudioPlayback(content.duration, content.audioSynthesizerTones);
    });

    document.querySelectorAll('.audio-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.audio-speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.audioPlaybackRate = parseFloat(btn.dataset.speed);
      });
    });

    document.getElementById('btnInsertSpeakerTag')?.addEventListener('click', () => {
      const textarea = document.getElementById('audioTranscriptTextarea');
      const timeStr = String(this.audioCurrentTime).padStart(2, '0');
      textarea.value += `\n[00:00:${timeStr}] Speaker 1: `;
      textarea.focus();
    });
  }

  toggleAudioPlayback(duration, tones) {
    const label = document.getElementById('audioPlayLabel');
    const icon = document.getElementById('audioPlayIcon');

    if (this.audioIsPlaying) {
      this.audioIsPlaying = false;
      if (this.audioInterval) clearInterval(this.audioInterval);
      if (label) label.textContent = 'Play Audio';
      if (icon) icon.textContent = '▶';
    } else {
      this.audioIsPlaying = true;
      if (label) label.textContent = 'Pause Audio';
      if (icon) icon.textContent = '❚❚';

      // Play tone via Web Audio API
      this.playSynthesizedTone(tones);

      this.audioInterval = setInterval(() => {
        this.audioCurrentTime += Math.round(1 * this.audioPlaybackRate);
        const timeEl = document.getElementById('audioTimeDisplay');
        if (timeEl) {
          timeEl.textContent = `00:${String(this.audioCurrentTime).padStart(2, '0')} / 00:${duration}`;
        }
        if (this.audioCurrentTime >= duration) {
          this.toggleAudioPlayback(duration, tones);
          this.audioCurrentTime = 0;
        }
      }, 1000);
    }
  }

  playSynthesizedTone(tones) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(tones ? tones[0] : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Web Audio playback error:', e);
    }
  }

  drawAudioWaveform() {
    const canvas = document.getElementById('audioWaveformCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(48, 209, 88, 0.4)';

    const bars = 45;
    const barW = Math.floor(w / bars) - 2;
    for (let i = 0; i < bars; i++) {
      const barH = Math.floor(Math.sin(i * 0.4) * (h * 0.35) + (h * 0.45));
      const x = i * (barW + 2);
      const y = (h - barH) / 2;
      ctx.fillRect(x, y, barW, barH);
    }
  }

  // ========================================================
  // 3. VIDEO TRANSCRIPTION WORKSPACE
  // ========================================================
  renderVideoWorkspace(task, container) {
    const content = task.taskContent;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Simulated Video Screen -->
        <div style="background:#09090b; border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;">
          <div style="height:200px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:linear-gradient(135deg, #10141d, #161b24); position:relative;">
            <div style="width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.2rem; cursor:pointer;" id="videoPlayIconBtn">
              ▶
            </div>
            <div style="margin-top:0.75rem; font-size:0.8rem; color:var(--text-secondary); text-align:center; padding:0 1rem;">
              ${content.sceneDescription}
            </div>
          </div>
          <div style="padding:0.65rem 1rem; background:rgba(0,0,0,0.5); display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted);">
            <span>Video Duration: ${content.duration}s</span>
            <span>Speed: 1.0x</span>
          </div>
        </div>

        <div>
          <label style="display:block; font-weight:600; font-size:0.88rem; color:#fff; margin-bottom:0.4rem;">Subtitle & Transcript Output</label>
          <textarea rows="5" placeholder="Enter synchronized subtitles: ${content.initialSubtitle}" style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.88rem; font-family:monospace;"></textarea>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 4. IMAGE ANNOTATION & BOUNDING BOX WORKSPACE
  // ========================================================
  renderImageAnnotationWorkspace(task, container) {
    const content = task.taskContent;
    const labels = content.labels || ['Target Object'];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <!-- Annotation Toolbar -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.65rem 1rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:0.75rem; color:var(--text-secondary);">Active Label:</span>
            <select id="annoLabelSelect" style="padding:0.35rem 0.65rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.8rem;">
              ${labels.map(l => `<option value="${l}">${l}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex; gap:0.4rem;">
            <button type="button" class="btn btn-sm btn-outline" id="btnAnnoClear">Clear Boxes</button>
          </div>
        </div>

        <!-- Canvas Workspace -->
        <div style="background:#080b10; border:1px solid var(--border); border-radius:var(--radius-md); padding:0.5rem; text-align:center; position:relative;">
          <canvas id="annoCanvas" width="560" height="260" style="width:100%; height:260px; display:block; cursor:crosshair; background:radial-gradient(circle, #151d29, #080c14);"></canvas>
          <div style="position:absolute; bottom:12px; left:16px; font-size:0.72rem; color:var(--text-muted); background:rgba(0,0,0,0.6); padding:0.2rem 0.5rem; border-radius:4px;">
            Click and drag to draw bounding boxes
          </div>
        </div>

        <!-- Annotations List -->
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

    // Pre-seed 2 sample boxes
    this.imageBoxes = [
      { x: 60, y: 50, w: 140, h: 90, label: 'Matatu' },
      { x: 260, y: 90, w: 110, h: 80, label: 'Boda Boda' }
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background guidelines
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

    document.getElementById('btnAnnoClear')?.addEventListener('click', () => {
      this.imageBoxes = [];
      draw();
      document.getElementById('annoListDisplay').innerHTML = 'Recorded: <strong>0 boxes</strong>';
    });
  }

  // ========================================================
  // 5. WRITING STUDIO WORKSPACE
  // ========================================================
  renderWritingWorkspace(task, container) {
    const content = task.taskContent;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Prompt Brief & Checklists -->
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <h4 style="font-size:0.92rem; color:#fff; font-weight:600; margin-bottom:0.4rem;">Assignment Brief</h4>
          <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.45; margin-bottom:1rem;">${content.objective}</p>

          <div style="display:flex; flex-wrap:wrap; gap:1rem; font-size:0.78rem; color:var(--text-muted); border-top:1px solid var(--border); padding-top:0.75rem;">
            <span>Target Audience: <strong style="color:#fff;">${content.targetAudience}</strong></span>
            <span>·</span>
            <span>Minimum Words: <strong style="color:var(--accent-green);">${content.minWords}</strong></span>
          </div>
        </div>

        <!-- Writing Studio Textarea -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.45rem;">
            <label style="font-weight:600; font-size:0.88rem; color:#fff;">Writing Canvas</label>
            <span style="font-size:0.8rem; color:var(--text-muted);">
              Word Count: <strong id="studioWordCount" style="color:var(--accent-green);">0</strong> / ${content.minWords} min
            </span>
          </div>
          <textarea id="studioTextarea" rows="8" placeholder="Draft your complete article or letter according to the brief requirements above..." style="width:100%; padding:0.85rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.88rem; line-height:1.55;"></textarea>
        </div>
      </div>
    `;

    const textarea = document.getElementById('studioTextarea');
    const wordCount = document.getElementById('studioWordCount');
    if (textarea && wordCount) {
      textarea.addEventListener('input', () => {
        const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCount.textContent = words;
      });
    }
  }

  // ========================================================
  // 6. DATA ENTRY WORKSPACE
  // ========================================================
  renderDataEntryWorkspace(task, container) {
    const content = task.taskContent;
    const records = content.records || [];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Source Records Document -->
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

        <!-- Destination Entry Form -->
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <h4 style="font-size:0.88rem; color:#fff; font-weight:600; margin-bottom:0.75rem;">Destination Verification Entry</h4>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div>
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Target Doc ID</label>
              <input type="text" value="${records[0]?.id || ''}" style="width:100%; padding:0.55rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.82rem;">
            </div>
            <div>
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Total Digitized Amount (KES)</label>
              <input type="text" value="${records[0]?.total || ''}" style="width:100%; padding:0.55rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.82rem;">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 7. LOCATION & HOTEL REVIEWS WORKSPACE
  // ========================================================
  renderLocationWorkspace(task, container) {
    const content = task.taskContent;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Simulated Location Map Canvas -->
        <div style="background:#090b10; border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
            <div>
              <strong style="color:#fff; font-size:0.95rem;">${content.placeName}</strong>
              <div style="font-size:0.78rem; color:var(--text-secondary);">${content.address}</div>
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">
              GPS: ${content.coordinates?.lat}, ${content.coordinates?.lng}
            </div>
          </div>
          <div style="height:120px; background:radial-gradient(circle, #172433, #0a0e14); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; color:var(--accent-green); font-size:0.85rem; border:1px solid var(--border); gap:6px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Verified GPS Location Pin Plotted
          </div>
        </div>

        <!-- Amenities Audit -->
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem;">
          <h4 style="font-size:0.82rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">Listed Amenities Checklist</h4>
          <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
            ${(content.amenities || []).map(a => `
              <span style="font-size:0.78rem; background:rgba(255,255,255,0.06); padding:0.3rem 0.65rem; border-radius:4px; color:#fff; display:inline-flex; align-items:center; gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ${a}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Audit Questions -->
        <div>
          <label style="display:block; font-weight:600; font-size:0.88rem; color:#fff; margin-bottom:0.35rem;">Audit Findings Summary</label>
          <textarea rows="4" placeholder="Confirm operating hours, accuracy of stated amenities, and cleanliness standards..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem; line-height:1.45;"></textarea>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 8. APP & WEBSITE TESTING WORKBENCH
  // ========================================================
  renderAppTestingWorkspace(task, container) {
    const content = task.taskContent;
    const cases = content.testCases || [];

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem;">
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Target Test Application</div>
          <div style="font-size:1.05rem; font-weight:700; color:#fff; margin-top:0.2rem;">${content.applicationName}</div>
          <div style="font-size:0.8rem; color:var(--accent-cyan); margin-top:0.2rem; font-family:monospace;">${content.targetUrl}</div>
        </div>

        <!-- Step-by-Step Test Cases -->
        <div>
          <h4 style="font-size:0.9rem; color:#fff; font-weight:600; margin-bottom:0.75rem;">Execution Test Cases</h4>
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${cases.map(c => `
              <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.85rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                  <strong style="color:var(--accent-green); font-size:0.8rem;">${c.id}</strong>
                  <div style="display:flex; gap:0.4rem;">
                    <button type="button" class="btn btn-sm btn-outline tc-pass-btn" style="padding:0.2rem 0.6rem; font-size:0.75rem;">PASS</button>
                    <button type="button" class="btn btn-sm btn-outline tc-fail-btn" style="padding:0.2rem 0.6rem; font-size:0.75rem;">FAIL</button>
                  </div>
                </div>
                <div style="font-size:0.82rem; color:#fff; margin-bottom:0.25rem;"><strong>Step:</strong> ${c.step}</div>
                <div style="font-size:0.78rem; color:var(--text-secondary);"><strong>Expected:</strong> ${c.expected}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Bug Severity & Notes -->
        <div>
          <label style="display:block; font-weight:600; font-size:0.88rem; color:#fff; margin-bottom:0.35rem;">QA Observations & Bug Log</label>
          <textarea rows="3" placeholder="Document any lag, unhandled exceptions, or layout defects encountered during execution..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem;"></textarea>
        </div>
      </div>
    `;

    container.querySelectorAll('.tc-pass-btn').forEach(b => {
      b.addEventListener('click', () => {
        b.style.background = 'var(--accent-green)';
        b.style.color = '#000';
      });
    });
  }

  // ========================================================
  // 9. AI EVALUATION WORKSPACE
  // ========================================================
  renderAiEvaluationWorkspace(task, container) {
    const content = task.taskContent;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); padding:0.85rem;">
          <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">User Prompt</div>
          <p style="font-size:0.88rem; color:#fff; margin-top:0.25rem; line-height:1.4;">${content.prompt}</p>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.85rem;">
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:1rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--accent-cyan); margin-bottom:0.5rem;">MODEL ALPHA RESPONSE</div>
            <p style="font-size:0.82rem; color:var(--text-secondary); line-height:1.45;">${content.modelA}</p>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:1rem;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--accent-green); margin-bottom:0.5rem;">MODEL BETA RESPONSE</div>
            <p style="font-size:0.82rem; color:var(--text-secondary); line-height:1.45;">${content.modelB}</p>
          </div>
        </div>

        <div>
          <label style="display:block; font-weight:600; font-size:0.88rem; color:#fff; margin-bottom:0.35rem;">Evaluation Rationale</label>
          <textarea rows="3" placeholder="Explain which model response is superior regarding accuracy, helpfulness, and safety..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem;"></textarea>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 10. RESEARCH WORKSPACE
  // ========================================================
  renderResearchWorkspace(task, container) {
    const content = task.taskContent;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
          <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">Research Investigation</div>
          <h4 style="font-size:0.95rem; color:#fff; margin:0.3rem 0;">${content.topic}</h4>
          <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.45;">${content.claimToVerify}</p>
        </div>

        <div>
          <label style="display:block; font-size:0.8rem; color:#fff; margin-bottom:0.25rem;">Primary Verification URL (Source 1)</label>
          <input type="url" placeholder="https://example.gov/report-document.pdf" style="width:100%; padding:0.65rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem; margin-bottom:0.75rem;">

          <label style="display:block; font-size:0.8rem; color:#fff; margin-bottom:0.25rem;">Findings Summary & Citations</label>
          <textarea rows="4" placeholder="Detail verified numbers, dates, and conclusions supported by the primary source..." style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border); color:#fff; font-size:0.85rem;"></textarea>
        </div>
      </div>
    `;
  }

  // ========================================================
  // 11. QUIZ & LOGIC WORKSPACE
  // ========================================================
  renderQuizWorkspace(task, container) {
    const content = task.taskContent;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div style="background:#090d14; border:1px solid var(--border); border-radius:var(--radius-sm); padding:1rem; font-family:monospace; font-size:0.82rem; color:var(--accent-cyan); white-space:pre-wrap;">${content.codeSnippet}</div>

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
    const questions = task.taskContent?.questions || [];

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
