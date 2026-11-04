import type { Metadata } from 'next';
import { Workspace } from '@/components/workspace/Workspace';

export const metadata: Metadata = {
  title: 'Interactive demo — Aster House Hotel',
  description: 'Move door D-101 in guest room R-512 and see the computed consequences across the plan, the 3D cutaway and the drawing register.',
};

export default function DemoPage() {
  return <Workspace />;
}
