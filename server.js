import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Server-side production services
import { ledgerService } from './server/ledger.js';
import { taskService } from './server/tasks.js';
import { forexEngine } from './server/forex.js';
import { chatService } from './server/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// Log API requests
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[API] ${req.method} ${req.originalUrl} - ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// ==========================================
// 1. SYSTEM & HEALTH
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    platform: 'EARNWAVE Production Task Marketplace',
    darajaStatus: 'CONNECTED',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 2. AUTHORITATIVE WALLET & FINANCIAL LEDGER
// ==========================================
app.get('/api/wallet/balance', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const balance = ledgerService.getBalance(userId);
    res.json({ success: true, balance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/wallet/ledger', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const transactions = ledgerService.getTransactions(userId);
    const balance = ledgerService.getBalance(userId);
    res.json({ success: true, balance, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/wallet/withdraw', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const { phone, amount } = req.body;
    const result = ledgerService.requestWithdrawal({ userId, phone, amount });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. TASK EXECUTION, AUTOSAVE & SUBMISSION
// ==========================================
app.post('/api/tasks/:id/autosave', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const taskId = req.params.id;
    const { payload } = req.body;
    const result = taskService.saveDraft(userId, taskId, payload);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/tasks/:id/draft', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const taskId = req.params.id;
    const draft = taskService.getDraft(userId, taskId);
    res.json({ success: true, draft });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks/:id/submit', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const taskId = req.params.id;
    const { taskType, taskTitle, rewardKes, payload } = req.body;
    const result = taskService.submitTask({
      userId,
      taskId,
      taskType,
      taskTitle,
      rewardKes,
      payload
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. ADMIN DESK & REVIEW OPERATIONS
// ==========================================
app.get('/api/admin/submissions', (req, res) => {
  try {
    const filter = req.query.filter || 'ALL';
    const submissions = taskService.getSubmissions(filter);
    res.json({ success: true, submissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/submissions/:id/review', (req, res) => {
  try {
    const submissionId = req.params.id;
    const { action, reviewerNotes } = req.body;
    const result = taskService.reviewSubmission({ submissionId, action, reviewerNotes });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/tasks/create', (req, res) => {
  try {
    const taskData = req.body;
    const created = taskService.createCustomTask(taskData);
    res.json({ success: true, task: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/tasks', (req, res) => {
  try {
    const tasks = taskService.getCustomTasks();
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/ledger', (req, res) => {
  try {
    const txs = ledgerService.getAllTransactions();
    res.json({ success: true, transactions: txs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. FOREX SIMULATION ENGINE (STRICTLY ISOLATED)
// ==========================================
app.get('/api/forex/account', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const account = forexEngine.getAccount(userId);
    const rates = forexEngine.getRates();
    res.json({ success: true, account, rates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/forex/rates', (req, res) => {
  res.json({ success: true, rates: forexEngine.getRates() });
});

app.post('/api/forex/trade', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const { pair, type, lotSize, stopLoss, takeProfit } = req.body;
    const result = forexEngine.openTrade({
      userId,
      pair,
      type,
      lotSize,
      stopLoss,
      takeProfit
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/forex/close', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const { positionId } = req.body;
    const result = forexEngine.closeTrade({ userId, positionId });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. CONVERSATIONAL AI CHARACTERS & REWARDS
// ==========================================
app.post('/api/chat/message', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_default';
    const { character, message, history } = req.body;
    const result = await chatService.processMessage({
      userId,
      character,
      message,
      history
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. STATIC FILES & CLIENT ROUTING
// ==========================================
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html']
}));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all for HTML or direct files
app.get('*', (req, res) => {
  const cleanPath = req.path.replace(/\/$/, '');
  const htmlFilePath = path.join(__dirname, 'public', cleanPath + '.html');
  if (fs.existsSync(htmlFilePath)) {
    return res.sendFile(htmlFilePath);
  }
  const directPath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return res.sendFile(directPath);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`EARNWAVE server is running on http://${HOST}:${PORT}`);
});
