import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/authService';
import SkipLink from '../components/SkipLink';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setError(''); setEmailError(''); setPasswordError(''); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const validateEmail = (value: string): boolean => {
    if (!value) { setEmailError('Email é obrigatório'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setEmailError('Email inválido'); return false; }
    setEmailError(''); return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) { setPasswordError('Senha é obrigatória'); return false; }
    if (value.length < 8) { setPasswordError('Mínimo 8 caracteres'); return false; }
    setPasswordError(''); return true;
  };

  const decodeJWT = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return { userId: payload.sub || payload.userId, email: payload.email };
    } catch { return null; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setEmailError(''); setPasswordError('');
    if (!validateEmail(email) || !validatePassword(password)) return;
    setIsLoading(true);
    try {
      const { accessToken, refreshToken } = await authService.login({ email, password });
      setTokens(accessToken, refreshToken);
      const decoded = decodeJWT(accessToken);
      if (decoded) useAuthStore.getState().setUser({ id: decoded.userId, email: decoded.email });
      navigate('/chat');
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Muitas tentativas')) {
        setError(err.message);
      } else {
        setError('Credenciais inválidas. Por favor, tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SkipLink />
      <div className="h-screen flex items-center justify-center bg-[#f0f4f8] px-4 overflow-hidden">
        <main id="main-content" className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm px-8 py-10">
            {}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-[#1a1a2e] tracking-tight">Entrar na sua conta</h1>
              <p className="mt-1 text-sm text-[#8a8a9a]">Digite suas credenciais para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div role="alert" aria-live="polite" className="text-xs text-[#e53e3e] bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                  {error}
                </div>
              )}

              {}
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="off"
                  required
                  aria-describedby={emailError ? 'email-error' : undefined}
                  aria-invalid={!!emailError}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="Email"
                  className={`w-full px-4 py-3 rounded-lg border text-sm text-[#1a1a2e] placeholder-[#b0b0c0] focus:outline-none focus:ring-2 focus:ring-[#4a7cf7] transition-all ${emailError ? 'border-red-400' : 'border-[#e2e8f0]'}`}
                />
                {emailError && <p id="email-error" role="alert" className="mt-1 text-xs text-[#e53e3e]">{emailError}</p>}
              </div>

              {}
              <div>
                <label htmlFor="password" className="sr-only">Senha</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="off"
                    required
                    aria-describedby={passwordError ? 'password-error' : undefined}
                    aria-invalid={!!passwordError}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                    placeholder="Password"
                    className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm text-[#1a1a2e] placeholder-[#b0b0c0] focus:outline-none focus:ring-2 focus:ring-[#4a7cf7] transition-all ${passwordError ? 'border-red-400' : 'border-[#e2e8f0]'}`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0b0c0] hover:text-[#8a8a9a] focus:outline-none"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordError && <p id="password-error" role="alert" className="mt-1 text-xs text-[#e53e3e]">{passwordError}</p>}
              </div>

              {}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[#6e6e80] cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 rounded border-[#e2e8f0] text-[#4a7cf7] focus:ring-[#4a7cf7]" />
                  Lembrar-me
                </label>
                <button type="button" className="text-sm text-[#4a7cf7] hover:underline focus:outline-none">
                  Esqueceu a senha?
                </button>
              </div>

              {}
              <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="w-full py-3 bg-[#4a7cf7] hover:bg-[#3a6ce7] text-white text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#4a7cf7] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#8a8a9a]">
              Não tem uma conta?{' '}
              <Link to="/signup" className="text-[#4a7cf7] font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-[#4a7cf7] rounded">
                Criar conta
              </Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
