import { useRef, useState } from 'react';
import { useStudioStore } from '../store';
import type { Take } from '../take';

export function TakeList() {
  const takes = useStudioStore((s) => s.takes);
  const selectedId = useStudioStore((s) => s.selectedId);
  const selectTake = useStudioStore((s) => s.selectTake);
  const deleteTake = useStudioStore((s) => s.deleteTake);
  const [editing, setEditing] = useState<string | null>(null);

  if (takes.length === 0) return <p className="empty">Aucune prise. Clique sur Enregistrer pour commencer.</p>;

  return (
    <ul className="take-list scroll">
      {takes.map((take) => (
        <li key={take.id} className={`take ${take.id === selectedId ? 'is-selected' : ''}`}>
          {editing === take.id ? (
            <RenameInput take={take} onDone={() => setEditing(null)} />
          ) : (
            <button className="take-main" onClick={() => selectTake(take.id)}>
              <span className="take-name">{take.name}</span>
              <span className="take-meta">
                {take.tempo} bpm · {take.beatsPerBar}/4 · {take.bars} mesure{take.bars > 1 ? 's' : ''}
              </span>
            </button>
          )}
          <button className="icon-button" title="Renommer" aria-label={`Renommer ${take.name}`} onClick={() => setEditing(take.id)}>✎</button>
          <button
            className="icon-button"
            title="Supprimer"
            aria-label={`Supprimer ${take.name}`}
            onClick={() => window.confirm(`Supprimer « ${take.name} » ?`) && deleteTake(take.id)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

function RenameInput({ take, onDone }: { take: Take; onDone: () => void }) {
  const renameTake = useStudioStore((s) => s.renameTake);
  const [value, setValue] = useState(take.name);
  const done = useRef(false);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    if (save) renameTake(take.id, value);
    onDone();
  };
  return (
    <input
      className="take-rename"
      aria-label="Nom de la prise"
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      }}
    />
  );
}
