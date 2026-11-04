'use client';

import { useState } from 'react';
import { Button, Dialog, fieldStyles } from '@/components/ui/primitives';
import { MAX_IMPORT_BYTES } from '@/domain/io/projectFile';
import { useWorkspace } from '@/state/store';
import styles from './workspace.module.css';

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importText = useWorkspace((s) => s.importText);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    setErrors([]);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setErrors([`File is larger than ${MAX_IMPORT_BYTES / 1_000_000} MB.`]);
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const result = importText(text);
      if (result.ok) {
        onClose();
      } else {
        setErrors(result.errors);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      title="Import a PLANRIFT file"
      onClose={() => {
        setErrors([]);
        onClose();
      }}
      footer={<Button onClick={onClose}>Cancel</Button>}
    >
      <p className={styles.muted}>
        Accepts a project file (<span className="mono">planrift.project</span>) exported from PLANRIFT, or a single scene (
        <span className="mono">planrift.scene</span>). Files are validated in your browser and never uploaded. Importing replaces the current
        project in this browser.
      </p>
      <div className={fieldStyles.field}>
        <label htmlFor="import-file" className={fieldStyles.fieldLabel}>
          JSON file
        </label>
        <input id="import-file" type="file" accept="application/json,.json" disabled={busy} onChange={(e) => void onFile(e.target.files?.[0])} data-testid="import-file" />
      </div>
      {errors.length ? (
        <div role="alert" className={styles.blockers}>
          <p>
            <strong>The file was not imported.</strong> Your current project is unchanged.
          </p>
          <ul>
            {errors.map((e) => (
              <li key={e} className="mono">
                {e}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Dialog>
  );
}
