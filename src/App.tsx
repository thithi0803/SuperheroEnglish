import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';
import { PlacementTest } from '@/components/PlacementTest';
import { HomeDashboard } from '@/components/HomeDashboard';
import { LessonHub } from '@/components/LessonHub';
import { LessonRunner } from '@/components/LessonRunner';
import { ProgressDashboard } from '@/components/ProgressDashboard';
import { Navbar } from '@/components/Navbar';
import { saveLessonCompletion } from '@/lib/lessonService';
import type { Level } from '@/types';
import { Sparkles } from 'lucide-react';

type AppView = 'home' | 'lessons' | 'lesson' | 'progress';

function AppContent() {
  const { session, profile, loading, signOut, refreshProfile, updateProfile } = useAuth();
  const [view, setView] = useState<AppView>('home');
  const [showPlacement, setShowPlacement] = useState(false);
  const [activeLesson, setActiveLesson] = useState<{ topic: string; emoji: string; lessonIndex: number } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Sparkles className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (showPlacement || (profile && !profile.placement_level) || (session && !profile)) {
    return (
      <PlacementTest
        onComplete={async (level: Level) => {
          await updateProfile({ placement_level: level });
          setShowPlacement(false);
          setView('home');
        }}
      />
    );
  }

  const handleStartLesson = (topic: string, emoji: string, lessonIndex: number) => {
    setActiveLesson({ topic, emoji, lessonIndex });
    setView('lesson');
    window.scrollTo({ top: 0 });
  };

  const handleLessonComplete = async (score: number, stars: number, xp: number) => {
    if (!session?.user || !activeLesson) return;
    const level = profile?.placement_level || 'Beginner';
    const lessonKey = `${activeLesson.topic}-${level}-${activeLesson.lessonIndex}`;
    try {
      await saveLessonCompletion(session.user.id, lessonKey, score, stars, xp);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to save completion:', err);
    }
    setActiveLesson(null);
    setView('progress');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await signOut();
    setView('home');
  };

  if (view === 'lesson' && activeLesson) {
    return (
      <div className="min-h-screen bg-slate-900">
        <LessonRunner
          topic={activeLesson.topic}
          emoji={activeLesson.emoji}
          lessonIndex={activeLesson.lessonIndex}
          level={profile?.placement_level || 'Beginner'}
          onComplete={handleLessonComplete}
          onExit={() => {
            setActiveLesson(null);
            setView('lessons');
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar
        active={view === 'lesson' ? 'lessons' : view}
        onNavigate={(v) => {
          setView(v as AppView);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <main>
        {view === 'home' && (
          <HomeDashboard
            onStartLesson={() => setView('lessons')}
            onViewProgress={() => setView('progress')}
          />
        )}
        {view === 'lessons' && <LessonHub onStartLesson={handleStartLesson} />}
        {view === 'progress' && <ProgressDashboard onSignOut={handleSignOut} />}
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-slate-500 text-sm pb-20 md:pb-6">
        <p>SuperHero English Academy - Học tiếng Anh, trở thành siêu nhân!</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
