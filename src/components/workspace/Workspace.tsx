'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { PlanView } from '@/components/plan/PlanView';
import { useWorkspace } from '@/state/store';
import { AnalysisPanel } from './AnalysisPanel';
import { ComparePanel } from './ComparePanel';
import { DecisionDialog } from './DecisionDialog';
import { ElementTree } from './ElementTree';
import { Guide } from './Guide';
import { Header } from './Header';
import { ImportDialog } from './ImportDialog';
import { Inspector } from './Inspector';
import { LedgerPanel } from './LedgerPanel';
import { LiveRegion, NoticeToast } from './LiveRegion';
import { Timeline } from './Timeline';
import styles from './workspace.module.css';

const Cutaway = dynamic(() => import('@/components/cutaway/Cutaway').then((m) => m.Cutaway), {
  ssr: false,
  loading: () => <div className={styles.cutawayLoading}>Loading 3D cutaway…</div>,
});

export function Workspace() {
  const hydrate = useWorkspace((s) => s.hydrate);
  const hydrated = useWorkspace((s) => s.hydrated);
  const view = useWorkspace((s) => s.view);
  const undo = useWorkspace((s) => s.undo);
  const redo = useWorkspace((s) => s.redo);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <div className={styles.shell} data-hydrated={hydrated ? 'true' : 'false'}>
      <Header onOpenDecision={() => setDecisionOpen(true)} onOpenImport={() => setImportOpen(true)} />
      <Guide onOpenDecision={() => setDecisionOpen(true)} />
      {view === 'compare' ? (
        <main className={styles.compareMain} id="main">
          <ComparePanel onOpenDecision={() => setDecisionOpen(true)} />
        </main>
      ) : (
        <main className={styles.main} id="main">
          <aside className={styles.left} aria-label="Elements and documents">
            <ElementTree />
          </aside>
          <section className={styles.center} aria-label="Plan and 3D cutaway">
            <div className={styles.planArea}>
              <PlanView />
            </div>
            <div className={styles.cutawayArea}>
              <Cutaway />
            </div>
          </section>
          <aside className={styles.right} aria-label="Inspector and consequences">
            <Inspector />
            <AnalysisPanel />
            <LedgerPanel />
          </aside>
          <footer className={styles.bottom}>
            <Timeline />
          </footer>
        </main>
      )}
      <LiveRegion />
      <NoticeToast />
      <DecisionDialog open={decisionOpen} onClose={() => setDecisionOpen(false)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
