import { useState } from 'react';
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function DataExportButton() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleDownload = async () => {
    if (!token) return;
    setLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/me/data', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 429) {
        throw new Error('Data export is limited to once per 24 hours. Please try again tomorrow.');
      }

      if (!response.ok) {
        throw new Error('Failed to generate export archive. Please try again.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theravox_data_export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage((err instanceof Error && err.message) || 'Error downloading data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-white">Export Your Data</h4>
          <p className="text-xs text-stone-400">Download a complete ZIP archive of your journal, mood history, and chats.</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? 'Exporting...' : 'Download Archive'}
        </button>
      </div>

      {status === 'success' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle className="w-4 h-4" /> Data export downloaded successfully!
        </div>
      )}

      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4" /> {errorMessage}
        </div>
      )}
    </div>
  );
}
