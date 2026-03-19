/**
 * LOGIN / SIGNUP PAGE
 * -------------------
 * Single page that toggles between login and register forms.
 * On success it stores the JWT and user in localStorage via AuthContext
 * then redirects to the dashboard.
 */

import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../lib/api";
import { User } from "../types";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [mode, setMode]       = useState<"login" | "register">("login");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [bizName, setBiz]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = mode === "login"
        ? await authApi.login(email, password)
        : await authApi.register(email, password, bizName);

      const { token, user } = res.data;
      login(token, user as User);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center
                          text-white text-xl font-bold mx-auto mb-3">W</div>
          <h1 className="text-xl font-semibold text-gray-100">BizPal CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your WhatsApp business</p>
        </div>

        {/* Card */}
        <div className="card">

          {/* Tab switcher */}
          <div className="flex rounded-lg bg-surface-input p-1 mb-5">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-surface-card text-gray-100"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Business name</label>
                <input
                  className="input"
                  placeholder="e.g. Amaka's Boutique"
                  value={bizName}
                  onChange={(e) => setBiz(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPass(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40
                            rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-1"
            >
              {loading
                ? "Please wait..."
                : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          WhatsApp CRM · Made for Nigerian vendors
        </p>
      </div>
    </div>
  );
}
