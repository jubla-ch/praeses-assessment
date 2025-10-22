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
    // Keine Font explizit setzen: Standard ist helvetica/UTF-8
    let yOffset = 120;
    questions.forEach((topic, idx) => {
        if (yOffset > 270) {
            doc.addPage();
            yOffset = 20;
        }
        doc.text(topic.title, 10, yOffset);
        yOffset += 6;
        const fb = feedbackForScore(feedback, topic.id, scores[idx]);
        // Weniger Breite für Zeilenumbruch, damit Umlaute besser angezeigt werden
        const lines = doc.splitTextToSize(fb.text, 160);
        lines.forEach(line => {
            doc.text(line, 10, yOffset);
            yOffset += 6;
        });
        yOffset += 4;
    });

    doc.save('Selbstbewertung.pdf');
}