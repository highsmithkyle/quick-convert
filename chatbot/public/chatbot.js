// chatbot/public/chatbot.js

document.addEventListener("DOMContentLoaded", () => {
  const sendButton = document.getElementById("send-button");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");

  // Function to append messages to the chat
  function appendMessage(sender, message, timestamp = new Date()) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    messageContent.innerHTML = message; // Allow HTML content for better formatting

    // Format timestamp
    const time = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const timestampElement = document.createElement("div");
    timestampElement.classList.add("timestamp");
    timestampElement.textContent = time;

    messageContent.appendChild(timestampElement);
    messageElement.appendChild(messageContent);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Function to show loading indicator
  function showLoading() {
    const loadingElement = document.createElement("div");
    loadingElement.classList.add("message", "bot");

    const loader = document.createElement("div");
    loader.classList.add("message-content");
    loader.innerHTML = `<div class="loader"></div>`;

    loadingElement.appendChild(loader);
    chatMessages.appendChild(loadingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return loadingElement;
  }

  // Function to remove loading indicator
  function removeLoading(loadingElement) {
    chatMessages.removeChild(loadingElement);
  }

  // Function to send message to the server
  async function sendMessage() {
    const message = userInput.value.trim();
    if (message === "") return;

    appendMessage("user", message);
    userInput.value = "";

    // Show loading indicator
    const loadingElement = showLoading();

    try {
      const response = await fetch("/chatbot/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      // Remove loading indicator
      removeLoading(loadingElement);

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      appendMessage("bot", data.reply);
    } catch (error) {
      console.error("Error:", error);
      removeLoading(loadingElement);
      appendMessage("bot", "Sorry, something went wrong. Please try again later.");
    }
  }

  // Event listeners
  sendButton.addEventListener("click", sendMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
});
