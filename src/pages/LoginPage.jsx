import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore/lite';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { USER_ROLES, canLogin, resolveRole } from '../lib/roles';

function LoginPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const infoMessage = location.state?.message ?? '';

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isFirebaseConfigured || !auth) {
      setError('Firebase 설정이 없어 로그인할 수 없습니다. public/firebase-config.js를 확인하세요.');
      return;
    }

    try {
      setLoading(true);
      const credential = await signInWithEmailAndPassword(auth, email, password);

      if (!db) {
        await signOut(auth);
        setError('회원 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      const profileSnapshot = await getDoc(doc(db, 'businessUsers', credential.user.uid));
      const profileData = profileSnapshot.exists() ? profileSnapshot.data() : null;
      const role = resolveRole(profileData);

      if (!canLogin(role)) {
        await signOut(auth);
        setError('로그인할 수 없는 계정입니다.');
        return;
      }

      if (role === USER_ROLES.ADMIN) {
        navigate('/admin');
        return;
      }

      navigate('/');
    } catch (submitError) {
      setError('로그인에 실패했습니다. 이메일/비밀번호를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1240px] items-center px-6 pb-20 pt-28 sm:px-10">
      <div className="grid w-full items-stretch gap-6 lg:grid-cols-[minmax(0,640px)_1fr]">
        <section className="w-full rounded-2xl border border-[var(--line)] bg-white p-8 shadow-[0_26px_55px_-38px_rgba(15,23,42,0.55)] sm:p-10">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">BUSINESS LOGIN</p>
          <h1 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">로그인</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">이메일/비밀번호로 로그인 후 주문과 견적을 관리하세요.</p>
          {infoMessage ? <p className="mt-3 text-sm font-medium text-emerald-700">{infoMessage}</p> : null}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="form-label" htmlFor="login-email">
                이메일
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="login-password">
                비밀번호
              </label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[var(--gold)] px-4 py-3 text-sm font-bold tracking-[0.05em] text-[#101a2f] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="mt-6 text-sm text-[var(--muted)]">
            아직 계정이 없나요?{' '}
            <Link to="/signup" className="font-semibold text-[var(--navy)] hover:underline">
              회원가입
            </Link>
          </p>
        </section>

        <aside className="hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(150deg,#0c1831_0%,#15284d_58%,#1f3560_100%)] p-8 text-white shadow-[0_28px_60px_-40px_rgba(8,14,30,0.75)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-white/70">MEANWELLPOWER B2B</p>
            <h2 className="mt-3 font-brand text-4xl leading-tight tracking-[0.07em]">민웰파워</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              산업용 전원 공급의 안정성과 속도를 동시에 제공합니다. 로그인 후 견적, 주문, 승인 상태를 한 번에
              관리하세요.
            </p>
          </div>
          <p className="text-xs tracking-[0.12em] text-white/60">POWER SOLUTIONS FOR INDUSTRY</p>
        </aside>
      </div>
    </main>
  );
}

export default LoginPage;
