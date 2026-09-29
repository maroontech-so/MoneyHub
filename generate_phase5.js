const fs = require('fs');
const path = require('path');

const dirs = [
  'public/js',
  'public/css',
  'functions/src/tasks'
];

for (const dir of dirs) {
  fs.mkdirSync(dir, { recursive: true });
}

const files = {
  'public/hotels.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hotel Reviews - Earnwave</title>
    <link rel="stylesheet" href="/css/dashboard.css">
</head>
<body>
    <header>
        <h1>Hotel Reviews</h1>
        <div class="search-bar">
            <input type="text" id="searchInput" placeholder="Search hotels...">
        </div>
        <div class="filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="available">Available</button>
            <button class="filter-btn" data-filter="locked">Locked</button>
            <button class="filter-btn" data-filter="completed">Completed</button>
        </div>
    </header>
    <main>
        <div id="loadingState" class="loading-skeleton">Loading hotels...</div>
        <div id="emptyState" class="empty-state" style="display:none;">No hotels found.</div>
        <div id="hotelsList" class="hotel-grid"></div>
        <p class="note">Rewards subject to quality review and approval. See terms.</p>
    </main>
    <script src="/js/hotels.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => loadHotels());
    </script>
</body>
</html>`,

  'public/hotel.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hotel Review - Earnwave</title>
    <link rel="stylesheet" href="/css/dashboard.css">
</head>
<body>
    <main id="hotelApp">
        <div id="hotelHero" class="hero"></div>
        <div class="hotel-info">
            <h1 id="hotelName">Loading...</h1>
            <p id="hotelLocation"></p>
            <div id="hotelRating"></div>
        </div>
        
        <section class="assignment-section">
            <h2>Assignment</h2>
            <p id="hotelBrief"></p>
            <ul id="hotelRequirements">
                <li>Minimum rating required</li>
                <li>Minimum 100 words</li>
            </ul>
        </section>

        <section id="unlockSection" class="unlock-section" style="display:none;">
            <h3>Unlock this assignment</h3>
            <p>Fee: KES <span id="unlockFeeText"></span></p>
            <button id="unlockBtn">Pay with M-Pesa & Unlock</button>
        </section>

        <section id="reviewFormSection" style="display:none;">
            <form id="reviewForm">
                <label>Overall Rating (1-5):</label>
                <input type="number" id="ratingInput" min="1" max="5" required>
                
                <label>Review Title:</label>
                <input type="text" id="titleInput" minlength="10" required>
                
                <label>Detailed Review:</label>
                <textarea id="bodyInput" rows="5" required></textarea>
                <p>Word count: <span id="wordCount">0</span> / 100 minimum</p>
                
                <label>Pros (comma separated):</label>
                <input type="text" id="prosInput">
                
                <label>Cons (comma separated):</label>
                <input type="text" id="consInput">
                
                <button type="submit" id="submitReviewBtn" disabled>Submit Review</button>
            </form>
        </section>

        <div id="completedStatus" style="display:none;">
            <h3>Review Submitted!</h3>
            <p>Status: <span id="reviewStatusText"></span></p>
            <p>Reward: KES <span id="reviewRewardText"></span></p>
        </div>
    </main>
    <script src="/js/hotels.js"></script>
    <script>
        const urlParams = new URLSearchParams(window.location.search);
        const hotelId = urlParams.get('id');
        if (hotelId) loadHotel(hotelId);
    </script>
</body>
</html>`,

  'public/surveys.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Surveys - Earnwave</title>
    <link rel="stylesheet" href="/css/dashboard.css">
</head>
<body>
    <header>
        <h1>Surveys</h1>
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('available')">Available</button>
            <button class="tab-btn" onclick="switchTab('completed')">Completed</button>
        </div>
    </header>
    <main>
        <div id="loadingState">Loading surveys...</div>
        <div id="emptyState" style="display:none;">No surveys available right now.</div>
        
        <div id="surveysList" class="survey-grid"></div>
        <div id="completedSurveysList" class="survey-grid" style="display:none;"></div>

        <!-- Survey Taking Engine Modal/Section -->
        <div id="surveyTakeEngine" style="display:none;" class="modal">
            <div class="progress-bar"><div class="progress" id="surveyProgress"></div></div>
            <h3 id="questionCounter">Question 1 of X</h3>
            <p id="questionText"></p>
            <div id="answerArea"></div>
            <div class="nav-buttons">
                <button id="prevBtn" style="display:none;">Previous</button>
                <button id="nextBtn">Next</button>
                <button id="submitSurveyBtn" style="display:none;">Submit</button>
            </div>
        </div>
    </main>
    <script src="/js/surveys.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => loadSurveys());
    </script>
</body>
</html>`,

  'public/ai-training.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Training - Earnwave</title>
    <link rel="stylesheet" href="/css/dashboard.css">
</head>
<body>
    <div class="instructions-banner">Help improve AI systems. Evaluate AI responses for accuracy and quality.</div>
    <header>
        <h1>AI Training Tasks</h1>
    </header>
    <main>
        <div id="taskList" class="task-grid">
            <!-- Dynamically populated -->
        </div>

        <div id="taskView" style="display:none;" class="modal">
            <h2 id="taskPrompt"></h2>
            <div id="taskContent"></div>
            <button id="submitEvaluationBtn">Submit Evaluation</button>
        </div>
    </main>
    <script>
        // Placeholder for AI training JS
        const tasks = [
            { id: '1', type: 'response_ranking', prompt: 'Which summary is better?', reward: 50, time: 2, responseA: 'Summary A...', responseB: 'Summary B...' }
        ];
        function renderTasks() {
            const list = document.getElementById('taskList');
            list.innerHTML = tasks.map(t => \`
                <div class="card">
                    <span class="badge">\${t.type.replace('_', ' ')}</span>
                    <h3>\${t.prompt}</h3>
                    <p>Reward: KES \${t.reward} | Time: \${t.time} mins</p>
                    <button onclick="startTask('\${t.id}')">Start</button>
                </div>
            \`).join('');
        }
        function startTask(id) {
            document.getElementById('taskList').style.display = 'none';
            document.getElementById('taskView').style.display = 'block';
            document.getElementById('taskPrompt').innerText = tasks[0].prompt;
            document.getElementById('taskContent').innerHTML = \`
                <div class="response"><h4>Response A</h4><p>\${tasks[0].responseA}</p></div>
                <div class="response"><h4>Response B</h4><p>\${tasks[0].responseB}</p></div>
                <div class="rating-buttons">
                    <button>A is Better</button>
                    <button>B is Better</button>
                    <button>Both Good</button>
                    <button>Neither Good</button>
                </div>
            \`;
        }
        document.addEventListener('DOMContentLoaded', renderTasks);
    </script>
</body>
</html>`,

  'public/write-earn.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Write & Earn - Earnwave</title>
    <link rel="stylesheet" href="/css/dashboard.css">
</head>
<body>
    <header>
        <h1>Writing Assignments</h1>
    </header>
    <main>
        <div id="writingTaskList" class="task-grid">
            <!-- Simulated tasks -->
            <div class="card">
                <h3>Write an article about Finance</h3>
                <p>Discuss saving strategies in Kenya.</p>
                <p>300 - 500 words</p>
                <p>Reward: KES 200 | Deadline: Today</p>
                <span class="badge difficulty">Medium</span>
                <button onclick="openAssignment('1')">View Assignment</button>
            </div>
        </div>

        <div id="assignmentView" style="display:none;" class="modal">
            <h2>Assignment Brief</h2>
            <p>Write an article about Finance...</p>
            <p>Required: 300 - 500 words</p>
            <textarea id="writingArea" rows="15" placeholder="Start writing here..."></textarea>
            <p>Words: <span id="currentWordCount">0</span>/300 minimum</p>
            <button id="submitWritingBtn" disabled>Submit</button>
            <button id="previewBtn">Preview</button>
        </div>
    </main>
    <script>
        const writingArea = document.getElementById('writingArea');
        const countSpan = document.getElementById('currentWordCount');
        const submitBtn = document.getElementById('submitWritingBtn');

        function openAssignment(id) {
            document.getElementById('writingTaskList').style.display = 'none';
            document.getElementById('assignmentView').style.display = 'block';
        }

        writingArea.addEventListener('input', () => {
            const words = writingArea.value.trim().split(/\\s+/).filter(w => w.length > 0).length;
            countSpan.innerText = words;
            submitBtn.disabled = words < 300;
        });
    </script>
</body>
</html>`,

  'functions/src/tasks/hotels.js': `const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.unlockHotelReview = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { hotelId } = data;
    const db = admin.firestore();

    const hotelRef = db.collection('hotels').doc(hotelId);
    const hotelDoc = await hotelRef.get();
    if (!hotelDoc.exists) throw new functions.https.HttpsError('not-found', 'Hotel not found.');
    
    const hotel = hotelDoc.data();
    if (hotel.status !== 'AVAILABLE') throw new functions.https.HttpsError('failed-precondition', 'Hotel not available.');

    const taskRef = db.collection('hotelTasks').doc(\`\${userId}_\${hotelId}\`);
    const taskDoc = await taskRef.get();
    if (taskDoc.exists) throw new functions.https.HttpsError('already-exists', 'Task already unlocked.');

    if (hotel.unlockFee > 0) {
        // initiate STK push logic here...
        return { status: 'payment_required', amount: hotel.unlockFee };
    } else {
        await taskRef.set({
            userId,
            hotelId,
            status: 'UNLOCKED',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { status: 'unlocked' };
    }
});

exports.submitHotelReview = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { hotelId, rating, title, body, pros, cons, images } = data;
    const db = admin.firestore();

    const taskRef = db.collection('hotelTasks').doc(\`\${userId}_\${hotelId}\`);
    const taskDoc = await taskRef.get();
    
    if (!taskDoc.exists || taskDoc.data().status !== 'UNLOCKED') {
        throw new functions.https.HttpsError('failed-precondition', 'Task not unlocked.');
    }

    if (rating < 1 || rating > 5) throw new functions.https.HttpsError('invalid-argument', 'Invalid rating.');
    if (title.length < 10) throw new functions.https.HttpsError('invalid-argument', 'Title too short.');
    if (body.split(' ').length < 100) throw new functions.https.HttpsError('invalid-argument', 'Body too short.');

    const reviewRef = db.collection('hotelReviews').doc();
    await reviewRef.set({
        userId,
        hotelId,
        rating,
        title,
        body,
        pros,
        cons,
        images: images || [],
        status: 'UNDER_REVIEW',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await taskRef.update({ status: 'SUBMITTED' });

    // Send admin notification logic here...
    return { status: 'submitted', reviewId: reviewRef.id };
});

exports.approveHotelReview = functions.https.onCall(async (data, context) => {
    // Admin check omitted for brevity, assume valid
    const { reviewId } = data;
    const db = admin.firestore();

    const reviewRef = db.collection('hotelReviews').doc(reviewId);
    const reviewDoc = await reviewRef.get();
    if (!reviewDoc.exists) throw new functions.https.HttpsError('not-found', 'Review not found.');

    const review = reviewDoc.data();
    if (review.status === 'APPROVED') return { status: 'already_approved' };

    const hotelRef = db.collection('hotels').doc(review.hotelId);
    const hotelDoc = await hotelRef.get();
    const reward = hotelDoc.data().reward || 0;

    // Credit wallet logic
    const walletRef = db.collection('wallets').doc(review.userId);
    await walletRef.update({ balance: admin.firestore.FieldValue.increment(reward) });

    await reviewRef.update({ status: 'APPROVED' });

    return { status: 'approved', reward };
});`,

  'functions/src/tasks/surveys.js': `const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.startSurvey = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { surveyId } = data;
    const db = admin.firestore();

    const attemptId = \`\${userId}_\${surveyId}\`;
    const attemptRef = db.collection('surveyAttempts').doc(attemptId);
    const attemptDoc = await attemptRef.get();
    
    if (attemptDoc.exists) throw new functions.https.HttpsError('already-exists', 'Survey already attempted.');

    const surveyRef = db.collection('surveys').doc(surveyId);
    const surveyDoc = await surveyRef.get();
    if (!surveyDoc.exists || surveyDoc.data().status !== 'ACTIVE') {
        throw new functions.https.HttpsError('not-found', 'Survey not available.');
    }

    await attemptRef.set({
        userId,
        surveyId,
        status: 'STARTED',
        startedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { attemptId };
});

exports.submitSurvey = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { attemptId, answers } = data;
    const db = admin.firestore();

    const attemptRef = db.collection('surveyAttempts').doc(attemptId);
    const attemptDoc = await attemptRef.get();

    if (!attemptDoc.exists || attemptDoc.data().userId !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Invalid attempt.');
    }
    if (attemptDoc.data().status !== 'STARTED') {
        throw new functions.https.HttpsError('failed-precondition', 'Survey not in progress.');
    }

    const surveyId = attemptDoc.data().surveyId;
    const surveyRef = db.collection('surveys').doc(surveyId);
    const surveyDoc = await surveyRef.get();
    
    // Validate required questions omitted for brevity

    await attemptRef.update({
        answers,
        status: 'SUBMITTED',
        submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const reward = surveyDoc.data().reward || 0;
    
    if (surveyDoc.data().autoApprove) {
        const walletRef = db.collection('wallets').doc(userId);
        await walletRef.set({ balance: admin.firestore.FieldValue.increment(reward) }, { merge: true });
        await attemptRef.update({ status: 'APPROVED' });
        return { status: 'approved', reward };
    }

    return { status: 'submitted', reward: 0 };
});`,

  'functions/src/tasks/writing.js': `const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.submitWritingTask = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { taskId, content, wordCount } = data;
    const db = admin.firestore();

    const taskRef = db.collection('writingTasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) throw new functions.https.HttpsError('not-found', 'Task not found.');

    const task = taskDoc.data();
    if (wordCount < task.wordCountMin) {
        throw new functions.https.HttpsError('invalid-argument', 'Word count too low.');
    }

    const submissionRef = db.collection('writingSubmissions').doc();
    await submissionRef.set({
        taskId,
        userId,
        content,
        wordCount,
        status: 'PENDING_REVIEW',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { submissionId: submissionRef.id };
});

exports.approveWritingTask = functions.https.onCall(async (data, context) => {
    const { submissionId } = data;
    const db = admin.firestore();

    const subRef = db.collection('writingSubmissions').doc(submissionId);
    const subDoc = await subRef.get();
    if (!subDoc.exists) throw new functions.https.HttpsError('not-found', 'Submission not found.');

    const submission = subDoc.data();
    if (submission.status === 'APPROVED') return { status: 'already_approved' };

    const taskRef = db.collection('writingTasks').doc(submission.taskId);
    const taskDoc = await taskRef.get();
    const reward = taskDoc.data().reward || 0;

    const walletRef = db.collection('wallets').doc(submission.userId);
    await walletRef.set({ balance: admin.firestore.FieldValue.increment(reward) }, { merge: true });

    await subRef.update({ status: 'APPROVED' });

    return { status: 'approved', reward };
});`,

  'functions/src/tasks/aitraining.js': `const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.submitAiTraining = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const userId = context.auth.uid;
    const { taskId, selection, reasoning, confidence } = data;
    const db = admin.firestore();

    const subRef = db.collection('aiTrainingSubmissions').doc(\`\${userId}_\${taskId}\`);
    const subDoc = await subRef.get();
    if (subDoc.exists) throw new functions.https.HttpsError('already-exists', 'Task already completed.');

    const taskRef = db.collection('aiTrainingTasks').doc(taskId);
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) throw new functions.https.HttpsError('not-found', 'Task not found.');

    await subRef.set({
        userId,
        taskId,
        selection,
        reasoning,
        confidence,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const reward = taskDoc.data().reward || 0;
    const walletRef = db.collection('wallets').doc(userId);
    await walletRef.set({ balance: admin.firestore.FieldValue.increment(reward) }, { merge: true });

    return { status: 'success', reward };
});`,

  'public/js/hotels.js': `async function loadHotels(options = {}) {
    console.log("Loading hotels...");
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('hotelsList').innerHTML = '';
    // Mock load
    setTimeout(() => {
        document.getElementById('loadingState').style.display = 'none';
        const hotels = [{id:'1', name:'Test Hotel', location:'Nairobi 🇰🇪', rating: 4, unlockFee: 0, reward: 500, status: 'AVAILABLE', description: 'Nice hotel.'}];
        const list = document.getElementById('hotelsList');
        if(hotels.length === 0) document.getElementById('emptyState').style.display = 'block';
        
        hotels.forEach(h => {
            list.innerHTML += \`
                <div class="card hotel-card">
                    <h3>\${h.name} - \${h.location}</h3>
                    <p>\${h.description}</p>
                    <p>Unlock: KES \${h.unlockFee} | Reward: KES \${h.reward}</p>
                    <span class="badge">\${h.status}</span>
                    <button onclick="window.location.href='/hotel.html?id=\${h.id}'">View Assignment</button>
                </div>
            \`;
        });
    }, 1000);
}

async function loadHotel(hotelId) {
    document.getElementById('hotelName').innerText = "Loaded Hotel";
    document.getElementById('hotelLocation').innerText = "Nairobi 🇰🇪";
    document.getElementById('hotelBrief').innerText = "Please write a detailed review.";
    document.getElementById('reviewFormSection').style.display = 'block';

    const bodyInput = document.getElementById('bodyInput');
    const wordCount = document.getElementById('wordCount');
    const submitBtn = document.getElementById('submitReviewBtn');
    bodyInput.addEventListener('input', () => {
        const words = bodyInput.value.trim().split(/\\s+/).filter(w => w.length > 0).length;
        wordCount.innerText = words;
        submitBtn.disabled = words < 100;
    });
}

async function unlockHotelReview(hotelId) {
    console.log('Unlocking', hotelId);
}

async function submitHotelReview(hotelTaskId, reviewData) {
    console.log('Submitting', reviewData);
}
`,

  'public/js/surveys.js': `async function loadSurveys() {
    console.log("Loading surveys...");
    document.getElementById('loadingState').style.display = 'block';
    setTimeout(() => {
        document.getElementById('loadingState').style.display = 'none';
        const list = document.getElementById('surveysList');
        list.innerHTML = \`
            <div class="card survey-card">
                <h3>Customer Habits Survey</h3>
                <p>~5 mins | 10 questions</p>
                <p>Reward: KES 100</p>
                <span class="badge">Available</span>
                <button onclick="startSurvey('1')">Start Survey</button>
            </div>
        \`;
    }, 1000);
}

function switchTab(tab) {
    document.getElementById('surveysList').style.display = tab === 'available' ? 'grid' : 'none';
    document.getElementById('completedSurveysList').style.display = tab === 'completed' ? 'grid' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

async function startSurvey(surveyId) {
    document.getElementById('surveysList').style.display = 'none';
    document.querySelector('.tabs').style.display = 'none';
    document.getElementById('surveyTakeEngine').style.display = 'block';
    
    document.getElementById('questionText').innerText = "What is your favorite color?";
    document.getElementById('answerArea').innerHTML = \`<input type="text" placeholder="Your answer">\`;
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('submitSurveyBtn').style.display = 'inline-block';
}

async function submitSurvey(attemptId, answers) {
    console.log("Submitting survey");
}

function renderQuestion(question, index, total) {}
function collectAnswer(question) {}
`,

  'public/css/dashboard.css': `
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background: #f4f7f6;
}
.card {
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 15px;
}
.hotel-grid, .survey-grid, .task-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
}
.badge {
    background: #e0e0e0;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8em;
}
.difficulty { background: #ffd700; }
.search-bar, .filters, .tabs { margin-bottom: 20px; }
button {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
}
button:disabled { background: #ccc; cursor: not-allowed; }
button.active { background: #0056b3; }
.modal {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}
.progress-bar {
    height: 10px;
    background: #e0e0e0;
    border-radius: 5px;
    margin-bottom: 15px;
}
.progress {
    height: 100%;
    background: #28a745;
    border-radius: 5px;
    width: 20%;
}
form label { display: block; margin-top: 10px; }
form input, form textarea { width: 100%; padding: 8px; margin-top: 4px; }
`
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(filename, content);
  console.log('Created:', filename);
}
