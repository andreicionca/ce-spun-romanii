// auth.js

// DOM Elements
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const loadingSection = document.getElementById('loadingSection');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const continueAsGuestBtn = document.getElementById('continueAsGuestBtn');

const toggleLoginPassword = document.getElementById('toggleLoginPassword');
const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');

// Initialize
document.addEventListener('DOMContentLoaded', function () {
  if (!window.supabaseClient) {
    showError('Eroare: Supabase client nu este disponibil');
    return;
  }

  setupEventListeners();
  checkExistingSession();
});

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // Form submissions
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);

  // Form switching
  showRegisterBtn.addEventListener('click', showRegisterForm);
  showLoginBtn.addEventListener('click', showLoginForm);

  // Guest continuation
  continueAsGuestBtn.addEventListener('click', handleGuestContinue);

  // Password visibility toggles
  toggleLoginPassword.addEventListener('click', () =>
    togglePasswordVisibility('loginPassword', 'toggleLoginPassword')
  );
  toggleRegisterPassword.addEventListener('click', () =>
    togglePasswordVisibility('registerPassword', 'toggleRegisterPassword')
  );

  // Enter key handling
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      const activeForm = document.querySelector('section:not(.hidden) form');
      if (activeForm) {
        e.preventDefault();
        activeForm.dispatchEvent(new Event('submit'));
      }
    }
  });
}

// ==================== SESSION CHECK ====================

async function checkExistingSession() {
  try {
    const {
      data: { session },
      error,
    } = await window.supabaseClient.raw.auth.getSession();

    if (error) {
      console.error('Error checking session:', error);
      return;
    }

    if (session) {
      // User is already logged in, redirect to setup
      showSuccess('Ești deja conectat! Te redirectionăm...');
      setTimeout(() => {
        window.location.href = 'setup.html';
      }, 1500);
    }
  } catch (error) {
    console.error('Error checking existing session:', error);
  }
}

// ==================== FORM HANDLING ====================

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('Te rog completează toate câmpurile');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Te rog introdu o adresă de email validă');
    return;
  }

  setButtonLoading('loginBtn', true);
  showLoading('Se conectează...');

  try {
    const { data, error } = await window.supabaseClient.raw.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      // Set user session info in localStorage for easy access
      const { data: profile } = await window.supabaseClient.raw
        .from('user_profiles')
        .select('role, username')
        .eq('id', data.user.id)
        .single();

      localStorage.setItem(
        'user_session',
        JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          username: profile?.username || '',
          role: profile?.role || 'user',
        })
      );

      showSuccess('Conectare reușită! Te redirectionăm...');

      setTimeout(() => {
        window.location.href = 'setup.html';
      }, 1500);
    }
  } catch (error) {
    console.error('Login error:', error);

    let errorMessage = 'Eroare la conectare';
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'Email sau parolă incorectă';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = 'Te rog confirmă adresa de email';
    } else if (error.message.includes('Too many requests')) {
      errorMessage = 'Prea multe încercări. Încearcă din nou mai târziu';
    }

    showError(errorMessage);
    hideLoading();
    setButtonLoading('loginBtn', false);
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!username || !email || !password) {
    showError('Te rog completează toate câmpurile');
    return;
  }

  if (username.length < 3) {
    showError('Numele de utilizator trebuie să aibă cel puțin 3 caractere');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Te rog introdu o adresă de email validă');
    return;
  }

  if (password.length < 6) {
    showError('Parola trebuie să aibă cel puțin 6 caractere');
    return;
  }

  setButtonLoading('registerBtn', true);
  showLoading('Se creează contul...');

  try {
    // Register user (fără verificare username)
    const { data, error } = await window.supabaseClient.raw.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          role: 'user',
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      // Create profile manually
      const { error: profileError } = await window.supabaseClient.raw.from('user_profiles').insert({
        id: data.user.id,
        username: username,
        role: 'user',
      });

      if (profileError) {
        console.error('Profile creation failed:', profileError);
        // Continue anyway
      }

      showSuccess('Cont creat cu succes! Verifică emailul pentru confirmare...');

      setTimeout(() => {
        showLoginForm();
        document.getElementById('loginEmail').value = email;
        showInfo('Te rog confirmă adresa de email, apoi conectează-te');
      }, 2000);
    }
  } catch (error) {
    console.error('Register error:', error);

    let errorMessage = 'Eroare la crearea contului';
    if (error.message.includes('already registered')) {
      errorMessage = 'Acest email este deja înregistrat';
    } else if (error.message.includes('Password should be at least')) {
      errorMessage = 'Parola trebuie să aibă cel puțin 6 caractere';
    }

    showError(errorMessage);
    hideLoading();
    setButtonLoading('registerBtn', false);
  }
}

