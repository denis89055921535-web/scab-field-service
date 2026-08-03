import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const API_URL = 'https://scabpro.com/api';

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('scab_saved_login') || 'null');
      if (saved && saved.email) {
        setEmail(saved.email);
        if (saved.password) setPassword(saved.password);
        setRemember(true);
      }
    } catch (e) { /* игнор */ }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (remember) {
        localStorage.setItem('scab_saved_login', JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem('scab_saved_login');
      }
      await login(email, password);
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, position, phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка регистрации');
      setSuccess(data.message);
      setMode('login');
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
        <p className="text-slate-400 mb-8">Полевая служба</p>

        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 rounded-lg p-3 mb-4 text-sm">
            {success}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Пароль</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600" />
              Запомнить пароль
            </label>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-3 transition disabled:opacity-50">
              {loading ? 'Вход...' : 'Войти'}
            </button>
            <p className="text-center text-slate-400 text-sm">
              Нет аккаунта?{' '}
              <button type="button" onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                className="text-blue-400 hover:underline">Подать заявку</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Полное имя</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Иванов Иван Иванович" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Минимум 8 символов" required minLength={8} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Должность</label>
              <input type="text" value={position} onChange={e => setPosition(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Инженер по сервисному обслуживанию" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Телефон</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+7 (999) 123-45-67" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-3 transition disabled:opacity-50">
              {loading ? 'Отправка...' : 'Подать заявку'}
            </button>
            <p className="text-center text-slate-400 text-sm">
              Уже есть аккаунт?{' '}
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-blue-400 hover:underline">Войти</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
