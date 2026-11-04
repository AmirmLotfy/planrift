/**
 * Document impact ledger. Links between elements and drawings/schedules are authored data
 * (`scene.links`). PLANRIFT never edits those documents; it flags them for human review.
 * REVIEW_REQUIRED is independent of geometric clearance: a clear swing still changes the
 * drawings that show the door.
 */

import type { DependencyLink, DocumentRef, Scene } from '../model/types';
import { describeFieldChange, type SceneDiff } from './diff';

export interface ImpactReason {
  readonly linkId: string;
  readonly elementId: string;
  readonly roomId: string;
  readonly description: string;
  readonly linkNote: string;
}

export interface ImpactRecord {
  readonly documentId: string;
  readonly title: string;
  readonly kind: DocumentRef['kind'];
  readonly revision: string;
  readonly status: 'REVIEW_REQUIRED';
  readonly elementIds: readonly string[];
  readonly reasons: readonly ImpactReason[];
}

function linkTriggers(link: DependencyLink, field: string): boolean {
  const top = field.split('.')[0]!;
  return link.fields.includes('*') || link.fields.includes(top) || link.fields.includes(field);
}

/**
 * Impacts are computed against the scenario's source baseline. Document metadata comes from
 * the baseline scene (the documents as issued), links from the proposed scene.
 */
export function computeImpacts(baseline: Scene, proposal: Scene, diff: SceneDiff): ImpactRecord[] {
  const documents = new Map(baseline.documents.map((d) => [d.id, d]));
  const byDocument = new Map<string, { reasons: ImpactReason[]; elements: string[] }>();
  const add = (link: DependencyLink, roomId: string, description: string) => {
    const entry = byDocument.get(link.documentId) ?? { reasons: [], elements: [] };
    if (!entry.reasons.some((r) => r.linkId === link.id && r.description === description)) {
      entry.reasons.push({ linkId: link.id, elementId: link.elementId, roomId, description, linkNote: link.note });
    }
    if (!entry.elements.includes(link.elementId)) entry.elements.push(link.elementId);
    byDocument.set(link.documentId, entry);
  };
  for (const change of diff.fields) {
    for (const link of proposal.links) {
      if (link.elementId === change.elementId && linkTriggers(link, change.field)) add(link, change.roomId, describeFieldChange(change));
    }
  }
  for (const change of diff.presence) {
    for (const link of [...baseline.links, ...proposal.links]) {
      if (link.elementId === change.elementId) add(link, change.roomId, `${change.elementId} ${change.change}`);
    }
  }
  const order = baseline.documents.map((d) => d.id);
  return [...byDocument.entries()]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([documentId, entry]) => {
      const doc = documents.get(documentId);
      return {
        documentId,
        title: doc?.title ?? documentId,
        kind: doc?.kind ?? 'drawing',
        revision: doc?.revision ?? '—',
        status: 'REVIEW_REQUIRED' as const,
        elementIds: entry.elements,
        reasons: entry.reasons,
      };
    });
}
