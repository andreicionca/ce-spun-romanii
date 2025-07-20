// ✅ Control Panel Logic - Adaptat pentru client.js
const gameCode = new URLSearchParams(window.location.search).get("game");
let questions = [];
let currentIndex = 0;
let currentQPoints = 0;
let selectedTeam = null;
let gameId = null;
let showMode = false;

let gameState = {
  status: "waiting",
  current_question_index: 0,
  current_question: null,
  team1_score: 0,
  team2_score: 0,
  show_mode: false,
  progressive_strikes: [false, false, false],
  question_displayed: false,
  last_buzz_strike: null,
};

// DOM Elements
const DOM = {
  initScreen: document.getElementById("initScreen"),
  controlPanel: document.getElementById("controlPanel"),
  gameCodeWelcome: document.getElementById("gameCodeWelcome"),
  resumeInfo: document.getElementById("resumeInfo"),
  startBtn: document.getElementById("startBtn"),
  startBtnText: document.getElementById("startBtnText"),
  gameStatus: document.getElementById("gameStatus"),
  statusText: document.getElementById("statusText"),

  stopBtn: document.getElementById("stopGame"),
  pauseBtn: document.getElementById("pauseGame"),
  stopModal: document.getElementById("stopModal"),
  pauseModal: document.getElementById("pauseModal"),
  confirmStop: document.getElementById("confirmStop"),
  cancelStop: document.getElementById("cancelStop"),
  confirmPause: document.getElementById("confirmPause"),
  cancelPause: document.getElementById("cancelPause"),

  // New success modals
  pausedSuccessModal: document.getElementById("pausedSuccessModal"),
  pausedGameCode: document.getElementById("pausedGameCode"),
  pausedOkBtn: document.getElementById("pausedOkBtn"),
  stoppedSuccessModal: document.getElementById("stoppedSuccessModal"),
  finalTeam1Name: document.getElementById("finalTeam1Name"),
  finalTeam2Name: document.getElementById("finalTeam2Name"),
  finalTeam1Score: document.getElementById("finalTeam1Score"),
  finalTeam2Score: document.getElementById("finalTeam2Score"),
  stoppedOkBtn: document.getElementById("stoppedOkBtn"),

  team1Name: document.getElementById("team1Name"),
  team2Name: document.getElementById("team2Name"),
  team1Total: document.getElementById("team1Total"),
  team2Total: document.getElementById("team2Total"),
  questionPoints: document.getElementById("questionPoints"),
  progressElement: document.getElementById("questionProgress"),
  currentQuestionElem: document.getElementById("currentQuestion"),
  answersGrid: document.getElementById("answersGrid"),
  prevQ: document.getElementById("prevQ"),
  nextQ: document.getElementById("nextQ"),
  showQuestionBtn: document.getElementById("showQuestionBtn"),

  buzzStrike: document.getElementById("buzzStrike"),
  progressiveStrikes: document.querySelectorAll(".progressiveStrike"),

  assignModal: document.getElementById("assignModal"),
  modalPoints: document.getElementById("modalPoints"),
  assignTeam1: document.getElementById("assignTeam1"),
  assignTeam2: document.getElementById("assignTeam2"),
};

if (!gameCode) {
  // Use modal instead of alert
  showErrorModal(
    "Cod de joc lipsă!",
    "Accesează această pagină prin setup.",
    () => {
      window.location.href = "index.html";
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  DOM.gameCodeWelcome.textContent = gameCode || "----";
  setupEventListeners();
});

function setupEventListeners() {
  DOM.startBtn.addEventListener("click", startGame);
  DOM.questionPoints.addEventListener("click", showAssignModal);
  DOM.showQuestionBtn.addEventListener("click", showQuestionOnDisplay);

  DOM.stopBtn.addEventListener(
    "click",
    () => (DOM.stopModal.style.display = "flex")
  );
  DOM.pauseBtn.addEventListener(
    "click",
    () => (DOM.pauseModal.style.display = "flex")
  );

  DOM.confirmStop.addEventListener("click", stopGame);
  DOM.cancelStop.addEventListener(
    "click",
    () => (DOM.stopModal.style.display = "none")
  );

  DOM.confirmPause.addEventListener("click", pauseGame);
  DOM.cancelPause.addEventListener(
    "click",
    () => (DOM.pauseModal.style.display = "none")
  );

  // Success modal handlers
  DOM.pausedOkBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  DOM.stoppedOkBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  DOM.assignTeam1.addEventListener("click", () => selectTeam("team1"));
  DOM.assignTeam2.addEventListener("click", () => selectTeam("team2"));

  DOM.prevQ.addEventListener("click", () => changeQuestion(currentIndex - 1));
  DOM.nextQ.addEventListener("click", () => changeQuestion(currentIndex + 1));

  DOM.buzzStrike.addEventListener("click", sendBuzzStrike);
  DOM.progressiveStrikes.forEach((btn, index) => {
    btn.addEventListener("click", () => toggleProgressiveStrike(index));
  });

  document.querySelectorAll(".close-modal").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.modal).style.display = "none";
    })
  );

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  });

  window.addEventListener("resize", () => {
    if (questions.length > 0 && gameState.current_question) {
      restoreAnswersFromState();
    }
  });
}

