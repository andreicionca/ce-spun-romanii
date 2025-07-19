// Supabase Client - Conexiune și funcții CRUD
// file: supabase/client.js

// Credențiale Supabase
const SUPABASE_URL = "https://qpbmchmczpluevmzdrho.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwYm1jaG1jenBsdWV2bXpkcmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NjI4OTcsImV4cCI6MjA2ODIzODg5N30.8PisUse5ydYT09B2ZbUUN7P3dGZeJ6TRKm-wyPGs13o";

// Inițializare client Supabase
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    global: {
      fetch: (url, options) => {
        const timeout = 8000; // 8 secunde timeout
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Serverul nu răspunde.")),
              timeout
            )
          ),
        ]);
      },
    },
  }
);

// === CONEXIUNE ===
async function testConnection() {
  try {
    const { data, error } = await supabaseClient
      .from("questions")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Eroare conexiune baza de date:", error);
      return false;
    }

    console.log("✅ Conectat la Supabase cu succes");
    return true;
  } catch (err) {
    console.error("❌ Conexiune eșuată:", err);
    return false;
  }
}

// === ÎNTREBĂRI ȘI RĂSPUNSURI ===
async function getQuestions(categoryId = null) {
  try {
    let query = supabaseClient.from("questions").select(`
      id,
      text,
      answers (
        id,
        text,
        points,
        position
      ),
      question_categories (
        categories (
          id,
          name
        )
      )
    `);

    if (categoryId) {
      const { data: questionIds, error: categoryError } = await supabaseClient
        .from("question_categories")
        .select("question_id")
        .eq("category_id", categoryId);

      if (categoryError)
        throw new Error(
          `Eroare la obținerea ID-urilor întrebărilor: ${categoryError.message}`
        );

      const ids = questionIds.map((item) => item.question_id);
      query = query.in("id", ids);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error)
      throw new Error(`Eroare la încărcarea întrebărilor: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error("Eroare la încărcarea întrebărilor:", error);
    throw new Error(`Nu s-au putut încărca întrebările: ${error.message}`);
  }
}

async function getQuestionById(questionId) {
  if (!questionId) {
    throw new Error("ID-ul întrebării este necesar");
  }

  try {
    const { data, error } = await supabaseClient
      .from("questions")
      .select(
        `
        id,
        text,
        answers (
          id,
          text,
          points,
          position
        )
      `
      )
      .eq("id", questionId)
      .single();

    if (error)
      throw new Error(`Eroare la obținerea întrebării: ${error.message}`);
    return data;
  } catch (error) {
    console.error("Eroare la încărcarea întrebării:", error);
    throw new Error(`Nu s-a putut încărca întrebarea: ${error.message}`);
  }
}

// === CATEGORII ===
async function getCategories() {
  try {
    const { data, error } = await supabaseClient
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error)
      throw new Error(`Eroare la obținerea categoriilor: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error("Eroare la încărcarea categoriilor:", error);
    throw new Error(`Nu s-au putut încărca categoriile: ${error.message}`);
  }
}

// === SETURI ÎNTREBĂRI ===
async function getQuestionSets(typeFilter = "default") {
  try {
    let query = supabaseClient.from("question_sets").select("*");

    // Filtrăm doar seturile de tipul specificat
    if (typeFilter) {
      query = query.eq("type", typeFilter);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error)
      throw new Error(`Eroare la obținerea seturilor: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error("Eroare la încărcarea seturilor:", error);
    throw new Error(
      `Nu s-au putut încărca seturile de întrebări: ${error.message}`
    );
  }
}

async function getQuestionSetWithQuestions(setId) {
  if (!setId) {
    throw new Error("ID-ul setului este necesar");
  }

  try {
    // Obținem informațiile despre set
    const { data: setData, error: setError } = await supabaseClient
      .from("question_sets")
      .select("*")
      .eq("id", setId)
      .single();

    if (setError)
      throw new Error(`Eroare la obținerea setului: ${setError.message}`);

    // Obținem întrebările din set
    const { data: items, error: itemsError } = await supabaseClient
      .from("question_set_items")
      .select(
        `
        question_id,
        order_index,
        questions (
          id,
          text,
          answers (
            id,
            text,
            points,
            position
          )
        )
      `
      )
      .eq("set_id", setId)
      .order("order_index", { ascending: true });

    if (itemsError)
      throw new Error(
        `Eroare la obținerea întrebărilor din set: ${itemsError.message}`
      );

    return {
      ...setData,
      questions: items.map((item) => item.questions).filter((q) => q !== null),
    };
  } catch (error) {
    console.error("Eroare la încărcarea detaliilor setului:", error);
    throw new Error(
      `Nu s-au putut încărca detaliile setului: ${error.message}`
    );
  }
}

// === JOCURI ===

// === JOCURI === (Funcții corectate)

async function createGame(gameData) {
  if (!gameData || typeof gameData !== "object") {
    throw new Error("Datele jocului sunt invalide");
  }

  try {
    const { data, error } = await supabaseClient
      .from("games")
      .insert([
        {
          game_code: gameData.game_code,
          set_id: gameData.set_id,
          team1_name: gameData.team1_name,
          team2_name: gameData.team2_name,
          current_state: gameData.current_state || {
            status: "waiting",
            team1_score: 0,
            team2_score: 0,
            current_question_index: 0,
            current_question: null,
            show_mode: false,
            progressive_strikes: [false, false, false],
            question_displayed: false,
            last_buzz_strike: null,
          },
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Eroare la crearea jocului: ${error.message}`);
    return data;
  } catch (error) {
    console.error("Eroare la crearea jocului:", error);
    throw new Error(`Nu s-a putut crea jocul: ${error.message}`);
  }
}

async function updateGameState(gameId, state) {
  if (!gameId || !state) {
    throw new Error("ID-ul jocului și starea sunt necesare");
  }

  try {
    const { data, error } = await supabaseClient
      .from("games")
      .update({
        current_state: state,
      })
      .eq("id", gameId)
      .select()
      .single();

    if (error)
      throw new Error(
        `Eroare la actualizarea stării jocului: ${error.message}`
      );
    return data;
  } catch (error) {
    console.error("Eroare la actualizarea stării jocului:", error);
    throw new Error(`Nu s-a putut actualiza starea jocului: ${error.message}`);
  }
}

async function getGameByCode(gameCode) {
  if (!gameCode) {
    throw new Error("Codul jocului este necesar");
  }

  try {
    const { data, error } = await supabaseClient
      .from("games")
      .select(
        `
        *,
        question_sets (
          id,
          name,
          description
        )
      `
      )
      .eq("game_code", gameCode)
      .single();

    if (error) throw new Error(`Eroare la obținerea jocului: ${error.message}`);
    return data;
  } catch (error) {
    console.error("Eroare la încărcarea jocului:", error);
    throw new Error(`Nu s-a putut încărca jocul: ${error.message}`);
  }
}

async function checkGameCodeExists(gameCode) {
  if (!gameCode) {
    throw new Error("Codul jocului este necesar");
  }

  try {
    const { data, error } = await supabaseClient
      .from("games")
      .select("id")
      .eq("game_code", gameCode)
      .limit(1);

    if (error) {
      console.error("Eroare la verificarea codului:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error("Eroare la verificarea codului jocului:", error);
    return false;
  }
}

// === UTILITĂȚI ===
function generateGameCode() {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}

// Export global pentru utilizare în alte fișiere
window.supabaseClient = {
  testConnection,
  getQuestions,
  getQuestionById,
  getCategories,
  getQuestionSets,
  getQuestionSetWithQuestions,
  createGame,
  getGameByCode,
  updateGameState,
  checkGameCodeExists,
  generateGameCode,
};

window.supabaseClient.raw = supabaseClient;
