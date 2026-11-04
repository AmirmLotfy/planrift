'use client';

/**
 * Live state of the landing-page model, shared between the hero stage (writer) and the site
 * header status capsule (reader). Values always come from the engine via solveAt().
 */

import { create } from 'zustand';
import type { PairStatus } from '@/domain/analysis/analyze';

export interface HeroModelState {
  hingeMm: number;
  status: PairStatus;
  headline: string;
  documentsToReview: number;
  /** 0..1 progress through the hero + story stage (for the header gauge and chapter sync). */
  stageProgress: number;
  set: (patch: Partial<Omit<HeroModelState, 'set'>>) => void;
}

export const useHeroModel = create<HeroModelState>()((set) => ({
  hingeMm: 1700,
  status: 'PASS',
  headline: 'Opens the full 90° without touching furniture.',
  documentsToReview: 0,
  stageProgress: 0,
  set: (patch) => set(patch),
}));
