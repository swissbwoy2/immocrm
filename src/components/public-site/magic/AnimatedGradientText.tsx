import { cn } from '@/lib/utils';

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGradientText({ children, className }: AnimatedGradientTextProps) {
  return (
    <div
      className={cn(
        'group relative mx-auto flex max-w-fit flex-row items-center justify-center rounded-2xl bg-[hsl(38_45%_48%/0.08)] px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_hsl(38_45%_48%/0.1)] backdrop-blur-sm transition-shadow duration-500 ease-out [--bg-size:300%] hover:shadow-[inset_0_-5px_10px_hsl(38_45%_48%/0.2)]',
        className
      )}
    >
      <div
        className="absolute inset-0 block h-full w-full animate-gradient bg-gradient-to-r from-[hsl(38_55%_65%/0.5)] via-[hsl(38_45%_48%/0.5)] to-[hsl(28_35%_38%/0.5)] bg-[length:var(--bg-size)_100%] p-[1px] ![mask-composite:subtract] [border-radius:inherit] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]"
      />
      {children}
    </div>
  );
}
