/*
 * BACKGROUND SERVICE WORKER
 * =========================
 * This is the "brain" of the extension. It runs in the background and handles:
 *   1. Storing and retrieving the user's JWT token securely
 *   2. Making authenticated HTTP requests to our backend API
 *   3. Responding to messages sent by the content script
 *
 * WHY A SERVICE WORKER INSTEAD OF MAKING API CALLS FROM THE CONTENT SCRIPT?
 * --------------------------------------------------------------------------
 * We could call the API directly from the content script, but that would mean
 * the JWT token would be exposed to WhatsApp Web's page context. Instead, we
 * keep the token locked in chrome.storage and only the service worker touches
 * it. The content script sends a message ("save this customer") and the
 * service worker handles the actual API call.
 *
 * IMPORTANT: Service workers are stateless between events. Any variable set
 * here will be lost when the worker goes idle. Always use chrome.storage for
 * anything that needs to persist.
 */

const API_BASE = "http://localhost:5000/api"; // ← change to your deployed URL in production

// ─────────────────────────────────────────────
// MESSAGE LISTENER
// ─────────────────────────────────────────────
/*
 * chrome.runtime.onMessage fires whenever the content script (or popup)
 * calls chrome.runtime.sendMessage(). We use a switch on message.type to
 * route different actions. Every handler must call sendResponse() to return
 * a result back to the caller.
 *
 * The `return true` at the end of each case tells Chrome to keep the message
 * channel open for async responses. Without it, sendResponse() would be
 * ignored after the handler returns.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "SAVE_CUSTOMER":
      handleSaveCustomer(message.payload).then(sendResponse);
      return true; // keep channel open for async response

    case "CREATE_ORDER":
      handleCreateOrder(message.payload).then(sendResponse);
      return true;

    case "GET_AUTH_STATUS":
      // The popup calls this to check if the user is logged in
      checkAuthStatus().then(sendResponse);
      return true;

    case "LOGOUT":
      // Clear the token from storage and notify the content script
      chrome.storage.local.remove(["token", "user"], () => {
        sendResponse({ success: true });
      });
      return true;

    default:
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

// ─────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────

/**
 * Retrieves the stored JWT token from chrome.storage.local.
 * Returns null if the user is not logged in.
 */
async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["token"], (result) => {
      resolve(result.token || null);
    });
  });
}

/**
 * Checks whether a valid token exists in storage.
 * Used by the popup to show "logged in" vs "login required" state.
 */
async function checkAuthStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["token", "user"], (result) => {
      resolve({
        isLoggedIn: !!result.token,
        user: result.user || null,
      });
    });
  });
}

/**
 * A wrapper around fetch() that automatically:
 *   - Adds the Authorization: Bearer <token> header
 *   - Sets Content-Type: application/json
 *   - Parses the JSON response
 *   - Returns a consistent { success, data, error } shape
 *
 * @param {string} endpoint - API path e.g. "/customers"
 * @param {string} method   - HTTP method e.g. "POST"
 * @param {object} body     - Request body (will be JSON.stringify'd)
 */
async function apiRequest(endpoint, method = "GET", body = null) {
  const token = await getToken();

  if (!token) {
    return { success: false, error: "Not logged in. Please open the extension popup and sign in." };
  }

  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    // Only attach a body for non-GET requests
    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      // The API returned an error status (4xx or 5xx).
      // Our backend always returns { message: "..." } on errors.
      return { success: false, error: data.message || "Something went wrong" };
    }

    return { success: true, data };
  } catch (err) {
    // Network error — the backend might be down or unreachable
    return { success: false, error: "Cannot reach the server. Check your connection." };
  }
}

// ─────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────

/**
 * Saves a customer extracted from the WhatsApp chat to the backend.
 *
 * @param {object} payload - { name, phone } extracted by the content script
 */
async function handleSaveCustomer(payload) {
  const { name, phone } = payload;

  if (!name || !phone) {
    return { success: false, error: "Could not extract customer name or phone from this chat." };
  }

  const result = await apiRequest("/customers", "POST", {
    name,
    phone,
    tags: ["New"], // default tag for customers saved from WhatsApp
    notes: `Saved from WhatsApp on ${new Date().toLocaleDateString("en-NG")}`,
  });

  return result;
}

/**
 * Creates an order linked to a customer in the backend.
 *
 * @param {object} payload - { customerId, productName, amount, notes }
 */
async function handleCreateOrder(payload) {
  const result = await apiRequest("/orders", "POST", {
    customerId: payload.customerId,
    productName: payload.productName,
    amount: Number(payload.amount),
    status: "Pending",
    notes: payload.notes || "",
  });

  return result;
}
