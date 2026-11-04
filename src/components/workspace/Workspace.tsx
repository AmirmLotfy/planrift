'use client';

import { useCallback, useEffect, useState } from 'react';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { Canvas, type CanvasMode, type PlanExtent } from './Canvas';
import { CoachCard, useCoach } from './Coach';
import { CompareSheet } from './CompareSheet';
import { DecisionDialog } from './DecisionDialog';
import { ImportDialog } from './ImportDialog';
import { Inspector, type InspectorTab } from './Inspector';
import { LayersRail } from './LayersRail';
import { LiveRegion, NoticeToast } from './LiveRegion';
import { Sheet } from './Sheet';
import { StatusStrip } from './StatusStrip';
import { Timeline } from './Timeline';
import { TopBar } from './TopBar';
import { DESKTOP_QUERY, MOBILE_QUERY, WIDE_DESKTOP_QUERY, matches, useMediaQuery } from './useMediaQuery';
import styles from './shell.module.css';

/** 'auto' lets CSS decide (expanded on wide desktops) until the user toggles the rail. */
type LayersState = 'auto' | 'open' | 'closed';

export function Workspace() {
  const hydrate = useWorkspace((s) => s.hydrate);
  const hydrated = useWorkspace((s) => s.hydrated);
  const viewMode = useWorkspace((s) => s.view);
  const activeId = useWorkspace((s) => s.activeId);
  const undo = useWorkspace((s) => s.undo);
  const redo = useWorkspace((s) => s.redo);
  const view = useActiveView();
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [mode, setMode] = useState<CanvasMode>('plan');
  const [extent, setExtent] = useState<PlanExtent>('room');
  const [layers, setLayers] = useState<LayersState>('auto');
  const [layersSheet, setLayersSheet] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [tab, setTab] = useState<InspectorTab>('position');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const desktop = useMediaQuery(DESKTOP_QUERY, true);
  const wide = useMediaQuery(WIDE_DESKTOP_QUERY, true);
  const mobile = useMediaQuery(MOBILE_QUERY);
  const openDecision = useCallback(() => setDecisionOpen(true), []);
  const coach = useCoach(openDecision);

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

  const railExpanded = desktop ? (layers === 'auto' ? wide : layers === 'open') : layersSheet;
  const toggleLayers = () => {
    if (matches(DESKTOP_QUERY)) setLayers(railExpanded ? 'closed' : 'open');
    else setLayersSheet(true);
  };
  const readOnlyLabel = view.editable
    ? null
    : view.kind === 'revision'
      ? `${activeId} · read-only`
      : `Revision ${view.scenario?.label ?? ''} · locked`;

  return (
    <div className={styles.shell} data-hydrated={hydrated ? 'true' : 'false'}>
      <h1 className="visually-hidden">PLANRIFT studio — {view.scene.project.name}</h1>
      <TopBar onOpenDecision={openDecision} onOpenImport={() => setImportOpen(true)} />

      {viewMode === 'compare' ? (
        <main className={styles.compareMain} id="main">
          <CompareSheet onOpenDecision={openDecision} />
        </main>
      ) : (
        <main
          className={styles.body}
          id="main"
          data-layers={layers}
          data-inspector={inspectorOpen ? 'open' : 'closed'}
          data-sheet={sheetExpanded ? 'expanded' : 'docked'}
        >
          <aside className={styles.layers} aria-label="Layers" data-expanded={railExpanded ? 'true' : 'false'}>
            <h2 className={styles.railTitle}>Layers</h2>
            <LayersRail />
          </aside>

          <Canvas
            mode={mode}
            onMode={setMode}
            extent={extent}
            onExtent={setExtent}
            layersExpanded={railExpanded}
            onToggleLayers={toggleLayers}
            inspectorOpen={inspectorOpen}
            onToggleInspector={() => setInspectorOpen((v) => !v)}
            coach={!mobile && coach.visible ? <CoachCard coach={coach} /> : null}
            readOnlyLabel={readOnlyLabel}
          />

          <StatusStrip />

          <aside className={styles.inspectorPane} aria-label="Inspector">
            <button
              type="button"
              className={styles.sheetHandle}
              onClick={() => setSheetExpanded((v) => !v)}
              aria-expanded={sheetExpanded}
              aria-label={sheetExpanded ? 'Collapse the panel' : 'Expand the panel'}
            >
              <span aria-hidden="true" className={styles.sheetGripBar} />
            </button>
            <Inspector
              tab={tab}
              onTab={setTab}
              onOpenDecision={openDecision}
              coach={mobile && coach.visible ? <CoachCard coach={coach} variant="row" /> : null}
            />
          </aside>

          <footer className={styles.timelineBar}>
            <Timeline />
          </footer>
        </main>
      )}

      <Sheet open={layersSheet} title="Layers" onClose={() => setLayersSheet(false)}>
        <LayersRail onPicked={() => setLayersSheet(false)} />
      </Sheet>
      <LiveRegion />
      <NoticeToast />
      <DecisionDialog open={decisionOpen} onClose={() => setDecisionOpen(false)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
