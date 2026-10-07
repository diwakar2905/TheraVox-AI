import { useEffect, useState } from 'react';
import { UserCheck, Key, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ClientLink {
  link_id: string;
  invite_code: string;
  status: string;
  consent_shared: boolean;
  client_name: string;
  client_email?: string;
  client_id?: string;
  created_at: string;
}

export default function TherapistDashboard() {
  const { token } = useAuth();
  const [clients, setClients] = useState<ClientLink[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClients = () => {
    if (!token) return;
    fetch('/api/therapist/clients', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setClients(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, [token]);

  const handleGenerateInvite = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/therapist/generate-invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.invite_code);
        fetchClients();
      }
    } catch (err) {
      console.error('Failed to generate invite code', err);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-300">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Professional Therapist Portal</h2>
            <p className="text-xs text-stone-400">
              Manage patient consent links, monitor aggregate mood trends, and view crisis escalation history.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateInvite}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-xl hover:bg-cyan-500 transition-colors"
        >
          <Key className="w-4 h-4" /> Generate Client Invite Code
        </button>
      </div>

      {inviteCode && (
        <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-300">Share this 6-character code with your patient:</span>
            <div className="text-2xl font-mono font-bold tracking-widest text-white mt-1">{inviteCode}</div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-cyan-500/20 font-medium text-cyan-300">Active Invite</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" /> Linked Patients
          </h3>

          {clients.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No patients linked yet. Generate an invite code above.</p>
          ) : (
            <div className="space-y-3">
              {clients.map((c) => (
                <div key={c.link_id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-sm">{c.client_name}</h4>
                    <p className="text-xs text-stone-400">{c.client_email || `Code: ${c.invite_code}`}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      c.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {c.status}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Consent: {c.consent_shared ? 'Shared ✅' : 'Private 🔒'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" /> Clinical Dashboard Overview
          </h3>
          <p className="text-xs text-stone-300 leading-relaxed mb-4">
            Patient privacy is strictly enforced. Patient wellness entries and crisis alerts are only viewable if explicit client consent is active.
          </p>
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs text-stone-400">
            Select a patient from your linked roster to inspect longitudinal mood charts and clinical assessments.
          </div>
        </div>
      </div>
    </div>
  );
}
