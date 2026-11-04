import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/instrument-sans/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'PLANRIFT — See what a design change breaks before you approve it',
    template: '%s · PLANRIFT',
  },
  description:
    'PLANRIFT is an architecture revision consequence studio. Move a door, test the clearance, reveal affected drawings, compare alternatives and approve with evidence.',
  applicationName: 'PLANRIFT',
  openGraph: {
    title: 'PLANRIFT — Architecture revision consequence studio',
    description: 'One change. Every consequence. Rehearse a revision, compute its geometric consequences and record the decision.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#f6f6f3',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
