async function loadSurveys() {
    console.log("Loading surveys...");
    document.getElementById('loadingState').style.display = 'block';
    setTimeout(() => {
        document.getElementById('loadingState').style.display = 'none';
        const list = document.getElementById('surveysList');
        list.innerHTML = `
            <div class="card survey-card">
                <h3>Customer Habits Survey</h3>
                <p>~5 mins | 10 questions</p>
                <p>Reward: KES 100</p>
                <span class="badge">Available</span>
                <button onclick="startSurvey('1')">Start Survey</button>
            </div>
        `;
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
    document.getElementById('answerArea').innerHTML = `<input type="text" placeholder="Your answer">`;
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('submitSurveyBtn').style.display = 'inline-block';
}

async function submitSurvey(attemptId, answers) {
    console.log("Submitting survey");
}

function renderQuestion(question, index, total) {}
function collectAnswer(question) {}
