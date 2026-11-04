'use client';

/**
 * Workspace store. A thin wrapper: every state transition calls a pure domain function.
 * Analysis is derived (memoised by immutable scene identity), never stored.
 */

import { create } from 'zustand';
import { z } from 'zod';
import { analyzeScene, type SceneAnalysis } from '@/domain/analysis/analyze';
import { computeHingeMap, type HingeMap } from '@/domain/analysis/hingeMap';
import { canonicalJson } from '@/domain/io/canonical';
import { importProjectText, serializeProject, type ImportResult } from '@/domain/io/projectFile';
import type { Room, Scene } from '@/domain/model/types';
import {
  acceptScenario,
  applyEdit,
  createScenario,
  discardChanges,
  editScenario,
  evaluateScenario,
  headRevision,
  initialProjectState,
  redo as redoScenario,
  rejectScenario,
  returnToDraft,
  revisionById,
  setRemarks,
  submitForReview,
  undo as undoScenario,
  type DecisionInput,
  type Edit,
  type ProjectState,
  type Scenario,
  type ScenarioEvaluation,
} from '@/domain/revision/scenario';
import { createAsterHouseScene } from '@/domain/seed/asterHouse';

export const STORAGE_KEY = 'planrift.project.v1';
export const UI_STORAGE_KEY = 'planrift.ui.v1';
/** Fixed timestamp for the seed so server and client render identically before hydration. */
export const SEED_TIME = '2026-10-28T09:00:00.000Z';

export type ViewMode = 'edit' | 'compare';

export interface Notice {
  readonly id: number;
  readonly kind: 'info' | 'error';
  readonly text: string;
}

export interface WorkspaceState {
  project: ProjectState;
  /** A scenario ID, or a revision ID for read-only viewing. */
  activeId: string;
  selectedId: string | null;
  preview: { scenarioId: string; edit: Edit } | null;
  view: ViewMode;
  notice: Notice | null;
  hydrated: boolean;
  hydrate(): void;
  select(id: string | null): void;
  setActive(id: string): void;
  setView(view: ViewMode): void;
  newScenario(): string;
  renameScenario(id: string, name: string): void;
  edit(edit: Edit): boolean;
  previewEdit(edit: Edit | null): void;
  commitPreview(): void;
  undo(): void;
  redo(): void;
  discard(): void;
  setRemarks(text: string): void;
  submit(): boolean;
  reopen(): boolean;
  accept(input: DecisionInput): boolean;
  reject(input: Omit<DecisionInput, 'acknowledgedDocuments'>): boolean;
  importText(text: string): ImportResult;
  reset(): void;
  notify(kind: Notice['kind'], text: string): void;
  dismissNotice(): void;
}

const now = () => new Date().toISOString();
let noticeId = 0;

function seedState(): ProjectState {
  return initialProjectState(createAsterHouseScene(), SEED_TIME);
}

const uiSchema = z.strictObject({
  activeId: z.string().max(40),
  selectedId: z.string().max(40).nullable(),
  view: z.enum(['edit', 'compare']),
});

function nextLabel(project: ProjectState): string {
  const used = new Set(project.scenarios.map((s) => s.label));
  for (let i = 0; i < 26; i += 1) {
    const label = String.fromCharCode(65 + i);
    if (!used.has(label)) return label;
  }
  return 'Z';
}

function persist(state: Pick<WorkspaceState, 'project' | 'activeId' | 'selectedId' | 'view'>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeProject(state.project, now()));
    window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ activeId: state.activeId, selectedId: state.selectedId, view: state.view }));
  } catch {
    // Storage may be full or disabled (private mode); the session keeps working in memory.
  }
}

