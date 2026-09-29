/**
 * EARNWAVE - Server-Side Task Execution & Validation Engine
 * Enforces server-side trust, validation criteria, autosaves, and review queues.
 */
import { JsonStore } from './storage.js';
import { ledgerService, TRANSACTION_TYPES } from './ledger.js';
import crypto from 'crypto';

class TaskService {
  constructor() {
    this.submissionsStore = new JsonStore('submissions.json', { submissions: [] });
    this.draftsStore = new JsonStore('drafts.json', { drafts: {} });
    this.customTasksStore = new JsonStore('custom_tasks.json', { tasks: [] });
  }

  // --- Autosave Draft Management ---
  saveDraft(userId = 'usr_default', taskId, payload) {
    if (!taskId) throw new Error('Task ID is required for autosave');
    const data = this.draftsStore.read();
    const key = `${userId}_${taskId}`;
    data.drafts = data.drafts || {};
    data.drafts[key] = {
      userId,
      taskId,
      payload,
      updatedAt: new Date().toISOString()
    };
    this.draftsStore.write(data);
    return { success: true, savedAt: data.drafts[key].updatedAt };
  }

  getDraft(userId = 'usr_default', taskId) {
    const data = this.draftsStore.read();
    const key = `${userId}_${taskId}`;
    return data.drafts?.[key] || null;
  }

  deleteDraft(userId = 'usr_default', taskId) {
    const data = this.draftsStore.read();
    const key = `${userId}_${taskId}`;
    if (data.drafts && data.drafts[key]) {
      delete data.drafts[key];
      this.draftsStore.write(data);
    }
  }

