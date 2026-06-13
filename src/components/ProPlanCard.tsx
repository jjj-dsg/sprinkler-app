import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface ProPlanCardProps {
  muniName: string;
  /** Fired on checkout click for the monetization funnel (analytics). */
  onInitiate?: () => void;
}

export function ProPlanCard({ muniName, onInitiate }: ProPlanCardProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    onInitiate?.();
    // TODO: POST /api/checkout → Stripe Checkout session → window.location = url
    // Secret key stays server-side (Vercel function); only the publishable key is client-side.
    setTimeout(() => {
      alert('Stripe Checkout will launch here!');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl shadow-lg p-4">
      <div className="font-bold text-sm flex items-center gap-1.5">
        <Download size={15} />Pro Plan — $19
      </div>
      <p className="text-xs text-slate-300 mt-1">
        PDF blueprint, valve schedule, contractor handoff &amp; {muniName} rebate paperwork.
      </p>
      <button
        onClick={handleCheckout}
        disabled={loading}
        aria-label="Export Pro Plan"
        className="w-full mt-3 bg-white text-slate-900 font-bold text-sm py-2.5 rounded-xl hover:bg-slate-100 disabled:opacity-75 flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : 'Export Pro Plan'}
      </button>
    </div>
  );
}
