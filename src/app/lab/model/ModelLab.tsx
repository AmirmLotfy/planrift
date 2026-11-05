'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { hingeMap, solveAt } from '@/components/landing/engine';
import { createDrive } from '@/components/scene/drive';
import type { CameraPose } from '@/components/scene/posing';

const noSubscribe = () => () => {};
const WhiteModel = dynamic(() => import('@/components/scene/WhiteModel'), { ssr: false });

/** /lab/model?hinge=3000&from=hero&to=plan&t=0.5&morph=0.5&left=0.35 — QA harness, removed before release. */
export function ModelLab() {
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => null);
  const params = useMemo(() => (search === null ? null : new URLSearchParams(search)), [search]);
  const drive = useMemo(() => createDrive(), []);
  const [hinge, setHinge] = useState<number | null>(null);
  useEffect(() => {
    if (!params) return;
    const left = Number(params.get('left') ?? 0);
    drive.set({
      from: (params.get('from') ?? 'hero') as CameraPose,
      to: (params.get('to') ?? params.get('from') ?? 'hero') as CameraPose,
      t: Number(params.get('t') ?? 0),
      morph: Number(params.get('morph') ?? 0),
      frame: { left, right: 1, top: Number(params.get('top') ?? 0), bottom: Number(params.get('bottom') ?? 1) },
    });
  }, [params, drive]);
  if (!params) return null;
  const mm = hinge ?? Number(params.get('hinge') ?? 1700);
  const frame = solveAt(mm);
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <WhiteModel
        scene={frame.scene}
        analysis={frame.analysis}
        focusRoomId="R-512"
        doorId="D-101"
        drive={drive}
        hingeMap={hingeMap()}
        interactive
        intro={params.get('intro') === '1'}
        quality={params.get('q') === 'low' ? 'low' : 'high'}
        onHingeChange={setHinge}
        ariaLabel="Lab model"
      />
    </div>
  );
}
