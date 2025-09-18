document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('summarize-form');
    const urlInput = document.getElementById('url-input');
    const submitButton = document.getElementById('submit-button');
    const summaryOutput = document.getElementById('summary-output');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const url = urlInput.value;
        if (!url) {
            summaryOutput.innerHTML = '<p style="color: red;">Please enter a URL.</p>';
            return;
        }

        // Disable button and show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Summarizing...';
        summaryOutput.innerHTML = '<p>Fetching and summarizing, please wait...</p>';

        try {
            const response = await fetch('http://localhost:3000/summarize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            // Format summary to preserve line breaks
            summaryOutput.innerHTML = `<p>${data.summary.replace(/\n/g, '<br>')}</p>`;

        } catch (error) {
            summaryOutput.innerHTML = `<p style="color: red;"><strong>Error:</strong> ${error.message}</p>`;
        } finally {
            // Re-enable button
            submitButton.disabled = false;
            submitButton.textContent = 'Summarize';
        }
    });
});
