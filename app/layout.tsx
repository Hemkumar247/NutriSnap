import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'NutriSnap',
  description: 'AI-powered nutrition tracker',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nutrisnap_theme');var r=document.documentElement;r.classList.remove('light','dark');if(t==='light'||t==='dark'){r.classList.add(t);}else{r.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
