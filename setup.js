// setup.js
// Game State
let gameType = null;
let selectedSetId = null;
let selectedQuestions = [];
let selectedCategory = null;
let currentGameCode = null;
let allCategories = [];
let allQuestions = [];
let allSets = [];
let modalStack = []; // Stack pentru conținutul modalului
let currentModalType = null; // 'set' sau 'question'

// User session management
let currentUser = null;
let userType = null; // 'authenticated', 'guest', null
let guestSession = null;

// DOM Elements
const questionSection = document.getElementById('questionSection');
const quickGameSets = document.getElementById('quickGameSets');
const customGameQuestions = document.getElementById('customGameQuestions');
const teamSection = document.getElementById('teamSection');
const createSection = document.getElementById('createSection');
const loadingSection = document.getElementById('loadingSection');
const gameCreatedSection = document.getElementById('gameCreatedSection');
const previewModal = document.getElementById('previewModal');

// Initialize
// Initialize
document.addEventListener('DOMContentLoaded', function () {
  if (!window.supabaseClient) {
    showError('Eroare: Supabase client nu este disponibil');
    return;
  }

  // ADAUGĂ VERIFICAREA AUTENTIFICĂRII
  checkAuthentication();
});

// FUNCȚIE NOUĂ - verifică autentificarea
async function checkAuthentication() {
  try {
    // 1. User autentificat?
    const {
      data: { session },
    } = await window.supabaseClient.raw.auth.getSession();

    if (session) {
      // Get profile from DB
      const { data: profile, error: profileError } = await window.supabaseClient.raw
        .from('user_profiles')
        .select('role, username')
        .eq('id', session.user.id)
        .single();

      console.log('Profile error:', profileError); // ← AICI

      currentUser = {
        id: session.user.id,
        email: session.user.email,
        username: profile?.username || '',
        role: profile?.role || 'user',
      };
      userType = 'authenticated';
      // console.log('User autentificat:', currentUser);
    }
    // 2. Guest simplu?
    else if (getCookie('is_guest') === 'true') {
      userType = 'guest';
      console.log('User guest');
    }
    // 3. Nu e nimic
    else {
      showError('Nu ești autentificat. Te redirectionăm...');
      setTimeout(() => {
        window.location.href = 'auth.html';
      }, 2000);
      return;
    }

    // Continuă cu inițializarea normală
    setupEventListeners();
    loadInitialData();
    showUserInfo();
  } catch (error) {
    console.error('Error checking authentication:', error);
    showError('Eroare la verificarea autentificării');
    setTimeout(() => {
      window.location.href = 'auth.html';
    }, 2000);
  }
}
// Afișează info utilizator în header
function showUserInfo() {
  const userInfoHeader = document.getElementById('userInfoHeader');
  const authenticatedUser = document.getElementById('authenticatedUser');
  const guestUser = document.getElementById('guestUser');

  userInfoHeader.classList.remove('hidden');

  if (userType === 'authenticated') {
    authenticatedUser.classList.remove('hidden');
    guestUser.classList.add('hidden');
    document.getElementById('userName').textContent = currentUser.email;

    // Adaugă event listener pentru logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  } else if (userType === 'guest') {
    guestUser.classList.remove('hidden');
    authenticatedUser.classList.add('hidden');
    updateGuestInfo();
  }
}

// Actualizează info guest
function updateGuestInfo() {
  const guestSetsCount = document.getElementById('guestSetsCount');
  guestSetsCount.textContent = `(acces la un set public)`;
}

// Logout handler
async function handleLogout() {
  try {
    await window.supabaseClient.raw.auth.signOut();
    window.location.href = 'auth.html';
  } catch (error) {
    console.error('Logout error:', error);
    showError('Eroare la deconectare');
  }
}

// ==================== EVENT HANDLERS ====================

