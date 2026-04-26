import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export function PageLoader() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
      {/* Halo radial subtil derrière le logo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(180,140,70,0.18) 0%, rgba(0,0,0,0) 55%)',
        }}
      />
      {/* Grand logo Immo-rama, sans cercle ni découpe */}
      <img
        src={logoImmoRama}
        alt="Immo-rama.ch"
        fetchPriority="high"
        className="relative z-10 w-[60vw] max-w-[420px] h-auto object-contain animate-pulse"
        style={{ animationDuration: '2.4s' }}
      />
    </div>
  );
}
