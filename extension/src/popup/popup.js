/*
 * POPUP SCRIPT — popup.js
 * ========================
 * Handles the login form UI in the extension toolbar popup.
 *
 * IMPORTANT: This script CANNOT use chrome.runtime.sendMessage to call the
 * background worker for login, because the login endpoint doesn't need a
 * stored token — it generates one. So we call the API directly from here
 * and then store the returned token in chrome.storage.local.
 *
 * For all other API calls (saving customers, creating orders) we route
 * through the background worker to keep the token out of the content script.
 */

const API_BASE = "http://localhost:5000/api"; // keep in sync with background/index.js

// ─── DOM references ───────────────────────────────────────
const statusDot    = document.getElementById("status-dot");
const statusText   = document.getElementById("status-text");
const userCard     = document.getElementById("user-card");
const userBusiness = document.getElementById("user-business");
const userEmail    = document.getElementById("user-email");
const loginForm    = document.getElementById("login-form");
const emailInput   = document.getElementById("input-email");
const passwordInput= document.getElementById("input-password");
const btnLogin     = document.getElementById("btn-login");
const btnLogout    = document.getElementById("btn-logout");
const feedback     = document.getElementById("feedback");

// ─── Init: check login state when popup opens ─────────────
/*
 * Every time the popup opens we ask the background worker if a token exists.
 * This keeps the UI in sync without storing any state in the popup itself
 * (which would be lost each time the popup closes).
 */
document.addEventListener("DOMContentLoaded", async () => {
  const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" });
  if (response.isLoggedIn) {
    showLoggedInState(response.user);
  } else {
    showLoggedOutState();
  }
});

// ─── Login ────────────────────────────────────────────────
btnLogin.addEventListener("click", async () => {
  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showFeedback("Please enter your email and password.", "error");
    return;
  }

  btnLogin.textContent = "Signing in...";
  btnLogin.disabled = true;
  clearFeedback();

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showFeedback(data.message || "Login failed.", "error");
      return;
    }

    /*
     * Store the token and user info in chrome.storage.local.
     * This persists across browser restarts (unlike sessionStorage).
     * The background service worker reads the token for every API call.
     */
    await chrome.storage.local.set({
      token: data.token,
      user: {
        email: data.user.email,
        businessName: data.user.businessName,
        plan: data.user.subscriptionPlan,
      },
    });

    showLoggedInState(data.user);
    showFeedback("Signed in!", "success");

  } catch (err) {
    showFeedback("Cannot reach server. Is the backend running?", "error");
  } finally {
    btnLogin.textContent = "Sign in";
    btnLogin.disabled = false;
  }
});

// ─── Logout ───────────────────────────────────────────────
btnLogout.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "LOGOUT" });
  showLoggedOutState();
  showFeedback("Signed out.", "success");
});

// ─── UI state helpers ─────────────────────────────────────

/**
 * Updates the UI to show the logged-in state.
 * Hides the login form, shows the user card and logout button.
 *
 * @param {{ businessName, email }} user
 */
function showLoggedInState(user) {
  loginForm.style.display   = "none";
  btnLogout.style.display   = "block";
  userCard.style.display    = "block";
  userBusiness.textContent  = user?.businessName || "Your business";
  userEmail.textContent     = user?.email || "";
  statusDot.classList.add("status__dot--online");
  statusText.textContent    = "Connected to WhatsApp CRM";
}

/**
 * Updates the UI to show the logged-out state.
 * Shows the login form, hides user info and logout button.
 */
function showLoggedOutState() {
  loginForm.style.display   = "flex";
  btnLogout.style.display   = "none";
  userCard.style.display    = "none";
  statusDot.classList.remove("status__dot--online");
  statusText.textContent    = "Not signed in";
}

function showFeedback(message, type) {
  feedback.textContent  = message;
  feedback.className    = `feedback feedback--${type}`;
}

function clearFeedback() {
  feedback.textContent = "";
  feedback.className   = "feedback";
}