function setupEventListeners() {
  // Game type selection
  const gameTypeOptions = document.querySelectorAll('.game-type-option');
  gameTypeOptions.forEach((option) => {
    option.removeEventListener('click', handleGameTypeSelection); // Prevent duplicate listeners
    option.addEventListener('click', handleGameTypeSelection);
  });

  // Search inputs
  const setSearch = document.getElementById('setSearch');
  const categorySearch = document.getElementById('categorySearch');
  setSearch.removeEventListener('input', filterSets);
  setSearch.addEventListener('input', filterSets);
  categorySearch.removeEventListener('input', filterCategories);
  categorySearch.addEventListener('input', filterCategories);

  // All Categories button
  const allCategoriesBtn = document.getElementById('allCategoriesBtn');
  allCategoriesBtn.removeEventListener('click', handleAllCategories);
  allCategoriesBtn.addEventListener('click', handleAllCategories);

  // Team inputs
  const team1Name = document.getElementById('team1Name');
  const team2Name = document.getElementById('team2Name');
  team1Name.removeEventListener('input', checkTeamNames);
  team1Name.addEventListener('input', checkTeamNames);
  team2Name.removeEventListener('input', checkTeamNames);
  team2Name.addEventListener('input', checkTeamNames);

  // Create game button
  const createGameBtn = document.getElementById('createGameBtn');
  createGameBtn.removeEventListener('click', createGameHandler);
  createGameBtn.addEventListener('click', createGameHandler);

  // Navigation buttons
  const openControlBtn = document.getElementById('openControlBtn');
  const openPublicBtn = document.getElementById('openPublicBtn');
  openControlBtn.removeEventListener('click', openControl);
  openControlBtn.addEventListener('click', openControl);
  openPublicBtn.removeEventListener('click', openPublic);
  openPublicBtn.addEventListener('click', openPublic);

  // Preview modal
  const closePreviewBtn = document.getElementById('closePreview');
  closePreviewBtn.removeEventListener('click', closePreview);
  closePreviewBtn.addEventListener('click', closePreview);
  previewModal.removeEventListener('click', handleModalClick);
  previewModal.addEventListener('click', handleModalClick);
}

function handleGameTypeSelection() {
  document.querySelectorAll('.game-type-option').forEach((opt) => opt.classList.remove('selected'));
  this.classList.add('selected');
  gameType = this.dataset.type;
  showQuestionSection();
}

function handleAllCategories() {
  const allCategoriesBtn = document.getElementById('allCategoriesBtn');

  if (allCategoriesBtn.classList.contains('selected')) {
    allCategoriesBtn.classList.remove('selected');
    selectedCategory = null;
  } else {
    document
      .querySelectorAll('.category-option')
      .forEach((opt) => opt.classList.remove('selected'));
    allCategoriesBtn.classList.add('selected');
    selectedCategory = null;
  }

  loadQuestions();
}

function handleModalClick(e) {
  if (e.target === this) closePreview();
}

// ==================== DATA LOADING ====================

