import { createFeedback } from '../api/feedback.js';
import { showToast } from '../components/toast.js';

export async function renderFeedback(container) {
  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <div style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:700;color:var(--text);letter-spacing:-0.02em;">Feedback</div>
      <div style="font-size:0.82rem;color:var(--text-dim);">Found a bug? Missing a feature? Tell us — we read every submission and reply by email.</div>
    </div>
    <div class="card card-p" style="max-width:640px;">
      <div class="section-title" style="margin-bottom:16px;">Send us feedback</div>
      <form id="feedback-form">
        <div class="form-group">
          <label class="input-label">Category</label>
          <select class="input-field" id="fb-category">
            <option value="0" selected>General</option>
            <option value="1">Bug report</option>
            <option value="2">Feature request</option>
            <option value="3">Question</option>
          </select>
        </div>
        <div class="form-group">
          <label class="input-label">Subject</label>
          <input class="input-field" type="text" id="fb-subject" maxlength="200" placeholder="A short summary" required>
        </div>
        <div class="form-group">
          <label class="input-label">Message</label>
          <textarea class="input-field" id="fb-message" maxlength="4000" rows="6" placeholder="Tell us what happened, what you expected, or what you'd like to see…" required style="resize:vertical;min-height:120px;"></textarea>
        </div>
        <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:14px;">
          Your feedback is emailed to our team with you on copy, so the reply lands in your inbox too.
        </div>
        <button type="submit" class="btn-primary" id="fb-submit" style="width:100%;">Submit feedback</button>
      </form>
    </div>
  `;

  container.querySelector('#feedback-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = container.querySelector('#fb-submit');
    const subject = container.querySelector('#fb-subject').value.trim();
    const message = container.querySelector('#fb-message').value.trim();
    if (!subject || !message) {
      showToast('Subject and message are required.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
    try {
      const res = await createFeedback({
        category: parseInt(container.querySelector('#fb-category').value, 10),
        subject,
        message,
        pageUrl: null,
      });
      showToast(res.message || 'Feedback submitted. Thank you!');
      container.querySelector('#feedback-form').reset();
    } catch (err) {
      showToast(err.message || 'Failed to submit feedback', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit feedback';
    }
  });
}
