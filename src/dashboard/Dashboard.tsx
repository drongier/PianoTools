import type { ComponentType } from 'react';
import ReactGridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import { Panel } from './Panel';
import { GRID_COLS } from './layout';
import { CurrentChord } from '../modules/CurrentChord';
import { ChordHistory } from '../modules/ChordHistory';
import { ChordPicker } from '../modules/ChordPicker';
import { ClearProgressionButton, ProgressionModule } from '../modules/ProgressionModule';
import { PianoModule } from '../modules/PianoModule';

interface ModuleDef {
  title: string;
  Component: ComponentType;
  Actions?: ComponentType;
}

/** Adding a module: write the component, register it here, give it a default place in layout.ts. */
const MODULES: Record<string, ModuleDef> = {
  picker: { title: 'Accords', Component: ChordPicker },
  current: { title: 'Accord joué', Component: CurrentChord },
  history: { title: 'Historique', Component: ChordHistory },
  progression: { title: 'Playground', Component: ProgressionModule, Actions: ClearProgressionButton },
  piano: { title: 'Piano', Component: PianoModule },
};

export function Dashboard({ layout, onLayoutChange }: { layout: Layout; onLayoutChange: (layout: Layout) => void }) {
  const { width, containerRef, mounted } = useContainerWidth();
  return (
    <div ref={containerRef} className="dashboard">
      {mounted && (
        <ReactGridLayout
          layout={layout}
          width={width}
          gridConfig={{ cols: GRID_COLS, rowHeight: 40, margin: [12, 12], containerPadding: [16, 16] }}
          dragConfig={{ handle: '.panel-header', cancel: '.panel-actions' }}
          resizeConfig={{ handles: ['se'] }}
          onLayoutChange={onLayoutChange}
        >
          {layout.map(({ i }) => {
            const def = MODULES[i];
            if (!def) return null;
            const { Component, Actions } = def;
            return (
              <div key={i}>
                <Panel title={def.title} actions={Actions && <Actions />}>
                  <Component />
                </Panel>
              </div>
            );
          })}
        </ReactGridLayout>
      )}
    </div>
  );
}
