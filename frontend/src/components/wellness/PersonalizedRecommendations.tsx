import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Wind, BookOpen, MessageSquare, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Recommendation {
  id: string;
  title: string;
  category: string;
  description: string;
  action_label: string;
  target_route: string;
  icon: string;
  color: string;
}

export default function PersonalizedRecommendations() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/recommendations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setRecommendations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading || recommendations.length === 0) return null;

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'wind': return <Wind className="w-5 h-5" />;
      case 'book-open': return <BookOpen className="w-5 h-5" />;
      case 'message-square': return <MessageSquare className="w-5 h-5" />;
      case 'image': return <Image className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-white">Recommended For You Today</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300"
          >
            <div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${rec.color}20`, color: rec.color }}
              >
                {renderIcon(rec.icon)}
              </div>
              <h4 className="font-semibold text-white mb-1">{rec.title}</h4>
              <p className="text-xs text-stone-300 leading-relaxed mb-4">{rec.description}</p>
            </div>
            <button
              onClick={() => navigate(rec.target_route)}
              className="flex items-center justify-between text-xs font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <span>{rec.action_label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