function showErrorModal(title, message, onOk = null) {
  // Create a temporary error modal if it doesn't exist
  let errorModal = document.getElementById("errorModal");
  if (!errorModal) {
    errorModal = document.createElement("div");
    errorModal.id = "errorModal";
    errorModal.className = "modal";
    errorModal.style.display = "flex";
    errorModal.innerHTML = `
      <div class="glass rounded-lg p-4 md:p-6 w-full max-w-md text-center text-white modal-content">
        <div class="mb-4">
          <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-3"></i>
        </div>
        <h2 class="text-lg md:text-xl font-bold mb-4" id="errorTitle">${title}</h2>
        <p class="mb-6 text-sm md:text-base text-gray-300" id="errorMessage">${message}</p>
        <button id="errorOkBtn" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-semibold text-sm md:text-base">
          <i class="fas fa-check mr-2"></i>În regulă
        </button>
      </div>
    `;
    document.body.appendChild(errorModal);

    document.getElementById("errorOkBtn").addEventListener("click", () => {
      errorModal.style.display = "none";
      if (onOk) onOk();
    });
  } else {
    document.getElementById("errorTitle").textContent = title;
    document.getElementById("errorMessage").textContent = message;
    errorModal.style.display = "flex";
  }
}

async function updateGameState(updates = {}) {
  gameState = { ...gameState, ...updates };

  try {
    await window.supabaseClient.updateGameState(gameId, gameState);
    console.log("Game state updated successfully:", gameState);
    return true;
  } catch (error) {
    console.error("Error updating game state:", error);
    throw error;
  }
}

async function startGame() {
  try {
    console.log("Starting game with code:", gameCode);

    const game = await window.supabaseClient.getGameByCode(gameCode);

    if (!game) {
      showErrorModal(
        "Joc negăsit",
        "Verifică codul de joc și încearcă din nou."
      );
      return;
    }

    console.log("Game loaded:", game);

    gameId = game.id;
    DOM.team1Name.textContent = game.team1_name;
    DOM.team2Name.textContent = game.team2_name;
    DOM.assignTeam1.textContent = game.team1_name;
    DOM.assignTeam2.textContent = game.team2_name;

    const questionSet = await window.supabaseClient.getQuestionSetWithQuestions(
      game.set_id
    );

    if (
      !questionSet ||
      !questionSet.questions ||
      questionSet.questions.length === 0
    ) {
      showErrorModal(
        "Întrebări lipsă",
        "Nu s-au găsit întrebări pentru acest joc!"
      );
      return;
    }

    questions = questionSet.questions;
    console.log("Questions loaded:", questions.length);

    if (game.current_state && Object.keys(game.current_state).length > 0) {
      gameState = { ...game.current_state };

      console.log("Resuming game from state:", gameState);
      await restoreUIFromState();
    } else {
      console.log("Starting new game");

      gameState = {
        status: "waiting",
        current_question_index: 0,
        current_question: null,
        team1_score: game.team1_score || 0,
        team2_score: game.team2_score || 0,
        show_mode: false,
        progressive_strikes: [false, false, false],
        question_displayed: false,
        last_buzz_strike: null,
      };

      await loadQuestion(0);
    }

    DOM.initScreen.classList.add("hidden");
    DOM.controlPanel.classList.remove("hidden");
  } catch (error) {
    console.error("Error starting game:", error);
    showErrorModal("Eroare", "Eroare la pornirea jocului. Verifică codul.");
  }
}

