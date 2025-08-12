// Load questions and feedback from JSON
async function loadData() {
    const questions = await fetch('questions.json').then(r => r.json());
    const feedback = await fetch('feedback.json').then(r => r.json());
    return { questions, feedback };
}

// Render the survey grouped by topic
function renderSurvey(questions) {
    const form = document.getElementById('survey-form');
    form.innerHTML = '';
    questions.forEach((topic, tIdx) => {
        const topicDiv = document.createElement('div');
        topicDiv.innerHTML = `<h2>${topic.title}</h2>`;
        topic.questions.forEach((q, qIdx) => {
            topicDiv.innerHTML += `
                <label>${q}</label>
                <select id="t${tIdx}q${qIdx}">
                    <option value="1">1 - trifft nicht zu</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5 - trifft voll zu</option>
                </select>
                <br/>
            `;
        });
        form.appendChild(topicDiv);
    });
}

// Calculate average score per topic
function calculateScores(questions) {
    return questions.map((topic, tIdx) => {
        let sum = 0;
        topic.questions.forEach((_, qIdx) => {
            sum += +document.getElementById(`t${tIdx}q${qIdx}`).value;
        });
        return sum / topic.questions.length;
    });
}

// Determine feedback for each topic based on score
function feedbackForScore(feedback, topicId, score) {
    if (score < 2.5) return feedback[topicId].low;
    else if (score < 4) return feedback[topicId].medium;
    else return feedback[topicId].high;
}

// Show radar chart of topic scores
let radarChart = null;
function showRadarChart(questions, scores) {
    const ctx = document.getElementById('results-chart').getContext('2d');
    if (radarChart) radarChart.destroy();
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: questions.map(t => t.title),
            datasets: [{
                label: 'Ihre Bewertung',
                data: scores,
                backgroundColor: 'rgba(44, 130, 201, 0.2)',
                borderColor: 'rgba(44, 130, 201, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(44, 130, 201, 1)'
            }]
        },
        options: {
            scale: { min: 1, max: 5, ticks: { stepSize: 1 } }
        }
    });
}

// Show textual feedback for each topic
function showFeedback(questions, scores, feedback) {
    const fbDiv = document.getElementById('feedback');
    fbDiv.innerHTML = '';
    questions.forEach((topic, idx) => {
        fbDiv.innerHTML += `<h3>${topic.title}</h3><p>${feedbackForScore(feedback, topic.id, scores[idx])}</p>`;
    });
}

// Save answers in localStorage
function saveProgress(questions) {
    const answers = questions.map((topic, tIdx) =>
        topic.questions.map((_, qIdx) =>
            document.getElementById(`t${tIdx}q${qIdx}`).value
        )
    );
    localStorage.setItem('privacyAssessment', JSON.stringify(answers));
    alert("Fortschritt gespeichert!");
}

// Load answers from localStorage
function loadProgress(questions) {
    const answers = JSON.parse(localStorage.getItem('privacyAssessment') || 'null');
    if (answers) {
        answers.forEach((topicAnswers, tIdx) => {
            topicAnswers.forEach((val, qIdx) => {
                document.getElementById(`t${tIdx}q${qIdx}`).value = val;
            });
        });
    }
}

// Clear saved answers
function clearProgress() {
    localStorage.removeItem('privacyAssessment');
    window.location.reload();
}

// Encode answers in URL for sharing
function getShareableLink(questions) {
    const answers = questions.map((topic, tIdx) =>
        topic.questions.map((_, qIdx) =>
            document.getElementById(`t${tIdx}q${qIdx}`).value
        )
    ).flat();
    const params = new URLSearchParams({ answers: answers.join(',') });
    const link = window.location.origin + window.location.pathname + "?" + params.toString();
    window.prompt("Kopieren Sie diesen Link, um Ihren Fortschritt zu teilen:", link);
}

// Load answers from URL if present
function loadFromUrl(questions) {
    const params = new URLSearchParams(window.location.search);
    const ans = params.get('answers');
    if (ans) {
        const answers = ans.split(',');
        let idx = 0;
        questions.forEach((topic, tIdx) => {
            topic.questions.forEach((_, qIdx) => {
                document.getElementById(`t${tIdx}q${qIdx}`).value = answers[idx++] || "1";
            });
        });
    }
}

// PDF export using jsPDF and html2canvas
async function exportPDF(questions, scores, feedback) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Ihre Datenschutz Selbstbewertung", 10, 15);

    // Capture chart as image
    const chartCanvas = document.getElementById('results-chart');
    const imgData = await html2canvas(chartCanvas).then(canvas => canvas.toDataURL('image/png'));
    doc.addImage(imgData, 'PNG', 10, 25, 180, 90);

    doc.setFontSize(12);
    let yOffset = 120;
    questions.forEach((topic, idx) => {
        if (yOffset > 270) {
            doc.addPage();
            yOffset = 20;
        }
        doc.text(topic.title, 10, yOffset);
        yOffset += 6;
        const fb = feedbackForScore(feedback, topic.id, scores[idx]);
        // Split feedback into lines for PDF
        const lines = doc.splitTextToSize(fb, 180);
        lines.forEach(line => {
            doc.text(line, 10, yOffset);
            yOffset += 6;
        });
        yOffset += 4;
    });

    doc.save('Selbstbewertung.pdf');
}

// Main logic on page load
window.onload = async function() {
    const { questions, feedback } = await loadData();
    renderSurvey(questions);

    // Load saved progress or from URL
    loadProgress(questions);
    loadFromUrl(questions);

    document.getElementById('submit-btn').onclick = function() {
        const scores = calculateScores(questions);
        showRadarChart(questions, scores);
        showFeedback(questions, scores, feedback);
    };

    document.getElementById('pdf-btn').onclick = async function() {
        const scores = calculateScores(questions);
        await exportPDF(questions, scores, feedback);
    };

    document.getElementById('save-btn').onclick = function() {
        saveProgress(questions);
    };

    document.getElementById('clear-btn').onclick = function() {
        clearProgress();
    };

    document.getElementById('link-btn').onclick = function() {
        getShareableLink(questions);
    };
};