(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const launcher = $("aiLauncher");
  const panel = $("aiChat");
  const close = $("aiClose");
  const form = $("aiForm");
  const input = $("aiInput");
  const send = $("aiSend");
  const messagesEl = $("aiMessages");
  const status = $("aiStatus");
  const apiBase = String(window.SCHOLARSHIPMATCH_AI_API || "").replace(/\/+$/, "");
  const history = [];

  if (!launcher || !panel || !form || !input || !messagesEl) return;

  function openChat() {
    panel.classList.add("open");
    launcher.setAttribute("aria-expanded", "true");
    input.focus();
  }
  function closeChat() {
    panel.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }
  function addMessage(role, content, citations = []) {
    const bubble = document.createElement("div");
    bubble.className = `ai-message ${role}`;
    bubble.textContent = content;
    messagesEl.appendChild(bubble);
    if (citations.length) {
      const links = document.createElement("div");
      links.className = "ai-citations";
      citations.forEach((citation, index) => {
        try {
          const url = new URL(citation.url);
          if (url.protocol !== "https:" && url.protocol !== "http:") return;
          const link = document.createElement("a");
          link.href = url.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = `${index + 1}. ${citation.title || url.hostname}`;
          links.appendChild(link);
        } catch {}
      });
      bubble.appendChild(links);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  launcher.addEventListener("click", openChat);
  close.addEventListener("click", closeChat);
  $("aiSuggestions")?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    input.value = button.textContent === "Find scholarships"
      ? "Find current scholarships and explain which eligibility details I should check."
      : button.textContent === "Explain FAFSA"
      ? "Explain the FAFSA process in simple steps."
      : "How should I compare the real cost of two colleges?";
    form.requestSubmit();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || send.disabled) return;
    if (!apiBase || apiBase.includes("YOUR-BACKEND-URL")) {
      status.textContent = "The AI service hasn't been connected yet. The website owner must configure its backend URL.";
      return;
    }

    history.push({ role: "user", content: question });
    addMessage("user", question);
    input.value = "";
    send.disabled = true;
    status.textContent = "Researching your question…";

    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The research service returned an error.");
      const answer = String(data.answer || "I couldn't produce an answer.");
      history.push({ role: "assistant", content: answer });
      addMessage("assistant", answer, Array.isArray(data.citations) ? data.citations : []);
      status.textContent = "Check cited official sources before relying on deadlines or eligibility.";
    } catch (error) {
      history.pop();
      addMessage("assistant", error.message || "I couldn't reach the research service. Please try again.");
      status.textContent = "Please try again in a moment.";
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
})();
