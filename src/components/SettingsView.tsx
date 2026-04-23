import { useState, useEffect } from 'react';
import { User, Building2, Mail, Save, CheckCircle2, AlertCircle, Loader2, LogOut } from 'lucide-react';
import { getProfile, updateProfile, type Profile } from '../lib/auth';

type Props = {
  userId: string;
  userEmail: string;
  onSignOut: () => void;
};

export function SettingsView({ userId, userEmail, onSignOut }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile(userId)
      .then((p) => {
        if (p) {
          setProfile(p);
          setFullName(p.full_name);
          setCompany(p.company);
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await updateProfile(userId, { full_name: fullName, company });
      if (updated) setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-enter">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your profile and account</p>
      </div>

      <div className="space-y-6">
        {/* Profile card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Profile</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Company
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                {saved ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Saved
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save changes
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Account card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Account</h3>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Email cannot be changed here.</p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Session</h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs text-slate-500 mb-4">
              You are currently signed in as <span className="font-medium text-slate-700">{userEmail}</span>.
            </p>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
