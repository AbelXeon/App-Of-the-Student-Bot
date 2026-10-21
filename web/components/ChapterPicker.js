"use client";

export default function ChapterPicker({ chapters, value, onChange }) {
  return (
    <div className="chips" role="radiogroup" aria-label="Chapter">
      <button
        type="button"
        role="radio"
        aria-checked={value === "all"}
        className={`chip ${value === "all" ? "on" : ""}`}
        onClick={() => onChange("all")}
      >
        🌐 All chapters
      </button>
      {chapters.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          className={`chip ${value === c ? "on" : ""}`}
          onClick={() => onChange(c)}
        >
          📖 Chapter {c}
        </button>
      ))}
    </div>
  );
}
