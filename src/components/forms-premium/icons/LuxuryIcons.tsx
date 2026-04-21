import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' });
const stroke = { stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function IconUser({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><circle cx="12" cy="8" r="4" {...stroke}/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" {...stroke}/></svg>;
}

export function IconHome({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" {...stroke}/><path d="M9 21V12h6v9" {...stroke}/></svg>;
}

export function IconKey({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><circle cx="7.5" cy="11.5" r="4.5" {...stroke}/><circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" opacity=".5"/><path d="M11.5 11.5H20M17 11.5V14M14 11.5V13.5" {...stroke}/></svg>;
}

export function IconShield({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" {...stroke}/><path d="M9 12l2 2 4-4" {...stroke}/></svg>;
}

export function IconStar({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" {...stroke}/></svg>;
}

export function IconDiamond({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M2 9l3-6h14l3 6-10 12L2 9zM2 9h20M7 3l-2 6 7 12M17 3l2 6-7 12" {...stroke}/></svg>;
}

export function IconBuilding({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><rect x="3" y="2" width="12" height="20" rx="1" {...stroke}/><rect x="15" y="8" width="6" height="14" rx="1" {...stroke}/><path d="M7 6h4M7 10h4M7 14h4M7 18h4" {...stroke}/></svg>;
}

export function IconDocument({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" {...stroke}/><path d="M14 2v6h6M8 12h8M8 16h5" {...stroke}/></svg>;
}

export function IconSignature({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M3 17c3-1 6-4 8-7s2-5 0-5-3 3-2 6 3 5 6 6 5 0 6-2" {...stroke}/><path d="M17 17l4 0M3 21h18" {...stroke}/></svg>;
}

export function IconCamera({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" {...stroke}/><circle cx="12" cy="13" r="4" {...stroke}/></svg>;
}

export function IconLock({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><rect x="3" y="11" width="18" height="11" rx="2" {...stroke}/><path d="M7 11V7a5 5 0 0110 0v4" {...stroke}/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>;
}

export function IconMail({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><rect x="2" y="4" width="20" height="16" rx="2" {...stroke}/><path d="M2 4l10 9 10-9" {...stroke}/></svg>;
}

export function IconPhone({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" {...stroke}/></svg>;
}

export function IconMapPin({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" {...stroke}/><circle cx="12" cy="10" r="3" {...stroke}/></svg>;
}

export function IconWallet({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><rect x="1" y="4" width="22" height="16" rx="2" {...stroke}/><path d="M1 10h22" {...stroke}/><circle cx="16" cy="15" r="1" fill="currentColor"/></svg>;
}

export function IconCalendar({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><rect x="3" y="4" width="18" height="18" rx="2" {...stroke}/><path d="M16 2v4M8 2v4M3 10h18" {...stroke}/></svg>;
}

export function IconSearch({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><circle cx="11" cy="11" r="8" {...stroke}/><path d="M21 21l-4.35-4.35" {...stroke}/></svg>;
}

export function IconCheck({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M20 6L9 17l-5-5" {...stroke} strokeWidth={2}/></svg>;
}

export function IconArrowRight({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M5 12h14M12 5l7 7-7 7" {...stroke}/></svg>;
}

export function IconArrowLeft({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M19 12H5M12 19l-7-7 7-7" {...stroke}/></svg>;
}

export function IconUpload({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" {...stroke}/><path d="M17 8l-5-5-5 5M12 3v12" {...stroke}/></svg>;
}

export function IconLoader({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p} className={`animate-spin ${p.className ?? ''}`}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" {...stroke}/></svg>;
}

export function IconHammer({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M15 12l-8.5 8.5a2.12 2.12 0 01-3-3L12 9" {...stroke}/><path d="M17.64 15L22 10.64 17.36 6 13 10.36 17.64 15z" {...stroke}/></svg>;
}

export function IconEye({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...stroke}/><circle cx="12" cy="12" r="3" {...stroke}/></svg>;
}

export function IconEyeOff({ size = 20, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" {...stroke}/><path d="M1 1l22 22" {...stroke}/></svg>;
}
