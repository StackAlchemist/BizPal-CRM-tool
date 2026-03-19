/*
 * CONTENT SCRIPT — index.js
 * ==========================
 * This file is injected directly into the WhatsApp Web page (web.whatsapp.com).
 * It is responsible for:
 *   1. Detecting when the user opens a chat
 *   2. Extracting the contact's name and phone number from the DOM
 *   3. Injecting our CRM panel (buttons, order form) into the WhatsApp UI
 *   4. Sending messages to the background service worker to make API calls
 *
 * HOW WHATSAPP WEB WORKS (important context):
 * -------------------------------------------
 * WhatsApp Web is a React Single Page Application. The URL does NOT change
 * when you switch chats — only the DOM updates. This means:
 *   - We cannot rely on page load events to detect chat changes
 *   - We must use a MutationObserver to watch for DOM changes
 *   - DOM selectors can break when WhatsApp updates their app, so we try
 *     multiple selectors and fail gracefully when nothing is found
 *
 * SECURITY NOTE:
 * --------------
 * Content scripts run in an "isolated world" — they share the DOM with the
 * page but NOT the JavaScript environment. We cannot access WhatsApp's React
 * state or internal variables. Everything we read must come from the DOM.
 */

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

/*
 * These are CSS selectors for WhatsApp Web's DOM elements.
 * WhatsApp doesn't expose stable IDs, so we use data attributes and
 * aria labels which tend to be more stable than class names.
 *
 * If the extension stops working after a WhatsApp update, these selectors
 * are the first thing to check and update.
 */
const SELECTORS = {
  // The header area of an open chat — contains the contact's name
  chatHeader: "header._amig",

  // The element inside the header that shows the contact's name
  contactName: "span[data-testid='conversation-info-header-chat-title']",

  // The main chat panel — we inject our CRM panel adjacent to this
  chatPanel: "#main",

  // The message input box — used for quick reply injection
  messageInput: "div[data-testid='conversation-compose-box-input']",
};

// Our panel gets this ID so we can find and remove it when the chat changes
const CRM_PANEL_ID = "whatsapp-crm-panel";

// Debounce delay in ms — prevents the observer from firing too rapidly
const OBSERVER_DEBOUNCE_MS = 500;

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

/*
 * We track the currently active chat so we don't re-inject the panel
 * every time the MutationObserver fires for unrelated DOM changes.
 */
let currentChatName = null;
let debounceTimer = null;

// ─────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────

/*
 * We wait for the WhatsApp Web app to fully load before starting our observer.
 * WhatsApp renders its full shell asynchronously — the chat list and panels
 * aren't in the DOM immediately when the page loads.
 *
 * We poll every 1 second until the chat panel exists, then start observing.
 */
function waitForWhatsAppLoad() {
  const interval = setInterval(() => {
    const chatPanel = document.querySelector(SELECTORS.chatPanel);
    if (chatPanel) {
      clearInterval(interval);
      console.log("[WhatsApp CRM] WhatsApp Web loaded. Starting observer.");
      startObserver();
    }
  }, 1000);
}

waitForWhatsAppLoad();

// ─────────────────────────────────────────────
// MUTATION OBSERVER
// ─────────────────────────────────────────────

/**
 * Sets up a MutationObserver on the document body.
 *
 * A MutationObserver watches for DOM changes and fires a callback when they
 * happen. We watch the entire body because WhatsApp can update any part of
 * the DOM when you switch chats.
 *
 * We use debouncing to avoid running our detection logic dozens of times
 * per second — WhatsApp makes many small DOM changes for each chat switch.
 */
function startObserver() {
  const observer = new MutationObserver(() => {
    // Clear the previous timer so we only run once after changes settle
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onDOMChange, OBSERVER_DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,  // watch for elements being added/removed
    subtree: true,    // watch all descendants, not just direct children
  });

  // Run once immediately in case a chat is already open
  onDOMChange();
}

