// Load questions and feedback from JSON
async function loadData() {
    const questions = await fetch('questions.json').then(r => r.json());
    const feedback = await fetch('feedback.json').then(r => r.json());
    return { questions, feedback };
}

// Render the survey grouped by topic using sliders
function renderSurvey(questions) {
    const form = document.getElementById('survey-form');
    form.innerHTML = '';
    questions.forEach((topic, tIdx) => {
        const topicDiv = document.createElement('div');
        topicDiv.innerHTML = `<h2>${topic.title}</h2>`;
        topic.questions.forEach((q, qIdx) => {
            const sliderId = `t${tIdx}q${qIdx}`;
            topicDiv.innerHTML += `
                <label>${q}</label>
                <div class="slider-group">
                  <span>1<br><small>(trifft nicht zu)</small></span>
                  <input type="range" min="1" max="5" value="3" id="${sliderId}" name="${sliderId}" class="slider">
                  <span>5<br><small>(trifft voll zu)</small></span>
                  <span id="${sliderId}-value" class="slider-value">3</span>
                </div>
                <br/>
            `;
        });
        form.appendChild(topicDiv);
    });

    // Attach input listeners to update displayed value
    questions.forEach((topic, tIdx) => {
        topic.questions.forEach((_, qIdx) => {
            const sliderId = `t${tIdx}q${qIdx}`;
            const slider = document.getElementById(sliderId);
            const valueSpan = document.getElementById(`${sliderId}-value`);
            if (slider && valueSpan) {
                slider.addEventListener("input", () => {
                    valueSpan.textContent = slider.value;
                });
            }
        });
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
                label: 'Ergebnisse',
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
        const fb = feedbackForScore(feedback, topic.id, scores[idx]);
        fbDiv.innerHTML += `<h3>${topic.title}</h3>
            <p>${fb.text}</p>
            <a href="${fb.link_url}" target="_blank">${fb.link_text}</a>`;
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
                document.getElementById(`t${tIdx}q${qIdx}-value`).textContent = val;
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
                document.getElementById(`t${tIdx}q${qIdx}`).value = answers[idx] || "1";
                document.getElementById(`t${tIdx}q${qIdx}-value`).textContent = answers[idx] || "1";
                idx++;
            });
        });
    }
}

// PDF export using jsPDF and html2canvas
async function exportPDF(questions, scores, feedback) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Selbsteinschätzung für Präses mit Spider-Auswertung", 10, 15);

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
        const fbObj = feedbackForScore(feedback, topic.id, scores[idx]);
        if (fbObj && fbObj.text) {
            const lines = doc.splitTextToSize(fbObj.text, 160);
            lines.forEach(line => {
                doc.text(line, 10, yOffset);
                yOffset += 6;
            });
            yOffset += 4;
        }
    });

    doc.save('Selbstbewertung.pdf');
}

// Utility: Add event listeners for both button and link triggers
function addActionListener(idList, handler) {
    idList.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = function(e) {
                if (el.tagName === 'A') e.preventDefault();
                handler();
            };
        }
    });
}

// Main logic on page load
window.onload = async function() {
    const { questions, feedback } = await loadData();
    renderSurvey(questions);

    // Load saved progress or from URL
    loadProgress(questions);
    loadFromUrl(questions);

    addActionListener(
        ['submit-btn', 'show-results-link'],
        function() {
            const scores = calculateScores(questions);
            showRadarChart(questions, scores);
            showFeedback(questions, scores, feedback);
        }
    );

    addActionListener(
        ['pdf-btn', 'export-pdf-link'],
        async function() {
            const scores = calculateScores(questions);
            await exportPDF(questions, scores, feedback);
        }
    );

    addActionListener(
        ['save-btn', 'save-progress-link'],
        function() {
            saveProgress(questions);
        }
    );

    addActionListener(
        ['clear-btn', 'clear-progress-link'],
        function() {
            clearProgress();
        }
    );

    addActionListener(
        ['link-btn', 'generate-link-link'],
        function() {
            getShareableLink(questions);
        }
    );
};