async function loadQuestion(idx) {
  if (idx < 0 || idx >= questions.length) return;

  currentIndex = idx;
  currentQPoints = 0;
  DOM.questionPoints.textContent = "0";
  showMode = false;

  const q = questions[idx];
  DOM.currentQuestionElem.textContent = q.text || "...";

  const answersForState = [];
  if (q.answers) {
    q.answers.forEach((a) => {
      if (a.position >= 1 && a.position <= 8) {
        answersForState[a.position - 1] = {
          id: a.id,
          text: a.text,
          points: a.points,
          position: a.position,
          revealed: false,
        };
      }
    });
  }

  // RESETARE COMPLETĂ A STĂRII PENTRU NOUA ÎNTREBARE
  await updateGameState({
    status: "playing",
    current_question_index: idx,
    current_question: {
      id: q.id,
      text: q.text,
      answers: answersForState,
    },
    question_displayed: false, // RESETEAZĂ afișarea întrebării
    show_mode: false,
    progressive_strikes: [false, false, false], // RESETEAZĂ strikes-urile
    last_buzz_strike: null, // RESETEAZĂ buzz strike
  });

  // RESETARE UI PENTRU BUTONUL DE AFIȘARE
  DOM.showQuestionBtn.style.background = "rgba(59, 130, 246, 0.2)";
  DOM.showQuestionBtn.innerHTML =
    '<i class="fas fa-tv mr-1"></i>Afișează întrebarea';

  // RESETARE UI PENTRU STRIKES
  DOM.progressiveStrikes.forEach((btn) => {
    btn.classList.remove("active");
  });

  generateAnswersGrid(answersForState);
  updateNavigationButtons();
  console.log("Question loaded and state updated:", idx);
}

function generateAnswersGrid(answersForState) {
  const slots = Array(8).fill(null);
  answersForState.forEach((answer, index) => {
    if (answer) {
      slots[index] = answer;
    }
  });

  DOM.answersGrid.innerHTML = "";

  // Unified logic: 1-4 left, 5-8 right for all screens
  [0, 4].forEach((start) => {
    const col = document.createElement("div");
    col.className = "grid-col";

    slots.slice(start, start + 4).forEach((answer, i) => {
      const num = start + i + 1;
      const btn = document.createElement("button");

      // Responsive classes based on screen size
      btn.className =
        window.innerWidth <= 768
          ? "btn-answer p-1 rounded flex justify-between text-xs font-semibold"
          : "btn-answer p-4 rounded-lg flex justify-between text-base font-semibold";

      if (answer) {
        const pointsClass =
          window.innerWidth <= 768
            ? "text-yellow-400"
            : "font-bold text-yellow-400";

        btn.innerHTML = `<span>${num}. ${answer.text}</span><span class="${pointsClass}">${answer.points}</span>`;
        btn.onclick = () => toggleAnswer(btn, answer.points);
        btn.dataset.text = answer.text;
        btn.dataset.points = answer.points;
      } else {
        btn.innerHTML = `<span>${num}.</span><span></span>`;
        btn.disabled = true;
        btn.classList.add("opacity-0");
      }
      col.appendChild(btn);
    });
    DOM.answersGrid.appendChild(col);
  });
}

async function restoreUIFromState() {
  console.log("Restoring UI from state:", gameState);

  currentIndex = gameState.current_question_index || 0;
  showMode = gameState.show_mode || false;

  DOM.team1Total.textContent = gameState.team1_score || 0;
  DOM.team2Total.textContent = gameState.team2_score || 0;

  if (!gameState.current_question && questions.length > 0) {
    await loadQuestion(currentIndex);
    return;
  }

  if (gameState.current_question && questions.length > 0) {
    DOM.currentQuestionElem.textContent =
      gameState.current_question.text || questions[currentIndex]?.text || "...";
    restoreAnswersFromState();
  }

  // Restaurează starea butonului "Afișează"
  if (gameState.question_displayed) {
    DOM.showQuestionBtn.style.background = "rgba(34, 197, 94, 0.3)";
    DOM.showQuestionBtn.innerHTML =
      '<i class="fas fa-check mr-1"></i>Întrebarea afișată';
  } else {
    DOM.showQuestionBtn.style.background = "rgba(59, 130, 246, 0.2)";
    DOM.showQuestionBtn.innerHTML =
      '<i class="fas fa-tv mr-1"></i>Afișează întrebarea';
  }

  updateStrikesUI();
  updateNavigationButtons();
  currentQPoints = calculateCurrentPoints();
  DOM.questionPoints.textContent = currentQPoints;
  console.log("UI restored successfully");
}

