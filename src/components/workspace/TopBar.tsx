'use client';

import Link from 'next/link';
import { ArrowRight, Check, Clock, Columns3, Ellipsis, FileText, Lock, PenLine, Redo2, Stamp, Undo2, X } from 'lucide-react';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { headRevision, type ScenarioStatus } from '@/domain/revision/scenario';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { ExportMenu, useExportEntries } from './ExportMenu';
import { LIFECYCLE_LABEL, primaryActionLabel } from './lifecycle';
import { Menu, type MenuEntry } from './Menu';
import { ScenarioSelect, ScenarioSwitcher } from './ScenarioSwitcher';
import styles from './shell.module.css';

const LIFECYCLE_ICON: Record<ScenarioStatus | 'committed', typeof Check> = {
  committed: Lock,
  draft: PenLine,
  ready_for_review: Clock,
  accepted: Check,
  rejected: X,
  superseded: X,
};

/** In the overflow menu the export entries need their verb, since they sit among other actions. */
const OVERFLOW_LABEL: Record<string, string> = {
  project: 'Export project file',
  csv: 'Export impact ledger',
  svg: 'Export current plan',
};

function PrimaryIcon({ status }: { status: ScenarioStatus }) {
  if (status === 'draft') return <ArrowRight size={15} aria-hidden="true" />;
  if (status === 'ready_for_review') return <Stamp size={15} aria-hidden="true" />;
  return <FileText size={15} aria-hidden="true" />;
}

export function LifecycleChip({ status }: { status: ScenarioStatus | 'committed' }) {
  const Icon = LIFECYCLE_ICON[status];
  return (
    <span className={styles.lifecycle} data-lifecycle={status}>
      <Icon size={12} aria-hidden="true" />
      {LIFECYCLE_LABEL[status]}
    </span>
  );
}

export function TopBar({ onOpenDecision, onOpenImport }: { onOpenDecision: () => void; onOpenImport: () => void }) {
  const project = useWorkspace((s) => s.project);
  const undo = useWorkspace((s) => s.undo);
  const redo = useWorkspace((s) => s.redo);
  const viewMode = useWorkspace((s) => s.view);
  const setView = useWorkspace((s) => s.setView);
  const view = useActiveView();
  const head = headRevision(project);
  const scenario = view.scenario;
  const canUndo = view.editable && Boolean(scenario?.past.length);
  const canRedo = view.editable && Boolean(scenario?.future.length);
  const comparing = viewMode === 'compare';
  const exportEntries = useExportEntries({ onOpenImport });

  const overflow: MenuEntry[] = [
    { key: 'undo', label: 'Undo', icon: <Undo2 size={15} aria-hidden="true" />, disabled: !canUndo, onSelect: undo },
    { key: 'redo', label: 'Redo', icon: <Redo2 size={15} aria-hidden="true" />, disabled: !canRedo, onSelect: redo },
    {
      key: 'compare',
      label: 'Compare alternatives',
      icon: <Columns3 size={15} aria-hidden="true" />,
      checked: comparing,
      disabled: project.scenarios.length === 0,
      separatorBefore: true,
      onSelect: () => setView(comparing ? 'edit' : 'compare'),
    },
    ...exportEntries.map((entry, i) => ({
      ...entry,
      label: OVERFLOW_LABEL[entry.key] ?? entry.label,
      separatorBefore: i === 0 || entry.separatorBefore,
    })),
  ];

  return (
    <header className={styles.topbar}>
      <Link href="/" className={styles.brand} aria-label="PLANRIFT home">
        <span className={styles.brandFull}>
          <Logo size={20} />
        </span>
        <span className={styles.brandMark}>
          <LogoMark size={22} />
        </span>
      </Link>

      <div className={styles.project}>
        <span className={styles.projectName}>{project.revisions[0]!.scene.project.name}</span>
        <span className={styles.projectSub}>
          Fictional sample · <span className="mono">{head.id}</span> committed
        </span>
      </div>

      <div className={styles.switcherSlot}>
        <ScenarioSwitcher />
      </div>
      <div className={styles.selectSlot}>
        <ScenarioSelect />
      </div>

      <div className={styles.actions}>
        <span className={styles.lifecycleSlot}>
          <LifecycleChip status={scenario ? scenario.status : 'committed'} />
        </span>
        <div className={styles.history}>
          <button type="button" className={styles.iconButton} onClick={undo} disabled={!canUndo} aria-label="Undo (⌘Z)" title="Undo (⌘Z)">
            <Undo2 size={16} aria-hidden="true" />
          </button>
          <button type="button" className={styles.iconButton} onClick={redo} disabled={!canRedo} aria-label="Redo (⇧⌘Z)" title="Redo (⇧⌘Z)">
            <Redo2 size={16} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles.compareToggle}`}
          onClick={() => setView(comparing ? 'edit' : 'compare')}
          aria-pressed={comparing}
          aria-label="Compare"
          title={project.scenarios.length === 0 ? 'Create a scenario to compare it with its source revision' : 'Compare alternatives side by side'}
          disabled={project.scenarios.length === 0}
        >
          <Columns3 size={15} aria-hidden="true" />
          <span className={styles.hideTablet}>Compare</span>
        </button>
        {scenario ? (
          <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={onOpenDecision} data-testid="primary-action">
            {primaryActionLabel(scenario.status)}
            <PrimaryIcon status={scenario.status} />
          </button>
        ) : null}
        <span className={styles.exportSlot}>
          <ExportMenu onOpenImport={onOpenImport} />
        </span>
        <span className={styles.overflowSlot}>
          <Menu
            label={<Ellipsis size={18} aria-hidden="true" />}
            ariaLabel="More actions"
            triggerClassName={styles.iconButton}
            items={overflow}
            testId="overflow-menu"
          />
        </span>
      </div>
    </header>
  );
}
