export function Spinner({ label }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div className="note error" role="alert">
      {children}
    </div>
  );
}
