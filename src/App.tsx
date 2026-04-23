import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { supabase } from './lib/supabase';
import { signOut, ensureProfile } from './lib/auth';
import { saveProcessingRun } from './lib/history';

import { AuthScreen } from './components/AuthScreen';
import { Sidebar, type NavTab } from './components/Sidebar';
import { FileUpload } from './components/FileUpload';
import { ResultsSummary } from './components/ResultsSummary';
import { BlacklistReview } from './components/BlacklistReview';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';

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
type AuthState = 'loading' | 'unauthenticated' | 'authenticated';

function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('cleaner');

  // CSV pipeline state
  const [stage, setStage] = useState<Stage>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<NormalizedRow[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setAuthState(u ? 'authenticated' : 'unauthenticated');
      if (u) ensureProfile(u.id).catch(() => null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setAuthState(u ? 'authenticated' : 'unauthenticated');
      if (u) ensureProfile(u.id).catch(() => null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    handleReset();
    setActiveTab('cleaner');
  };

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
      setError(`Scan failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
      if (user) {
        saveProcessingRun(user.id, files.map((f) => f.name), r).catch(() => null);
      }
    } catch (e) {
      setError(`Failed to clean files: ${e instanceof Error ? e.message : 'Unknown error'}`);
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

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <AuthScreen onAuth={() => setAuthState('authenticated')} />;
  }

  const userEmail = user?.email ?? '';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userInitial={userInitial}
        userEmail={userEmail}
      />

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          {activeTab === 'cleaner' && (
            <CsvCleanerTab
              stage={stage}
              files={files}
              scan={scan}
              result={result}
              error={error}
              setFiles={setFiles}
              onProcess={handleProcess}
              onContinue={handleContinue}
              onReset={handleReset}
            />
          )}

          {activeTab === 'history' && user && (
            <HistoryView userId={user.id} />
          )}

          {activeTab === 'settings' && user && (
            <SettingsView
              userId={user.id}
              userEmail={userEmail}
              onSignOut={handleSignOut}
            />
          )}
        </div>

        <footer className="max-w-3xl mx-auto px-8 pb-8">
          <div className="pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 leading-relaxed">
              Domain scanning uses a secure edge function. CSV contents stay in your
              browser; only the list of email domains is sent for classification.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

type CsvCleanerTabProps = {
  stage: Stage;
  files: File[];
  scan: ScanResult | null;
  result: ProcessedResult | null;
  error: string | null;
  setFiles: (files: File[]) => void;
  onProcess: () => void;
  onContinue: () => void;
  onReset: () => void;
};

function CsvCleanerTab({
  stage,
  files,
  scan,
  result,
  error,
  setFiles,
  onProcess,
  onContinue,
  onReset,
}: CsvCleanerTabProps) {
  return (
    <>
      {stage === 'upload' && (
        <div className="fade-enter">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">
              Turn messy scraper output<br />into outreach-ready lists.
            </h2>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl">
              Upload one or more CSVs from your Google Maps scraper. We'll scan for junk
              email domains, let you approve the blacklist additions, then dedupe, sort,
              and split into download-ready buckets.
            </p>
          </div>

          <FileUpload
            files={files}
            onFilesChange={setFiles}
            onProcess={onProcess}
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
          onContinue={onContinue}
        />
      )}

      {stage === 'finalizing' && <LoadingStage label="Cleaning your files..." />}

      {stage === 'results' && result && (
        <div className="fade-enter">
          <ResultsSummary result={result} onReset={onReset} />
        </div>
      )}
    </>
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
