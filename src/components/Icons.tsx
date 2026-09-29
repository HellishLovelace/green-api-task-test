import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true } as const;
const stroke = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const LogoIcon = (p: P) => (
  <svg {...base} viewBox="0 0 64 64" {...p}>
    <defs>
      <linearGradient id="maxLogo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3D7BFF" />
        <stop offset="1" stopColor="#9B4DFF" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="18" fill="url(#maxLogo)" />
    <path d="M20 44V22l12 12 12-12v22" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SendIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12 20 4l-5 16-3-7-8-1Z" fill="currentColor" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path {...stroke} strokeWidth={2.4} d="M12 5v14M5 12h14" />
  </svg>
);

export const LogoutIcon = (p: P) => (
  <svg {...base} {...p}>
    <path {...stroke} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const BackIcon = (p: P) => (
  <svg {...base} {...p}>
    <path {...stroke} d="M15 18l-6-6 6-6" />
  </svg>
);

export const EyeIcon = ({ off, ...p }: P & { off?: boolean }) => (
  <svg {...base} {...p}>
    <path {...stroke} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle {...stroke} cx="12" cy="12" r="3" />
    {off && <path {...stroke} d="M3 3l18 18" />}
  </svg>
);

/** Галочки статуса исходящего сообщения */
export const TicksIcon = ({ double, ...p }: P & { double?: boolean }) => (
  <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden {...p}>
    <path d="M1 5.5 4.5 9 11 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    {double && (
      <path
        d="M8 8.2 8.8 9 15 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const AlertIcon = (p: P) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden {...p}>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="M12 7v6M12 16.5v.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const ChatBubblesIcon = (p: P) => (
  <svg {...base} viewBox="0 0 64 64" {...p}>
    <path
      d="M10 14a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H24l-9 7v-7h1a6 6 0 0 1-6-6V14Z"
      fill="currentColor"
      opacity=".35"
    />
    <path
      d="M24 30a6 6 0 0 1 6-6h18a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6h-1v7l-9-7h-8a6 6 0 0 1-6-6V30Z"
      fill="currentColor"
    />
  </svg>
);
