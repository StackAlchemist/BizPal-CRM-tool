# WhatsApp CRM — Chrome Extension

## How to install (Developer Mode)

Chrome extensions under development are loaded as "unpacked" — no need to
publish to the Chrome Web Store during development.

1. Open Chrome and go to: `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select this folder (`whatsapp-crm-extension/`)
5. The extension icon will appear in your Chrome toolbar

## How to use

1. Make sure the backend is running: `npm run dev` in `whatsapp-crm-backend/`
2. Click the extension icon → sign in with your account
3. Open [WhatsApp Web](https://web.whatsapp.com) and open any chat
4. The CRM panel appears at the bottom of the chat
5. Click **Save customer** to add the contact to your CRM
6. Click **Create order** to log an order for that customer

## Folder structure

```
whatsapp-crm-extension/
├── manifest.json              ← Extension config (permissions, scripts, popup)
├── icons/                     ← Extension icons (16px, 48px, 128px)
├── src/
│   ├── background/
│   │   └── index.js           ← Service worker: API calls, token management
│   ├── content/
│   │   ├── index.js           ← Injected into WhatsApp Web: DOM, panel, buttons
│   │   └── styles.css         ← Panel styles (injected alongside the script)
│   └── popup/
│       ├── popup.html         ← Toolbar popup UI
│       └── popup.js           ← Popup logic: login, logout, status
```

## If the panel stops working after a WhatsApp update

WhatsApp periodically changes their DOM class names. If the panel stops
appearing, update the selectors in `src/content/index.js`:

```js
const SELECTORS = {
  chatHeader:  "header._amig",          // ← update this
  contactName: "span[data-testid='conversation-info-header-chat-title']",
  chatPanel:   "#main",
  messageInput:"div[data-testid='conversation-compose-box-input']",
};
```

`data-testid` attributes tend to be more stable than class names. Use Chrome
DevTools (F12) on WhatsApp Web to inspect and find the updated selectors.

## Switching to production

In both `src/background/index.js` and `src/popup/popup.js`, replace:
```js
const API_BASE = "http://localhost:5000/api";
```
with your deployed backend URL, e.g.:
```js
const API_BASE = "https://api.yourdomain.com/api";
```

Also update `host_permissions` in `manifest.json` to include your production domain.
