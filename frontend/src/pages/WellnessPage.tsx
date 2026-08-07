import { useState } from 'react';
import { useWellnessStore } from '../hooks/useWellnessStore';
import { useAuth } from '../contexts/AuthContext';
import HeroSection from '../components/shared/HeroSection';
import BreathingCoach from '../components/wellness/tools/BreathingCoach';
import MoodCheck from '../components/wellness/tools/MoodCheck';
import DailyAffirmations from '../components/wellness/tools/DailyAffirmations';
import FocusTimer from '../components/wellness/tools/FocusTimer';
import GroundingExercise from '../components/wellness/tools/GroundingExercise';
import GratitudeBox from '../components/wellness/tools/GratitudeBox';
import GuidedJournal from '../components/wellness/tools/GuidedJournal';
import WellnessStatsBanner from '../components/wellness/WellnessStatsBanner';
import { AnimatePresence, motion } from 'framer-motion';
import { exportWellnessData } from '../lib/exportCsv';

type TabName = 'tools' | 'journal' | 'tracker' | 'resources';

export default function WellnessPage() {
  const { state, dispatch } = useWellnessStore();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabName>('tools');

  const tabs: { id: TabName; label: string }[] = [
    { id: 'tools', label: 'Tools' },
    { id: 'journal', label: 'Journal' },
    { id: 'tracker', label: 'Tracker' },
    { id: 'resources', label: 'Resources' },
  ];

  return (
    <>
      <HeroSection
        title="Your Wellness Sanctuary"
        subtitle="Tools for mental health and emotional wellbeing"
      />

      <div className="grid" style={{ marginTop: '32px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
        <WellnessStatsBanner state={state} />

        {/* Tab Navigation */}
        <div className="wellness-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`wellness-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.id === 'tools' && '🛠️'} {tab.id === 'journal' && '📔'} {tab.id === 'tracker' && '📊'} {tab.id === 'resources' && '📚'} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content with Animations */}
        <AnimatePresence mode="wait">
          {activeTab === 'tools' && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid" style={{ marginBottom: '32px' }}>
                <BreathingCoach dispatch={dispatch} />
                <MoodCheck dispatch={dispatch} />
                <DailyAffirmations />
                <FocusTimer />
                <GroundingExercise />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <GratitudeBox dispatch={dispatch} />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <GuidedJournal dispatch={dispatch} moodLogs={state.moodLogs} />
              </div>

              <div className="card" style={{ background: 'linear-gradient(135deg, var(--surface-secondary), var(--surface))', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>💡 Quick Wellness Tips</h3>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <li style={{ padding: '14px 16px', backgroundColor: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>🫁 <strong>Breathing</strong> - Practice daily for instant calmness</li>
                  <li style={{ padding: '14px 16px', backgroundColor: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>😊 <strong>Mood Tracking</strong> - Log patterns to understand yourself better</li>
                  <li style={{ padding: '14px 16px', backgroundColor: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>📝 <strong>Journaling</strong> - Process your thoughts and emotions</li>
                  <li style={{ padding: '14px 16px', backgroundColor: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>📊 <strong>Analytics</strong> - Track your wellness progress over time</li>
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === 'journal' && (
            <motion.div
              key="journal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '20px' }}>📔 Journal Entries</h2>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>{state.journalEntries.length} entries recorded</p>
                  </div>
                </div>
                {state.journalEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'linear-gradient(135deg, var(--surface-secondary), var(--surface))', borderRadius: '12px', border: '2px dashed var(--border)' }}>
                    <p style={{ color: '#6b665c', fontSize: '16px', margin: 0 }}>✍️ No journal entries yet</p>
                    <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Start journaling to track your thoughts and feelings</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {state.journalEntries.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          padding: '20px',
                          backgroundColor: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          borderLeft: '5px solid #d97757',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(217, 119, 87, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-start' }}>
                          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text)' }}>{entry.title || 'Untitled Entry'}</h4>
                          <span style={{ fontSize: '12px', color: '#8a857b', fontWeight: '500' }}>
                            {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <p style={{ margin: '10px 0 0 0', color: '#4a4640', lineHeight: '1.6', maxHeight: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '20px' }}>🙏 Gratitude Wall</h2>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>{state.gratitude.length} moments of gratitude</p>
                  </div>
                </div>
                {state.gratitude.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'linear-gradient(135deg, var(--surface-secondary), var(--surface))', borderRadius: '12px', border: '2px dashed var(--border)' }}>
                    <p style={{ color: '#d97757', fontSize: '16px', margin: 0 }}>✨ Start your gratitude journey</p>
                    <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Add what you're thankful for in the Tools tab</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {state.gratitude.slice(0, 6).map((item, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '16px 20px',
                          backgroundColor: 'var(--surface-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          transition: 'transform 0.2s',
                          cursor: 'default'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        }}
                      >
                        <p style={{ margin: 0, color: 'var(--text)', fontSize: '15px', lineHeight: '1.5', fontWeight: '500' }}>
                          "{item.text}"
                        </p>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'tracker' && (
            <motion.div
              key="tracker"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
            >
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn primary"
                  onClick={() => exportWellnessData(state, user?.email)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  📥 Export Data
                </button>
              </div>

              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h2 style={{ marginBottom: '24px' }}>📊 Mood Tracker</h2>
                {state.moodLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'linear-gradient(135deg, var(--surface-secondary), var(--surface))', borderRadius: '12px', border: '2px dashed var(--border)' }}>
                    <p style={{ color: '#6b665c', fontSize: '16px', margin: 0 }}>📈 No mood logs yet</p>
                    <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Log your mood to track emotional patterns</p>
                  </div>
                ) : (
                  <div style={{ background: 'linear-gradient(135deg, var(--surface-secondary), var(--surface))', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ marginBottom: '20px', color: '#4a4640', fontWeight: '600' }}>
                      📅 Last 7 days: {state.moodLogs.slice(0, 7).length} entries
                    </p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '160px' }}>
                      {state.moodLogs.slice(0, 7).map((log, i) => (
                        <div
                          key={i}
                          title={`${log.mood} ${log.emoji}`}
                          style={{
                            flex: 1,
                            height: `${(7 - i) * 20}px`,
                            background: 'linear-gradient(135deg, #d97757, #c4684a)',
                            borderRadius: '8px 8px 0 0',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.opacity = '0.8';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>🎯 Wellness Stats</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--surface-secondary)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>BREATHING MINUTES</p>
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#d97757' }}>{state.breathingMinutes}</p>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: 'var(--surface-secondary)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>JOURNAL ENTRIES</p>
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#7a9a8c' }}>{state.journalEntries.length}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>🔥 Streaks & Logs</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--surface-secondary)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>MOOD LOGS</p>
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#c9a962' }}>{state.moodLogs.length}</p>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: 'var(--surface-secondary)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>CURRENT STREAK</p>
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#d97757' }}>{state.streak.count} 🔥</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.05), var(--surface))', borderLeft: '5px solid #FF6B6B', marginBottom: '24px' }}>
                <h2 style={{ marginBottom: '16px', color: '#FF6B6B', fontSize: '20px' }}>🆘 Crisis Support</h2>
                <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontWeight: '500' }}>💜 If you're in crisis, please reach out. Reaching out is a sign of strength.</p>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <a href="tel:9152987821" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', textDecoration: 'none', color: 'inherit', transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#FF6B6B';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.2)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}>
                    <span style={{ fontSize: '24px' }}>🇮🇳</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: 'var(--text)' }}>AASRA (India)</div>
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>9152987821 • 24/7 Support</div>
                    </div>
                    <span style={{ fontSize: '20px' }}>📞</span>
                  </a>
                  <a href="tel:1-800-891-4416" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', textDecoration: 'none', color: 'inherit', transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#FF6B6B';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.2)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}>
                    <span style={{ fontSize: '24px' }}>🇮🇳</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: 'var(--text)' }}>Tele Manas</div>
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>1-800-891-4416 • Mental Health Support</div>
                    </div>
                    <span style={{ fontSize: '20px' }}>📞</span>
                  </a>
                  <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', textDecoration: 'none', color: 'inherit', transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(217, 119, 87, 0.2)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}>
                    <span style={{ fontSize: '24px' }}>🌍</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: 'var(--text)' }}>International Helplines</div>
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Find local support in your country</div>
                    </div>
                    <span style={{ fontSize: '20px' }}>🔗</span>
                  </a>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>📚 Recommended Resources</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <a href="https://www.mentalhealth.gov" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', backgroundColor: 'linear-gradient(135deg, var(--surface-secondary), var(--surface))', border: '1px solid var(--border-subtle)', borderRadius: '10px', textDecoration: 'none', color: 'inherit', transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}>
                    <span style={{ fontSize: '20px' }}>🏛️</span>
                    <span style={{ fontWeight: '500' }}>Mental Health Foundation</span>
                  </a>
                  <a href="https://www.who.int/teams/mental-health-and-substance-use" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', backgroundColor: 'linear-gradient(135deg, var(--surface-secondary), var(--surface))', border: '1px solid var(--border-subtle)', borderRadius: '10px', textDecoration: 'none', color: 'inherit', transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}>
                    <span style={{ fontSize: '20px' }}>🌐</span>
                    <span style={{ fontWeight: '500' }}>WHO Mental Health Services</span>
                  </a>
                  <a href="https://www.headspace.com" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', backgroundColor: 'linear-gradient(135deg, var(--surface-secondary), var(--surface))', border: '1px solid var(--border-subtle)', borderRadius: '10px', textDecoration: 'none', color: 'inherit', transition: 'all 0.3s ease', cursor: 'pointer' }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}>
                    <span style={{ fontSize: '20px' }}>🧘</span>
                    <span style={{ fontWeight: '500' }}>Headspace Meditation</span>
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </>
  );
}
