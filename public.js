// ✅ Public Display Logic - Ce Spun Românii (OPTIMIZED)
// Synchronized with control panel via Supabase realtime

// Get game code from URL
const gameCode = new URLSearchParams(window.location.search).get("game");

// Game state
let gameId = null;
let gameState = null;
let allQuestions = [];
let lastBuzzTime = 0;
let introPlayed = false;
let currentScores = { team1: 0, team2: 0, question: 0 };
let realtimeSubscription = null;

// DOM Elements
const DOM = {
  // Screens
  waitingScreen: document.getElementById("waitingScreen"),
  introScreen: document.getElementById("introScreen"),
  gameBoard: document.getElementById("gameBoard"),

  // Connection
  connectionStatus: document.getElementById("connectionStatus"),
  connectionText: document.getElementById("connectionText"),

  // Waiting screen
  gameCodeDisplay: document.getElementById("gameCodeDisplay"),

  // Intro screen
  introTitle: document.getElementById("introTitle"),
  introTeam1: document.getElementById("introTeam1"),
  introTeam2: document.getElementById("introTeam2"),

  // Game board
  team1Name: document.getElementById("team1Name"),
  team2Name: document.getElementById("team2Name"),
  team1Score: document.getElementById("team1Score"),
  team2Score: document.getElementById("team2Score"),
  questionPoints: document.getElementById("questionPoints"),

  // Question
  questionArea: document.getElementById("questionArea"),
  questionText: document.getElementById("questionText"),

  // Answers
  answerSlots: document.querySelectorAll(".answer-slot"),

  // Strikes
  strikeIndicators: document.querySelectorAll(".strike-indicator"),

  // Modals
  buzzModal: document.getElementById("buzzModal"),
  strikeModal: document.getElementById("strikeModal"),
  strikeDisplay: document.getElementById("strikeDisplay"),

  // Game finished modal elements
  gameFinishedModal: document.getElementById("gameFinishedModal"),
  finalTeam1Name: document.getElementById("finalTeam1Name"),
  finalTeam2Name: document.getElementById("finalTeam2Name"),
  finalTeam1Score: document.getElementById("finalTeam1Score"),
  finalTeam2Score: document.getElementById("finalTeam2Score"),
  winnerAnnouncement: document.getElementById("winnerAnnouncement"),
  newGameBtn: document.getElementById("newGameBtn"),

  // Game paused modal elements
  gamePausedModal: document.getElementById("gamePausedModal"),
  pausedGameCode: document.getElementById("pausedGameCode"),
  pausedOkBtn: document.getElementById("pausedOkBtn"),
};

// Validation
if (!gameCode) {
  alert("Cod de joc lipsă!");
  window.location.href = "index.html";
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  DOM.gameCodeDisplay.textContent = gameCode;
  setupModalEventListeners();
  initGame();
});

// Setup modal event listeners
function setupModalEventListeners() {
  DOM.newGameBtn?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  DOM.pausedOkBtn?.addEventListener("click", () => {
    DOM.gamePausedModal?.classList.remove("show");
  });
}

// INITIALIZATION
async function initGame() {
  try {
    updateConnectionStatus("connecting");

    if (!window.supabaseClient) {
      throw new Error("Supabase client not initialized");
    }

    // Load game data
    const game = await window.supabaseClient.getGameByCode(gameCode);
    if (!game) {
      throw new Error("Game not found");
    }

    gameId = game.id;

    // Set team names
    DOM.team1Name.textContent = game.team1_name;
    DOM.team2Name.textContent = game.team2_name;
    DOM.introTeam1.textContent = game.team1_name;
    DOM.introTeam2.textContent = game.team2_name;

    // Load questions
    const questionSet = await window.supabaseClient.getQuestionSetWithQuestions(
      game.set_id
    );
    if (!questionSet?.questions?.length) {
      throw new Error("No questions found");
    }

    allQuestions = questionSet.questions;

    // Check game state
    if (game.current_state && Object.keys(game.current_state).length > 0) {
      gameState = game.current_state;

      if (gameState.status === "playing") {
        introPlayed = true;
        showGameBoard();
        updateUI();
      } else if (gameState.status === "paused") {
        showGamePausedModal();
      } else if (gameState.status === "finished") {
        showGameFinishedModal(gameState);
      }
    } else {
      gameState = { status: "waiting" };
    }

    setupRealtime();
    updateConnectionStatus("connected");
  } catch (error) {
    updateConnectionStatus("error");
    DOM.connectionText.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i>Eroare: ${error.message}`;
  }
}

// REALTIME SYNCHRONIZATION
function setupRealtime() {
  if (realtimeSubscription) {
    realtimeSubscription.unsubscribe();
  }

  try {
    realtimeSubscription = window.supabaseClient.raw
      .channel(`public-game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        handleGameUpdate
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          updateConnectionStatus("connected");
        } else if (status === "CHANNEL_ERROR") {
          updateConnectionStatus("error");
        }
      });

    window.addEventListener("beforeunload", () => {
      realtimeSubscription?.unsubscribe();
    });
  } catch (error) {
    updateConnectionStatus("error");
  }
}

