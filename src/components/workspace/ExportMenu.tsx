'use client';

import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ChevronDown, Download } from 'lucide-react';
import { PlanDrawing, cropForRooms } from '@/components/plan/PlanDrawing';
import { impactLedgerCsv } from '@/domain/io/csv';
import { serializeProject } from '@/domain/io/projectFile';
import { buildComparison } from '@/domain/revision/compare';
import { buildPlanModel } from '@/render/planModel';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { downloadText, slugDate } from './download';
import { Menu, type MenuEntry } from './Menu';
import styles from './shell.module.css';

/** Export, import and reset entries, shared by the desktop Export menu and the mobile overflow menu. */
export function useExportEntries({ onOpenImport }: { onOpenImport: () => void }): MenuEntry[] {
  const project = useWorkspace((s) => s.project);
  const reset = useWorkspace((s) => s.reset);
  const view = useActiveView();
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
    const columns = buildComparison(project, project.scenarios.map((s) => s.id), 'D-101');
    downloadText(`planrift-impact-ledger-${slugDate()}.csv`, impactLedgerCsv(columns), 'text/csv');
  };

  return [
    {
      key: 'project',
      label: 'Project file',
      hint: '.json',
      onSelect: () => downloadText(`aster-house.planrift-${slugDate()}.json`, serializeProject(project, new Date().toISOString()), 'application/json'),
    },
    { key: 'csv', label: 'Impact ledger', hint: '.csv', disabled: project.scenarios.length === 0, onSelect: exportCsv },
    { key: 'svg', label: 'Current plan', hint: '.svg', onSelect: exportSvg },
    { key: 'import', label: 'Import project…', separatorBefore: true, onSelect: onOpenImport },
    {
      key: 'reset',
      label: 'Reset demo',
      onSelect: () => {
        if (window.confirm('Reset the demo? Your scenarios and decisions in this browser will be removed.')) reset();
      },
    },
  ];
}

export function ExportMenu({ onOpenImport }: { onOpenImport: () => void }) {
  const items = useExportEntries({ onOpenImport });
  return (
    <Menu
      label={
        <>
          <Download size={15} aria-hidden="true" />
          <span className={styles.hideTablet}>Export</span>
          <ChevronDown size={13} aria-hidden="true" className={styles.chevron} />
        </>
      }
      ariaLabel="Export, import or reset"
      triggerClassName={styles.btn}
      items={items}
    />
  );
}
