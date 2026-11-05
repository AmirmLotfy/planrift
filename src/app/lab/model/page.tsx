import type { Metadata } from 'next';
import { ModelLab } from './ModelLab';

export const metadata: Metadata = { title: 'Lab · model', robots: { index: false, follow: false } };

export default function ModelLabPage() {
  return <ModelLab />;
}