function handleGameUpdate(payload) {
  try {
    const newGame = payload.new;
    if (!newGame?.current_state) return;

    const newState = newGame.current_state;

    // Check if game started and we haven't played intro yet
    if (!introPlayed && newState.status === "playing") {
      playIntroAnimation();
      gameState = newState;
      return;
    }

    gameState = newState;

    // Handle status changes
    if (newState.status === "finished") {
      showGameFinishedModal(newState);
      return;
    }

    if (newState.status === "paused") {
      showGamePausedModal();
      return;
    }

    // Handle buzz strike
    if (
      newState.last_buzz_strike &&
      newState.last_buzz_strike !== lastBuzzTime
    ) {
      showBuzzModal();
      lastBuzzTime = newState.last_buzz_strike;
    }

    // Update UI if game is active
    if (introPlayed && newState.status === "playing") {
      updateUI();
    }
  } catch (error) {
    console.error("Error handling game update:", error);
  }
}

// SCREEN TRANSITIONS
async function playIntroAnimation() {
  if (introPlayed) return;

  introPlayed = true;
  DOM.waitingScreen?.classList.add("hidden");
  DOM.introScreen?.classList.remove("hidden");

  setTimeout(() => {
    showGameBoard();
  }, 5000);
}

function showGameBoard() {
  DOM.introScreen?.classList.add("hidden");
  DOM.gameBoard?.classList.remove("hidden");
  DOM.gameBoard?.classList.add("fade-in");

  if (gameState) {
    updateUI();
  }
}

// UI UPDATES
function updateUI() {
  if (!gameState) return;

  updateScores();
  updateQuestionPoints();
  updateQuestion();
  updateAnswers();
  updateStrikes();
}

function updateScores() {
  const newTeam1Score = gameState.team1_score || 0;
  const newTeam2Score = gameState.team2_score || 0;

  if (newTeam1Score !== currentScores.team1) {
    animateScoreUpdate(DOM.team1Score, currentScores.team1, newTeam1Score);
    currentScores.team1 = newTeam1Score;
  }

  if (newTeam2Score !== currentScores.team2) {
    animateScoreUpdate(DOM.team2Score, currentScores.team2, newTeam2Score);
    currentScores.team2 = newTeam2Score;
  }
}

function updateQuestionPoints() {
  let newPoints = 0;

  if (gameState.current_question?.answers) {
    newPoints = gameState.current_question.answers
      .filter((a) => a?.revealed && !gameState.show_mode)
      .reduce((sum, a) => sum + (a.points || 0), 0);
  }

  if (newPoints !== currentScores.question) {
    animateScoreUpdate(DOM.questionPoints, currentScores.question, newPoints);
    currentScores.question = newPoints;
  }
}

function updateQuestion() {
  if (!gameState.current_question || !gameState.question_displayed) {
    hideQuestion();
    return;
  }

  showQuestion(gameState.current_question.text);
}

function showQuestion(questionText) {
  DOM.questionText.textContent = questionText || "";
  DOM.questionArea.classList.remove("hidden");
  DOM.questionArea.classList.add("revealed");
  DOM.questionText.classList.add("question-slide-in");

  setTimeout(() => {
    DOM.questionText.classList.remove("question-slide-in");
  }, 800);
}

function hideQuestion() {
  DOM.questionArea.classList.remove("revealed");
  DOM.questionArea.classList.add("hidden");
  DOM.questionText.textContent = "";
}

