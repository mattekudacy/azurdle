"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import navStyles from "./coming-soon-nav.module.css";
import { ArchiveIcon } from "./icons";
import ArchiveModal from "./archive-modal";
import AuthModal from "./auth-modal";

export default function ArchiveButton() {
  const [user, setUser] = useState<User | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingReopen, setPendingReopen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (pendingReopen && session?.user) {
        setPendingReopen(false);
        setAuthOpen(false);
        setArchiveOpen(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [pendingReopen]);

  function handleClick() {
    if (user) {
      setArchiveOpen(true);
    } else {
      setAuthOpen(true);
      setPendingReopen(true);
    }
  }

  return (
    <>
      <button
        type="button"
        className={navStyles.item}
        style={{ cursor: "pointer", opacity: 1 }}
        onClick={handleClick}
        aria-label="View puzzle archive"
      >
        <ArchiveIcon />
        <span>Archive</span>
      </button>
      <ArchiveModal open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setPendingReopen(false);
        }}
      />
    </>
  );
}
