import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type LoginUser = {
  email: string;
  role: "admin" | "client";
  name: string;
};

export const MOCK_USERS = [
  { email: "trisha@baltazarstudio.co", password: "studio123", role: "admin" as const, name: "Trisha Baltazar" },
  { email: "team@floraandco.com", password: "flora123", role: "client" as const, name: "Flora & Co." },
  { email: "hazel@houseofhazel.co", password: "hazel123", role: "client" as const, name: "House of Hazel" },
];

const DEMO_LOGIN_OPTIONS = [
  { label: "View admin", email: "trisha@baltazarstudio.co", ariaLabel: "View admin dashboard — auto-login to explore the admin view" },
  { label: "View Flora & Co.", email: "team@floraandco.com", ariaLabel: "View Flora and Co. client dashboard — auto-login to explore the Flora workspace" },
  { label: "View House of Hazel", email: "hazel@houseofhazel.co", ariaLabel: "View House of Hazel client dashboard — auto-login to explore the House of Hazel workspace" },
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
          <div className="login-subtitle">Your website audit and project management portal — secure, encrypted, your data stays private</div>
        </div>

        <div className="login-demo-actions" aria-label="Demo login options">
          {DEMO_LOGIN_OPTIONS.map(option => (
            <button
              key={option.email}
              type="button"
              className="login-demo-btn"
              onClick={() => handleDemoLogin(option.email)}
              disabled={loading}
              aria-label={option.ariaLabel}
            >
              {option.label}
            </button>
          ))}
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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <div className="login-demo-hint">
          <strong>Demo credentials</strong><br />
          Admin: trisha@baltazarstudio.co / studio123<br />
          Flora & Co.: team@floraandco.com / flora123<br />
          House of Hazel: hazel@houseofhazel.co / hazel123
        </div>
      </div>
    </div>
  );
}