function updateAnswers() {
  // Reset all answer slots
  DOM.answerSlots.forEach((slot) => {
    slot.className =
      "answer-slot rounded-lg p-2 md:p-3 flex items-center justify-between";
    const answerText = slot.querySelector(".answer-text");
    const answerPoints = slot.querySelector(".answer-points");
    if (answerText) answerText.textContent = "";
    if (answerPoints) answerPoints.textContent = "";
  });

  if (!gameState.current_question) return;

  const questionId = gameState.current_question.id;
  const fullQuestion = allQuestions.find((q) => q.id === questionId);
  if (!fullQuestion?.answers) return;

  // Process each answer
  fullQuestion.answers.forEach((answer) => {
    if (answer.position >= 1 && answer.position <= 8) {
      const slot = document.querySelector(
        `[data-position="${answer.position}"]`
      );
      if (slot) {
        slot.classList.add("exists");

        const stateAnswer = gameState.current_question.answers?.find(
          (a) => a?.position === answer.position
        );

        if (stateAnswer?.revealed) {
          setTimeout(() => {
            slot.classList.add("revealed");
            const answerText = slot.querySelector(".answer-text");
            const answerPoints = slot.querySelector(".answer-points");
            if (answerText) answerText.textContent = answer.text;
            if (answerPoints) answerPoints.textContent = answer.points;
          }, (answer.position - 1) * 100);
        }
      }
    }
  });
}

function updateStrikes() {
  if (!gameState.progressive_strikes) return;

  DOM.strikeIndicators.forEach((indicator, index) => {
    const wasActive = indicator.classList.contains("active");
    const shouldBeActive = gameState.progressive_strikes[index];

    if (shouldBeActive && !wasActive) {
      indicator.classList.add("active");
      showStrikeModal(index + 1);
    } else if (!shouldBeActive && wasActive) {
      indicator.classList.remove("active");
    }
  });
}

// ANIMATIONS
function animateScoreUpdate(element, fromValue, toValue) {
  if (!element) return;

  element.classList.add("updating");

  const duration = 800;
  const startTime = performance.now();
  const difference = toValue - fromValue;

  function updateScore(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(fromValue + difference * easedProgress);

    element.textContent = currentValue;

    if (progress < 1) {
      requestAnimationFrame(updateScore);
    } else {
      element.classList.remove("updating");
    }
  }

  requestAnimationFrame(updateScore);
}

// MODALS
function showBuzzModal() {
  DOM.buzzModal?.classList.add("show");
  setTimeout(() => {
    DOM.buzzModal?.classList.remove("show");
  }, 1500);
}

function showStrikeModal(strikeCount) {
  if (!DOM.strikeModal || !DOM.strikeDisplay) return;

  let strikeText = "";
  for (let i = 0; i < strikeCount; i++) {
    strikeText += '<i class="fas fa-x"></i>';
    if (i < strikeCount - 1) strikeText += " ";
  }

  DOM.strikeDisplay.innerHTML = strikeText;
  DOM.strikeModal.classList.add("show");

  setTimeout(() => {
    DOM.strikeModal.classList.remove("show");
  }, 2000);
}

function showGameFinishedModal(finalState) {
  if (!DOM.gameFinishedModal) return;

  const team1Score = finalState.team1_score || 0;
  const team2Score = finalState.team2_score || 0;

  DOM.finalTeam1Name.textContent = DOM.team1Name.textContent;
  DOM.finalTeam2Name.textContent = DOM.team2Name.textContent;
  DOM.finalTeam1Score.textContent = team1Score;
  DOM.finalTeam2Score.textContent = team2Score;

  let winnerText = "";
  if (team1Score > team2Score) {
    winnerText = `🎉 ${DOM.team1Name.textContent} CÂȘTIGĂ! 🎉`;
  } else if (team2Score > team1Score) {
    winnerText = `🎉 ${DOM.team2Name.textContent} CÂȘTIGĂ! 🎉`;
  } else {
    winnerText = "🤝 EGALITATE! 🤝";
  }

  DOM.winnerAnnouncement.textContent = winnerText;
  DOM.gameFinishedModal.classList.add("show");
}

function showGamePausedModal() {
  if (!DOM.gamePausedModal) return;
  DOM.pausedGameCode.textContent = gameCode;
  DOM.gamePausedModal.classList.add("show");
}

// CONNECTION STATUS
function updateConnectionStatus(status) {
  if (!DOM.connectionStatus || !DOM.connectionText) return;

  switch (status) {
    case "connected":
      DOM.connectionStatus.className = "connection-status status-connected";
      DOM.connectionText.innerHTML =
        '<i class="fas fa-check mr-1"></i>Conectat';
      break;
    case "connecting":
      DOM.connectionStatus.className = "connection-status status-error";
      DOM.connectionText.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-1"></i>Conectare...';
      break;
    case "error":
    default:
      DOM.connectionStatus.className = "connection-status status-error";
      DOM.connectionText.innerHTML =
        '<i class="fas fa-exclamation-triangle mr-1"></i>Eroare';
      break;
  }
}
