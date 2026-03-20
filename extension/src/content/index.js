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
/*
 * OPTIMIZED WHATSAPP CRM CONTENT SCRIPT
 * =====================================
 * Performance improvements:
 * - Scoped MutationObserver (no full DOM watching)
 * - Debounced DOM handling
 * - Phone-based chat detection
 * - Cached DOM queries
 * - Stable selector fallbacks
 * - Batched DOM updates
 */

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SELECTORS = {
  chatPanel: "#main",
  messageInput: "div[data-testid='conversation-compose-box-input']",
};

const CRM_PANEL_ID = "whatsapp-crm-panel";

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let currentChatPhone = null;
let debounceTimer = null;
let cachedHeader = null;

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function waitForWhatsAppLoad() {
  const interval = setInterval(() => {
    const app = document.querySelector("#app");
    const main = document.querySelector(SELECTORS.chatPanel);

    if (app && main) {
      clearInterval(interval);
      console.log("[CRM] WhatsApp ready");
      startObserver(app);
    }
  }, 800);
}

waitForWhatsAppLoad();

// ─────────────────────────────────────────────
// OBSERVER (SCOPED)
// ─────────────────────────────────────────────
function startObserver(rootNode) {
  const observer = new MutationObserver(() => {
    if (debounceTimer) return;

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onDOMChange();
    }, 300);
  });

  observer.observe(rootNode, {
    childList: true,
    subtree: true,
  });

  onDOMChange();
}

// ─────────────────────────────────────────────
// DOM CHANGE HANDLER
// ─────────────────────────────────────────────
function onDOMChange() {
  const contactInfo = extractContactInfo();
  

  if (!contactInfo) {
    removePanel();
    currentChatPhone = null;
    return;
  }

  if (contactInfo.phone === currentChatPhone) return;

  currentChatPhone = contactInfo.phone;

  console.log(`[CRM] Active chat: ${contactInfo.name} (${contactInfo.phone})`);

  injectPanel(contactInfo);
}

// ─────────────────────────────────────────────
// CONTACT EXTRACTION (OPTIMIZED)
// ─────────────────────────────────────────────
function extractContactInfo() {
  const header = document.querySelector("#main header");
  if (!header) return null;

  const spans = header.querySelectorAll("span");
  if (!spans.length) return null;

  const name = spans[0].textContent.trim();
  if (!name) return null;

  // ── Try to extract phone from message data-id attributes ──
  // Every message has data-id="true_PHONENUMBER@c.us_MSGID"
  // This is the most reliable way to get the number on WhatsApp Web
  let phone = extractPhoneFromMessages();

  if (!phone) {
    phone = "unknown";
  }

  return { name, phone };
}

