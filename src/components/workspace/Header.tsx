'use client';

import Link from 'next/link';
import { Columns3, Plus, Redo2, Undo2 } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { StatusIcon } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/primitives';
import { analysisOf, useWorkspace } from '@/state/store';
import { useActiveView } from '@/state/hooks';
import { headRevision } from '@/domain/revision/scenario';
import { ExportMenu } from './ExportMenu';
import styles from './workspace.module.css';

const LIFECYCLE_LABEL = {
  draft: 'Draft',
  ready_for_review: 'Ready for review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  superseded: 'Superseded',
} as const;

export function Header({ onOpenDecision, onOpenImport }: { onOpenDecision: () => void; onOpenImport: () => void }) {
  const project = useWorkspace((s) => s.project);
  const activeId = useWorkspace((s) => s.activeId);
  const setActive = useWorkspace((s) => s.setActive);
  const newScenario = useWorkspace((s) => s.newScenario);
  const undo = useWorkspace((s) => s.undo);
  const redo = useWorkspace((s) => s.redo);
  const viewMode = useWorkspace((s) => s.view);
  const setView = useWorkspace((s) => s.setView);
  const reset = useWorkspace((s) => s.reset);
  const view = useActiveView();
  const head = headRevision(project);
  const scenario = view.scenario;

  return (
    <header className={styles.header}>
      <div className={styles.brandBlock}>
        <Link href="/" className={styles.brand} aria-label="PLANRIFT home">
          <Logo size={22} />
        </Link>
        <div className={styles.projectMeta}>
          <span className={styles.projectName}>{project.revisions[0]!.scene.project.name}</span>
          <span className={styles.projectSub}>Fictional sample project · {head.label} committed</span>
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Revisions and scenarios">
        <button
          type="button"
          className={styles.tab}
          aria-current={activeId === head.id ? 'page' : undefined}
          onClick={() => setActive(head.id)}
        >
          <StatusIcon status={analysisOf(head.scene).status} size={12} />
          <span>{head.id === 'REV-0' ? 'Baseline' : head.label}</span>
          <span className={styles.tabMeta}>{head.id}</span>
        </button>
        {project.scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            className={styles.tab}
            aria-current={activeId === s.id ? 'page' : undefined}
            onClick={() => setActive(s.id)}
            data-lifecycle={s.status}
          >
            <StatusIcon status={analysisOf(s.scene).status} size={12} />
            <span>Revision {s.label}</span>
            <span className={styles.tabMeta}>{LIFECYCLE_LABEL[s.status]}</span>
          </button>
        ))}
        <Button size="sm" variant="quiet" onClick={() => newScenario()} aria-label="New scenario from the committed revision">
          <Plus size={14} aria-hidden="true" /> New scenario
        </Button>
      </nav>

      <div className={styles.headerActions}>
        <Button icon variant="quiet" onClick={undo} disabled={!view.editable || !scenario?.past.length} aria-label="Undo (⌘Z)" title="Undo (⌘Z)">
          <Undo2 size={16} aria-hidden="true" />
        </Button>
        <Button icon variant="quiet" onClick={redo} disabled={!view.editable || !scenario?.future.length} aria-label="Redo (⇧⌘Z)" title="Redo (⇧⌘Z)">
          <Redo2 size={16} aria-hidden="true" />
        </Button>
        <Button
          variant={viewMode === 'compare' ? 'primary' : 'default'}
          onClick={() => setView(viewMode === 'compare' ? 'edit' : 'compare')}
          aria-pressed={viewMode === 'compare'}
          disabled={project.scenarios.length === 0}
        >
          <Columns3 size={15} aria-hidden="true" /> Compare
        </Button>
        {scenario ? (
          <Button variant="accent" onClick={onOpenDecision}>
            {scenario.status === 'draft' ? 'Review' : scenario.status === 'ready_for_review' ? 'Decide' : 'Receipt'}
          </Button>
        ) : null}
        <ExportMenu onOpenImport={onOpenImport} onReset={reset} />
      </div>
    </header>
  );
}