/**
 * Called after the DOM settles. Checks if the active chat has changed
 * and re-injects our panel if so.
 */
function onDOMChange() {
  const contactInfo = extractContactInfo();

  if (!contactInfo) {
    // No chat is open — remove our panel if it exists
    removePanel();
    currentChatName = null;
    return;
  }

  // Only re-inject if the chat has actually changed
  if (contactInfo.name === currentChatName) return;

  currentChatName = contactInfo.name;
  console.log(`[WhatsApp CRM] Chat opened: ${contactInfo.name} (${contactInfo.phone})`);

  injectPanel(contactInfo);
}

// ─────────────────────────────────────────────
// DOM EXTRACTION
// ─────────────────────────────────────────────

/**
 * Attempts to extract the current chat contact's name and phone number
 * from the WhatsApp Web DOM.
 *
 * Returns null if no chat is open or the elements can't be found.
 *
 * PHONE NUMBER NOTE:
 * WhatsApp Web doesn't always show the phone number visibly. For saved
 * contacts it shows their name. For unsaved numbers it shows the number
 * as the title. We try to extract it from the title first, then fall
 * back to the subtitle (which sometimes shows the number for saved contacts).
 *
 * @returns {{ name: string, phone: string } | null}
 */
function extractContactInfo() {
  const header = document.querySelector(SELECTORS.chatHeader);
  if (!header) return null; // no chat is open

  const nameEl = document.querySelector(SELECTORS.contactName);
  if (!nameEl) return null;

  const name = nameEl.textContent.trim();
  if (!name) return null;

  /*
   * Try to find the phone number. WhatsApp shows it in different places
   * depending on whether the contact is saved in the user's phone book:
   *
   * - Saved contact → title = "Tunde Bakare", subtitle = "+234 801 234 5678"
   * - Unsaved number → title = "+234 801 234 5678", no subtitle
   */
  let phone = extractPhoneFromText(name); // check if the title itself is a number

  if (!phone) {
    // Try the subtitle (shown for saved contacts)
    const subtitleEl = header.querySelector("span._ao3e");
    if (subtitleEl) {
      phone = extractPhoneFromText(subtitleEl.textContent.trim());
    }
  }

  // If we still can't find a phone number, use the name as a fallback.
  // The backend requires a phone field — the user can edit it in the dashboard.
  if (!phone) {
    phone = name.replace(/\s+/g, ""); // strip spaces as a rough fallback
  }

  return { name, phone };
}

/**
 * Uses a regex to extract a phone number from a string.
 * Handles formats like: +2348012345678, 08012345678, +1 (555) 000-0000
 *
 * @param {string} text
 * @returns {string | null}
 */
function extractPhoneFromText(text) {
  // Match strings that are primarily digits with optional +, spaces, dashes, parens
  const match = text.match(/^\+?[\d\s\-().]{7,20}$/);
  if (match) {
    // Normalise: remove spaces, dashes, parens — keep digits and leading +
    return text.replace(/[\s\-().]/g, "");
  }
  return null;
}

// ─────────────────────────────────────────────
// PANEL INJECTION
// ─────────────────────────────────────────────

/**
 * Creates and injects our CRM panel into the WhatsApp Web UI.
 *
 * We inject it into the #main chat panel. The panel floats at the bottom
 * of the chat area via CSS positioning (see styles.css).
 *
 * @param {{ name: string, phone: string }} contactInfo
 */
