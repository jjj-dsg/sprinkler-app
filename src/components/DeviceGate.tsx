import { useEffect, useState } from 'react';
import { Droplets, TabletSmartphone } from 'lucide-react';

// Matches Lumio's device-scope decision (../outdoor lighting/src/components/DeviceGate.jsx):
// tablet + desktop now, phone support as a deliberate follow-on, not shipped half-working.
const BREAKPOINT = 768;

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function DeviceGate({ children }: { children: React.ReactNode }) {
  const width = useWindowWidth();
  const blocked = width < BREAKPOINT;

  // `children` (the whole App tree) stays mounted at all times — only overlaid, never
  // swapped out — so a desktop/iPad user who transiently narrows the window (or a
  // borderline device rotating through the breakpoint) doesn't lose in-progress,
  // un-persisted plan state (drawn zones, placed heads) to a full unmount/remount.
  return (
    <>
      {children}
      {blocked && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 text-center px-8">
          <div className="bg-gradient-to-br from-sky-500 to-emerald-500 p-3 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.35)] mb-6">
            <Droplets className="text-white" size={28} />
          </div>

          <h1 className="text-xl font-bold text-white mb-3 leading-snug">
            SprinklerSmart is optimized for<br />tablet and desktop right now
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs mb-8">
            Phone support is coming soon. Please visit on an iPad or larger screen.
          </p>

          <div className="flex items-center gap-3 w-full max-w-xs mb-8">
            <div className="flex-1 h-px bg-slate-800" />
            <TabletSmartphone className="text-slate-600" size={14} />
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <p className="text-[11px] text-slate-600 uppercase tracking-widest font-semibold">
            SprinklerSmart · Irrigation Design &amp; Water Savings
          </p>
        </div>
      )}
    </>
  );
}
