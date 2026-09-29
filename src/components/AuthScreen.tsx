import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, Mail, Lock, User, Sparkles, ArrowRight } from 'lucide-react';

const avatars = ['🦸', '🦸‍♀️', '🦊', '🦁', '🐼', '🦄', '🐉', '⚡', '🔥', '🌟'];

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('🦸');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setError('Vui lòng nhập tên hiển thị');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Mật khẩu phải có ít nhất 6 ký tự');
        setLoading(false);
        return;
      }
      const { error: err } = await signUp(email, password, displayName, avatar);
      if (err) setError(err);
    } else {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-red-500 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-red-500 mb-4 shadow-lg shadow-amber-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">SuperHero English</h1>
          <p className="text-slate-400 text-sm mt-1">Học tiếng Anh theo cách siêu nhân!</p>
        </div>

        <div className="rounded-2xl bg-slate-800/80 backdrop-blur-sm border border-white/10 p-6">
          <div className="flex gap-2 mb-6 p-1 rounded-xl bg-slate-900/60">
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                mode === 'signup' ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Đăng Ký
            </button>
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                mode === 'signin' ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Đăng Nhập
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-1.5 block">Tên Siêu Nhân</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nhập tên của bé..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-1.5 block">Chọn Avatar</label>
                  <div className="grid grid-cols-5 gap-2">
                    {avatars.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAvatar(a)}
                        className={`text-2xl py-2 rounded-lg border-2 transition-all ${
                          avatar === a ? 'border-amber-500 bg-amber-500/20 scale-110' : 'border-white/10 bg-slate-900/60 hover:border-white/30'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-semibold text-slate-300 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300 mb-1.5 block">Mật Khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold shadow-lg shadow-red-500/30 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <Sparkles className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signup' ? 'Bắt Đầu Phiêu Lưu' : 'Đăng Nhập'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Bé cần người lớn giúp tạo tài khoản và nhập email/mật khẩu.
        </p>
      </div>
    </div>
  );
}
