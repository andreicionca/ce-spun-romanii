// === GAME NAVIGATION ===
// Redirects user to game setup page
function startNewGame() {
  window.location.href = 'auth.html';
}

// === GAME JOINING (Deschide un joc) ===
// Validates game code and redirects to public display
async function joinGame(event) {
  event.preventDefault();

  const gameCode = document.getElementById('gameCode').value.trim();
  const joinBtn = document.getElementById('joinGameBtn');

  hideError();

  if (!validateGameCode(gameCode)) {
    showError('Codul trebuie să conțină exact 6 cifre');
    return;
  }

  setButtonLoading(joinBtn, 'VERIFICĂ...', true);

  try {
    // Testează mai întâi conexiunea la Supabase
    if (!window.supabaseClient) {
      throw new Error('Client Supabase nu este disponibil');
    }

    // Testează conexiunea efectivă
    const connectionOk = await window.supabaseClient.testConnection();
    if (!connectionOk) {
      throw new Error('Nu se poate conecta la baza de date');
    }

    // Verifică dacă jocul există în DB
    const gameExists = await window.supabaseClient.checkGameCodeExists(gameCode);
    if (!gameExists) {
      showError(
        `Jocul cu codul "${gameCode}" nu a fost găsit. Verifică codul introdus sau creează un joc nou.`
      );
      setButtonLoading(joinBtn, '<i class="fas fa-sign-in-alt mr-2"></i>INTRĂ ÎN JOC', false);
      return;
    }

    // Redirect to public display for "Deschide un joc"
    console.log(`Redirecting to: public.html?game=${gameCode}`);
    window.location.href = `public.html?game=${gameCode}`;
  } catch (error) {
    console.error('Join game error:', error);

    // Gestionare specifică a erorilor
    if (
      error.message.includes('Nu se poate conecta') ||
      error.message.includes('Serverul nu răspunde')
    ) {
      showError('Problemă de conexiune. Verifică internetul și încearcă din nou.');
    } else if (error.message.includes('nu este disponibil')) {
      showError('Eroare tehnică. Reîncarcă pagina.');
    } else {
      showError('Eroare la conectare. Încearcă din nou.');
    }

    setButtonLoading(joinBtn, '<i class="fas fa-sign-in-alt mr-2"></i>INTRĂ ÎN JOC', false);
  }
}

// === CONTINUE GAME (Continuă un joc) ===
// Validates game code and redirects based on selected mode (Control/Display)
async function continueGame(gameCode, mode, button) {
  console.log(`continueGame called with: ${gameCode}, ${mode}`);

  hideError();

  if (!validateGameCode(gameCode)) {
    showError('Codul trebuie să conțină exact 6 cifre');
    return;
  }

  setButtonLoading(button, 'VERIFICĂ...', true);

  try {
    // Testează mai întâi conexiunea la Supabase
    if (!window.supabaseClient) {
      throw new Error('Client Supabase nu este disponibil');
    }

    // Testează conexiunea efectivă
    const connectionOk = await window.supabaseClient.testConnection();
    if (!connectionOk) {
      throw new Error('Nu se poate conecta la baza de date');
    }

    // Verifică dacă jocul există în DB
    console.log(`Checking if game ${gameCode} exists...`);
    const gameExists = await window.supabaseClient.checkGameCodeExists(gameCode);
    console.log(`Game exists: ${gameExists}`);

    if (!gameExists) {
      console.log('Game not found, showing error');
      showError(
        `Jocul cu codul "${gameCode}" nu a fost găsit. Verifică codul introdus sau creează un joc nou.`
      );
      setButtonLoading(button, getOriginalButtonText(button), false);
      return;
    }

    console.log('Game found, proceeding with redirect...');

    // Redirect based on selected mode
    if (mode === 'control') {
      console.log(`Redirecting to: control.html?game=${gameCode}`);
      window.location.href = `control.html?game=${gameCode}`;
    } else {
      console.log(`Opening new window: public.html?game=${gameCode}`);
      window.open(`public.html?game=${gameCode}`, '_blank');
    }
  } catch (error) {
    console.error('Continue game error:', error);

    // Gestionare specifică a erorilor
    if (
      error.message.includes('Nu se poate conecta') ||
      error.message.includes('Serverul nu răspunde')
    ) {
      showError('Problemă de conexiune. Verifică internetul și încearcă din nou.');
    } else if (error.message.includes('nu este disponibil')) {
      showError('Eroare tehnică. Reîncarcă pagina.');
    } else {
      showError('Eroare la conectare. Încearcă din nou.');
    }

    setButtonLoading(button, getOriginalButtonText(button), false);
  }
}

// === BUTTON HANDLERS ===
async function handleControlButton() {
  console.log('Control button clicked');
  const gameCode = document.getElementById('continueGameCode').value.trim();
  const button = document.querySelector('#continueGameForm button[data-mode="control"]');
  await continueGame(gameCode, 'control', button);
}

async function handleDisplayButton() {
  console.log('Display button clicked');
  const gameCode = document.getElementById('continueGameCode').value.trim();
  const button = document.querySelector('#continueGameForm button[data-mode="display"]');
  await continueGame(gameCode, 'display', button);
}

// === UI INTERACTIONS ===
// Toggles rules visibility with smooth animation
function toggleRules() {
  const content = document.getElementById('rulesContent');
  const chevron = document.getElementById('rulesChevron');
  const toggle = document.getElementById('rulesToggle');

  const isHidden = content.classList.contains('hidden');

  if (isHidden) {
    content.classList.remove('hidden');
    chevron.style.transform = 'rotate(180deg)';
    toggle.setAttribute('aria-expanded', 'true');
    content.setAttribute('aria-hidden', 'false');
  } else {
    content.classList.add('hidden');
    chevron.style.transform = 'rotate(0deg)';
    toggle.setAttribute('aria-expanded', 'false');
    content.setAttribute('aria-hidden', 'true');
  }
}

