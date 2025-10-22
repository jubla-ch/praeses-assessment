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

function feedbackForScore(feedback, topicId, score) {
    if (score < 2.5) return feedback[topicId].low;
    else if (score < 4) return feedback[topicId].medium;
    else return feedback[topicId].high;
}