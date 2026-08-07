import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, Award, Play, Sparkles, Wind } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Step {
  id: string;
  title: string;
  type: string;
  content?: string;
  prompt?: string;
}

interface Program {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  badge_name: string;
  steps: Step[];
  is_enrolled: boolean;
  progress_percent: number;
  completed_steps: string[];
  badge_earned?: string | null;
}

export default function TherapyHub() {
  const { token } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrograms = () => {
    if (!token) return;
    fetch('/api/programs', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setPrograms(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPrograms();
  }, [token]);

  const handleEnroll = async (programId: string) => {
    if (!token) return;
    await fetch(`/api/programs/${programId}/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPrograms();
  };

  const handleCompleteStep = async (programId: string, stepId: string) => {
    if (!token) return;
    await fetch(`/api/programs/${programId}/complete-step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ step_id: stepId }),
    });
    fetchPrograms();
  };

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Therapeutic Programs & CBT Modules</h2>
          <p className="text-xs text-stone-400">
            Evidence-based Cognitive Behavioral Therapy exercises, guided breathing, and mindfulness courses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {programs.map((prog) => (
          <div
            key={prog.id}
            className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300">
                  {prog.category}
                </span>
                <span className="text-xs text-stone-400">{prog.duration}</span>
              </div>
              <h3 className="font-semibold text-lg text-white mb-2">{prog.title}</h3>
              <p className="text-xs text-stone-300 leading-relaxed mb-4">{prog.description}</p>

              {prog.is_enrolled && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                    <span>Progress</span>
                    <span className="font-semibold text-white">{prog.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${prog.progress_percent}%` }}
                    />
                  </div>
                </div>
              )}

              {prog.badge_earned && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4">
                  <Award className="w-4 h-4" /> Earned: {prog.badge_earned}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10">
              {!prog.is_enrolled ? (
                <button
                  onClick={() => handleEnroll(prog.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm text-white bg-amber-600 hover:bg-amber-500 transition-colors"
                >
                  <Play className="w-4 h-4" /> Enroll Now
                </button>
              ) : (
                <button
                  onClick={() => setActiveProgram(prog)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm text-white bg-stone-800 hover:bg-stone-700 transition-colors"
                >
                  <Sparkles className="w-4 h-4" /> Continue Course
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {activeProgram && (
        <div className="p-6 rounded-2xl border border-white/10 bg-stone-900/90 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">{activeProgram.title}</h3>
              <p className="text-xs text-stone-400">Step-by-step course player</p>
            </div>
            <button
              onClick={() => setActiveProgram(null)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-stone-300 hover:text-white"
            >
              Close Player
            </button>
          </div>

          <div className="space-y-4">
            {activeProgram.steps.map((s, idx) => {
              const isDone = activeProgram.completed_steps.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-xl border ${
                    isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white text-sm">
                      Session {idx + 1}: {s.title}
                    </h4>
                    {isDone ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                        <CheckCircle className="w-4 h-4" /> Completed
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          handleCompleteStep(activeProgram.id, s.id);
                          setActiveProgram({
                            ...activeProgram,
                            completed_steps: [...activeProgram.completed_steps, s.id],
                          });
                        }}
                        className="text-xs px-3 py-1 rounded bg-amber-600 text-white font-medium hover:bg-amber-500"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                  {s.content && <p className="text-xs text-stone-300 leading-relaxed">{s.content}</p>}
                  {s.prompt && (
                    <div className="mt-2 p-3 rounded-lg bg-black/40 text-xs text-amber-200 border border-amber-500/20">
                      💡 <strong>Reflection Prompt:</strong> {s.prompt}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
