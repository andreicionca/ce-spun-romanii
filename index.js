// === GAME NAVIGATION ===
// Redirects user to game setup page
function startNewGame() {
  window.location.href = "setup.html";
}

// === GAME JOINING ===
// Validates game code and redirects to display
async function joinGame(event) {
  event.preventDefault();

  const gameCode = document.getElementById("gameCode").value.trim();
  const joinBtn = document.getElementById("joinGameBtn");

  hideError();

  if (!validateGameCode(gameCode)) {
    showError("Codul trebuie să conțină exact 6 cifre");
    return;
  }

  setButtonLoading(joinBtn, "VERIFICĂ...", true);

  try {
    // TODO: Verifică dacă jocul există în DB
    const gameExists = await window.supabaseClient.checkGameCodeExists(
      gameCode
    );
    if (!gameExists) {
      showError("Jocul nu a fost găsit. Verifică codul introdus.");
      return;
    }

    window.location.href = `public.html?game=${gameCode}`;
  } catch (error) {
    showError("Eroare la conectare. Încearcă din nou.");
    console.error("Join game error:", error);
  } finally {
    setButtonLoading(joinBtn, "INTRĂ ÎN JOC", false);
  }
}

// === UI INTERACTIONS ===
// Toggles rules visibility with animation
function toggleRules() {
  const content = document.getElementById("rulesContent");
  const chevron = document.getElementById("rulesChevron");
  const toggle = document.getElementById("rulesToggle");

  const isHidden = content.classList.contains("hidden");

  if (isHidden) {
    content.classList.remove("hidden");
    chevron.style.transform = "rotate(180deg)";
    toggle.setAttribute("aria-expanded", "true");
    content.setAttribute("aria-hidden", "false");
  } else {
    content.classList.add("hidden");
    chevron.style.transform = "rotate(0deg)";
    toggle.setAttribute("aria-expanded", "false");
    content.setAttribute("aria-hidden", "true");
  }
}

// === ERROR HANDLING ===
// Shows error message to user
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");

  errorText.textContent = message;
  errorDiv.classList.remove("hidden");

  // Auto-hide după 5 secunde
  setTimeout(hideError, 5000);
}

// Hides error message
function hideError() {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.classList.add("hidden");
}

// === BUTTON STATES ===
// Sets button to loading state
function setButtonLoading(button, loadingText, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${loadingText}`;
  } else {
    button.disabled = false;
    // Restore original content based on button ID
    if (button.id === "joinGameBtn") {
      button.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>INTRĂ ÎN JOC';
    }
  }
}

// === VALIDATION ===
// Validates game code format
function validateGameCode(code) {
  return code.length === 6 && /^\d{6}$/.test(code);
}

// === INPUT FORMATTING ===
// Formats game code input to numbers only
function formatGameCodeInput(event) {
  event.target.value = event.target.value.replace(/\D/g, "");
}

// === EVENT LISTENERS ===
// Initialize event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Start game button
  document
    .getElementById("startGameBtn")
    .addEventListener("click", startNewGame);

  // Join game form
  document.getElementById("joinGameForm").addEventListener("submit", joinGame);

  // Rules toggle
  document.getElementById("rulesToggle").addEventListener("click", toggleRules);

  // Game code input formatting
  const gameCodeInput = document.getElementById("gameCode");
  gameCodeInput.addEventListener("input", formatGameCodeInput);

  // Hide error when user starts typing
  gameCodeInput.addEventListener("input", hideError);
});
