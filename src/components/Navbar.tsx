import { Home, BookOpen, Trophy, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Props {
  active: string;
  onNavigate: (view: 'home' | 'lessons' | 'progress') => void;
}

export function Navbar({ active, onNavigate }: Props) {
  const { profile, signOut } = useAuth();

  const items = [
    { id: 'home' as const, label: 'Trang Chủ', icon: <Home className="w-5 h-5" /> },
    { id: 'lessons' as const, label: 'Bài Học', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'progress' as const, label: 'Tiến Độ', icon: <Trophy className="w-5 h-5" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-white font-black text-xl tracking-tight"
          >
            <span className="text-2xl">{profile?.avatar_emoji || '🦸'}</span>
            <span className="hidden sm:block bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">
              HeroEnglish
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  active === item.id
                    ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-lg shadow-red-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900/90 backdrop-blur-lg border-t border-white/10">
        <div className="flex items-center justify-around h-16">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                active === item.id ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
