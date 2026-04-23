import { useState } from 'react';
import { Check, Undo2, ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { setDomainStatus } from '../lib/blacklist';

type AddedDomain = {
  domain: string;
  reasoning: string;
};

type Props = {
  added: AddedDomain[];
  scanned: number;
  onContinue: () => void;
};

export function BlacklistReview({ added, scanned, onContinue }: Props) {
  const [status, setStatus] = useState<Record<string, 'active' | 'reverted'>>(
    () => Object.fromEntries(added.map((a) => [a.domain, 'active'])) as Record<string, 'active' | 'reverted'>
  );
  const [pending, setPending] = useState<string | null>(null);

  const toggle = async (domain: string) => {
    const current = status[domain];
    const next = current === 'active' ? 'reverted' : 'active';
    setPending(domain);
    try {
      await setDomainStatus(domain, next);
      setStatus((s) => ({ ...s, [domain]: next }));
    } catch (e) {
      console.error(e);
    } finally {
      setPending(null);
    }
  };

  const activeCount = Object.values(status).filter((s) => s === 'active').length;

  return (
    <div className="fade-enter">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          Scan complete
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mb-2">
          Review new blacklist entries
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Scanned {scanned} {scanned === 1 ? 'domain' : 'domains'} from your CSVs. The
          assistant flagged {added.length} as likely non-contact addresses. Confirm or
          revert each one, then continue to clean your files.
        </p>
      </div>

      {added.length === 0 ? (
        <div className="p-6 rounded-xl border border-slate-200 bg-white text-center">
          <ShieldCheck className="w-6 h-6 text-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-slate-700">
            No new domains to blacklist. Your data looks clean.
          </p>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {added.map((entry) => {
            const isActive = status[entry.domain] === 'active';
            const isPending = pending === entry.domain;
            return (
              <div
                key={entry.domain}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-slate-900' : 'bg-slate-300'
                  }`}
                >
                  {isActive ? (
                    <ShieldAlert className="w-4 h-4 text-white" />
                  ) : (
                    <Undo2 className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-mono text-sm font-medium ${
                        isActive ? 'text-slate-900' : 'text-slate-500 line-through'
                      }`}
                    >
                      {entry.domain}
                    </span>
                    {!isActive && (
                      <span className="text-xs text-slate-500 font-medium">
                        reverted
                      </span>
                    )}
                  </div>
                  {entry.reasoning && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {entry.reasoning}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggle(entry.domain)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 disabled:opacity-50 ${
                    isActive
                      ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isActive ? (
                    <>
                      <Undo2 className="w-3.5 h-3.5" />
                      Revert
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          {activeCount} active of {added.length} flagged
        </p>
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow"
        >
          Continue and clean
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
