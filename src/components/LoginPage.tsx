import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { DashboardUserRole } from "../types";

type LoginUser = {
  email: string;
  role: DashboardUserRole;
  name: string;
};

export const MOCK_USERS = [
  { email: "trisha@baltazarstudio.co", password: "studio123", role: "admin" as const, name: "Trisha Baltazar" },
  { email: "developer@baltazarstudio.co", password: "developer123", role: "developer" as const, name: "Studio Developer" },
  { email: "team@floraandco.com", password: "flora123", role: "client" as const, name: "Flora & Co." },
  { email: "hazel@houseofhazel.co", password: "hazel123", role: "client" as const, name: "House of Hazel" },
];

const PREVIEW_LOGIN_OPTIONS = [
  { label: "Studio Admin", detail: "Owner workspace", email: "trisha@baltazarstudio.co", ariaLabel: "Preview studio admin dashboard" },
  { label: "Developer", detail: "Delivery workspace", email: "developer@baltazarstudio.co", ariaLabel: "Preview developer dashboard" },
  { label: "Flora & Co.", detail: "Client-safe portal", email: "team@floraandco.com", ariaLabel: "Preview Flora and Co. client dashboard" },
  { label: "House of Hazel", detail: "Client-safe portal", email: "hazel@houseofhazel.co", ariaLabel: "Preview House of Hazel client dashboard" },
] as const;

export function LoginPage({ onLogin }: { onLogin: (user: LoginUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const user = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
      }
    }, 400);
  }

  function handleDemoLogin(email: string) {
    setError("");
    setLoading(true);
    setTimeout(() => {
      const demoUser = MOCK_USERS.find(u => u.email === email);
      if (demoUser) {
        onLogin(demoUser);
      }
    }, 400);
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <div className="login-mark">BS</div>
          <div className="login-title">Baltazar Studio</div>
          <div className="login-subtitle">Access your project timeline, files, approvals, and next steps.</div>
        </div>

        <div className="login-preview-panel" aria-label="Preview workspace options">
          <div className="login-preview-head">
            <span>Preview workspace</span>
            <p>Jump into a role while this portal is in setup.</p>
          </div>
          <div className="login-preview-actions">
          {PREVIEW_LOGIN_OPTIONS.map(option => (
            <button
              key={option.email}
              type="button"
              className="login-preview-btn"
              onClick={() => handleDemoLogin(option.email)}
              disabled={loading}
              aria-label={option.ariaLabel}
            >
              <span>{option.label}</span>
              <small>{option.detail}</small>
            </button>
          ))}
          </div>
        </div>

        <div className="login-card">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
              />
            </div>
            <div className="login-field">
              <label>Password</label>
              <div className="login-password-wrap">
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="dashboard-preloader-dot login-submit-spinner" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : "Sign in"}
            </button>
            <div className="login-support-row">
              <a href="mailto:hello@baltazarstudio.co?subject=Password%20reset%20request">Forgot password?</a>
              <a href="mailto:hello@baltazarstudio.co?subject=Portal%20access%20request">Request access</a>
            </div>
          </form>
        </div>

        <div className="login-security-note">
          <strong>Private client portal</strong>
          <span>Project data, approvals, files, and audit notes stay inside your assigned workspace.</span>
        </div>
      </div>
    </div>
  );
}