async function loadInitialData() {
  try {
    showLoading('Se încarcă datele inițiale...');
    const [categories, sets] = await Promise.all([
      window.supabaseClient.getCategories(),
      window.supabaseClient.getQuestionSets(),
    ]);

    allCategories = categories;
    allSets = sets;
    hideLoading();
  } catch (error) {
    console.error('Error loading initial data:', error);
    showError('Eroare la încărcarea datelor. Reîncarcă pagina.');
  }
}
async function loadSets() {
  const container = document.getElementById('availableSets');
  container.innerHTML =
    '<div class="text-center text-blue-200 col-span-full">Se încarcă seturile...</div>';

  try {
    // Afișează notificarea pentru guest-uri în jocul rapid
    if (userType === 'guest') {
      showGuestQuickGameNotification();
    }

    let availableSets = [];

    if (userType === 'guest') {
      const { data: guestSets } = await window.supabaseClient.raw
        .from('question_sets')
        .select('*')
        .eq('is_public', true)
        .order('created_at')
        .limit(2);
      availableSets = guestSets;
    } else if (userType === 'authenticated') {
      // USER AUTENTIFICAT: seturi publice + seturi proprii private
      if (currentUser.role === 'admin') {
        // ADMIN: toate seturile
        availableSets = await window.supabaseClient.getQuestionSets();
      } else {
        // USER NORMAL: publice + proprii
        const { data: sets, error } = await window.supabaseClient.raw
          .from('question_sets')
          .select('*')
          .or(`is_public.eq.true,and(created_by.eq.${currentUser.id})`);

        if (error) throw error;
        availableSets = sets;
      }
    }

    const setsWithCounts = await Promise.all(
      availableSets.map(async (set) => {
        const setData = await window.supabaseClient.getQuestionSetWithQuestions(set.id);
        return {
          ...set,
          questionCount: setData.questions ? setData.questions.length : 0,
        };
      })
    );

    allSets = setsWithCounts;
    displaySets(setsWithCounts);
  } catch (error) {
    console.error('Error loading sets:', error);
    container.innerHTML =
      '<div class="text-center text-red-300 col-span-full">Eroare la încărcarea seturilor</div>';
  }
}
async function loadQuestions() {
  const container = document.getElementById('availableQuestions');
  container.innerHTML =
    '<div class="text-center text-blue-200 col-span-full">Se încarcă întrebările...</div>';

  try {
    let questions = [];

    if (userType === 'guest') {
      // GUEST: întrebări DOAR din primele 3 seturi publice (aceleași ca la jocul rapid)
      const { data: publicSets } = await window.supabaseClient.raw
        .from('question_sets')
        .select('id')
        .eq('is_public', true)
        .order('created_at')
        .limit(2);

      if (publicSets && publicSets.length > 0) {
        const setIds = publicSets.map((s) => s.id);

        // Obține toate întrebările din aceste seturi
        const { data: setItems } = await window.supabaseClient.raw
          .from('question_set_items')
          .select('question_id')
          .in('set_id', setIds);

        if (setItems && setItems.length > 0) {
          const questionIds = setItems.map((item) => item.question_id);

          const { data: guestQuestions, error } = await window.supabaseClient.raw
            .from('questions')
            .select('*, answers (*)')
            .in('id', questionIds);

          if (error) throw error;

          // Filtrare după categorie dacă este selectată
          if (selectedCategory) {
            const { data: categoryQuestions } = await window.supabaseClient.raw
              .from('question_categories')
              .select('question_id')
              .eq('category_id', selectedCategory);

            if (categoryQuestions) {
              const categoryQuestionIds = categoryQuestions.map((cq) => cq.question_id);
              questions = guestQuestions.filter((q) => categoryQuestionIds.includes(q.id));
            }
          } else {
            questions = guestQuestions;
          }
        }
      }
    } else if (userType === 'authenticated') {
      // USER AUTENTIFICAT: accesul complet normal
      if (currentUser.role === 'admin') {
        // ADMIN: toate întrebările
        questions = await window.supabaseClient.getQuestions(selectedCategory);
      } else {
        // USER NORMAL: întrebări din seturile accesibile (publice + proprii)
        const { data: accessibleSets } = await window.supabaseClient.raw
          .from('question_sets')
          .select('id')
          .or(`is_public.eq.true,and(created_by.eq.${currentUser.id})`);

        if (accessibleSets && accessibleSets.length > 0) {
          const setIds = accessibleSets.map((s) => s.id);

          const { data: setItems } = await window.supabaseClient.raw
            .from('question_set_items')
            .select('question_id')
            .in('set_id', setIds);

          if (setItems && setItems.length > 0) {
            const questionIds = setItems.map((item) => item.question_id);

            let query = window.supabaseClient.raw
              .from('questions')
              .select('*, answers (*)')
              .in('id', questionIds);

            // Filtrare după categorie dacă este selectată
            if (selectedCategory) {
              const { data: categoryQuestions } = await window.supabaseClient.raw
                .from('question_categories')
                .select('question_id')
                .eq('category_id', selectedCategory);

              if (categoryQuestions) {
                const categoryQuestionIds = categoryQuestions.map((cq) => cq.question_id);
                const filteredIds = questionIds.filter((id) => categoryQuestionIds.includes(id));
                query = window.supabaseClient.raw
                  .from('questions')
                  .select('*, answers (*)')
                  .in('id', filteredIds);
              }
            }

            const { data: userQuestions, error } = await query;
            if (error) throw error;
            questions = userQuestions;
          }
        }
      }
    }

    allQuestions = questions;

    if (questions.length === 0) {
      container.innerHTML =
        '<div class="text-center text-blue-200 col-span-full">Nu s-au găsit întrebări pentru această categorie</div>';
      return;
    }

    displayQuestions(questions);
  } catch (error) {
    console.error('Error loading questions:', error);
    container.innerHTML =
      '<div class="text-center text-red-300 col-span-full">Eroare la încărcarea întrebărilor</div>';
  }
}
// Helper function pentru a obține seturile accesibile guest-urilor
async function getGuestAccessibleSets() {
  const { data: publicSets, error } = await window.supabaseClient.raw
    .from('question_sets')
    .select('id, name')
    .eq('is_public', true)
    .order('created_at')
    .limit(2);

  if (error) {
    console.error('Error getting guest accessible sets:', error);
    return [];
  }

  return publicSets || [];
}

