// Conexiune Supabase
const { createClient } = supabase;
const supabaseClient = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

// === QUESTION SETS ===
async function getQuestionSets() {
  try {
    const { data, error } = await supabaseClient
      .from("question_sets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error loading question sets:", error);
    throw error;
  }
}

async function getQuestionSetWithQuestions(setId) {
  try {
    // Obținem mai întâi informațiile despre set
    const { data: setData, error: setError } = await supabaseClient
      .from("question_sets")
      .select("*")
      .eq("id", setId)
      .single();

    if (setError) throw setError;

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

    if (itemsError) throw itemsError;

    // Formatăm răspunsul în formatul așteptat
    return {
      ...setData,
      questions: items.map((item) => item.questions).filter((q) => q !== null),
    };
  } catch (error) {
    console.error("Error loading question set details:", error);
    throw error;
  }
}

// === CATEGORIES ===
async function getCategories() {
  try {
    const { data, error } = await supabaseClient
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error loading categories:", error);
    throw error;
  }
}

// === QUESTIONS ===
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
      // Folosim un query separat pentru filtrarea după categorie
      const { data: questionIds, error: categoryError } = await supabaseClient
        .from("question_categories")
        .select("question_id")
        .eq("category_id", categoryId);

      if (categoryError) throw categoryError;

      const ids = questionIds.map((item) => item.question_id);
      query = query.in("id", ids);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error loading questions:", error);
    throw error;
  }
}

// === GAMES ===
async function createGame(gameData) {
  try {
    const { data, error } = await supabaseClient
      .from("games")
      .insert([gameData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating game:", error);
    throw error;
  }
}

// Alias pentru compatibilitate
const createGameInDB = createGame;

async function getGameByCode(gameCode) {
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error loading game:", error);
    throw error;
  }
}

async function updateGameScore(gameId, team1Score, team2Score) {
  try {
    const { data, error } = await supabaseClient
      .from("games")
      .update({
        team1_score: team1Score,
        team2_score: team2Score,
      })
      .eq("id", gameId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating game score:", error);
    throw error;
  }
}

async function updateGameStatus(gameId, status) {
  try {
    const { data, error } = await supabaseClient
      .from("games")
      .update({ status })
      .eq("id", gameId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating game status:", error);
    throw error;
  }
}

// === GAME STATE ===
async function saveGameState(gameId, actionType, actionData) {
  try {
    const { data, error } = await supabaseClient
      .from("game_state")
      .insert([
        {
          game_id: gameId,
          action_type: actionType,
          data: actionData,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error saving game state:", error);
    throw error;
  }
}

// === REALTIME SUBSCRIPTIONS ===
function subscribeToGame(gameId, callback) {
  return supabaseClient
    .channel(`game_${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      callback
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_state",
        filter: `game_id=eq.${gameId}`,
      },
      callback
    )
    .subscribe();
}

function unsubscribeFromGame(subscription) {
  supabaseClient.removeChannel(subscription);
}

// === UTILITIES ===
async function checkGameCodeExists(gameCode) {
  try {
    const { data, error } = await supabaseClient
      .from("games")
      .select("id")
      .eq("game_code", gameCode)
      .single();

    return !error && data;
  } catch (error) {
    return false;
  }
}
