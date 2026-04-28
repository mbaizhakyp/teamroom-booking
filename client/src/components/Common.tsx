/* ============================================================
   COMMON UI · shared bits used across pages
   ============================================================ */

import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export function Meander({ thin = false, style }: { thin?: boolean; style?: CSSProperties }) {
  return <div className={'meander' + (thin ? ' thin' : '')} style={style} />;
}

export function Pediment({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="pediment rise">
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="display">{title}</h1>
      {sub && <div className="italic muted" style={{ fontSize: 20, maxWidth: 640, textAlign: 'center' }}>{sub}</div>}
      <div className="pediment-rule"><Meander /></div>
    </div>
  );
}

export function Surface({ children, style, className = '' }: {
  children: ReactNode; style?: CSSProperties; className?: string;
}) {
  return (
    <div className={'surface surface-corners-all ' + className} style={style}>
      <span className="corner tl" /><span className="corner tr" />
      <span className="corner bl" /><span className="corner br" />
      {children}
    </div>
  );
}

export function StatusPip({ status }: { status: string }) {
  return <span className={'pip ' + status.toLowerCase()}>{status}</span>;
}

export function Toast({ msg, kind, onDone }: { msg: string | null; kind?: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  return <div className={'toast ' + (kind || '')}>{msg}</div>;
}

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark" />
      <span>Bibliotheca · Synedrion</span>
    </div>
  );
}
