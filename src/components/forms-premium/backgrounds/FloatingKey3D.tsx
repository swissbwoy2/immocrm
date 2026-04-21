import { useEffect, useState } from 'react';

export function FloatingKey3D() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isMobile && !reducedMotion) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-24 right-6 z-30 pointer-events-none select-none"
      style={{
        animation: 'floatKey 4s ease-in-out infinite',
        filter: 'drop-shadow(0 0 12px hsl(38 45% 48% / 0.35))',
      }}
    >
      <style>{`
        @keyframes floatKey {
          0%, 100% { transform: translateY(0px) rotateZ(-5deg) rotateX(10deg); }
          50% { transform: translateY(-12px) rotateZ(5deg) rotateX(-5deg); }
        }
      `}</style>
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.45 }}
      >
        <circle
          cx="7.5"
          cy="10.5"
          r="4.5"
          stroke="hsl(38 55% 65%)"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="7.5" cy="10.5" r="1.5" fill="hsl(38 55% 65%)" opacity="0.6" />
        <path
          d="M11.5 10.5H20M17 10.5V13M14 10.5V12.5"
          stroke="hsl(38 55% 65%)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
