import { useEffect, useState } from 'react';
import { Clock, Mail, Globe, MapPin, Database, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchProcessingHistory, type ProcessingRun } from '../lib/history';

type Props = {
  userId: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatPill({ icon: Icon, label, value, color }: {
  icon: typeof Mail;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-5 h-5 rounded flex items-center justify-center ${color}`}>
        <Icon className="w-3 h-3" strokeWidth={2} />
      </div>
      <span className="text-xs font-semibold text-slate-800 tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

function RunCard({ run }: { run: ProcessingRun }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all duration-150">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{run.run_name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500">
                {formatDate(run.created_at)} at {formatTime(run.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-xs font-semibold tabular-nums text-slate-700">
            {run.total_ingested.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 ml-1">rows</span>
        </div>
      </div>

      {run.file_names.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {run.file_names.map((f) => (
            <span
              key={f}
              className="inline-block px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-600 truncate max-w-[180px]"
              title={f}
            >
              {f}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-slate-100">
        <StatPill icon={Mail} label="w/ email" value={run.leads_with_email} color="bg-emerald-50 text-emerald-600" />
        <StatPill icon={Globe} label="site, no email" value={run.leads_website_no_email} color="bg-sky-50 text-sky-600" />
        <StatPill icon={MapPin} label="no site" value={run.leads_no_website} color="bg-amber-50 text-amber-600" />
        <StatPill icon={Database} label="total" value={run.master_list_count} color="bg-slate-100 text-slate-600" />
      </div>

      {run.duplicates_removed > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          {run.duplicates_removed.toLocaleString()} duplicate{run.duplicates_removed === 1 ? '' : 's'} removed
        </p>
      )}
    </div>
  );
}

export function HistoryView({ userId }: Props) {
  const [runs, setRuns] = useState<ProcessingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProcessingHistory(userId);
      setRuns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  return (
    <div className="fade-enter">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">History</h2>
          <p className="text-sm text-slate-500 mt-1">
            Your past CSV processing runs
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
          </div>
          <p className="text-sm text-slate-500">Loading history…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No runs yet</h3>
          <p className="text-xs text-slate-500 max-w-xs">
            Once you process a CSV file, your runs will appear here with full stats.
          </p>
        </div>
      )}

      {!loading && !error && runs.length > 0 && (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
