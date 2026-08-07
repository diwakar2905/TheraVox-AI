import { useEffect, useState } from 'react';
import { Phone, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EmergencyContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  relationship: string;
}

export default function EmergencyContactManager() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');

  const fetchContacts = () => {
    if (!token) return;
    fetch('/api/emergency-contacts', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setContacts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchContacts();
  }, [token]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !token) return;

    try {
      const res = await fetch('/api/emergency-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone, relationship }),
      });

      if (res.ok) {
        setName('');
        setPhone('');
        fetchContacts();
      }
    } catch (err) {
      console.error('Failed to add contact', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/emergency-contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchContacts();
    } catch (err) {
      console.error('Failed to delete contact', err);
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-rose-400" />
        <div>
          <h4 className="font-semibold text-white">Emergency Contacts (SMS Crisis Escalation)</h4>
          <p className="text-xs text-stone-400">
            Contacts specified here will receive an automated SMS alert if severe crisis signals are detected.
          </p>
        </div>
      </div>

      <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <input
          type="text"
          placeholder="Contact Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-white/10 text-white border border-white/10 focus:outline-none focus:border-amber-400"
          required
        />
        <input
          type="tel"
          placeholder="Phone Number (+1...)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-white/10 text-white border border-white/10 focus:outline-none focus:border-amber-400"
          required
        />
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-stone-900 text-white border border-white/10 focus:outline-none"
        >
          <option value="Family">Family Member</option>
          <option value="Friend">Close Friend</option>
          <option value="Therapist">Therapist / Doctor</option>
          <option value="Other">Other Trusted Person</option>
        </select>
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </form>

      {contacts.length === 0 ? (
        <p className="text-xs text-stone-400 italic">No emergency contacts added yet.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{c.name} ({c.relationship})</p>
                  <p className="text-xs text-stone-400">{c.phone}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-1.5 text-stone-400 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
