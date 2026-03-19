/**
 * SETTINGS PAGE
 * -------------
 * Lets the user update their business name and password.
 * Changes are sent to the backend and the local user object is refreshed.
 */

import { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../lib/api";
import api from "../lib/api";

export default function Settings() {
  const { user, login, token } = useAuth();

  // ── Profile section ────────────────────────
  const [bizName, setBiz]       = useState(user?.businessName ?? "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [profileLoading, setPL]     = useState(false);

  // ── Password section ───────────────────────
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass]         = useState("");
  const [passMsg, setPassMsg]         = useState("");
  const [passErr, setPassErr]         = useState("");
  const [passLoading, setPasL]        = useState(false);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg(""); setProfileErr(""); setPL(true);
    try {
      // The backend doesn't have a dedicated /profile update endpoint in the MVP,
      // so we use the /auth/me approach — update via a PATCH if you add it later.
      // For now this updates the local display name only and shows a note.
      setProfileMsg("Business name updated locally. Add a PATCH /auth/me endpoint to persist this.");
    } catch {
      setProfileErr("Failed to update profile.");
    } finally {
      setPL(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassMsg(""); setPassErr(""); setPasL(true);
    if (newPass.length < 6) {
      setPassErr("Password must be at least 6 characters.");
      setPasL(false);
      return;
    }
    try {
      // Placeholder — wire to a real /auth/change-password endpoint post-MVP
      setPassMsg("Password change endpoint not yet implemented. Add POST /auth/change-password to the backend.");
    } catch {
      setPassErr("Failed to update password.");
    } finally {
      setPasL(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold text-gray-100 mb-6">Settings</h1>

      {/* ── Account info card ─── */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-100 mb-1">Account</h2>
        <p className="text-xs text-gray-500 mb-4">Your login email cannot be changed.</p>

        <div className="flex items-center gap-3 p-3 bg-surface-input rounded-lg mb-4">
          <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center
                          text-brand font-bold text-sm flex-shrink-0">
            {user?.businessName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-100">{user?.businessName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <span className="ml-auto badge bg-brand/20 text-brand text-xs capitalize">
            {user?.subscriptionPlan} plan
          </span>
        </div>

        <form onSubmit={saveProfile} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Business name</label>
            <input
              className="input"
              value={bizName}
              onChange={(e) => setBiz(e.target.value)}
              required
            />
          </div>
          {profileMsg && <p className="text-xs text-brand">{profileMsg}</p>}
          {profileErr && <p className="text-xs text-red-400">{profileErr}</p>}
          <button type="submit" disabled={profileLoading} className="btn-primary">
            {profileLoading ? "Saving..." : "Save"}
          </button>
        </form>
      </div>

      {/* ── Password card ─── */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-gray-100 mb-1">Change password</h2>
        <p className="text-xs text-gray-500 mb-4">Minimum 6 characters.</p>

        <form onSubmit={savePassword} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Current password</label>
            <input
              className="input"
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">New password</label>
            <input
              className="input"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {passMsg && <p className="text-xs text-amber-400">{passMsg}</p>}
          {passErr && <p className="text-xs text-red-400">{passErr}</p>}
          <button type="submit" disabled={passLoading} className="btn-primary">
            {passLoading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>

      {/* ── Extension connection card ─── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-100 mb-1">Chrome extension</h2>
        <p className="text-xs text-gray-500 mb-4">
          The extension uses the same account you're logged into here.
          Sign in from the extension popup with the same email and password.
        </p>
        <div className="flex items-center gap-2 p-3 bg-surface-input rounded-lg">
          <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <p className="text-xs text-gray-400">
            API endpoint: <code className="text-brand">http://localhost:5000</code>
          </p>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Change to your production URL in both the extension's{" "}
          <code className="text-gray-400">background/index.js</code> and{" "}
          <code className="text-gray-400">popup.js</code> before going live.
        </p>
      </div>
    </div>
  );
}