  // --- Submissions & Validation ---
  submitTask({ userId = 'usr_default', taskId, taskType, taskTitle, rewardKes, payload }) {
    if (!taskId) throw new Error('Task ID required');
    if (!payload) throw new Error('Submission payload required');

    // 1. Run Server-Side Validation Rules
    const validationResult = this.validatePayload(taskType, payload);
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.reason}`);
    }

    const submissionId = 'sub_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    const reward = Number(rewardKes) || 0;

    // Determine review policy: Complex writing/audits require human or asynchronous review; others qualify for instant validated credit
    const requiresManualReview = ['writing', 'local_review', 'usability'].includes(taskType);

    const submission = {
      id: submissionId,
      userId,
      taskId,
      taskType,
      taskTitle: taskTitle || `Task ${taskId}`,
      rewardKes: reward,
      payload,
      status: requiresManualReview ? 'PENDING_REVIEW' : 'APPROVED',
      validationNotes: validationResult.notes || 'All automated server validation checks passed.',
      submittedAt: new Date().toISOString(),
      reviewedAt: requiresManualReview ? null : new Date().toISOString()
    };

    const subsData = this.submissionsStore.read();
    subsData.submissions = subsData.submissions || [];
    subsData.submissions.push(submission);
    this.submissionsStore.write(subsData);

    // Clean up draft
    this.deleteDraft(userId, taskId);

    // If instantly approved, record authoritative transaction immediately
    let ledgerResult = null;
    if (submission.status === 'APPROVED' && reward > 0) {
      const txType = this.getTxTypeForTask(taskType);
      ledgerResult = ledgerService.recordTransaction({
        userId,
        type: txType,
        amount: reward,
        direction: 'CREDIT',
        status: 'COMPLETED',
        description: `Task Verified: ${submission.taskTitle}`,
        referenceId: submission.id,
        metadata: { taskId, submissionId }
      });
    }

    return {
      success: true,
      submissionId: submission.id,
      status: submission.status,
      reward: reward,
      message: requiresManualReview
        ? 'Your work has been submitted to the QA Verification Queue. Rewards will be credited upon review.'
        : `Verification complete! Server credited KES ${reward.toFixed(2)} to your authoritative wallet ledger.`,
      newBalance: ledgerResult ? ledgerResult.newBalance.availableBalance : null
    };
  }

  getTxTypeForTask(taskType) {
    switch (taskType) {
      case 'survey': return TRANSACTION_TYPES.SURVEY_REWARD;
      case 'writing': return TRANSACTION_TYPES.WRITING_REWARD;
      case 'ai_evaluation':
      case 'ai_data': return TRANSACTION_TYPES.AI_TRAINING_REWARD;
      default: return TRANSACTION_TYPES.TASK_REWARD;
    }
  }

  validatePayload(taskType, payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, reason: 'Payload must be a valid JSON object' };
    }

    switch (taskType) {
      case 'writing': {
        const text = String(payload.content || '').trim();
        const words = text.split(/\s+/).filter(Boolean);
        const minWords = payload.targetWords || 80;
        if (words.length < minWords) {
          return { valid: false, reason: `Minimum word count not met. Required: ${minWords} words, provided: ${words.length} words.` };
        }
        if (text.length < 200) {
          return { valid: false, reason: 'Article content is too brief to meet quality standards.' };
        }
        return { valid: true, notes: `Word count verified: ${words.length} words.` };
      }

      case 'transcription':
      case 'audio': {
        const transcript = String(payload.transcript || '').trim();
        if (transcript.length < 20) {
          return { valid: false, reason: 'Transcript is incomplete or empty.' };
        }
        return { valid: true, notes: 'Audio transcription length verified.' };
      }

      case 'data_entry': {
        const entries = Array.isArray(payload.entries) ? payload.entries : [];
        if (entries.length === 0) {
          return { valid: false, reason: 'No data records were entered.' };
        }
        for (let i = 0; i < entries.length; i++) {
          const item = entries[i];
          if (!item.sku || !item.name) {
            return { valid: false, reason: `Row #${i + 1} has missing SKU or description.` };
          }
          if (isNaN(Number(item.price)) || Number(item.price) <= 0) {
            return { valid: false, reason: `Row #${i + 1} has an invalid numeric price.` };
          }
        }
        return { valid: true, notes: `Validated ${entries.length} structured ledger records with no format errors.` };
      }

      case 'image_annotation': {
        const boxes = Array.isArray(payload.boxes) ? payload.boxes : [];
        if (boxes.length === 0) {
          return { valid: false, reason: 'At least one bounding box annotation is required.' };
        }
        for (const box of boxes) {
          if (typeof box.x !== 'number' || typeof box.width !== 'number' || !box.label) {
            return { valid: false, reason: 'Invalid bounding box geometry or missing classification label.' };
          }
        }
        return { valid: true, notes: `Validated ${boxes.length} bounding box annotations.` };
      }

      case 'survey': {
        const answers = payload.answers || {};
        const keys = Object.keys(answers);
        if (keys.length === 0) {
          return { valid: false, reason: 'Survey questions cannot be left unanswered.' };
        }
        return { valid: true, notes: `All ${keys.length} survey items answered.` };
      }

      case 'ai_evaluation': {
        if (!payload.preferredModel) {
          return { valid: false, reason: 'Please select a preferred model or declare a tie.' };
        }
        const reasoning = String(payload.reasoning || '').trim();
        if (reasoning.length < 20) {
          return { valid: false, reason: 'Please provide a substantive evaluation explanation (minimum 20 characters).' };
        }
        return { valid: true, notes: 'Comparative evaluation and reasoning verified.' };
      }

      case 'local_review': {
        const notes = String(payload.reviewNotes || payload.comments || '').trim();
        if (notes.length < 30) {
          return { valid: false, reason: 'Location audit findings must be at least 30 characters.' };
        }
        return { valid: true, notes: 'Business verification audit verified.' };
      }

      case 'usability':
      case 'testing': {
        const issue = String(payload.issueSummary || '').trim();
        const steps = String(payload.steps || '').trim();
        if (issue.length < 15 || steps.length < 20) {
          return { valid: false, reason: 'Detailed bug summary and reproduction steps are mandatory.' };
        }
        return { valid: true, notes: 'Test report meets QA criteria.' };
      }

      case 'quiz': {
        const userAnswers = payload.answers || {};
        const score = Number(payload.score) || 0;
        const total = Number(payload.total) || 5;
        const percentage = (score / total) * 100;
        if (percentage < 60) {
          return { valid: false, reason: `Quiz pass threshold is 60%. Your score: ${percentage.toFixed(0)}%. You can retake the quiz.` };
        }
        return { valid: true, notes: `Passed quiz with ${score}/${total} (${percentage.toFixed(0)}%).` };
      }

      default:
        // Generic fallback check
        if (Object.keys(payload).length === 0) {
          return { valid: false, reason: 'Task response cannot be empty.' };
        }
        return { valid: true, notes: 'Generic payload verified.' };
    }
  }

  // --- Admin Review Operations ---
  getSubmissions(filter = 'ALL') {
    const data = this.submissionsStore.read();
    let subs = data.submissions || [];
    if (filter === 'PENDING') {
      subs = subs.filter(s => s.status === 'PENDING_REVIEW');
    } else if (filter === 'APPROVED') {
      subs = subs.filter(s => s.status === 'APPROVED');
    } else if (filter === 'REJECTED') {
      subs = subs.filter(s => s.status === 'REJECTED');
    }
    return subs.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  reviewSubmission({ submissionId, action, reviewerNotes = '' }) {
    const data = this.submissionsStore.read();
    const sub = (data.submissions || []).find(s => s.id === submissionId);
    if (!sub) {
      throw new Error(`Submission ${submissionId} not found`);
    }
    if (sub.status !== 'PENDING_REVIEW') {
      throw new Error(`Submission ${submissionId} has already been reviewed (Status: ${sub.status})`);
    }

    if (action === 'APPROVE') {
      sub.status = 'APPROVED';
      sub.reviewedAt = new Date().toISOString();
      sub.reviewerNotes = reviewerNotes || 'Approved by Staff Quality Review.';

      // Credit the ledger
      const txType = this.getTxTypeForTask(sub.taskType);
      const ledgerResult = ledgerService.recordTransaction({
        userId: sub.userId,
        type: txType,
        amount: sub.rewardKes,
        direction: 'CREDIT',
        status: 'COMPLETED',
        description: `Manual Review Approved: ${sub.taskTitle}`,
        referenceId: sub.id,
        metadata: { submissionId, reviewerNotes: sub.reviewerNotes }
      });

      this.submissionsStore.write(data);
      return { success: true, submission: sub, newBalance: ledgerResult.newBalance };
    } else if (action === 'REJECT') {
      sub.status = 'REJECTED';
      sub.reviewedAt = new Date().toISOString();
      sub.reviewerNotes = reviewerNotes || 'Does not satisfy assignment quality criteria.';
      this.submissionsStore.write(data);
      return { success: true, submission: sub };
    } else {
      throw new Error(`Invalid review action: ${action}`);
    }
  }

  // --- Custom Task Creation (Admin) ---
  createCustomTask(taskData) {
    if (!taskData.title || !taskData.category || !taskData.reward) {
      throw new Error('Title, category, and reward are required');
    }
    const data = this.customTasksStore.read();
    data.tasks = data.tasks || [];
    const taskId = 'custom_' + Date.now().toString(36);
    const newTask = {
      id: taskId,
      title: taskData.title,
      category: taskData.category,
      type: taskData.type || taskData.category,
      difficulty: taskData.difficulty || 'Intermediate',
      estimatedMinutes: Number(taskData.estimatedMinutes) || 15,
      reward: Number(taskData.reward),
      description: taskData.description || '',
      instructions: taskData.instructions || [],
      validationRules: taskData.validationRules || {},
      content: taskData.content || {},
      createdAt: new Date().toISOString()
    };
    data.tasks.push(newTask);
    this.customTasksStore.write(data);
    return newTask;
  }

  getCustomTasks() {
    const data = this.customTasksStore.read();
    return data.tasks || [];
  }
}

export const taskService = new TaskService();
