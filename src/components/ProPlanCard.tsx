import { useState } from 'react';
import { Download, Loader2, FileText, CreditCard } from 'lucide-react';
import { generatePdf } from '../lib/pdf';
import type { PdfPlanData } from '../lib/pdf';
import { savePendingPlan } from '../lib/planStorage';
import { isNativeApp } from '../lib/platform';
import { isNativeEntitlementActive, purchaseNative, restoreNative } from '../lib/billing';

interface ProPlanCardProps {
  planData: PdfPlanData;
  onInitiate?: () => void;
}

export function ProPlanCard({ planData, onInitiate }: ProPlanCardProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'redirecting' | 'done' | 'error'>('idle');

  const gated = Boolean(import.meta.env.VITE_STRIPE_PK);
  const native = isNativeApp();

  async function handleExport() {
    onInitiate?.();
    if (!native) {
      setStatus(gated ? 'redirecting' : 'generating');
    }

    try {
      if (native) {
        const active = await isNativeEntitlementActive();
        if (active) {
          setStatus('generating');
          await generatePdf(planData);
          setStatus('done');
          window.setTimeout(() => setStatus('idle'), 3500);
        } else {
          const purchased = await purchaseNative();
          if (purchased) {
            setStatus('generating');
            await generatePdf(planData);
            setStatus('done');
            window.setTimeout(() => setStatus('idle'), 3500);
          } else {
            setStatus('idle'); // cancelled or not entitled — not an error
          }
        }
      } else if (gated) {
        savePendingPlan(planData);
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`checkout ${res.status}`);
        const { url } = (await res.json()) as { url: string };
        if (!url) throw new Error('no checkout url');
        window.location.href = url;
        // Navigation in progress — leave in 'redirecting' state
      } else {
        await generatePdf(planData);
        setStatus('done');
        window.setTimeout(() => setStatus('idle'), 3500);
      }
    } catch {
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 4000);
    }
  }

  async function handleRestore() {
    const active = await restoreNative();
    if (active) {
      setStatus('generating');
      try {
        await generatePdf(planData);
        setStatus('done');
      } catch {
        setStatus('error');
      }
      window.setTimeout(() => setStatus('idle'), 3500);
    }
  }

  const hasZones = planData.zones.length > 0;
  const busy = status === 'generating' || status === 'redirecting';

  const label =
    status === 'generating'   ? 'Generating PDF…'
    : status === 'redirecting' ? 'Redirecting to checkout…'
    : status === 'done'        ? 'Blueprint Downloaded!'
    : status === 'error'       ? 'Error — try again'
    : gated || native          ? 'Get PDF Blueprint — $19'
    : 'Export Pro Plan';

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl shadow-lg p-4">
      <div className="flex items-center justify-between">
        <div className="font-bold text-sm flex items-center gap-1.5">
          {gated || native ? <CreditCard size={15} /> : <Download size={15} />}Pro Plan — $19
        </div>
        {native && (
          <button
            onClick={handleRestore}
            disabled={!hasZones || busy}
            className="text-[10px] text-slate-400 hover:text-white underline-offset-2 hover:underline transition disabled:opacity-50 disabled:hover:text-slate-400 disabled:hover:no-underline"
          >
            Restore Purchases
          </button>
        )}
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
        disabled={!hasZones || busy}
        aria-label="Export Pro Plan"
        data-testid="export-pro-plan"
        className={`w-full mt-3 font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition
          ${status === 'done'
            ? 'bg-emerald-500 text-white'
            : 'bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-60'}`}
      >
        {busy
          ? <><Loader2 size={16} className="animate-spin" />{label}</>
          : status === 'done'
          ? <><Download size={16} />{label}</>
          : label}
      </button>
    </div>
  );
}
