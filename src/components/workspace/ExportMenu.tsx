'use client';

import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Download } from 'lucide-react';
import { PlanDrawing, cropForRooms } from '@/components/plan/PlanDrawing';
import { impactLedgerCsv } from '@/domain/io/csv';
import { serializeProject } from '@/domain/io/projectFile';
import { buildComparison } from '@/domain/revision/compare';
import { buildPlanModel } from '@/render/planModel';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { downloadText, slugDate } from './download';
import styles from './workspace.module.css';

export function ExportMenu({ onOpenImport, onReset }: { onOpenImport: () => void; onReset: () => void }) {
  const project = useWorkspace((s) => s.project);
  const view = useActiveView();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const close = () => detailsRef.current?.removeAttribute('open');
  const label = view.scenario ? `revision-${view.scenario.label.toLowerCase()}` : view.kind;

  const exportSvg = () => {
    const model = buildPlanModel(view.scene, view.analysis, {});
    const crop = cropForRooms(model, model.rooms.map((r) => r.roomId), { west: 900, east: 420, south: 900, north: 420 });
    const host = document.createElement('div');
    const root = createRoot(host);
    flushSync(() => {
      root.render(<PlanDrawing model={model} crop={crop} mode="static" focusDoorId="D-101" title={`${view.scene.project.name} — plan`} />);
    });
    const svg = host.innerHTML
      .replace(/var\(--font-mono\), ui-monospace, monospace/g, 'ui-monospace, Menlo, monospace')
      .replace('<svg ', '<svg width="1600" ');
    root.unmount();
    downloadText(`planrift-plan-${label}-${slugDate()}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, 'image/svg+xml');
  };

  const exportCsv = () => {
    const ids = project.scenarios.map((s) => s.id);
    const columns = buildComparison(project, ids, 'D-101');
    downloadText(`planrift-impact-ledger-${slugDate()}.csv`, impactLedgerCsv(columns), 'text/csv');
  };

  return (
    <details className={styles.menu} ref={detailsRef}>
      <summary className={styles.menuSummary}>
        <Download size={15} aria-hidden="true" /> Export
      </summary>
      <div className={styles.menuList} role="menu">
        <button
          role="menuitem"
          type="button"
          onClick={() => {
            downloadText(`aster-house.planrift-${slugDate()}.json`, serializeProject(project, new Date().toISOString()), 'application/json');
            close();
          }}
        >
          Project file <span>.json</span>
        </button>
        <button
          role="menuitem"
          type="button"
          onClick={() => {
            exportCsv();
            close();
          }}
          disabled={project.scenarios.length === 0}
        >
          Impact ledger <span>.csv</span>
        </button>
        <button
          role="menuitem"
          type="button"
          onClick={() => {
            exportSvg();
            close();
          }}
        >
          Current plan <span>.svg</span>
        </button>
        <hr />
        <button
          role="menuitem"
          type="button"
          onClick={() => {
            close();
            onOpenImport();
          }}
        >
          Import project…
        </button>
        <button
          role="menuitem"
          type="button"
          onClick={() => {
            close();
            if (window.confirm('Reset the demo? Your scenarios and decisions in this browser will be removed.')) onReset();
          }}
        >
          Reset demo
        </button>
      </div>
    </details>
  );
}
