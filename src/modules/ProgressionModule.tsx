import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { stepName, type ProgressionStep } from '../music/progression';
import { useMusicStore } from '../state/store';

export const PROGRESSION_DROP_ID = 'progression';

/** The "score": chords placed in order above the piano. The highlighted one is the next to play. */
export function ProgressionModule() {
  const steps = useMusicStore((s) => s.progression.steps);
  const { setNodeRef, isOver } = useDroppable({ id: PROGRESSION_DROP_ID });

  return (
    <div ref={setNodeRef} className={`score ${isOver ? 'is-over' : ''}`}>
      <SortableContext items={steps.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
        {steps.map((step, i) => <StepCard key={step.id} step={step} index={i} />)}
      </SortableContext>
      {steps.length === 0 && <p className="empty">Glisse des accords ici depuis la liste, ou clique sur +.</p>}
    </div>
  );
}

export function ClearProgressionButton() {
  const clear = useMusicStore((s) => s.clearProgression);
  const empty = useMusicStore((s) => s.progression.steps.length === 0);
  return <button className="text-button" onClick={clear} disabled={empty}>Vider</button>;
}

function StepCard({ step, index }: { step: ProgressionStep; index: number }) {
  const active = useMusicStore((s) => s.progression.active === index && s.selected === null);
  const hitAt = useMusicStore((s) => (s.lastHit?.target === step.id ? s.lastHit.at : null));
  const setActiveStep = useMusicStore((s) => s.setActiveStep);
  const removeStep = useMusicStore((s) => s.removeStep);
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: step.id,
    data: { kind: 'step' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`step ${active ? 'is-active' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => setActiveStep(index)}
      {...attributes}
      {...listeners}
    >
      {hitAt && <span key={hitAt} className="hit-flash" aria-hidden />}
      <span className="step-index">{index + 1}</span>
      <span className="step-name">{stepName(step)}</span>
      <button
        className="step-remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
        aria-label="Retirer l’accord"
      >
        ×
      </button>
    </div>
  );
}
