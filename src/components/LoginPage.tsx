import { ArrowRight, Check, Eye, EyeOff, Feather, Lock, Mail, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { resolveDashboardUser } from "@/lib/auth";
import { DEMO_USERS, type LoginUser } from "@/lib/demoUsers";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const JOURNEY_STEPS = [
  { label: "Cocoon Consult — the audit", Icon: Search, toneClassName: "is-audit" },
  { label: "Winged in a Week — the build", Icon: Feather, toneClassName: "is-build" },
  { label: "In Full Flight — the partnership", Icon: Check, toneClassName: "is-partnership" },
] as const;

export function LoginPage({
  onLogin,
  nextPath = "/dashboard",
  initialMessage = null,
}: {
  onLogin: (user: LoginUser) => void;
  nextPath?: string;
  initialMessage?: LoginFeedback | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<LoginFeedback | null>(initialMessage);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeAssistPanel, setActiveAssistPanel] = useState<"forgot" | "invite" | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [assistLoading, setAssistLoading] = useState<"forgot" | "invite" | "google" | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const normalizedEmail = email.trim().toLowerCase();
  const matchedUser = DEMO_USERS.find(user => user.email === normalizedEmail);
  const submitName = matchedUser ? firstName(matchedUser.name) : "Portal";
  const isForgotMode = activeAssistPanel === "forgot";

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const demoUser = DEMO_USERS.find(u => u.email === normalizedEmail && u.password === password);
    if (demoUser) {
      const { email: demoEmail, role, name, clientName } = demoUser;
      onLogin({ email: demoEmail, role, name, clientName });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setMessage({ tone: "error", text: error?.message || "Invalid email or password. Please try again." });
      setLoading(false);
      return;
    }

    const nextUser = resolveDashboardUser(
      data.user.email,
      pickSupabaseName(data.user.user_metadata),
    );

    if (!nextUser) {
      setMessage({ tone: "error", text: "We couldn't map this account into the portal yet." });
      setLoading(false);
      return;
    }

    onLogin(nextUser);
  }

  async function handleSSOClick() {
    setMessage(null);
    setAssistLoading("google");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAuthRedirectUrl("/auth/callback", `/login?next=${encodeURIComponent(nextPath)}`),
      },
    });

    if (error) {
      setMessage({ tone: "error", text: error.message });
      setAssistLoading(null);
    }
  }

  async function handleForgotPassword() {
    const recoveryEmail = (resetEmail || email).trim().toLowerCase();
    if (!recoveryEmail) {
      setMessage({ tone: "error", text: "Enter the email address tied to your portal first." });
      return;
    }

    setMessage(null);
    setAssistLoading("forgot");

    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: buildAuthRedirectUrl("/auth/callback", "/login/reset-password"),
    });

    if (error) {
      setMessage({ tone: "error", text: error.message });
      setAssistLoading(null);
      return;
    }

    setMessage({
      tone: "success",
      text: `Reset instructions are on the way to ${recoveryEmail}.`,
    });
    setResetEmail(recoveryEmail);
    setAssistLoading(null);
  }

  async function handleInviteRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setMessage({ tone: "error", text: "Add your name and email so we can review the request." });
      return;
    }

    setMessage(null);
    setAssistLoading("invite");

    const response = await fetch("/api/invite-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: inviteName,
        email: inviteEmail,
        businessName,
        note: inviteNote,
      }),
    });

    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setMessage({ tone: "error", text: payload?.error || "We couldn't send that invite request just yet." });
      setAssistLoading(null);
      return;
    }

    setMessage({
      tone: "success",
      text: "Invite request received. We'll review access and follow up shortly.",
    });
    setInviteName("");
    setInviteEmail("");
    setBusinessName("");
    setInviteNote("");
    setActiveAssistPanel(null);
    setAssistLoading(null);
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-journey-panel" aria-label="Baltazar Studio Portal Overview">
          <div className="login-journey-orb" aria-hidden="true" />
          <div className="login-journey-feather" aria-hidden="true">
            <Feather size={80} strokeWidth={1.1} />
          </div>

          <div className="login-studio-chip">
            <div className="login-studio-mark">B</div>
            <div>
              <div className="login-studio-name">Baltazar Studio</div>
              <div className="login-studio-kicker">Studio Portal</div>
            </div>
          </div>

          <div className="login-journey-copy">
            <h1>Welcome back to the flight path.</h1>
            <p>Everything from your Cocoon Consult audit to launch and beyond, in one calm place.</p>

            <div className="login-journey-list">
              {JOURNEY_STEPS.map(step => {
                const StepIcon = step.Icon;
                return (
                  <div key={step.label} className="login-journey-item">
                    <span className={`login-journey-dot ${step.toneClassName}`}>
                      <StepIcon size={13} />
                    </span>
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-form-header">
            <h2>{isForgotMode ? "Reset Your Password" : "Sign In"}</h2>
            <p>
              {isForgotMode
                ? "We'll send a secure reset link to the email tied to your portal."
                : "Use your assigned studio or client portal account."}
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={event => {
              if (isForgotMode) {
                event.preventDefault();
                void handleForgotPassword();
                return;
              }

              void handleSubmit(event);
            }}
          >
            {isForgotMode ? (
              <div className="login-field">
                <label htmlFor="forgot-email">Reset Email</label>
                <div className="login-input-shell">
                  <Mail size={17} className="login-input-icon" aria-hidden="true" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={resetEmail}
                    onChange={event => setResetEmail(event.target.value)}
                    placeholder="you@studio.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="login-field">
                  <label htmlFor="login-email">Email</label>
                  <div className="login-input-shell">
                    <Mail size={17} className="login-input-icon" aria-hidden="true" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@studio.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <div className="login-field-row">
                    <label htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="login-link-btn"
                      onClick={() => {
                        setActiveAssistPanel("forgot");
                        setResetEmail(email);
                      }}
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="login-input-shell">
                    <Lock size={17} className="login-input-icon" aria-hidden="true" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="login-password-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <label className="login-remember-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span className="login-remember-box" aria-hidden="true">
                    {rememberMe ? <Check size={12} /> : null}
                  </span>
                  <span>Keep Me Signed In</span>
                </label>
              </>
            )}

            {message ? (
              <div className={`login-message is-${message.tone}`}>
                {message.text}
              </div>
            ) : null}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isForgotMode ? assistLoading === "forgot" : loading}
            >
              {isForgotMode ? (
                <span>{assistLoading === "forgot" ? "Sending..." : "Send Reset Link"}</span>
              ) : loading ? (
                <>
                  <span className="dashboard-preloader-dot login-submit-spinner" aria-hidden="true" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {submitName}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {isForgotMode ? (
              <button
                type="button"
                className="login-secondary-btn"
                onClick={() => {
                  setActiveAssistPanel(null);
                  setMessage(null);
                }}
              >
                Back to Sign In
              </button>
            ) : (
              <>
                <div className="login-divider" aria-hidden="true">
                  <span />
                  <small>or</small>
                  <span />
                </div>

                <button
                  type="button"
                  className="login-google-btn"
                  onClick={handleSSOClick}
                  disabled={loading || assistLoading === "google"}
                >
                  <span className="login-google-mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="presentation">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3.01h3.88c2.27-2.09 3.55-5.16 3.55-8.66Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.76-2.1-6.7-4.92H1.3v3.1A12 12 0 0 0 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.3 14.32A7.18 7.18 0 0 1 4.92 12c0-.8.14-1.58.38-2.32v-3.1H1.3A12 12 0 0 0 0 12c0 1.93.46 3.76 1.3 5.42l4-3.1Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.77c1.76 0 3.34.61 4.59 1.81l3.44-3.44C17.94 1.16 15.24 0 12 0A12 12 0 0 0 1.3 6.58l4 3.1c.94-2.82 3.58-4.91 6.7-4.91Z"
                      />
                    </svg>
                  </span>
                  <span>{assistLoading === "google" ? "Redirecting to Google..." : "Continue with Google"}</span>
                </button>
              </>
            )}
          </form>

          {!isForgotMode ? (
            <p className="login-request-row">
              New to the studio?{" "}
              <button
                type="button"
                className="login-inline-btn"
                onClick={() => setActiveAssistPanel(current => current === "invite" ? null : "invite")}
              >
                Request an Invite
              </button>
            </p>
          ) : null}

          {!isForgotMode && activeAssistPanel === "invite" ? (
            <div className="login-assist-panel">
              <div className="login-assist-panel-header">
                <strong>Request Portal Access</strong>
                <span>Share who you are and we'll review the right portal role for you.</span>
              </div>
              <form className="login-assist-form" onSubmit={handleInviteRequest}>
                <div className="login-field">
                  <label htmlFor="invite-name">Your Name</label>
                  <input
                    id="invite-name"
                    type="text"
                    value={inviteName}
                    onChange={event => setInviteName(event.target.value)}
                    placeholder="First and last name"
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="invite-email">Work Email</label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={event => setInviteEmail(event.target.value)}
                    placeholder="you@business.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="invite-business">Business Name</label>
                  <input
                    id="invite-business"
                    type="text"
                    value={businessName}
                    onChange={event => setBusinessName(event.target.value)}
                    placeholder="Studio or brand name"
                    autoComplete="organization"
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="invite-note">Anything we should know?</label>
                  <textarea
                    id="invite-note"
                    value={inviteNote}
                    onChange={event => setInviteNote(event.target.value)}
                    placeholder="Share context for the access request."
                    rows={3}
                  />
                </div>

                <button
                  type="submit"
                  className="login-secondary-btn"
                  disabled={assistLoading === "invite"}
                >
                  {assistLoading === "invite" ? "Submitting..." : "Send Invite Request"}
                </button>
              </form>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

type LoginFeedback = {
  tone: "error" | "info" | "success";
  text: string;
};

function buildAuthRedirectUrl(callbackPath: string, nextPath: string) {
  const origin = window.location.origin;
  return `${origin}${callbackPath}?next=${encodeURIComponent(nextPath)}`;
}

function pickSupabaseName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  return typeof record.full_name === "string"
    ? record.full_name
    : typeof record.name === "string"
      ? record.name
      : null;
}

function firstName(name: string) {
  return name.split(" ")[0] || name;
}
