import { useMusicStore } from '../state/store';

/** Newest chord first; the list scrolls inside its module. */
export function ChordHistory() {
  const history = useMusicStore((s) => s.history);
  if (history.length === 0) return <p className="empty">Les accords joués apparaîtront ici.</p>;
  return (
    <ol className="history scroll">
      {history.map((name, i) => (
        <li key={`${history.length - i}`} className={i === 0 ? 'history-latest' : undefined}>{name}</li>
      ))}
    </ol>
  );
}
