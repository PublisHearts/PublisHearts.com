const form = document.getElementById("custom-story-form");
const submitBtn = document.getElementById("custom-story-submit");
const messageEl = document.getElementById("custom-story-message");

function setMessage(message, isError = false) {
  if (!messageEl) {
    return;
  }
  messageEl.textContent = message || "";
  messageEl.classList.toggle("error", Boolean(isError));
}

function collectPayload() {
  const formData = new FormData(form);
  return {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    storyInspiration: String(formData.get("storyInspiration") || "").trim(),
    audienceDetails: String(formData.get("audienceDetails") || "").trim(),
    timelineDetails: String(formData.get("timelineDetails") || "").trim(),
    extraNotes: String(formData.get("extraNotes") || "").trim()
  };
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form || !submitBtn) {
    return;
  }

  const payload = collectPayload();
  submitBtn.disabled = true;
  setMessage("Sending quote request...");

  try {
    const response = await fetch("/api/custom-story-quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not send quote request.");
    }
    form.reset();
    setMessage("Quote request sent. PublisHearts will follow up by email.");
  } catch (error) {
    setMessage(error.message || "Could not send quote request.", true);
  } finally {
    submitBtn.disabled = false;
  }
});
