import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const API_URL = 'https://scabpro.com/api';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) setToken(t);
    else setError('Ссылка недействительна: отсутствует токен');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сброса пароля');
      setSuccess('Пароль успешно изменён. Теперь вы можете войти с новым паролем.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">АРБИ</h1>
        <p className="text-slate-400 mb-8">Сброс пароля</p>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-500/20 border border-green-500 text-green-400 rounded-lg p-3 text-sm">
              {success}
            </div>
            <a href="/login" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-3 transition">
              Перейти ко входу
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Новый пароль</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Минимум 6 символов" required minLength={6} disabled={!token} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Повторите пароль</label>
              <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Минимум 6 символов" required minLength={6} disabled={!token} />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading || !token}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-3 transition disabled:opacity-50">
              {loading ? 'Сохранение...' : 'Установить новый пароль'}
            </button>
            <p className="text-center text-slate-400 text-sm">
              <a href="/login" className="text-blue-400 hover:underline">Вернуться ко входу</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
