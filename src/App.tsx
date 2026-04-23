import { useState } from 'react';
import { Filter, AlertCircle, Loader2 } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { ResultsSummary } from './components/ResultsSummary';
import { BlacklistReview } from './components/BlacklistReview';
import {
  ingestFiles,
  collectUniqueDomains,
  finalizeRows,
  type NormalizedRow,
  type ProcessedResult,
} from './lib/csvProcessor';

import {
  fetchActiveBlacklist,
  scanDomains,
  type ScanResult,
} from './lib/blacklist';

type Stage = 'upload' | 'scanning' | 'review' | 'finalizing' | 'results';

function App() {
  const [stage, setStage] = useState<Stage>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<NormalizedRow[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError(null);
    setStage('scanning');
    try {
      const ingested = await ingestFiles(files);
      setRows(ingested.rows);
      setSourceColumns(ingested.sourceColumns);

      const domains = collectUniqueDomains(ingested.rows);
      const scanResult = await scanDomains(domains);
      setScan(scanResult);
      setStage('review');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(`Scan failed: ${message}`);
      setStage('upload');
    }
  };

  const handleContinue = async () => {
    setStage('finalizing');
    try {
      const blacklist = await fetchActiveBlacklist();
      const r = finalizeRows(rows, blacklist, sourceColumns);
      setResult(r);
      setStage('results');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setError(`Failed to clean files: ${message}`);
      setStage('review');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setRows([]);
    setSourceColumns([]);
    setScan(null);
    setResult(null);
    setError(null);
    setStage('upload');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <header className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <Filter className="w-5 h-5 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
              Lead CSV Processor
            </h1>
            <p className="text-xs text-slate-500">
              Clean, dedupe, and split scraped lead lists
            </p>
          </div>
        </header>

        <main>
          {stage === 'upload' && (
            <div className="fade-enter">
              <div className="mb-8">
                <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-3">
                  Turn messy scraper output<br />into outreach-ready lists.
                </h2>
                <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                  Upload one or more CSVs from your Google Maps scraper. We'll scan
                  for junk email domains, let you approve the blacklist additions,
                  then dedupe, sort, and split into download-ready buckets.
                </p>
              </div>

              <FileUpload
                files={files}
                onFilesChange={setFiles}
                onProcess={handleProcess}
                processing={false}
              />

              {error && (
                <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">{error}</div>
                </div>
              )}
            </div>
          )}

          {stage === 'scanning' && <LoadingStage label="Scanning email domains..." />}

          {stage === 'review' && scan && (
            <BlacklistReview
              added={scan.added}
              scanned={scan.scanned}
              onContinue={handleContinue}
            />
          )}

          {stage === 'finalizing' && <LoadingStage label="Cleaning your files..." />}

          {stage === 'results' && result && (
            <div className="fade-enter">
              <ResultsSummary result={result} onReset={handleReset} />
            </div>
          )}
        </main>

        <footer className="mt-16 pt-8 border-t border-slate-200">
          <p className="text-xs text-slate-500 leading-relaxed">
            Domain scanning uses a secure edge function. CSV contents stay in your
            browser; only the list of email domains is sent for classification.
          </p>
        </footer>
      </div>
    </div>
  );
}

function LoadingStage({ label }: { label: string }) {
  return (
    <div className="fade-enter flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4">
        <Loader2 className="w-5 h-5 text-white animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <p className="text-xs text-slate-500 mt-1">This usually takes a few seconds</p>
    </div>
  );
}

export default App;