function handleGuestContinue() {
  // Create guest session
  const guestSession = {
    type: 'guest',
    sessionToken: generateGuestToken(),
    setsUsedCount: 0,
    maxSets: 3,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem('guest_session', JSON.stringify(guestSession));

  showSuccess('Continuând ca vizitator...');

  setTimeout(() => {
    window.location.href = 'setup.html';
  }, 1000);
}

// ==================== UI HELPERS ====================

function showLoginForm() {
  registerSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  clearForms();
}

function showRegisterForm() {
  loginSection.classList.add('hidden');
  registerSection.classList.remove('hidden');
  clearForms();
}

function clearForms() {
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('registerUsername').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerPassword').value = '';
}

function togglePasswordVisibility(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  const icon = button.querySelector('i');

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

function setButtonLoading(buttonId, loading) {
  const button = document.getElementById(buttonId);
  const icon = button.querySelector('i');

  if (loading) {
    button.classList.add('btn-loading');
    button.disabled = true;
    if (icon) {
      icon.className = 'fas fa-spinner mr-2';
    }
  } else {
    button.classList.remove('btn-loading');
    button.disabled = false;
    if (icon) {
      // Restore original icon based on button
      if (buttonId === 'loginBtn') {
        icon.className = 'fas fa-sign-in-alt mr-2';
      } else if (buttonId === 'registerBtn') {
        icon.className = 'fas fa-user-plus mr-2';
      }
    }
  }
}

function showLoading(message = 'Se procesează...') {
  document.getElementById('loadingText').textContent = message;

  // Hide other sections
  loginSection.classList.add('hidden');
  registerSection.classList.add('hidden');

  // Show loading
  loadingSection.classList.remove('hidden');
}

function hideLoading() {
  loadingSection.classList.add('hidden');

  // Show appropriate section
  if (registerSection.classList.contains('hidden')) {
    loginSection.classList.remove('hidden');
  } else {
    registerSection.classList.remove('hidden');
  }
}

// ==================== UTILITY FUNCTIONS ====================

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateGuestToken() {
  return 'guest_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// ==================== NOTIFICATION SYSTEM ====================

function showError(message) {
  showNotification(message, 'error');
}

function showSuccess(message) {
  showNotification(message, 'success');
}

function showInfo(message) {
  showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelectorAll('.notification');
  existing.forEach((n) => n.remove());

  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 notification ${type}-notification`;

  let bgColor, textColor, icon;
  switch (type) {
    case 'error':
      bgColor = 'bg-red-500';
      textColor = 'text-white';
      icon = 'fas fa-exclamation-circle';
      break;
    case 'success':
      bgColor = 'bg-green-500';
      textColor = 'text-white';
      icon = 'fas fa-check-circle';
      break;
    case 'info':
      bgColor = 'bg-blue-500';
      textColor = 'text-white';
      icon = 'fas fa-info-circle';
      break;
    default:
      bgColor = 'bg-gray-500';
      textColor = 'text-white';
      icon = 'fas fa-bell';
  }

  notification.className += ` ${bgColor} ${textColor}`;
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="${icon} mr-3"></i>
      <span>${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// ==================== ERROR HANDLING ====================

window.addEventListener('error', function (e) {
  console.error('Global error:', e.error);
  showError('A apărut o eroare neașteptată');
});

window.addEventListener('unhandledrejection', function (e) {
  console.error('Unhandled promise rejection:', e.reason);
  showError('A apărut o eroare de conexiune');
});

// ==================== SESSION MANAGEMENT ====================

// Listen for auth state changes
if (window.supabaseClient?.raw?.auth) {
  window.supabaseClient.raw.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session);

    if (event === 'SIGNED_IN' && session) {
      // Get profile from DB
      const { data: profile } = await window.supabaseClient.raw
        .from('user_profiles')
        .select('role, username')
        .eq('id', session.user.id)
        .single();

      localStorage.setItem(
        'user_session',
        JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          username: profile?.username || '',
          role: profile?.role || 'user',
        })
      );
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem('user_session');
    }
  });
}