function injectPanel(contactInfo) {
  // Remove any existing panel first (clean slate for new chat)
  removePanel();

  const chatPanel = document.querySelector(SELECTORS.chatPanel);
  if (!chatPanel) return;

  /*
   * Build the panel DOM manually (no React/JSX here — this is plain JS).
   * We create elements programmatically rather than setting innerHTML to
   * avoid XSS risks from contact names containing HTML characters.
   */
  const panel = document.createElement("div");
  panel.id = CRM_PANEL_ID;
  panel.className = "crm-panel";

  // Header row: CRM label + contact info
  const header = createEl("div", "crm-panel__header", [
    createEl("span", "crm-panel__title", [], "CRM"),
    createEl("span", "crm-panel__contact", [], `${contactInfo.name} · ${contactInfo.phone}`),
  ]);

  // Action buttons row
  const actions = createEl("div", "crm-panel__actions", [
    createButton("Save customer", "primary", () => handleSaveCustomer(contactInfo)),
    createButton("Create order", "secondary", () => handleCreateOrder(contactInfo)),
  ]);

  // Feedback area — shows "Customer saved!" or error messages
  const feedback = createEl("div", "crm-panel__feedback");
  feedback.id = "crm-feedback";

  panel.appendChild(header);
  panel.appendChild(actions);
  panel.appendChild(feedback);

  chatPanel.appendChild(panel);
}

/**
 * Removes our CRM panel from the DOM if it exists.
 * Called when the chat changes or no chat is open.
 */
function removePanel() {
  const existing = document.getElementById(CRM_PANEL_ID);
  if (existing) existing.remove();
}

// ─────────────────────────────────────────────
// ORDER FORM
// ─────────────────────────────────────────────

/**
 * Injects a simple order form below the action buttons.
 * Called when the user clicks "Create order". If the form is already open,
 * clicking again closes it (toggle behaviour).
 *
 * @param {string} customerId - the backend _id of the saved customer
 */
function injectOrderForm(customerId) {
  // Toggle: if form already exists, remove it
  const existing = document.getElementById("crm-order-form");
  if (existing) {
    existing.remove();
    return;
  }

  const panel = document.getElementById(CRM_PANEL_ID);
  if (!panel) return;

  const form = createEl("div", "crm-order-form");
  form.id = "crm-order-form";

  // Product name input
  const productInput = document.createElement("input");
  productInput.type = "text";
  productInput.placeholder = "Product / service name";
  productInput.className = "crm-input";
  productInput.id = "crm-product-name";

  // Amount input
  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.placeholder = "Amount (₦)";
  amountInput.className = "crm-input";
  amountInput.id = "crm-amount";

  // Notes textarea
  const notesInput = document.createElement("textarea");
  notesInput.placeholder = "Notes (optional)";
  notesInput.className = "crm-input crm-input--textarea";
  notesInput.id = "crm-notes";
  notesInput.rows = 2;

  // Submit button
  const submitBtn = createButton("Save order", "primary", () => {
    const payload = {
      customerId,
      productName: productInput.value.trim(),
      amount: amountInput.value,
      notes: notesInput.value.trim(),
    };
    handleSubmitOrder(payload);
  });

  form.appendChild(productInput);
  form.appendChild(amountInput);
  form.appendChild(notesInput);
  form.appendChild(submitBtn);

  panel.appendChild(form);

  // Focus the first field for convenience
  productInput.focus();
}

// ─────────────────────────────────────────────
// ACTION HANDLERS
// ─────────────────────────────────────────────

/**
 * Sends a "SAVE_CUSTOMER" message to the background service worker.
 * The service worker makes the actual API call and returns the result.
 *
 * We then store the returned customer ID so we can link orders to it.
 *
 * @param {{ name: string, phone: string }} contactInfo
 */
async function handleSaveCustomer(contactInfo) {
  showFeedback("Saving...", "loading");

  /*
   * chrome.runtime.sendMessage sends a message to the background service worker.
   * It's asynchronous — we await the response.
   * The background worker returns { success: boolean, data?, error? }.
   */
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_CUSTOMER",
    payload: contactInfo,
  });

  if (response.success) {
    const customerId = response.data._id;

    /*
     * Store the customer ID in chrome.storage.session (temporary, clears when
     * Chrome closes) so the "Create Order" button knows which customer to link.
     * We key it by phone number in case the user switches chats.
     */
    chrome.storage.local.set({ [`customer_${contactInfo.phone}`]: customerId });

    showFeedback("Customer saved!", "success");

    // Update the Create Order button to be active (it now has a customer to link to)
    activateOrderButton(customerId);
  } else {
    // Show the error from the backend (e.g. "duplicate phone number")
    showFeedback(response.error || "Something went wrong", "error");
  }
}