// === ERROR HANDLING ===
// Shows error message to user with enhanced styling
function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');

  errorText.textContent = message;
  errorDiv.classList.remove('hidden');

  // Scroll to error message so user sees it
  errorDiv.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  });

  // Add shake animation for attention
  errorDiv.style.animation = 'none';
  errorDiv.offsetHeight; // Trigger reflow
  errorDiv.style.animation = 'shake 0.5s ease-in-out';

  // Auto-hide after 8 seconds (increased from 5)
  setTimeout(hideError, 8000);
}

// Hides error message
function hideError() {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.classList.add('hidden');
  errorDiv.style.animation = 'none';
}

// === BUTTON STATES ===
// Sets button to loading state
function setButtonLoading(button, loadingText, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${loadingText}`;
  } else {
    button.disabled = false;
    button.innerHTML = loadingText;
  }
}

// Gets original button text based on mode
function getOriginalButtonText(button) {
  const mode = button.dataset.mode;
  if (mode === 'control') {
    return '<i class="fas fa-cog mr-2"></i>CONTROL';
  } else {
    return '<i class="fas fa-tv mr-2"></i>DISPLAY';
  }
}

// === VALIDATION ===
// Validates game code format - exactly 6 digits
function validateGameCode(code) {
  return code.length === 6 && /^\d{6}$/.test(code);
}

// === INPUT FORMATTING ===
// Ensures only numbers are entered and max 6 digits
function formatGameCodeInput(event) {
  let value = event.target.value.replace(/\D/g, ''); // Remove non-digits

  // Limit to 6 digits
  if (value.length > 6) {
    value = value.slice(0, 6);
  }

  event.target.value = value;

  // Visual feedback for valid code
  const input = event.target;
  if (value.length === 6) {
    input.classList.add('valid');
  } else {
    input.classList.remove('valid');
  }
}

// === KEYBOARD SHORTCUTS ===
// Handle keyboard shortcuts for better UX
function handleKeyboardShortcuts(event) {
  // Press Enter on game code input to submit with join game
  if (event.key === 'Enter' && event.target.id === 'gameCode') {
    const gameCode = event.target.value.trim();
    if (validateGameCode(gameCode)) {
      const joinButton = document.getElementById('joinGameBtn');
      joinButton.click();
    }
  }

  // Press Enter on continue game code input to submit with Control mode
  if (event.key === 'Enter' && event.target.id === 'continueGameCode') {
    const gameCode = event.target.value.trim();
    if (validateGameCode(gameCode)) {
      const controlButton = document.querySelector('#continueGameForm button[data-mode="control"]');
      controlButton.click();
    }
  }

  // Press Escape to close error message
  if (event.key === 'Escape') {
    hideError();
  }
}

// === INITIALIZATION ===
// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
  console.log('Ce Spun Românii - Homepage loaded');

  // Verifică și testează conexiunea la Supabase
  try {
    if (!window.supabaseClient) {
      throw new Error('Supabase client nu este disponibil');
    }

    // Testează conexiunea efectivă
    const connectionOk = await window.supabaseClient.testConnection();
    if (!connectionOk) {
      console.warn('Conexiunea la Supabase nu funcționează');
      showError('Problemă de conexiune la server. Unele funcții pot fi limitate.');
    } else {
      console.log('✅ Conexiune Supabase verificată cu succes');
    }
  } catch (error) {
    console.error('Eroare la inițializarea conexiunii:', error);
    showError('Eroare de conexiune. Reîncarcă pagina.');
  }

  // Start game button
  const startGameBtn = document.getElementById('startGameBtn');
  if (startGameBtn) {
    startGameBtn.addEventListener('click', startNewGame);
  }

  // Join game form (Deschide un joc)
  const joinGameForm = document.getElementById('joinGameForm');
  if (joinGameForm) {
    joinGameForm.addEventListener('submit', joinGame);
  }

  // Continue game buttons (SCHIMBAT: event listeners individuali)
  const controlBtn = document.querySelector('#continueGameForm button[data-mode="control"]');
  const displayBtn = document.querySelector('#continueGameForm button[data-mode="display"]');

  if (controlBtn) {
    controlBtn.addEventListener('click', function (e) {
      e.preventDefault();
      handleControlButton();
    });
  }

  if (displayBtn) {
    displayBtn.addEventListener('click', function (e) {
      e.preventDefault();
      handleDisplayButton();
    });
  }

  // Rules toggle
  const rulesToggle = document.getElementById('rulesToggle');
  if (rulesToggle) {
    rulesToggle.addEventListener('click', toggleRules);
  }

  // Game code input formatting and validation for both inputs
  const gameCodeInput = document.getElementById('gameCode');
  const continueGameCodeInput = document.getElementById('continueGameCode');

  if (gameCodeInput) {
    gameCodeInput.addEventListener('input', formatGameCodeInput);
    gameCodeInput.addEventListener('input', hideError);
  }

  if (continueGameCodeInput) {
    continueGameCodeInput.addEventListener('input', formatGameCodeInput);
    continueGameCodeInput.addEventListener('input', hideError);
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  // Auto-focus on game code input if URL has focus parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('focus') === 'game') {
    if (gameCodeInput) gameCodeInput.focus();
  }
});

// === UTILITY FUNCTIONS ===
// Smooth scroll to element (for future use)
function scrollToElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
}

// Add visual feedback when copying game code
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Could show a toast notification here
    console.log('Copied to clipboard:', text);
  });
}