function restoreAnswersFromState() {
  if (!gameState.current_question || !gameState.current_question.answers) {
    return;
  }

  const slots = Array(8).fill(null);
  const stateAnswers = gameState.current_question.answers;

  stateAnswers.forEach((answer) => {
    if (answer && answer.position >= 1 && answer.position <= 8) {
      slots[answer.position - 1] = answer;
    }
  });

  DOM.answersGrid.innerHTML = "";

  // Same unified logic
  [0, 4].forEach((start) => {
    const col = document.createElement("div");
    col.className = "grid-col";

    slots.slice(start, start + 4).forEach((answer, i) => {
      const num = start + i + 1;
      const btn = document.createElement("button");

      btn.className =
        window.innerWidth <= 768
          ? "btn-answer p-1 rounded flex justify-between text-xs font-semibold"
          : "btn-answer p-4 rounded-lg flex justify-between text-base font-semibold";

      if (answer) {
        const pointsClass =
          window.innerWidth <= 768
            ? "text-yellow-400"
            : "font-bold text-yellow-400";

        btn.innerHTML = `<span>${num}. ${answer.text}</span><span class="${pointsClass}">${answer.points}</span>`;
        btn.onclick = () => toggleAnswer(btn, answer.points);
        btn.dataset.text = answer.text;
        btn.dataset.points = answer.points;

        if (answer.revealed) {
          btn.classList.add(showMode ? "revealed" : "selected");
        }
      } else {
        btn.innerHTML = `<span>${num}.</span><span></span>`;
        btn.disabled = true;
        btn.classList.add("opacity-0");
      }
      col.appendChild(btn);
    });
    DOM.answersGrid.appendChild(col);
  });
}

function calculateCurrentPoints() {
  if (!gameState.current_question || !gameState.current_question.answers) {
    return 0;
  }

  return gameState.current_question.answers.reduce((total, answer) => {
    return total + (answer && answer.revealed && !showMode ? answer.points : 0);
  }, 0);
}