/**
 * Handles the "Create order" button click.
 * First checks if the customer has already been saved (we need their ID).
 * If saved → open the order form. If not → prompt to save first.
 *
 * @param {{ name: string, phone: string }} contactInfo
 */
async function handleCreateOrder(contactInfo) {
  // Look up whether this contact was already saved as a customer
  const key = `customer_${contactInfo.phone}`;

  chrome.storage.local.get([key], (result) => {
    const customerId = result[key];

    if (!customerId) {
      showFeedback("Save the customer first before creating an order.", "error");
      return;
    }

    // Customer exists — open the order form
    injectOrderForm(customerId);
  });
}

/**
 * Submits the order form data to the background service worker.
 *
 * @param {{ customerId, productName, amount, notes }} payload
 */
async function handleSubmitOrder(payload) {
  if (!payload.productName) {
    showFeedback("Please enter a product name.", "error");
    return;
  }
  if (!payload.amount || isNaN(payload.amount)) {
    showFeedback("Please enter a valid amount.", "error");
    return;
  }

  showFeedback("Creating order...", "loading");

  const response = await chrome.runtime.sendMessage({
    type: "CREATE_ORDER",
    payload,
  });

  if (response.success) {
    // Close the form and show success
    const form = document.getElementById("crm-order-form");
    if (form) form.remove();
    showFeedback(`Order created! ₦${Number(payload.amount).toLocaleString("en-NG")}`, "success");
  } else {
    showFeedback(response.error || "Failed to create order", "error");
  }
}

// ─────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────

/**
 * Shows a short feedback message in the panel's feedback area.
 * Auto-clears after 4 seconds for success/error messages.
 *
 * @param {string} message
 * @param {"loading" | "success" | "error"} type
 */
function showFeedback(message, type) {
  const el = document.getElementById("crm-feedback");
  if (!el) return;

  el.textContent = message;
  el.className = `crm-panel__feedback crm-panel__feedback--${type}`;

  // Auto-dismiss success and error messages after 4 seconds
  if (type !== "loading") {
    setTimeout(() => {
      if (el.textContent === message) { // only clear if message hasn't changed
        el.textContent = "";
        el.className = "crm-panel__feedback";
      }
    }, 4000);
  }
}

/**
 * Updates the "Create order" button to indicate a customer is linked.
 * Called after a customer is successfully saved.
 *
 * @param {string} customerId
 */
function activateOrderButton(customerId) {
  const panel = document.getElementById(CRM_PANEL_ID);
  if (!panel) return;

  const orderBtn = panel.querySelector(".crm-btn--secondary");
  if (orderBtn) {
    orderBtn.textContent = "Create order";
    orderBtn.classList.add("crm-btn--active");
    orderBtn.disabled = false;
  }
}

/**
 * Creates a DOM element with optional class, children, and text content.
 * A small utility to avoid repetitive document.createElement boilerplate.
 *
 * @param {string} tag - HTML tag name
 * @param {string} [className] - CSS class(es)
 * @param {Element[]} [children] - child elements to append
 * @param {string} [text] - text content
 */
function createEl(tag, className = "", children = [], text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  children.forEach((child) => el.appendChild(child));
  return el;
}

/**
 * Creates a styled CRM button.
 *
 * @param {string} label - button text
 * @param {"primary" | "secondary"} variant - visual style
 * @param {function} onClick - click handler
 */
function createButton(label, variant, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = `crm-btn crm-btn--${variant}`;
  btn.addEventListener("click", onClick);
  return btn;
}
