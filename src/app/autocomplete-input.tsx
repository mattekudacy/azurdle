"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./autocomplete-input.module.css";
import { SearchIcon } from "./icons";
import { normalizeGuess } from "@/lib/guess";

const MAX_SUGGESTIONS = 8;

type AutocompleteInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  // Called when Enter selects a highlighted suggestion — lets the caller
  // submit immediately with that value instead of requiring a second Enter.
  onSubmitValue?: (value: string) => void;
  // Guesses already made this round — matching suggestions are marked
  // "already tried" and can't be resubmitted, so a misremembered repeat
  // doesn't burn one of a scarce set of guesses for nothing.
  priorGuesses?: string[];
  disabled?: boolean;
  className?: string;
  // The guess bar is pinned to the bottom of the viewport, so the dropdown
  // must open upward from the input instead of downward off-screen.
  openUpward?: boolean;
};

let vocabPromise: Promise<string[]> | null = null;
function loadVocab(): Promise<string[]> {
  vocabPromise ??= fetch("/vocab/services.json").then((res) => res.json());
  return vocabPromise;
}

export default function AutocompleteInput({
  id,
  value,
  onChange,
  onSubmitValue,
  priorGuesses = [],
  disabled,
  className,
  openUpward,
}: AutocompleteInputProps) {
  const [vocab, setVocab] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    loadVocab().then(setVocab);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triedSet = new Set(priorGuesses.map(normalizeGuess));
  const isTried = (service: string) => triedSet.has(normalizeGuess(service));

  const suggestions = value.trim()
    ? vocab
        .filter((service) => service.toLowerCase().includes(value.trim().toLowerCase()))
        .slice(0, MAX_SUGGESTIONS)
    : [];

  function selectSuggestion(service: string) {
    onChange(service);
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const service = suggestions[highlightedIndex];
      if (isTried(service)) return;
      selectSuggestion(service);
      onSubmitValue?.(service);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <SearchIcon className={styles.searchIcon} />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
        }
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        placeholder="Search Azure services…"
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className={`${styles.suggestions} ${openUpward ? styles.suggestionsUp : ""}`}
        >
          {suggestions.map((service, i) => {
            const tried = isTried(service);
            return (
              <li
                key={service}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                aria-disabled={tried}
                className={[
                  i === highlightedIndex ? styles.suggestionActive : styles.suggestion,
                  tried ? styles.suggestionTried : "",
                ].join(" ")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (tried) return;
                  selectSuggestion(service);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                <span>{service}</span>
                {tried && <span className={styles.triedLabel}>Already tried</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