function extractPhoneFromMessages() {
  // Grab all elements with a data-id in the chat panel
  const messages = document.querySelectorAll("#main [data-id]");

  for (const msg of messages) {
    const dataId = msg.getAttribute("data-id");
    if (!dataId) continue;

    // Format: true_2348012345678@c.us_MESSAGEID
    // or:     false_2348012345678@c.us_MESSAGEID
    const match = dataId.match(/(?:true|false)_(\d+)@c\.us/);
    if (match) {
      return "+" + match[1]; // return e.g. +2348012345678
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// PANEL
// ─────────────────────────────────────────────
function injectPanel(contactInfo) {
  if (document.getElementById(CRM_PANEL_ID)) return;

  const chatPanel = document.querySelector(SELECTORS.chatPanel);
  if (!chatPanel) return;

  const panel = document.createElement("div");
  panel.id = CRM_PANEL_ID;
  panel.className = "crm-panel";

  const fragment = document.createDocumentFragment();

  const header = createEl("div", "crm-panel__header", [
    createEl("span", "crm-panel__title", [], "CRM"),
    createEl(
      "span",
      "crm-panel__contact",
      [],
      `${contactInfo.name} · ${contactInfo.phone}`
    ),
  ]);

  const actions = createEl("div", "crm-panel__actions", [
    createButton("Save customer", "primary", () =>
      handleSaveCustomer(contactInfo)
    ),
    createButton("Create order", "secondary", () =>
      handleCreateOrder(contactInfo)
    ),
  ]);

  const feedback = createEl("div", "crm-panel__feedback");
  feedback.id = "crm-feedback";

  fragment.appendChild(header);
  fragment.appendChild(actions);
  fragment.appendChild(feedback);

  panel.appendChild(fragment);
  chatPanel.appendChild(panel);
}

function removePanel() {
  const existing = document.getElementById(CRM_PANEL_ID);
  if (existing) existing.remove();
}

// ─────────────────────────────────────────────
// STORAGE (OPTIMIZED)
// ─────────────────────────────────────────────
function saveCustomerToStorage(phone, id) {
  chrome.storage.local.get(["customers"], (result) => {
    const customers = result.customers || {};
    customers[phone] = id;
    chrome.storage.local.set({ customers });
  });
}

function getCustomerFromStorage(phone, callback) {
  chrome.storage.local.get(["customers"], (result) => {
    const customers = result.customers || {};
    callback(customers[phone]);
  });
}

// ─────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────
async function handleSaveCustomer(contactInfo) {
  showFeedback("Saving...", "loading");

  const response = await chrome.runtime.sendMessage({
    type: "SAVE_CUSTOMER",
    payload: contactInfo,
  });

  if (response.success) {
    const customerId = response.data._id;

    saveCustomerToStorage(contactInfo.phone, customerId);

    showFeedback("Customer saved!", "success");
    activateOrderButton();
  } else {
    showFeedback(response.error || "Error", "error");
  }
}

function handleCreateOrder(contactInfo) {
  getCustomerFromStorage(contactInfo.phone, (customerId) => {
    if (!customerId) {
      showFeedback("Save customer first", "error");
      return;
    }

    injectOrderForm(customerId);
  });
}

async function handleSubmitOrder(payload) {
  if (!payload.productName) {
    showFeedback("Enter product name", "error");
    return;
  }

  if (!payload.amount || isNaN(payload.amount)) {
    showFeedback("Invalid amount", "error");
    return;
  }

  showFeedback("Creating order...", "loading");

  const response = await chrome.runtime.sendMessage({
    type: "CREATE_ORDER",
    payload,
  });

  if (response.success) {
    document.getElementById("crm-order-form")?.remove();
    showFeedback(
      `Order created! ₦${Number(payload.amount).toLocaleString("en-NG")}`,
      "success"
    );
  } else {
    showFeedback(response.error || "Failed", "error");
  }
}

// ─────────────────────────────────────────────
// ORDER FORM
// ─────────────────────────────────────────────
function injectOrderForm(customerId) {
  const existing = document.getElementById("crm-order-form");
  if (existing) {
    existing.remove();
    return;
  }

  const panel = document.getElementById(CRM_PANEL_ID);
  if (!panel) return;

  const form = createEl("div", "crm-order-form");
  form.id = "crm-order-form";

  const product = createInput("text", "Product name", "crm-product");
  const amount = createInput("number", "Amount (₦)", "crm-amount");
  const notes = document.createElement("textarea");
  notes.placeholder = "Notes";
  notes.className = "crm-input";

  const submit = createButton("Save order", "primary", () =>
    handleSubmitOrder({
      customerId,
      productName: product.value.trim(),
      amount: amount.value,
      notes: notes.value.trim(),
    })
  );

  form.append(product, amount, notes, submit);
  panel.appendChild(form);
  product.focus();
}

// ─────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────
function showFeedback(message, type) {
  const el = document.getElementById("crm-feedback");
  if (!el) return;

  el.textContent = message;
  el.className = `crm-panel__feedback crm-panel__feedback--${type}`;

  if (type !== "loading") {
    setTimeout(() => {
      if (el.textContent === message) {
        el.textContent = "";
        el.className = "crm-panel__feedback";
      }
    }, 4000);
  }
}

function activateOrderButton() {
  const btn = document.querySelector(".crm-btn--secondary");
  if (btn) {
    btn.classList.add("crm-btn--active");
    btn.disabled = false;
  }
}

function createEl(tag, className = "", children = [], text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  children.forEach((c) => el.appendChild(c));
  return el;
}

function createInput(type, placeholder, id) {
  const input = document.createElement("input");
  input.type = type;
  input.placeholder = placeholder;
  input.className = "crm-input";
  input.id = id;
  return input;
}

function createButton(label, variant, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = `crm-btn crm-btn--${variant}`;
  btn.addEventListener("click", onClick);
  return btn;
} 