"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CloseIcon } from "./icons";
import styles from "./auth-modal.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type EmailMode = "signin" | "signup";
type Step = "choose" | "email";

export default function AuthModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("choose");
  const [emailMode, setEmailMode] = useState<EmailMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => {
      onClose();
      // Reset state when closed
      setStep("choose");
      setEmail("");
      setPassword("");
      setError("");
      setEmailSent(false);
    };
    el.addEventListener("close", handler);
    return () => el.removeEventListener("close", handler);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      onClose();
    }
  }

  async function signInWithOAuth(provider: "github" | "google") {
    const supabase = createClient();
    // Use the stable site URL in production so deployment-specific Vercel
    // URLs (which expire) never end up as the OAuth redirect target.
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const supabase = createClient();
    try {
      if (emailMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); return; }
        onClose();
      } else {
        const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        });
        if (error) { setError(error.message); return; }
        setEmailSent(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="auth-modal-title"
      onClick={handleBackdropClick}
    >
      <div className={styles.header}>
        <h2 id="auth-modal-title" className={styles.title}>Sign in to Azurdle</h2>
        <button type="button" aria-label="Close" className={styles.close} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      {step === "choose" && (
        <div className={styles.body}>
          <p className={styles.subtitle}>Track your streak, view stats, and access the archive.</p>
          <div className={styles.oauthGroup}>
            <button type="button" className={styles.oauthButton} onClick={() => signInWithOAuth("github")}>
              <GitHubIcon />
              Continue with GitHub
            </button>
            <button type="button" className={styles.oauthButton} onClick={() => signInWithOAuth("google")}>
              <GoogleIcon />
              Continue with Google
            </button>
          </div>
          <div className={styles.divider}><span>or</span></div>
          <button type="button" className={styles.emailToggle} onClick={() => setStep("email")}>
            Continue with email
          </button>
        </div>
      )}

      {step === "email" && !emailSent && (
        <div className={styles.body}>
          <div className={styles.modeTabs}>
            <button
              type="button"
              className={emailMode === "signin" ? styles.modeTabActive : styles.modeTab}
              onClick={() => { setEmailMode("signin"); setError(""); }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={emailMode === "signup" ? styles.modeTabActive : styles.modeTab}
              onClick={() => { setEmailMode("signup"); setError(""); }}
            >
              Create account
            </button>
          </div>
          <form onSubmit={handleEmailSubmit} className={styles.form}>
            <label className={styles.fieldLabel}>
              Email
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
            </label>
            <label className={styles.fieldLabel}>
              Password
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder={emailMode === "signup" ? "At least 6 characters" : ""}
              />
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? "…" : emailMode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button type="button" className={styles.backLink} onClick={() => { setStep("choose"); setError(""); }}>
            ← Other sign-in options
          </button>
        </div>
      )}

      {step === "email" && emailSent && (
        <div className={styles.body}>
          <p className={styles.message}>Check your email — we sent a confirmation link to <strong>{email}</strong>.</p>
        </div>
      )}
    </dialog>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
