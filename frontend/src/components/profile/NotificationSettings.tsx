import { useState } from 'react';
import { Bell, Clock, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { requestNotificationPermission } from '../../utils/webPush';

export default function NotificationSettings() {
  const { token } = useAuth();
  const [preferredTime, setPreferredTime] = useState('20:00');
  const [enabled, setEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleEnablePush = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      await saveSettings('20:00', true);
    }
  };

  const saveSettings = async (time: string, is_active: boolean) => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferred_time: time, is_active }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error('Failed to update notification settings', e);
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          <div>
            <h4 className="font-semibold text-white">Daily Check-In Reminders</h4>
            <p className="text-xs text-stone-400">Receive gentle daily push notifications to log your mood and journal.</p>
          </div>
        </div>
        <button
          onClick={handleEnablePush}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-colors"
        >
          Enable Web Push
        </button>
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-white/10">
        <Clock className="w-4 h-4 text-stone-400" />
        <span className="text-xs text-stone-300">Preferred Reminder Time:</span>
        <input
          type="time"
          value={preferredTime}
          onChange={(e) => {
            setPreferredTime(e.target.value);
            saveSettings(e.target.value, enabled);
          }}
          className="px-2 py-1 text-xs rounded bg-stone-900 text-white border border-white/10 focus:outline-none"
        />
        {saved && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Saved!
          </span>
        )}
      </div>
    </div>
  );
}
