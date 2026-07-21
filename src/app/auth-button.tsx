"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { getLocalProgress } from "@/lib/local-progress";
import AuthModal from "./auth-modal";
import styles from "./auth-button.module.css";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // INITIAL_SESSION fires synchronously on subscribe — use it to end
      // the loading state instead of a separate getUser() round-trip, which
      // can race and overwrite state set by later auth events.
      if (event === "INITIAL_SESSION") setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Migrate any localStorage progress to the server whenever a user is signed
  // in and local data exists. Covers both the OAuth-redirect path (?migrated=1)
  // and the edge case where a session is already active (e.g. another tab).
  useEffect(() => {
    if (!user) return;

    // Clean up the legacy ?migrated=1 param if present from an OAuth redirect.
    const params = new URLSearchParams(window.location.search);
    if (params.has("migrated")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("migrated");
      window.history.replaceState({}, "", url.toString());
    }

    const stored = localStorage.getItem("azurdle.v1");
    if (!stored) return;
    try {
      const all = JSON.parse(stored) as Record<string, ReturnType<typeof getLocalProgress>>;
      const attempts = Object.values(all)
        .filter(Boolean)
        .map((p) => ({
          puzzleDate: p!.puzzleDate,
          guesses: p!.guesses,
          cluesRevealed: p!.revealedDuringPlay ?? p!.clues.length,
          solved: p!.solved,
          completedAt: p!.completedAt,
        }));

      if (attempts.length === 0) return;

      fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempts }),
      }).then((res) => {
        if (res.ok) localStorage.removeItem("azurdle.v1");
      });
    } catch {
      // Corrupt storage — ignore
    }
  }, [user]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  if (loading) return null;

  if (!user) {
    return (
      <>
        <button type="button" onClick={() => setModalOpen(true)} className={styles.button}>
          Sign in
        </button>
        <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  const displayName =
    user.user_metadata?.user_name ??
    user.user_metadata?.full_name ??
    (user.email ? user.email.split("@")[0] : "Account");

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={styles.user}>
      <span className={styles.username}>
        <span className={styles.avatar} aria-hidden="true">{initial}</span>
        {displayName}
      </span>
      <button type="button" onClick={signOut} className={styles.button}>
        Sign out
      </button>
    </div>
  );
}
