import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWellnessStore } from '../hooks/useWellnessStore';
import {
  sendChatMessage,
  getChatSessions,
  getChatSession,
  deleteChatSession,
} from '../lib/api';
import type { ChatMessage, ChatSession } from '../lib/api';
import {
  CrisisAlertBanner,
  CrisisAlertModal,
  useCrisisCheck,
} from '../components/shared/CrisisAlertBanner';
import SessionSummaryPanel from '../components/shared/SessionSummaryPanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Starter prompts
// ---------------------------------------------------------------------------

const STARTER_PROMPTS = [
  "I'm feeling anxious today. Can you help?",
  "I want to start a mindfulness habit.",
  "Suggest a breathing exercise for stress.",
  "Help me write a gratitude journal entry.",
  "I've been feeling sad lately.",
  "How can I improve my sleep?",
];

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '10px',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 700,
          background: isUser
            ? 'var(--brand)'
            : 'linear-gradient(135deg, var(--brand), var(--brand-dark))',
          color: '#fff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {isUser ? 'You' : '🧠'}
      </div>
      <div
        style={{
          maxWidth: '75%',
          padding: '12px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? 'var(--brand)' : 'var(--surface)',
          color: isUser ? '#fff' : 'var(--text)',
          fontSize: '14px',
          lineHeight: 1.6,
          border: isUser ? 'none' : '1px solid var(--border)',
          boxShadow: isUser ? 'var(--shadow-brand)' : 'var(--shadow-sm)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {msg.content}
        <div
          style={{
            fontSize: '10px',
            opacity: 0.6,
            marginTop: '6px',
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '16px' }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))',
          color: '#fff',
        }}
      >
        🧠
      </div>
      <div
        style={{
          padding: '14px 18px',
          borderRadius: '18px 18px 18px 4px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          gap: '5px',
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--muted)',
            }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// History sidebar
// ---------------------------------------------------------------------------

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  loading: boolean;
}

function HistorySidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  loading,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div
      style={{
        width: '220px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)',
        overflow: 'hidden',
      }}
    >
      {/* New Chat button */}
      <div style={{ padding: '12px' }}>
        <button
          onClick={onNewChat}
          style={{
            width: '100%',
            padding: '9px 14px',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px dashed var(--brand)',
            background: 'var(--brand-light)',
            color: 'var(--brand-dark)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--brand)';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderStyle = 'solid';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--brand-light)';
            e.currentTarget.style.color = 'var(--brand-dark)';
            e.currentTarget.style.borderStyle = 'dashed';
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span> New Chat
        </button>
      </div>

      <div
        style={{
          padding: '0 12px 6px',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          textTransform: 'uppercase',
        }}
      >
        Past conversations
      </div>

      {/* Session list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 12px' }}>
        {loading && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
            Loading…
          </p>
        )}
        {!loading && sessions.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '20px 8px' }}>
            No past conversations yet.
          </p>
        )}
        <AnimatePresence initial={false}>
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            const isHovered = hoveredId === s.id;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '4px',
                  padding: '8px 10px',
                  background: isActive
                    ? 'var(--brand-light)'
                    : isHovered
                    ? 'var(--bg-secondary)'
                    : 'transparent',
                  border: isActive ? '1px solid var(--brand)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onClick={() => onSelectSession(s.id)}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isActive ? 'var(--brand-dark)' : 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '20px',
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted)',
                    marginTop: '2px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{formatRelativeDate(s.updated_at)}</span>
                  <span>{s.message_count / 2 | 0} turns</span>
                </div>
                {s.preview && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      marginTop: '3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.preview}
                  </div>
                )}

                {/* Delete button */}
                {(isHovered || isActive) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(s.id);
                    }}
                    title="Delete conversation"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '6px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--muted)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--muted)';
                    }}
                  >
                    ✕
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                maxWidth: '200px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <p style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '14px', fontWeight: 500 }}>
                Delete this conversation?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    flex: 1, padding: '7px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                    color: 'var(--text)', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteSession(confirmDelete);
                    setConfirmDelete(null);
                  }}
                  style={{
                    flex: 1, padding: '7px', borderRadius: 'var(--radius-md)',
                    border: 'none', background: '#ef4444',
                    color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatPage
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE: Message = {
  id: 0,
  role: 'assistant',
  content:
    "Hi! I'm MindfulMind, your AI wellness companion 🌿\n\nI'm here to offer emotional support, mindfulness tips, and practical wellness guidance. How are you feeling today?",
  timestamp: new Date(),
};

export default function ChatPage() {
  const { state } = useWellnessStore();

  // Monotonic message ID — starts fresh on each mount, avoiding collisions with id=0 welcome message
  const msgIdRef = useRef<number>(0);
  const nextId = () => ++msgIdRef.current;

  // Chat state
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Crisis detection
  const { crisisData, showModal, handleCrisisResponse, dismissBanner, closeModal } =
    useCrisisCheck();

  // History sidebar
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Fetch sessions list when sidebar opens
  useEffect(() => {
    if (!showHistory) return;
    setSessionsLoading(true);
    getChatSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [showHistory]);

  const wellnessContext = {
    recent_mood: state.moodLogs[0]?.mood,
    streak: state.streak.count,
    breathing_minutes: state.breathingMinutes,
  };

  // Load a past session into the chat
  const handleSelectSession = useCallback(async (id: string) => {
    try {
      const detail = await getChatSession(id);
      setSessionId(detail.id);
      setMessages([
        WELCOME_MESSAGE,
        ...detail.messages.map((m) => ({
          id: nextId(),
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at),
        })),
      ]);
      setError(null);
      setShowHistory(false);
    } catch {
      setError('Failed to load conversation.');
    }
  }, []);

  // Start a fresh chat
  const handleNewChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
    setInput('');
    setError(null);
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Delete a session from history
  const handleDeleteSession = useCallback(async (id: string) => {
    try {
      await deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) handleNewChat();
    } catch {
      setError('Failed to delete conversation.');
    }
  }, [sessionId, handleNewChat]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setInput('');
    setError(null);

    const userMsg: Message = {
      id: nextId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Build conversation history (skip welcome message)
    const history: ChatMessage[] = messages
      .filter((m) => m.id !== 0)
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: trimmed });

    try {
      const result = await sendChatMessage(history, wellnessContext, sessionId ?? undefined);
      setSessionId(result.session_id);

      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        content: result.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // ── Crisis detection: check response for crisis signals ──
      handleCrisisResponse(result.crisis);

      // Refresh sidebar session list if it's open (or update count)
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === result.session_id);
        if (existing) {
          return prev.map((s) =>
            s.id === result.session_id
              ? { ...s, message_count: s.message_count + 2, updated_at: new Date().toISOString(), preview: result.reply.slice(0, 120) }
              : s,
          );
        }
        // New session — prepend it
        return [
          {
            id: result.session_id,
            title: trimmed.length > 100 ? trimmed.slice(0, 97) + '…' : trimmed,
            message_count: 2,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            preview: result.reply.slice(0, 120),
          },
          ...prev,
        ];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSend(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 180px)',
        minHeight: '500px',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          padding: '16px 20px',
          borderRadius: showHistory
            ? 'var(--radius-xl) var(--radius-xl) 0 0'
            : 'var(--radius-xl) var(--radius-xl) 0 0',
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 50%, var(--brand-dark) 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.3)',
          }}
        >
          🧠
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            MindfulMind
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
            AI Wellness Companion · Powered by Llama 3
          </p>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* New Chat shortcut */}
          <button
            onClick={handleNewChat}
            title="Start a new conversation"
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1.5px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          >
            + New Chat
          </button>

          {/* History toggle */}
          <button
            onClick={() => setShowHistory((v) => !v)}
            title="View past conversations"
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1.5px solid rgba(255,255,255,0.4)',
              background: showHistory ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = showHistory
                ? 'rgba(255,255,255,0.3)'
                : 'rgba(255,255,255,0.12)')
            }
          >
            🕒 History
          </button>

          {/* Online badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.15)',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 500,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Online
          </div>
        </div>
      </motion.div>

      {/* ── Body: optional sidebar + messages ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* History sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <HistorySidebar
                sessions={sessions}
                activeSessionId={sessionId}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                onNewChat={handleNewChat}
                loading={sessionsLoading}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: 'var(--bg-secondary)',
            borderLeft: showHistory ? 'none' : '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border) transparent',
          }}
        >
          {/* Starter prompts */}
          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ marginBottom: '20px' }}
            >
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px', textAlign: 'center' }}>
                Quick starts
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)',
                      fontWeight: 500,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand)';
                      e.currentTarget.style.color = 'var(--brand-dark)';
                      e.currentTarget.style.background = 'var(--brand-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.background = 'var(--surface)';
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {isTyping && <TypingIndicator />}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderLeft: '3px solid #ef4444',
                  color: '#dc2626',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}
              >
                ⚠ {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Crisis alert banner (inline in chat area) */}
          <AnimatePresence>
            {crisisData && (
              <CrisisAlertBanner
                crisis={crisisData}
                onDismiss={crisisData.severity !== 'critical' ? dismissBanner : undefined}
              />
            )}
          </AnimatePresence>

          {/* Full-screen crisis modal for CRITICAL severity */}
          {showModal && crisisData && (
            <CrisisAlertModal crisis={crisisData} onClose={closeModal} />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Session Summary Panel ── */}
      {sessionId && messages.length > 2 && (
        <SessionSummaryPanel
          sessionId={sessionId}
          messageCount={messages.filter((m) => m.role === 'user').length}
        />
      )}

      {/* ── Input area ── */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        onSubmit={handleSubmit}
        style={{
          padding: '14px 16px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          disabled={isTyping}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text)',
            fontSize: '14px',
            outline: 'none',
            resize: 'none',
            maxHeight: '120px',
            lineHeight: 1.5,
            fontFamily: 'inherit',
            transition: 'border-color 0.2s',
            opacity: isTyping ? 0.6 : 1,
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: 'none',
            background: input.trim() && !isTyping ? 'var(--brand)' : 'var(--border)',
            color: '#fff',
            fontSize: '18px',
            cursor: input.trim() && !isTyping ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s, transform 0.15s',
          }}
          onMouseEnter={(e) => {
            if (input.trim() && !isTyping) e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
        >
          ↑
        </button>
      </motion.form>

      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
        MindfulMind is an AI assistant, not a mental health professional. For crises, call AASRA: 9152987821
      </p>
    </div>
  );
}