export const useWorkspace = create<WorkspaceState>()((set, get) => {
  const updateScenario = (id: string, fn: (s: Scenario) => { ok: true; value: Scenario } | { ok: false; error: string }): boolean => {
    const { project } = get();
    const scenario = project.scenarios.find((s) => s.id === id);
    if (!scenario) return false;
    const result = fn(scenario);
    if (!result.ok) {
      get().notify('error', result.error);
      return false;
    }
    set({ project: { ...project, scenarios: project.scenarios.map((s) => (s.id === id ? result.value : s)) } });
    return true;
  };
  const updateProject = (fn: (p: ProjectState) => { ok: true; value: ProjectState } | { ok: false; error: string }): boolean => {
    const result = fn(get().project);
    if (!result.ok) {
      get().notify('error', result.error);
      return false;
    }
    set({ project: result.value });
    return true;
  };

  return {
    project: seedState(),
    activeId: 'REV-0',
    selectedId: 'D-101',
    preview: null,
    view: 'edit',
    notice: null,
    hydrated: false,

    hydrate() {
      if (get().hydrated || typeof window === 'undefined') return;
      let project: ProjectState | null = null;
      let ui: z.infer<typeof uiSchema> | null = null;
      let discarded = false;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const result = importProjectText(raw, now());
          if (result.ok && result.kind === 'project') project = result.state;
          else {
            discarded = true;
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
        const rawUi = window.localStorage.getItem(UI_STORAGE_KEY);
        if (rawUi) {
          const parsed = uiSchema.safeParse(JSON.parse(rawUi));
          if (parsed.success) ui = parsed.data;
        }
      } catch {
        discarded = true;
      }
      const nextProject = project ?? get().project;
      const validActive =
        ui && (nextProject.scenarios.some((s) => s.id === ui.activeId) || nextProject.revisions.some((r) => r.id === ui.activeId))
          ? ui.activeId
          : headRevision(nextProject).id;
      set({
        project: nextProject,
        activeId: validActive,
        selectedId: ui?.selectedId ?? get().selectedId,
        view: ui?.view ?? 'edit',
        hydrated: true,
      });
      if (discarded) get().notify('error', 'Saved work in this browser could not be read safely, so the demo started fresh.');
    },

    select(id) {
      set({ selectedId: id });
    },

    setActive(id) {
      set({ activeId: id, preview: null });
    },

    setView(view) {
      set({ view });
    },

    newScenario() {
      const { project } = get();
      const label = nextLabel(project);
      const id = `S-${label}-${Date.now().toString(36)}`;
      const scenario = createScenario({ id, label, name: `Revision ${label}`, source: headRevision(project), now: now() });
      set({ project: { ...project, scenarios: [...project.scenarios, scenario] }, activeId: id, view: 'edit', preview: null });
      return id;
    },

    renameScenario(id, name) {
      const trimmed = name.trim().slice(0, 60);
      if (!trimmed) return;
      updateScenario(id, (s) => ({ ok: true, value: { ...s, name: trimmed, updatedAt: now() } }));
    },

    edit(edit) {
      const { activeId } = get();
      set({ preview: null });
      return updateScenario(activeId, (s) => editScenario(s, edit, now()));
    },

    previewEdit(edit) {
      const { activeId, project } = get();
      if (!edit) {
        set({ preview: null });
        return;
      }
      const scenario = project.scenarios.find((s) => s.id === activeId);
      if (!scenario || scenario.status !== 'draft') return;
      set({ preview: { scenarioId: activeId, edit } });
    },

    commitPreview() {
      const { preview } = get();
      if (!preview) return;
      get().edit(preview.edit);
    },

    undo() {
      updateScenario(get().activeId, (s) => undoScenario(s, now()));
    },

    redo() {
      updateScenario(get().activeId, (s) => redoScenario(s, now()));
    },

    discard() {
      const { project, activeId } = get();
      const scenario = project.scenarios.find((s) => s.id === activeId);
      const source = scenario ? revisionById(project, scenario.sourceRevisionId) : undefined;
      if (!scenario || !source) return;
      updateScenario(activeId, (s) => discardChanges(s, source, now()));
    },

    setRemarks(text) {
      const { project, activeId } = get();
      set({ project: { ...project, scenarios: project.scenarios.map((s) => (s.id === activeId ? setRemarks(s, text, now()) : s)) } });
    },

    submit() {
      return updateProject((p) => submitForReview(p, get().activeId, now()));
    },

    reopen() {
      return updateProject((p) => returnToDraft(p, get().activeId, now()));
    },

    accept(input) {
      const ok = updateProject((p) => acceptScenario(p, get().activeId, input, now()));
      if (ok) get().notify('info', `Accepted. ${headRevision(get().project).label} is now the committed revision.`);
      return ok;
    },

    reject(input) {
      const ok = updateProject((p) => rejectScenario(p, get().activeId, input, now()));
      if (ok) get().notify('info', 'Rejected. The decision and its receipt are recorded.');
      return ok;
    },

    importText(text) {
      const result = importProjectText(text, now());
      if (result.ok) {
        set({ project: result.state, activeId: headRevision(result.state).id, preview: null, view: 'edit', selectedId: null });
        get().notify('info', result.kind === 'scene' ? 'Scene imported as a new baseline.' : 'Project imported.');
      }
      return result;
    },

    reset() {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(UI_STORAGE_KEY);
      } catch {
        // ignore
      }
      set({ project: seedState(), activeId: 'REV-0', selectedId: 'D-101', preview: null, view: 'edit' });
      get().notify('info', 'Demo reset to the Aster House baseline.');
    },

    notify(kind, text) {
      noticeId += 1;
      set({ notice: { id: noticeId, kind, text } });
    },

    dismissNotice() {
      set({ notice: null });
    },
  };
});

