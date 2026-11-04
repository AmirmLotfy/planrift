'use client';

import { useId, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button, Dialog } from '@/components/ui/primitives';
import { MAX_IMPORT_BYTES } from '@/domain/io/projectFile';
import { useWorkspace } from '@/state/store';
import styles from './dialogs.module.css';

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importText = useWorkspace((s) => s.importText);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const hintId = useId();

  const onFile = async (file: File | undefined) => {
    setErrors([]);
    setFileName(file?.name ?? '');
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
        setFileName('');
        onClose();
      } else {
        setErrors(result.errors);
      }
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setErrors([]);
    setFileName('');
    onClose();
  };

  return (
    <Dialog open={open} title="Import a PLANRIFT file" onClose={close} footer={<div className={styles.footer}><span className={styles.spacer} /><Button onClick={close}>Cancel</Button></div>}>
      <div className={styles.body} data-dialog="import">
        <p className={styles.lead}>
          Accepts a project file (<span className="mono">planrift.project</span>) exported from PLANRIFT, or a single scene (
          <span className="mono">planrift.scene</span>). Files are validated in your browser and never uploaded.
        </p>
        <label className={styles.drop} data-busy={busy ? 'true' : 'false'}>
          <Upload size={18} aria-hidden="true" />
          <span className={styles.dropTitle}>{fileName || 'Choose a JSON file'}</span>
          <span className={styles.dropHint} id={hintId}>
            {busy ? 'Validating…' : `Up to ${MAX_IMPORT_BYTES / 1_000_000} MB · replaces the project in this browser`}
          </span>
          <input
            id="import-file"
            type="file"
            accept="application/json,.json"
            disabled={busy}
            aria-describedby={hintId}
            className={styles.fileInput}
            onChange={(e) => void onFile(e.target.files?.[0])}
            data-testid="import-file"
          />
        </label>
        {errors.length ? (
          <div role="alert" className={styles.blockers}>
            <p className={styles.blockersLabel}>
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
      </div>
    </Dialog>
  );
}
