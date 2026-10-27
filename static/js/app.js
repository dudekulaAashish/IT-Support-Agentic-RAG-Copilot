const chatForm = document.querySelector("#chat-form");
const questionInput = document.querySelector("#question");
const sendButton = document.querySelector("#send-button");
const welcome = document.querySelector("#welcome");
const messageList = document.querySelector("#message-list");
const uploadForm = document.querySelector("#upload-form");
const fileInput = document.querySelector("#file-input");
const uploadButton = document.querySelector("#upload-button");
const uploadStatus = document.querySelector("#upload-status");
const selectedFile = document.querySelector("#selected-file");
const uploadDrop = document.querySelector("#upload-drop");

function resizeInput() {
  questionInput.style.height = "auto";
  questionInput.style.height = `${Math.min(questionInput.scrollHeight, 130)}px`;
  sendButton.disabled = questionInput.value.trim().length < 2;
}

function addMessage(role, text) {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  if (role === "assistant") {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "✦";
    article.append(avatar);
  }
  const body = document.createElement("div");
  body.className = "message-body";
  const label = document.createElement("p");
  label.className = "message-label";
  label.textContent = role === "user" ? "You" : "IT Support Copilot";
  const content = document.createElement("div");
  content.className = "message-text";
  content.textContent = text;
  body.append(label, content);
  article.append(body);
  messageList.append(article);
  article.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return { article, body, content };
}

function showAnswer(message, data) {
  message.content.textContent = data.answer || "The assistant returned an empty answer.";
  if (data.source_used) {
    const source = document.createElement("span");
    source.className = "source-pill";
    const labels = {
      private_kb: "Company knowledge base",
      web: "Web search",
      web_search: "Web search",
      direct: "General response",
      insufficient_evidence: "Not enough evidence",
    };
    source.textContent = labels[data.source_used] || "IT support answer";
    message.body.append(source);
  }
  if (Array.isArray(data.citations) && data.citations.length) {
    const citations = document.createElement("div");
    citations.className = "citations";
    for (const citation of data.citations) {
      const link = document.createElement("a");
      link.className = "citation";
      link.textContent = citation.title || citation.url || "Source";
      if (typeof citation.url === "string" && /^https?:\/\//i.test(citation.url)) {
        link.href = citation.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else {
        link.href = "#";
        link.addEventListener("click", (event) => event.preventDefault());
      }
      citations.append(link);
    }
    message.body.append(citations);
  }

  if (Array.isArray(data.trace) && data.trace.length) {
    const trace = document.createElement("details");
    trace.className = "agent-trace";
    const summary = document.createElement("summary");
    summary.textContent = "View agent trace";
    const steps = document.createElement("ol");
    for (const step of data.trace) {
      const item = document.createElement("li");
      item.textContent = typeof step === "string" ? step : JSON.stringify(step);
      steps.append(item);
    }
    trace.append(summary, steps);
    message.body.append(trace);
  }
}

async function submitQuestion(question) {
  const normalized = question.trim();
  if (normalized.length < 2) return;
  welcome.classList.add("has-messages");
  addMessage("user", normalized);
  const response = addMessage("assistant", "");
  const typing = document.createElement("span");
  typing.className = "typing";
  typing.setAttribute("aria-label", "Thinking");
  typing.innerHTML = "<span></span><span></span><span></span>";
  response.content.append(typing);
  sendButton.disabled = true;
  try {
    const result = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: normalized }),
    });
    const data = await result.json();
    if (!result.ok) throw new Error(data.detail || "The assistant could not answer right now.");
    showAnswer(response, data);
  } catch (error) {
    response.content.textContent = error.message || "Could not connect to the assistant. Please try again.";
    response.content.classList.add("error");
  } finally {
    resizeInput();
    questionInput.focus();
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = questionInput.value;
  questionInput.value = "";
  resizeInput();
  submitQuestion(question);
});
questionInput.addEventListener("input", resizeInput);
questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!sendButton.disabled) chatForm.requestSubmit();
  }
});
document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => submitQuestion(button.dataset.prompt || ""));
});
document.querySelector("#new-chat").addEventListener("click", () => {
  messageList.replaceChildren();
  welcome.classList.remove("has-messages");
  questionInput.value = "";
  resizeInput();
  questionInput.focus();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  selectedFile.hidden = !file;
  selectedFile.textContent = file ? `Selected: ${file.name}` : "";
  uploadStatus.textContent = "";
  uploadStatus.classList.remove("error");
});
uploadDrop.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadDrop.classList.add("dragover");
});
uploadDrop.addEventListener("dragleave", () => uploadDrop.classList.remove("dragover"));
uploadDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadDrop.classList.remove("dragover");
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  fileInput.dispatchEvent(new Event("change"));
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = fileInput.files?.[0];
  const adminKey = document.querySelector("#admin-key").value.trim();
  uploadStatus.classList.remove("error");
  if (!file) {
    uploadStatus.textContent = "Choose a file to add.";
    uploadStatus.classList.add("error");
    return;
  }
  if (!adminKey) {
    uploadStatus.textContent = "Enter your admin key to continue.";
    uploadStatus.classList.add("error");
    return;
  }
  uploadButton.disabled = true;
  uploadButton.textContent = "Indexing document…";
  uploadStatus.textContent = "";
  try {
    const formData = new FormData();
    formData.append("file", file);
    const result = await fetch("/api/ingest", {
      method: "POST",
      headers: { "x-admin-key": adminKey },
      body: formData,
    });
    const data = await result.json();
    if (!result.ok) throw new Error(data.detail || "Could not index this document.");
    uploadStatus.textContent = `${data.file} added · ${data.chunks} chunks indexed`;
    uploadForm.reset();
    selectedFile.hidden = true;
    selectedFile.textContent = "";
  } catch (error) {
    uploadStatus.textContent = error.message || "Could not index this document.";
    uploadStatus.classList.add("error");
  } finally {
    uploadButton.disabled = false;
    uploadButton.textContent = "Add to knowledge base";
  }
});

fetch("/api/health")
  .then((response) => {
    if (!response.ok) throw new Error("offline");
    return response.json();
  })
  .then((data) => {
    document.querySelector("#service-status").textContent = `${data.service} is ready`;
    document.querySelector(".status-dot").classList.add("online");
  })
  .catch(() => {
    document.querySelector("#service-status").textContent = "Assistant unavailable";
    document.querySelector(".status-dot").classList.add("offline");
  });
resizeInput();