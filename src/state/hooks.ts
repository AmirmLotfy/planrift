'use client';

import { useMemo } from 'react';
import { activeView, useWorkspace, type ActiveView } from './store';

export function useActiveView(): ActiveView {
  const project = useWorkspace((s) => s.project);
  const activeId = useWorkspace((s) => s.activeId);
  const preview = useWorkspace((s) => s.preview);
  return useMemo(() => activeView({ project, activeId, preview }), [project, activeId, preview]);
}
