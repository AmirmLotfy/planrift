import { continueRender, delayRender, staticFile } from 'remotion';

/** Same tokens as the product (src/app/globals.css). */
export const C = {
  paper: '#F6F6F3',
  sheet: '#FFFFFF',
  ink: '#111315',
  ink2: '#4A5057',
  ink3: '#6A7076',
  rule: '#E3E4DF',
  rule2: '#CFD1CB',
  grip: '#2F5BFF',
  gripInk: '#2448D8',
  gripTint: '#EDF1FF',
  red: '#FF4A1C',
  redInk: '#C6300B',
  redTint: '#FFEDE7',
  pass: '#0E9F5A',
  passInk: '#0A7A45',
  amber: '#E8A600',
  hi: '#FFE14D',
  furniture: '#E8E5DC',
};

export const SANS = "'Instrument Sans', ui-sans-serif, system-ui, sans-serif";
export const MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

const faces: [string, string, FontFaceDescriptors][] = [
  [
    'Instrument Sans',
    'fonts/instrument-sans-latin-wdth-normal.woff2',
    { weight: '400 700', stretch: '75% 100%' },
  ],
  ['IBM Plex Mono', 'fonts/ibm-plex-mono-latin-400-normal.woff2', { weight: '400' }],
  ['IBM Plex Mono', 'fonts/ibm-plex-mono-latin-500-normal.woff2', { weight: '500' }],
  ['IBM Plex Mono', 'fonts/ibm-plex-mono-latin-600-normal.woff2', { weight: '600' }],
];

if (typeof document !== 'undefined') {
  const handle = delayRender('fonts');
  Promise.all(
    faces.map(([family, file, desc]) => {
      const face = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, desc);
      document.fonts.add(face);
      return face.load();
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}
