import { useState } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import { generatePdf } from '../lib/pdf';
import type { PdfPlanData } from '../lib/pdf';

interface ProPlanCardProps {
  planData: PdfPlanData;
  /** Fired on checkout click for the monetization funnel (analytics). */
  onInitiate?: () => void;
}

export function ProPlanCard({ planData, onInitiate }: ProPlanCardProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');

  async function handleExport() {
    setStatus('generating');
    onInitiate?.();

    try {
      await generatePdf(planData);
      setStatus('done');
      window.setTimeout(() => setStatus('idle'), 3500);

      // If Stripe is configured, also redirect for the $19 upgrade after PDF lands.
      // (gating the PDF behind payment is the next step once we validate the deliverable)
      const stripePk = import.meta.env.VITE_STRIPE_PK;
      if (stripePk) {
        try {
          const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
          const { url } = await res.json();
          if (url) window.location.href = url;
        } catch {
          // Stripe redirect is optional — PDF was already downloaded
        }
      }
    } catch {
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 4000);
    }
  }

  const hasZones = planData.zones.length > 0;
  const label =
    status === 'generating' ? 'Generating PDF…'
    : status === 'done'     ? 'Blueprint Downloaded!'
    : status === 'error'    ? 'Error — try again'
    : 'Export Pro Plan';

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl shadow-lg p-4">
      <div className="font-bold text-sm flex items-center gap-1.5">
        <Download size={15} />Pro Plan — $19
      </div>
      <p className="text-xs text-slate-300 mt-1">
        PDF blueprint, valve schedule, contractor handoff &amp; {planData.muni.name} rebate paperwork.
      </p>
      {!hasZones && (
        <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
          <FileText size={12} />Draw at least one zone to unlock the PDF export.
        </p>
      )}
      <button
        onClick={handleExport}
        disabled={!hasZones || status === 'generating'}
        aria-label="Export Pro Plan"
        data-testid="export-pro-plan"
        className={`w-full mt-3 font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition
          ${status === 'done'
            ? 'bg-emerald-500 text-white'
            : 'bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-60'}`}
      >
        {status === 'generating'
          ? <><Loader2 size={16} className="animate-spin" />{label}</>
          : status === 'done'
          ? <><Download size={16} />{label}</>
          : label}
      </button>
    </div>
  );
}
