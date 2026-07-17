"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import navStyles from "./coming-soon-nav.module.css";
import { StatsIcon } from "./icons";
import StatsModal from "./stats-modal";
import AuthModal from "./auth-modal";

export default function StatsButton() {
  const [statsOpen, setStatsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  // True when the auth modal was opened via the stats "sign in to sync" CTA —
  // so we can re-open stats automatically after they sign in.
  const [pendingStatsReopen, setPendingStatsReopen] = useState(false);

  useEffect(() => {
    if (!pendingStatsReopen) return;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setPendingStatsReopen(false);
        setAuthOpen(false);
        setStatsOpen(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [pendingStatsReopen]);

  function handleSignInFromStats() {
    setStatsOpen(false);
    setAuthOpen(true);
    setPendingStatsReopen(true);
  }

  return (
    <>
      <button
        type="button"
        className={navStyles.item}
        style={{ cursor: "pointer", opacity: 1 }}
        onClick={() => setStatsOpen(true)}
        aria-label="View your stats"
      >
        <StatsIcon />
        <span>Stats</span>
      </button>
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        onSignIn={handleSignInFromStats}
      />
      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingStatsReopen(false);
        }}
      />
    </>
  );
}