function updateStrikesUI() {
  DOM.progressiveStrikes.forEach((btn, index) => {
    if (gameState.progressive_strikes[index]) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

async function toggleAnswer(btn, pts) {
  const answerText = btn.dataset.text;

  if (showMode) {
    const isRevealed = btn.classList.toggle("revealed");

    const updatedAnswers = gameState.current_question.answers.map((a) =>
      a && a.text === answerText ? { ...a, revealed: isRevealed } : a
    );

    await updateGameState({
      current_question: {
        ...gameState.current_question,
        answers: updatedAnswers,
      },
    });
  } else {
    if (btn.classList.contains("revealed")) return;

    const sel = btn.classList.toggle("selected");
    currentQPoints += sel ? pts : -pts;
    DOM.questionPoints.textContent = currentQPoints;

    const updatedAnswers = gameState.current_question.answers.map((a) =>
      a && a.text === answerText ? { ...a, revealed: sel } : a
    );

    await updateGameState({
      current_question: {
        ...gameState.current_question,
        answers: updatedAnswers,
      },
    });
  }
}

async function showQuestionOnDisplay() {
  console.log("Toggling question display:", currentIndex);

  if (
    questions.length === 0 ||
    currentIndex < 0 ||
    currentIndex >= questions.length
  ) {
    console.log("No valid question to display");
    return;
  }

  try {
    const newDisplayState = !gameState.question_displayed;

    await updateGameState({
      question_displayed: newDisplayState,
    });

    if (newDisplayState) {
      console.log("Question shown on display");
      DOM.showQuestionBtn.style.background = "rgba(34, 197, 94, 0.3)";
      DOM.showQuestionBtn.innerHTML =
        '<i class="fas fa-check mr-1"></i>Întrebarea afișată';
    } else {
      console.log("Question hidden from display");
      DOM.showQuestionBtn.style.background = "rgba(59, 130, 246, 0.2)";
      DOM.showQuestionBtn.innerHTML =
        '<i class="fas fa-tv mr-1"></i>Afișează întrebarea';
    }
  } catch (error) {
    console.error("Error toggling question display:", error);

    DOM.showQuestionBtn.style.background = "rgba(220, 38, 38, 0.3)";
    DOM.showQuestionBtn.innerHTML = '<i class="fas fa-times mr-1"></i>Eroare';

    setTimeout(() => {
      if (gameState.question_displayed) {
        DOM.showQuestionBtn.style.background = "rgba(34, 197, 94, 0.3)";
        DOM.showQuestionBtn.innerHTML =
          '<i class="fas fa-check mr-1"></i>Afișată';
      } else {
        DOM.showQuestionBtn.style.background = "rgba(59, 130, 246, 0.2)";
        DOM.showQuestionBtn.innerHTML =
          '<i class="fas fa-tv mr-1"></i>Afișează';
      }
    }, 2000);
  }
}

function showAssignModal() {
  if (currentQPoints > 0) {
    DOM.modalPoints.textContent = currentQPoints;
    selectedTeam = null;
    document.querySelectorAll(".team-option").forEach((btn) => {
      btn.classList.remove("selected");
    });
    DOM.assignModal.style.display = "flex";
  }
}

function selectTeam(team) {
  selectedTeam = team;
  document.querySelectorAll(".team-option").forEach((btn) => {
    btn.classList.remove("selected");
  });
  if (team === "team1") {
    DOM.assignTeam1.classList.add("selected");
  } else {
    DOM.assignTeam2.classList.add("selected");
  }
  setTimeout(() => submitPoints(team), 300);
}

async function submitPoints(team) {
  const points = currentQPoints;

  if (team === "team1") {
    const newScore = parseInt(DOM.team1Total.textContent) + points;
    DOM.team1Total.textContent = newScore;
  } else {
    const newScore = parseInt(DOM.team2Total.textContent) + points;
    DOM.team2Total.textContent = newScore;
  }

  DOM.assignModal.style.display = "none";

  currentQPoints = 0;
  DOM.questionPoints.textContent = "0";
  showMode = true;

  await updateGameState({
    team1_score: parseInt(DOM.team1Total.textContent),
    team2_score: parseInt(DOM.team2Total.textContent),
    show_mode: true,
  });
}

async function changeQuestion(newIdx) {
  if (newIdx >= 0 && newIdx < questions.length) {
    showMode = false;
    await loadQuestion(newIdx);
    updateNavigationButtons();
  }
}

function updateNavigationButtons() {
  DOM.prevQ.style.visibility = currentIndex > 0 ? "visible" : "hidden";
  DOM.nextQ.style.visibility =
    currentIndex < questions.length - 1 ? "visible" : "hidden";

  const progressText = `Întrebarea ${currentIndex + 1} din ${questions.length}`;

  DOM.progressElement.textContent = progressText;
}

async function toggleProgressiveStrike(index) {
  gameState.progressive_strikes[index] = !gameState.progressive_strikes[index];

  await updateGameState({
    progressive_strikes: [...gameState.progressive_strikes],
  });

  updateStrikesUI();
  console.log(
    "Progressive strike toggled:",
    index,
    gameState.progressive_strikes[index]
  );
}

async function sendBuzzStrike() {
  console.log("Buzz strike sent");

  await updateGameState({
    last_buzz_strike: Date.now(),
  });

  DOM.buzzStrike.classList.add("flashing");
  setTimeout(() => {
    DOM.buzzStrike.classList.remove("flashing");
  }, 500);
}

async function pauseGame() {
  try {
    await updateGameState({
      ...gameState,
      status: "paused",
      paused_at: new Date().toISOString(),
    });

    DOM.pauseModal.style.display = "none";

    // Show success modal instead of alert
    DOM.pausedGameCode.textContent = gameCode;
    DOM.pausedSuccessModal.style.display = "flex";
  } catch (error) {
    console.error("Error pausing game:", error);
    showErrorModal("Eroare", "Eroare la punerea pe pauză.");
  }
}

async function stopGame() {
  try {
    await saveGameProgress();

    DOM.stopModal.style.display = "none";

    // Show success modal with final scores
    DOM.finalTeam1Name.textContent = DOM.team1Name.textContent;
    DOM.finalTeam2Name.textContent = DOM.team2Name.textContent;
    DOM.finalTeam1Score.textContent = DOM.team1Total.textContent;
    DOM.finalTeam2Score.textContent = DOM.team2Total.textContent;
    DOM.stoppedSuccessModal.style.display = "flex";
  } catch (error) {
    console.error("Error stopping game:", error);
    showErrorModal("Eroare", "Eroare la oprirea jocului.");
  }
}

async function saveGameProgress() {
  if (!gameId) return;

  try {
    await updateGameState({
      status: "finished",
    });
  } catch (error) {
    console.error("Error saving game progress:", error);
  }
}

window.addEventListener("load", async () => {
  try {
    const game = await window.supabaseClient.getGameByCode(gameCode);

    if (game?.current_state && Object.keys(game.current_state).length > 0) {
      if (game.current_state.status === "paused") {
        DOM.resumeInfo.classList.remove("hidden");
        DOM.startBtnText.textContent = "CONTINUĂ";
      }
    }
  } catch (error) {
    console.log("No existing game state found");
  }
});
