"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import navStyles from "./coming-soon-nav.module.css";
import { StatsIcon } from "./icons";
import StatsModal from "./stats-modal";
import AuthModal from "./auth-modal";

export default function StatsButton() {
  const [user, setUser] = useState<User | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingStatsReopen, setPendingStatsReopen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (pendingStatsReopen && session?.user) {
        setPendingStatsReopen(false);
        setAuthOpen(false);
        setStatsOpen(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [pendingStatsReopen]);


  function handleClick() {
    if (user) {
      setStatsOpen(true);
    } else {
      setAuthOpen(true);
      setPendingStatsReopen(true);
    }
  }

  return (
    <>
      <button
        type="button"
        className={navStyles.item}
        style={{ cursor: "pointer", opacity: 1 }}
        onClick={handleClick}
        aria-label="View your stats"
      >
        <StatsIcon />
        <span>Stats</span>
      </button>
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        myUserId={user?.id ?? null}
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
