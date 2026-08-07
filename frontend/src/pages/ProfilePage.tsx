import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useWellnessStore } from '../hooks/useWellnessStore';
import AchievementBadge from '../components/profile/AchievementBadge';
import { updateProfile, changePassword, getAccountStats } from '../lib/api';
import { computeAchievements } from '../lib/achievements';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function FeedbackMessage({ type, message }: { type: 'success' | 'error'; message: string }) {
  const isSuccess = type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      style={{
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        fontSize: '14px',
        fontWeight: 500,
        background: isSuccess ? 'var(--accent-sage-light)' : '#FEF2F2',
        color: isSuccess ? 'var(--accent-sage)' : '#DC2626',
        border: `1px solid ${isSuccess ? 'var(--accent-sage)' : '#FECACA'}`,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span style={{ fontSize: '16px' }}>{isSuccess ? '✓' : '⚠'}</span>
      {message}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Input field component
// ---------------------------------------------------------------------------
function FormInput({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
  maxLength,
  suffix,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
        {label}
      </span>
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: suffix ? '12px 40px 12px 16px' : '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${focused ? 'var(--brand)' : 'var(--border)'}`,
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: '15px',
            outline: 'none',
            transition: 'var(--transition-fast)',
            boxSizing: 'border-box',
            boxShadow: focused ? '0 0 0 3px var(--brand-muted)' : 'var(--shadow-xs)',
          }}
        />
        {suffix && (
          <div style={{
            position: 'absolute', right: '12px', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
          }}>
            {suffix}
          </div>
        )}
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Stat block for activity
// ---------------------------------------------------------------------------
function ActivityStat({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      padding: '24px',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface-secondary)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-xs)',
      transition: 'var(--transition-smooth)',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      <div style={{
        width: '48px', height: '48px',
        borderRadius: '12px',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', flexShrink: 0,
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '4px' }}>
          {value}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfilePage
// ---------------------------------------------------------------------------
export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { state } = useWellnessStore();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [statsLoading, setStatsLoading] = useState(true);
  const [wellnessCount, setWellnessCount] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    getAccountStats()
      .then((stats) => setWellnessCount(stats.wellness_entries_count))
      .catch(() => setWellnessCount(null))
      .finally(() => setStatsLoading(false));
  }, []);

  const achievements = computeAchievements(state);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) { setProfileError('Full name cannot be empty.'); return; }

    const payload: { full_name?: string; email?: string } = {};
    if (trimmedName !== user?.full_name) payload.full_name = trimmedName;
    if (trimmedEmail !== user?.email) payload.email = trimmedEmail;

    if (Object.keys(payload).length === 0) { setProfileSuccess('No changes to save.'); return; }

    setProfileLoading(true);
    try {
      const updated = await updateProfile(payload);
      updateUser({ full_name: updated.full_name, email: updated.email });
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  }

  if (!user) return null;

  const initials = getInitials(user.full_name);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

      {/* ── PROFILE HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '24px',
          padding: '40px 0 48px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.1, type: 'spring', stiffness: 140 }}
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'var(--brand-light)',
              color: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              border: '2px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0,
            }}
          >
            {initials}
          </motion.div>

          <div style={{ flex: 1 }}>
            <h1 style={{
              margin: '0 0 8px',
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
            }}>
              {user.full_name}
            </h1>
            <p style={{
              margin: '0 0 16px',
              fontSize: '16px',
              color: 'var(--text-secondary)',
            }}>
              {user.email}
            </p>
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface-secondary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}>
              <span style={{ fontSize: '15px' }}>🗓</span> Member since {formatDate(user.created_at)}
            </div>
          </div>
        </div>
      </motion.div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '40px',
        alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', flex: '1 1 500px' }}>
          
          {/* ── Edit Profile ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.01em' }}>Profile Settings</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Update your personal details below.</p>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <AnimatePresence>
                {profileSuccess && <FeedbackMessage type="success" message={profileSuccess} />}
                {profileError && <FeedbackMessage type="error" message={profileError} />}
              </AnimatePresence>

              <FormInput
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(v) => { setFullName(v); setProfileSuccess(null); setProfileError(null); }}
                placeholder="Your full name"
                required
                maxLength={200}
              />
              <FormInput
                label="Email Address"
                type="email"
                value={email}
                onChange={(v) => { setEmail(v); setProfileSuccess(null); setProfileError(null); }}
                placeholder="you@example.com"
                required
              />

              <button
                type="submit"
                disabled={profileLoading}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '8px',
                  opacity: profileLoading ? 0.7 : 1,
                }}
              >
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </motion.div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '8px 0' }} />

          {/* ── Change Password ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.01em' }}>Security</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Ensure your account is using a long, random password to stay secure.</p>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <AnimatePresence>
                {passwordSuccess && <FeedbackMessage type="success" message={passwordSuccess} />}
                {passwordError && <FeedbackMessage type="error" message={passwordError} />}
              </AnimatePresence>

              <FormInput
                label="Current Password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(v) => { setCurrentPassword(v); setPasswordSuccess(null); setPasswordError(null); }}
                placeholder="••••••••"
                required
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    style={{ background: 'none', border: 'none', boxShadow: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '16px' }}
                  >
                    {showCurrent ? '🙈' : '👁'}
                  </button>
                }
              />
              <FormInput
                label="New Password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(v) => { setNewPassword(v); setPasswordSuccess(null); setPasswordError(null); }}
                placeholder="••••••••"
                required
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    style={{ background: 'none', border: 'none', boxShadow: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '16px' }}
                  >
                    {showNew ? '🙈' : '👁'}
                  </button>
                }
              />
              
              {newPassword.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Password strength</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: newPassword.length < 8 ? '#ef4444' : newPassword.length < 12 ? '#f59e0b' : 'var(--accent-sage)' }}>
                      {newPassword.length < 8 ? 'Too short' : newPassword.length < 12 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                  <div style={{ height: '6px', borderRadius: 'var(--radius-full)', background: 'var(--border-subtle)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 'var(--radius-full)',
                      width: `${Math.min(100, (newPassword.length / 16) * 100)}%`,
                      background: newPassword.length < 8 ? '#ef4444' : newPassword.length < 12 ? '#f59e0b' : 'var(--accent-sage)',
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }} />
                  </div>
                </div>
              )}

              <FormInput
                label="Confirm New Password"
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(v) => { setConfirmPassword(v); setPasswordSuccess(null); setPasswordError(null); }}
                placeholder="••••••••"
                required
              />

              <button
                type="submit"
                disabled={passwordLoading}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '8px',
                  opacity: passwordLoading ? 0.7 : 1,
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </motion.div>
        </div>

        {/* ── Right Column: Stats & Achievements ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', flex: '1 1 400px' }}>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.29 }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.01em' }}>Activity Summary</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Overview of your wellness journey.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
              <ActivityStat label="Day Streak" value={state.streak.count} icon="🔥" />
              <ActivityStat label="Total Entries" value={statsLoading ? '…' : (wellnessCount ?? '—')} icon="📋" />
              <ActivityStat label="Breathing Min" value={state.breathingMinutes} icon="🌬️" />
              <ActivityStat label="Journals" value={state.journalEntries.length} icon="✍️" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.36 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.01em' }}>Achievements</h2>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0 }}>
                  You have unlocked {unlockedCount} of {achievements.length} badges.
                </p>
              </div>
            </div>

            {unlockedCount > 0 && (
              <div style={{ marginBottom: '24px', height: '6px', borderRadius: 'var(--radius-full)', background: 'var(--border-subtle)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--brand)',
                  width: `${(unlockedCount / achievements.length) * 100}%`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '16px',
              }}
            >
              {achievements.map((achievement, i) => (
                <AchievementBadge key={achievement.id} achievement={achievement} index={i} />
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