// Persist after hydration, debounced.
if (typeof window !== 'undefined') {
  let timer: ReturnType<typeof setTimeout> | undefined;
  useWorkspace.subscribe((state, previous) => {
    if (!state.hydrated) return;
    if (state.project === previous.project && state.activeId === previous.activeId && state.selectedId === previous.selectedId && state.view === previous.view) return;
    clearTimeout(timer);
    timer = setTimeout(() => persist(useWorkspace.getState()), 250);
  });
}

// ---------- Derived data (memoised by immutable identity) ----------

const analysisCache = new WeakMap<Scene, SceneAnalysis>();
export function analysisOf(scene: Scene): SceneAnalysis {
  let analysis = analysisCache.get(scene);
  if (!analysis) {
    analysis = analyzeScene(scene);
    analysisCache.set(scene, analysis);
  }
  return analysis;
}

const hingeMapCache = new Map<string, HingeMap>();
export function hingeMapOf(room: Room, doorId: string, scene: Scene): HingeMap | null {
  const door = room.doors.find((d) => d.id === doorId);
  if (!door) return null;
  // The map is independent of the door's own hinge offset, so drags reuse it.
  const key = canonicalJson({ room: { ...room, doors: room.doors.map((d) => (d.id === doorId ? { ...d, hingeOffsetMm: 0 } : d)) }, settings: scene.settings, doorId });
  let map = hingeMapCache.get(key);
  if (!map) {
    map = computeHingeMap(room, door, scene.settings);
    hingeMapCache.set(key, map);
    if (hingeMapCache.size > 12) hingeMapCache.delete(hingeMapCache.keys().next().value as string);
  }
  return map;
}

const previewCache = new WeakMap<Scene, Map<string, Scene>>();
function sceneWithPreview(scene: Scene, edit: Edit): Scene {
  const key = canonicalJson(edit);
  let byEdit = previewCache.get(scene);
  if (!byEdit) {
    byEdit = new Map();
    previewCache.set(scene, byEdit);
  }
  let next = byEdit.get(key);
  if (!next) {
    const result = applyEdit(scene, edit);
    next = result.ok ? result.value : scene;
    byEdit.clear();
    byEdit.set(key, next);
  }
  return next;
}

export interface ActiveView {
  readonly kind: 'scenario' | 'revision';
  readonly scenario: Scenario | null;
  readonly scene: Scene;
  readonly analysis: SceneAnalysis;
  readonly evaluation: ScenarioEvaluation | null;
  readonly editable: boolean;
  readonly previewing: boolean;
}

const evaluationCache = new WeakMap<Scene, WeakMap<Scenario, ScenarioEvaluation>>();

export function activeView(state: Pick<WorkspaceState, 'project' | 'activeId' | 'preview'>): ActiveView {
  const scenario = state.project.scenarios.find((s) => s.id === state.activeId) ?? null;
  if (!scenario) {
    const revision = revisionById(state.project, state.activeId) ?? headRevision(state.project);
    return { kind: 'revision', scenario: null, scene: revision.scene, analysis: analysisOf(revision.scene), evaluation: null, editable: false, previewing: false };
  }
  const previewing = state.preview?.scenarioId === scenario.id;
  const scene = previewing ? sceneWithPreview(scenario.scene, state.preview!.edit) : scenario.scene;
  const effective: Scenario = scene === scenario.scene ? scenario : { ...scenario, scene };
  let byScenario = evaluationCache.get(scene);
  if (!byScenario) {
    byScenario = new WeakMap();
    evaluationCache.set(scene, byScenario);
  }
  let evaluation = byScenario.get(scenario);
  if (!evaluation) {
    const raw = evaluateScenario(state.project, effective);
    evaluation = { ...raw, scenario, analysis: analysisOf(scene) };
    byScenario.set(scenario, evaluation);
  }
  return {
    kind: 'scenario',
    scenario,
    scene,
    analysis: evaluation.analysis,
    evaluation,
    editable: scenario.status === 'draft',
    previewing,
  };
}
