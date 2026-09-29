/**
 * EARNWAVE - Gamification Data: Achievements, Levels & Leaderboards
 */
export const LEVELS = [
  { level: 1, name: 'Novice Earner', minXp: 0, bonusMultiplier: 1.0 },
  { level: 2, name: 'Active Contributor', minXp: 500, bonusMultiplier: 1.02 },
  { level: 3, name: 'Skilled Specialist', minXp: 1500, bonusMultiplier: 1.05 },
  { level: 4, name: 'Master Evaluator', minXp: 3500, bonusMultiplier: 1.08 },
  { level: 5, name: 'Elite Wavemaker', minXp: 7000, bonusMultiplier: 1.12 },
  { level: 6, name: 'Legendary Architect', minXp: 15000, bonusMultiplier: 1.15 }
];

export const ACHIEVEMENTS = [
  { id: 'first_task', name: 'First Wave', iconKey: 'bolt', desc: 'Complete your first marketplace task', xp: 100, rewardKes: 50 },
  { id: 'task_streak_3', name: 'Habit Former', iconKey: 'streak', desc: 'Maintain a 3-day active task streak', xp: 250, rewardKes: 100 },
  { id: 'task_streak_7', name: 'Unstoppable', iconKey: 'streak', desc: 'Maintain a 7-day active task streak', xp: 600, rewardKes: 250 },
  { id: 'tasks_10', name: 'Centurion', iconKey: 'checkCircle', desc: 'Successfully finish 10 verified tasks', xp: 400, rewardKes: 150 },
  { id: 'tasks_50', name: 'Veteran Earner', iconKey: 'admin', desc: 'Successfully finish 50 verified tasks', xp: 1200, rewardKes: 500 },
  { id: 'first_withdrawal', name: 'Payday', iconKey: 'wallet', desc: 'Complete your first M-Pesa withdrawal', xp: 300, rewardKes: 50 },
  { id: 'referral_champion', name: 'Networker', iconKey: 'users', desc: 'Invite 3 friends who complete their first task', xp: 500, rewardKes: 300 },
  { id: 'accuracy_master', name: 'Eagle Eye', iconKey: 'search', desc: 'Achieve 98%+ accuracy across 20 review tasks', xp: 800, rewardKes: 400 },
  { id: 'knowledge_guru', name: 'Brainiac', iconKey: 'cat_knowledge', desc: 'Solve 10 code or logic challenges correctly', xp: 700, rewardKes: 350 },
  { id: 'store_patron', name: 'Scholar', iconKey: 'cat_writing', desc: 'Acquire your first digital learning product', xp: 200, rewardKes: 50 }
];

export const INITIAL_LEADERBOARD = [
  { rank: 1, username: 'MwangiPro_KE', earnings: 14850, tasksCompleted: 64, level: 5, initials: 'MP' },
  { rank: 2, username: 'Amina_Dev', earnings: 12400, tasksCompleted: 58, level: 4, initials: 'AD' },
  { rank: 3, username: 'KibetResearch', earnings: 11200, tasksCompleted: 51, level: 4, initials: 'KR' },
  { rank: 4, username: 'Wanjiku_Writes', earnings: 9750, tasksCompleted: 44, level: 4, initials: 'WW' },
  { rank: 5, username: 'Onyango_Logic', earnings: 8300, tasksCompleted: 39, level: 3, initials: 'OL' },
  { rank: 6, username: 'FatumaMarket', earnings: 7450, tasksCompleted: 35, level: 3, initials: 'FM' },
  { rank: 7, username: 'Cheruiyot_Data', earnings: 6900, tasksCompleted: 32, level: 3, initials: 'CD' },
  { rank: 8, username: 'Otieno_UX', earnings: 6150, tasksCompleted: 29, level: 3, initials: 'OU' },
  { rank: 9, username: 'NaserianTravel', earnings: 5600, tasksCompleted: 26, level: 2, initials: 'NT' },
  { rank: 10, username: 'Kamau_Quality', earnings: 4950, tasksCompleted: 23, level: 2, initials: 'KQ' }
];
