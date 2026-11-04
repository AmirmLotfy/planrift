'use client';

import dynamic from 'next/dynamic';
import styles from './canvas.module.css';

/**
 * The only place the studio imports the 3D model. Swapping the renderer means changing this
 * import; the canvas, Split view and mobile Model toggle stay as they are.
 */
const Cutaway = dynamic(() => import('@/components/cutaway/Cutaway').then((m) => m.Cutaway), {
  ssr: false,
  loading: () => <div className={styles.modelLoading}>Loading the 3D model…</div>,
});

export function ModelViewport() {
  return (
    <div className={styles.modelViewport} data-testid="model-viewport">
      <Cutaway />
    </div>
  );
}
