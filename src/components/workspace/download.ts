'use client';

/** Triggers a client-side download of generated text. No network involved. */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugDate(iso = new Date().toISOString()): string {
  return iso.slice(0, 16).replace(/[:T]/g, '-');
}
