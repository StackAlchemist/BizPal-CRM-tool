import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Force dark mode permanently by adding the 'dark' class to <html>
// This tells Tailwind to apply all dark: variants
document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
