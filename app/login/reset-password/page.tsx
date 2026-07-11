"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveDashboardUser } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RecoveryMessage = {
  tone: "error" | "info" | "success";
  text: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [message, setMessage] = useState<RecoveryMessage | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRecoverySession() {
      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;

      if (error || !data.user?.email) {
        setCanReset(false);
        setMessage({
          tone: "error",
          text: "This reset link is no longer valid. Request a fresh password reset from the login page.",
        });
        setLoading(false);
        return;
      }

      setCanReset(true);
      setLoading(false);
    }

    void loadRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage({ tone: "error", text: "Use at least 8 characters for your new password." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ tone: "error", text: "Your passwords don't match yet." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage({ tone: "error", text: error.message });
      setSubmitting(false);
      return;
    }

    const nextUser = resolveDashboardUser(
      data.user?.email,
      pickSupabaseName(data.user?.user_metadata),
    );
    if (nextUser) {
      sessionStorage.setItem("bs-user", JSON.stringify(nextUser));
    }

    setMessage({ tone: "success", text: "Password updated. Taking you back into the portal..." });
    router.replace("/dashboard");
  }

  return (
    <div className="login-page login-page--recovery">
      <div className="login-recovery-card">
        <div className="login-form-header">
          <h2>Reset Your Password</h2>
          <p>Create a new password for your studio portal.</p>
        </div>

        {message ? <div className={`login-message is-${message.tone}`}>{message.text}</div> : null}

        {loading ? (
            <div className="login-recovery-status">Checking Your Secure Reset Link…</div>
        ) : canReset ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="reset-password">New Password</label>
              <div className="login-input-shell">
                <Lock size={17} className="login-input-icon" aria-hidden="true" />
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  minLength={8}
                  required
                  placeholder="Minimum 8 Characters"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="reset-password-confirm">Confirm Password</label>
              <div className="login-input-shell">
                <Lock size={17} className="login-input-icon" aria-hidden="true" />
                <input
                  id="reset-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  placeholder="Re-enter Your Password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={submitting}>
              {submitting ? "Saving..." : "Save New Password"}
            </button>
          </form>
        ) : (
          <Link href="/login" className="login-secondary-link">
            Back to Login
          </Link>
        )}
      </div>
    </div>
  );
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
