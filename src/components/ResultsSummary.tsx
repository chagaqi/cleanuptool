import {
  Mail,
  Globe,
  MapPin,
  Database,
  Download,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import {
  downloadCsv,
  toFullCsv,
  toOutreachCsv,
  type ProcessedResult,
} from '../lib/csvProcessor';

type Props = {
  result: ProcessedResult;
  onReset: () => void;
};

type CardConfig = {
  key: string;
  title: string;
  filename: string;
  description: string;
  Icon: typeof Mail;
  accent: string;
  iconBg: string;
  count: number;
  onDownload: () => void;
};

export function ResultsSummary({ result, onReset }: Props) {
  const cards: CardConfig[] = [
    {
      key: 'with-email',
      title: 'Leads with Email',
      filename: 'Leads_With_Email.csv',
      description: 'Ready for Instantly import',
      Icon: Mail,
      accent: 'text-emerald-700',
      iconBg: 'bg-emerald-50 text-emerald-600',
      count: result.leadsWithEmail.length,
      onDownload: () =>
        downloadCsv(
          'Leads_With_Email.csv',
          toOutreachCsv(result.leadsWithEmail)
        ),
    },
    {
      key: 'website-no-email',
      title: 'Website, No Email',
      filename: 'Leads_Website_No_Email.csv',
      description: 'For manual outreach',
      Icon: Globe,
      accent: 'text-sky-700',
      iconBg: 'bg-sky-50 text-sky-600',
      count: result.leadsWebsiteNoEmail.length,
      onDownload: () =>
        downloadCsv(
          'Leads_Website_No_Email.csv',
          toFullCsv(result.leadsWebsiteNoEmail, result.sourceColumns)
        ),
    },
    {
      key: 'no-website',
      title: 'No Website',
      filename: 'Leads_No_Website.csv',
      description: 'Unsuitable for email campaigns',
      Icon: MapPin,
      accent: 'text-amber-700',
      iconBg: 'bg-amber-50 text-amber-600',
      count: result.leadsNoWebsite.length,
      onDownload: () =>
        downloadCsv('Leads_No_Website.csv', toFullCsv(result.leadsNoWebsite, result.sourceColumns)),
    },
    {
      key: 'master',
      title: 'Master List',
      filename: 'Master_List.csv',
      description: 'All cleaned leads combined',
      Icon: Database,
      accent: 'text-slate-800',
      iconBg: 'bg-slate-100 text-slate-700',
      count: result.masterList.length,
      onDownload: () =>
        downloadCsv('Master_List.csv', toFullCsv(result.masterList, result.sourceColumns)),
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Processing complete
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Your leads have been cleaned, deduplicated, and split into categories.
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Start over
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Total Ingested
          </div>
          <div className="text-3xl font-semibold text-slate-900 tabular-nums">
            {result.totalIngested.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">rows across all files</div>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Duplicates Removed
          </div>
          <div className="text-3xl font-semibold text-slate-900 tabular-nums">
            {result.duplicatesRemoved.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            by Company + Email match
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
          Output files
        </h3>
        <div className="grid gap-3">
          {cards.map((card) => {
            const Icon = card.Icon;
            const disabled = card.count === 0;
            return (
              <div
                key={card.key}
                className={`
                  group flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-xl
                  transition-all duration-150
                  ${disabled ? 'opacity-60' : 'hover:border-slate-300 hover:shadow-sm'}
                `}
              >
                <div
                  className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${card.iconBg}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-base font-semibold text-slate-900">
                      {card.title}
                    </h4>
                    <span className={`text-sm font-semibold tabular-nums ${card.accent}`}>
                      {card.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500">
                      lead{card.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {card.description} &middot; <span className="font-mono">{card.filename}</span>
                  </div>
                </div>
                <button
                  onClick={card.onDownload}
                  disabled={disabled}
                  className={`
                    inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-150 flex-shrink-0
                    ${
                      disabled
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
                    }
                  `}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
