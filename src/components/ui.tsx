import { useEffect, type ReactNode } from 'react';
import { LEVELS, LEVEL_LABEL, type Level } from '../data/types';

const P: Record<string, ReactNode> = {
  board: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </>
  ),
  today: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  habits: (
    <>
      <path d="M17 3l3 3-3 3" />
      <path d="M4 12v-2a4 4 0 014-4h12" />
      <path d="M7 21l-3-3 3-3" />
      <path d="M20 12v2a4 4 0 01-4 4H4" />
    </>
  ),
  load: <path d="M5 20V12M12 20V5M19 20V9" />,
  closing: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M9 3.5v3M15 3.5v3" />
    </>
  ),
  month: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h2M12 9h2M16 9h0M8 13h2M12 13h2M8 17h2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="9" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0115 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  play: <path d="M8 5v14l11-7z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  spark: <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
};

export function Icon({ name, size = 22, stroke = 1.9, color = 'currentColor' }: { name: keyof typeof P | string; size?: number; stroke?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}

export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52.32 52.32" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#fff" />
      <rect x="29.07" y="1.1" width="22.1" height="22.1" rx="5" fill="none" stroke="#fff" strokeWidth="2.6" />
      <rect x="1.1" y="29.07" width="22.1" height="22.1" rx="5" fill="none" stroke="#fff" strokeWidth="2.6" />
      <rect x="29.07" y="29.07" width="22.1" height="22.1" rx="5" fill="none" stroke="#fff" strokeWidth="2.6" />
    </svg>
  );
}

export function LevelSwitch({ value, onChange, label = 'Level' }: { value: Level | null; onChange: (l: Level) => void; label?: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {LEVELS.map((l) => (
        <button key={l} type="button" role="radio" aria-checked={value === l} className={value === l ? 'on' : ''} onClick={() => onChange(l)}>
          {LEVEL_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

export function LevelChip({ level, children }: { level: Level | null; children?: ReactNode }) {
  return <span className={`chip ${level ?? ''}`}>{children ?? (level ? LEVEL_LABEL[level] : 'Not yet')}</span>;
}

export function Check({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className={`check ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} aria-label={label}>
      {on && <Icon name="check" size={15} stroke={3.2} color="#fff" />}
    </button>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="between" style={{ marginBottom: 14 }}>
          <h2 className="h2">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHead({ over, title, sub, right }: { over?: ReactNode; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="head">
      <div>
        {over && <div className="lbl">{over}</div>}
        <h1 className="h1">{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