// Actualizează și loadCategories pentru consistență
async function loadCategories() {
  const container = document.getElementById('availableCategories');
  container.innerHTML =
    '<div class="text-center text-blue-200 col-span-full">Se încarcă categoriile...</div>';

  try {
    let availableCategories = [];

    if (userType === 'guest') {
      // GUEST: categorii doar din seturile publice accesibile
      const guestSets = await getGuestAccessibleSets();
      if (guestSets.length > 0) {
        const setIds = guestSets.map((s) => s.id);

        // Obține întrebările din aceste seturi
        const { data: setItems } = await window.supabaseClient.raw
          .from('question_set_items')
          .select('question_id')
          .in('set_id', setIds);

        if (setItems && setItems.length > 0) {
          const questionIds = setItems.map((item) => item.question_id);

          // Obține categoriile acestor întrebări
          const { data: questionCategories } = await window.supabaseClient.raw
            .from('question_categories')
            .select('category_id')
            .in('question_id', questionIds);

          if (questionCategories && questionCategories.length > 0) {
            const categoryIds = [...new Set(questionCategories.map((qc) => qc.category_id))];

            const { data: categories } = await window.supabaseClient.raw
              .from('categories')
              .select('*')
              .in('id', categoryIds)
              .order('name');

            availableCategories = categories || [];
          }
        }
      }
    } else {
      // USER AUTENTIFICAT: toate categoriile
      if (allCategories.length === 0) {
        allCategories = await window.supabaseClient.getCategories();
      }
      availableCategories = allCategories;
    }

    displayCategories(availableCategories);

    const allCategoriesBtn = document.getElementById('allCategoriesBtn');
    if (!selectedCategory && !allCategoriesBtn.classList.contains('selected')) {
      allCategoriesBtn.classList.add('selected');
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    container.innerHTML =
      '<div class="text-center text-red-300 col-span-full">Eroare la încărcarea categoriilor</div>';
  }
}
// ==================== DISPLAY FUNCTIONS ====================

function displaySets(sets) {
  const container = document.getElementById('availableSets');
  container.innerHTML = sets
    .map(
      (set) => `
    <div class="category-btn rounded-lg p-4 cursor-pointer set-option ${
      selectedSetId === set.id ? 'selected' : ''
    }" data-set-id="${set.id}">
      <div class="text-center">
        <i class="fas fa-folder-open text-2xl text-blue-400 mb-2"></i>
        <h3 class="text-white font-semibold">${set.name}</h3>
        <p class="text-blue-200 text-sm">${set.description || 'Set de întrebări'}</p>
        <div class="text-yellow-400 text-xs mt-1">${set.questionCount || 0} întrebări</div>
        <button class="mt-2 text-blue-400 hover:text-blue-300 preview-set-btn" data-set-id="${
          set.id
        }">
          <i class="fas fa-eye mr-1"></i> Previzualizare
        </button>
      </div>
    </div>
  `
    )
    .join('');

  document.querySelectorAll('.set-option').forEach((option) => {
    option.removeEventListener('click', handleSetOptionClick);
    option.addEventListener('click', handleSetOptionClick);
  });

  document.querySelectorAll('.preview-set-btn').forEach((btn) => {
    btn.removeEventListener('click', handlePreviewSetClick);
    btn.addEventListener('click', handlePreviewSetClick);
  });
}

function handleSetOptionClick(e) {
  if (e.target.closest('.preview-set-btn')) return;
  const setId = this.dataset.setId;

  if (selectedSetId === setId) {
    this.classList.remove('selected');
    selectedSetId = null;
  } else {
    document.querySelectorAll('.set-option').forEach((opt) => opt.classList.remove('selected'));
    this.classList.add('selected');
    selectedSetId = setId;
  }

  showTeamSection();
}

function handlePreviewSetClick(e) {
  e.stopPropagation();
  showSetPreview(this.dataset.setId);
}

function displayQuestions(questions) {
  const container = document.getElementById('availableQuestions');
  container.innerHTML = questions
    .map(
      (question) => `
    <div class="question-card rounded-lg p-4 cursor-pointer question-option ${
      selectedQuestions.includes(question.id) ? 'selected' : ''
    }" data-question-id="${question.id}">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h4 class="text-white font-semibold mb-2">${question.text}</h4>
          <div class="text-blue-200 text-sm">${question.answers?.length || 0} răspunsuri</div>
        </div>
        <div class="ml-4">
          <button class="text-blue-400 hover:text-blue-300 preview-btn" data-question-id="${
            question.id
          }">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  document.querySelectorAll('.question-option').forEach((option) => {
    option.removeEventListener('click', handleQuestionOptionClick);
    option.addEventListener('click', handleQuestionOptionClick);
  });

  document.querySelectorAll('.preview-btn').forEach((btn) => {
    btn.removeEventListener('click', handlePreviewQuestionClick);
    btn.addEventListener('click', handlePreviewQuestionClick);
  });
}

function handleQuestionOptionClick(e) {
  if (e.target.closest('.preview-btn')) return;
  const questionId = this.dataset.questionId;
  toggleQuestionSelection(questionId, this);
}

function handlePreviewQuestionClick(e) {
  e.stopPropagation();
  showQuestionPreview(allQuestions.find((q) => q.id === this.dataset.questionId));
}

function toggleQuestionSelection(questionId, element) {
  if (selectedQuestions.includes(questionId)) {
    selectedQuestions = selectedQuestions.filter((id) => id !== questionId);
    element.classList.remove('selected');
  } else {
    selectedQuestions.push(questionId);
    element.classList.add('selected');
  }
  document.getElementById('selectedCount').textContent = selectedQuestions.length;
  if (selectedQuestions.length > 0) showTeamSection();
}

function handleCategorySelection() {
  const categoryId = this.dataset.categoryId;

  if (selectedCategory === categoryId) {
    this.classList.remove('selected');
    selectedCategory = null;
    document.getElementById('allCategoriesBtn').classList.add('selected');
  } else {
    document
      .querySelectorAll('.category-option')
      .forEach((opt) => opt.classList.remove('selected'));
    document.getElementById('allCategoriesBtn').classList.remove('selected');
    this.classList.add('selected');
    selectedCategory = categoryId;
  }

  loadQuestions();
}

// ==================== FILTER FUNCTIONS ====================

function filterSets() {
  const search = document.getElementById('setSearch').value.toLowerCase();
  const filteredSets = allSets.filter(
    (set) =>
      set.name.toLowerCase().includes(search) ||
      (set.description && set.description.toLowerCase().includes(search))
  );
  displaySets(filteredSets);
}

function filterCategories() {
  const search = document.getElementById('categorySearch').value.toLowerCase();
  const filteredCategories = allCategories.filter((category) =>
    category.name.toLowerCase().includes(search)
  );
  displayCategories(filteredCategories);
}

function displayCategories(categories) {
  const container = document.getElementById('availableCategories');
  container.innerHTML = categories
    .map(
      (category) => `
    <button class="category-btn rounded-lg p-3 cursor-pointer category-option ${
      selectedCategory === category.id ? 'selected' : ''
    }" data-category-id="${category.id}">
      <div class="text-center">
        <i class="fas fa-tag text-blue-400 mb-1"></i>
        <div class="text-white font-semibold text-sm">${category.name}</div>
      </div>
    </button>
  `
    )
    .join('');

  document.querySelectorAll('.category-option').forEach((option) => {
    option.removeEventListener('click', handleCategorySelection);
    option.addEventListener('click', handleCategorySelection);
  });
}

// ==================== PREVIEW FUNCTIONS ====================

async function showSetPreview(setId) {
  try {
    showLoadingInModal('Se încarcă setul...');

    const setData = await window.supabaseClient.getQuestionSetWithQuestions(setId);
    const questions = setData.questions || [];

    if (questions.length === 0) {
      showErrorInModal('Acest set nu conține întrebări.');
      return;
    }

    // Salvează tipul și resetează stack-ul pentru un set nou
    currentModalType = 'set';
    modalStack = [];

    const content = `
      <div class="mb-4">
        <h4 class="text-lg font-semibold text-white mb-3">${setData.name}</h4>
        <p class="text-blue-200 mb-4">${setData.description || ''}</p>
        <div class="space-y-3 max-h-96 overflow-y-auto">
          ${questions
            .map(
              (question, index) => `
            <div class="question-card rounded-lg p-3">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center mb-2">
                    <span class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mr-2">
                      ${index + 1}
                    </span>
                    <span class="text-white font-semibold">${question.text}</span>
                  </div>
                  <div class="text-blue-200 text-sm ml-8">
                    ${question.answers?.length || 0} răspunsuri
                  </div>
                </div>
                <button class="text-blue-400 hover:text-blue-300 preview-question-btn ml-2" data-question-id="${
                  question.id
                }">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    showModalContent(content);

    // Configurează event listeners pentru întrebări
    document.querySelectorAll('.preview-question-btn').forEach((btn) => {
      btn.removeEventListener('click', handlePreviewQuestionClick);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();

        // Salvează conținutul curent în stack înainte de a schimba
        modalStack.push({
          content: content,
          type: 'set',
          data: setData,
        });

        showQuestionPreview(questions.find((q) => q.id === this.dataset.questionId));
      });
    });
  } catch (error) {
    console.error('Error loading set preview:', error);
    showErrorInModal('Eroare la încărcarea previzualizării');
  }
}
function showQuestionPreview(question) {
  if (!question?.answers) {
    showErrorInModal('Nu s-au găsit răspunsuri pentru această întrebare');
    return;
  }

  currentModalType = 'question';

  const content = `
    <div class="mb-4">
      ${
        modalStack.length > 0
          ? `
        <div class="mb-4">
          <button id="backToSetBtn" class="flex items-center text-blue-400 hover:text-blue-300 transition-colors">
            <i class="fas fa-arrow-left mr-2"></i>
            Înapoi la întrebări
          </button>
        </div>
      `
          : ''
      }

      <h4 class="text-lg font-semibold text-white mb-3">${question.text}</h4>
      <div class="space-y-2">
        ${question.answers
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map(
            (answer, index) => `
            <div class="answer-bubble rounded-lg p-3 flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm mr-3">
                  ${answer.position || index + 1}
                </div>
                <span class="text-white">${answer.text}</span>
              </div>
              <span class="text-yellow-400 font-bold">${answer.points} pct</span>
            </div>
          `
          )
          .join('')}
      </div>
    </div>
  `;

  showModalContent(content);

  // Configurează butonul înapoi dacă există
  const backBtn = document.getElementById('backToSetBtn');
  if (backBtn) {
    backBtn.addEventListener('click', goBackInModal);
  }
}

// Funcție nouă pentru afișarea conținutului în modal
function showModalContent(content) {
  document.getElementById('previewContent').innerHTML = content;
  previewModal.classList.remove('hidden');
}

// Funcție nouă pentru navigarea înapoi
function goBackInModal() {
  if (modalStack.length > 0) {
    const previousState = modalStack.pop();
    currentModalType = previousState.type;
    showModalContent(previousState.content);

    // Re-configurează event listeners dacă e nevoie
    if (previousState.type === 'set') {
      setupSetPreviewListeners(previousState.data);
    }
  }
}

// Funcție helper pentru re-configurarea listeners
function setupSetPreviewListeners(setData) {
  document.querySelectorAll('.preview-question-btn').forEach((btn) => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();

      // Salvează starea curentă
      modalStack.push({
        content: document.getElementById('previewContent').innerHTML,
        type: 'set',
        data: setData,
      });

      const question = setData.questions.find((q) => q.id === this.dataset.questionId);
      showQuestionPreview(question);
    });
  });
}
function closePreview() {
  previewModal.classList.add('hidden');
  modalStack = []; // Resetează stack-ul când închizi modalul
  currentModalType = null;
}

// ==================== GAME CREATION ====================

async function createGameHandler() {
  const team1Name = document.getElementById('team1Name').value.trim();
  const team2Name = document.getElementById('team2Name').value.trim();

  if (!team1Name || !team2Name || team1Name.length < 2 || team2Name.length < 2) {
    showError('Numele echipelor trebuie să aibă cel puțin 2 caractere');
    return;
  }

  if (gameType === 'quick' && !selectedSetId) {
    showError('Te rog selectează un set de întrebări');
    return;
  }

  if (gameType === 'custom' && selectedQuestions.length === 0) {
    showError('Te rog selectează cel puțin o întrebare');
    return;
  }

  showLoading('Se creează jocul...');

  try {
    let gameCode;
    let exists;
    let attempts = 0;

    do {
      gameCode = window.supabaseClient.generateGameCode();
      exists = await window.supabaseClient.checkGameCodeExists(gameCode);
      attempts++;
    } while (exists && attempts < 10);

    if (exists) throw new Error('Nu s-a putut genera un cod unic de joc');

    let finalSetId = selectedSetId;
    if (gameType === 'custom') {
      showLoading('Se creează setul de întrebări...');
      finalSetId = await createTemporarySet(selectedQuestions, team1Name, team2Name);
    }

    showLoading('Se finalizează jocul...');
    const gameData = {
      game_code: gameCode,
      set_id: finalSetId,
      team1_name: team1Name,
      team2_name: team2Name,
      current_state: {
        status: 'waiting',
        team1_score: 0,
        team2_score: 0,
        current_question_index: 0,
        current_question: null,
        show_mode: false,
        progressive_strikes: [false, false, false],
        question_displayed: false,
        last_buzz_strike: null,
      },
    };

    await window.supabaseClient.createGame(gameData);
    currentGameCode = gameCode;

    hideLoading();
    gameCreatedSection.classList.remove('hidden');
    document.getElementById('gameCodeDisplay').textContent = currentGameCode;
    gameCreatedSection.classList.add('success-state');
  } catch (error) {
    console.error('Error creating game:', error);
    showError(`Eroare la crearea jocului: ${error.message}`);
    hideLoading();
    createSection.classList.remove('hidden');
  }
}

async function createTemporarySet(questionIds, team1, team2) {
  try {
    const { data: newSet, error: setError } = await window.supabaseClient.raw
      .from('question_sets')
      .insert({
        name: `Set Personalizat: ${team1} vs ${team2}`,
        description: `Set creat pentru jocul personalizat din ${new Date().toLocaleDateString()}`,
        type: 'custom', // ← ADĂUGĂM TIPUL
      })
      .select('id')
      .single();

    if (setError) throw setError;
    if (!newSet) throw new Error('Nu s-a putut crea setul de întrebări');

    const setItems = questionIds.map((questionId, index) => ({
      set_id: newSet.id,
      question_id: questionId,
      order_index: index,
    }));

    const { error: itemsError } = await window.supabaseClient.raw
      .from('question_set_items')
      .insert(setItems);

    if (itemsError) throw itemsError;

    return newSet.id;
  } catch (error) {
    console.error('Error creating temporary set:', error);
    throw new Error(`Eroare la crearea setului temporar: ${error.message}`);
  }
}

function setCookie(name, value, hours = 24) {
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Strict`;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// ==================== UI HELPERS ====================
function showGuestQuickGameNotification() {
  // Verifică dacă notificarea există deja
  if (document.getElementById('guestQuickNotification')) return;

  const notification = document.createElement('div');
  notification.id = 'guestQuickNotification';
  notification.className =
    'bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 mb-4 text-yellow-200';
  notification.innerHTML = `
    <div class="flex items-start">
      <i class="fas fa-info-circle text-yellow-400 mt-1 mr-3"></i>
      <div>
        <p class="font-semibold mb-1">Cont vizitator - acces limitat</p>
        <p class="text-sm">Poți selecta doar din primele 2 seturi publice disponibile.
        Pentru acces complet, <a href="auth.html" class="text-yellow-400 hover:text-yellow-300 underline">creează un cont gratuit</a>.</p>
      </div>
    </div>
  `;

  // Inserează notificarea la începutul secțiunii quick game
  const quickGameSets = document.getElementById('quickGameSets');
  quickGameSets.insertBefore(notification, quickGameSets.firstChild);
}
// Actualizează showQuestionSection pentru a afișa notificarea guest
function showQuestionSection() {
  questionSection.classList.remove('hidden');
  selectedQuestions = [];
  selectedSetId = null;
  selectedCategory = null;
  document.getElementById('selectedCount').textContent = '0';

  // Șterge notificările existente
  const existingQuickNotification = document.getElementById('guestQuickNotification');
  const existingCustomNotification = document.getElementById('guestNotification');
  if (existingQuickNotification) existingQuickNotification.remove();
  if (existingCustomNotification) existingCustomNotification.remove();

  if (gameType === 'quick') {
    quickGameSets.classList.remove('hidden');
    customGameQuestions.classList.add('hidden');
    loadSets();
  } else {
    customGameQuestions.classList.remove('hidden');
    quickGameSets.classList.add('hidden');

    // Afișează notificarea pentru guest-uri în jocul personalizat
    if (userType === 'guest') {
      showGuestCustomGameNotification();
    }

    loadCategories();
  }
}

// Funcție nouă pentru notificarea guest
function showGuestCustomGameNotification() {
  // Verifică dacă notificarea există deja
  if (document.getElementById('guestNotification')) return;

  const notification = document.createElement('div');
  notification.id = 'guestNotification';
  notification.className =
    'bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 mb-4 text-yellow-200';
  notification.innerHTML = `
    <div class="flex items-start">
      <i class="fas fa-info-circle text-yellow-400 mt-1 mr-3"></i>
      <div>
        <p class="font-semibold mb-1">Cont vizitator - acces limitat</p>
        <p class="text-sm">Poți selecta întrebări doar din primele 2 seturi publice disponibile.
        Pentru acces complet, <a href="auth.html" class="text-yellow-400 hover:text-yellow-300 underline">creează un cont gratuit</a>.</p>
      </div>
    </div>
  `;

  // Inserează notificarea la începutul secțiunii custom game
  const customGameQuestions = document.getElementById('customGameQuestions');
  customGameQuestions.insertBefore(notification, customGameQuestions.firstChild);
}

// Actualizează updateGuestInfo pentru a reflecta limitările
function updateGuestInfo() {
  const guestSetsCount = document.getElementById('guestSetsCount');
  guestSetsCount.textContent = `(acces la 2 seturi publice)`;
}

function showTeamSection() {
  teamSection.classList.remove('hidden');
}

function checkTeamNames() {
  const team1 = document.getElementById('team1Name').value.trim();
  const team2 = document.getElementById('team2Name').value.trim();
  if (team1.length >= 2 && team2.length >= 2) createSection.classList.remove('hidden');
}

function showLoading(message) {
  loadingSection.classList.remove('hidden');
  document.getElementById('loadingText').textContent = message;
}

function hideLoading() {
  loadingSection.classList.add('hidden');
}

function showLoadingInModal(message) {
  previewModal.classList.remove('hidden');
  document.getElementById('previewContent').innerHTML = `
    <div class="text-center text-blue-200 py-4">${message}</div>
  `;
}

function showErrorInModal(message) {
  document.getElementById('previewContent').innerHTML = `
    <div class="text-center text-red-300 py-4">${message}</div>
  `;
  previewModal.classList.remove('hidden');
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className =
    'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 error-notification';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  setTimeout(() => errorDiv.remove(), 5000);
}

// ==================== NAVIGATION ====================

function openControl() {
  window.location.href = `control.html?game=${currentGameCode}`;
}

function openPublic() {
  window.open(`public.html?game=${currentGameCode}`, '_blank');
}
