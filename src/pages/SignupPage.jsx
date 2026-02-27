import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { USER_ROLES } from '../lib/roles';

function SignupPage({ user }) {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('enterprise');
  const [form, setForm] = useState({
    email: '',
    password: '',
    companyName: '',
    businessNumber: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const normalizedEmail = form.email.trim();
    const normalizedPassword = form.password;
    const isEnterprise = accountType === 'enterprise';
    const role = isEnterprise ? USER_ROLES.ENTERPRISE : USER_ROLES.GENERAL;

    if (!isFirebaseConfigured || !auth || !db) {
      setError('Firebase 설정이 없어 회원가입을 진행할 수 없습니다.');
      return;
    }

    if (isEnterprise && (!form.companyName.trim() || !form.businessNumber.trim() || !form.phone.trim())) {
      setError('사업자 회원가입은 기업명, 사업자등록번호, 전화번호가 필요합니다.');
      return;
    }

    try {
      setLoading(true);
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);

      try {
        await setDoc(doc(db, 'businessUsers', credential.user.uid), {
          uid: credential.user.uid,
          email: normalizedEmail,
          password: form.password,
          companyName: isEnterprise ? form.companyName.trim() : '',
          businessNumber: isEnterprise ? form.businessNumber.trim() : '',
          phone: isEnterprise ? form.phone.trim() : '',
          role,
          accountType,
          createdAt: serverTimestamp()
        });

        await signOut(auth);
        navigate('/login', {
          state: { message: '회원가입이 완료되었습니다. 바로 로그인할 수 있습니다.' }
        });
      } catch (firestoreError) {
        // Prevent orphaned Auth accounts when profile write fails.
        try {
          await credential.user.delete();
        } catch (deleteError) {
          // noop
        }
        throw firestoreError;
      }
    } catch (submitError) {
      if (submitError?.code === 'auth/email-already-in-use') {
        setError('이미 등록된 이메일입니다.');
      } else if (submitError?.code === 'permission-denied') {
        setError('Firestore 권한 오류입니다. 관리자에게 규칙 배포 상태를 확인해 주세요.');
      } else {
        setError(`회원가입에 실패했습니다. (${submitError?.code ?? 'unknown-error'})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1240px] items-center px-6 pb-20 pt-28 sm:px-10">
      <div className="grid w-full items-stretch gap-6 lg:grid-cols-[minmax(0,760px)_1fr]">
        <section className="w-full rounded-2xl border border-[var(--line)] bg-white p-8 shadow-[0_26px_55px_-38px_rgba(15,23,42,0.55)] sm:p-10">
          <p className="text-xs font-semibold tracking-[0.15em] text-[var(--muted)]">SIGNUP</p>
          <h1 className="mt-2 font-brand text-3xl tracking-[0.05em] text-[var(--navy)]">회원가입</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">사업자/일반 회원 유형을 선택해 가입할 수 있습니다.</p>

          <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="sm:col-span-2">
              <p className="form-label">회원 유형</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy)]">
                  <input
                    type="radio"
                    name="account-type"
                    value="enterprise"
                    checked={accountType === 'enterprise'}
                    onChange={(event) => setAccountType(event.target.value)}
                  />
                  사업자 회원가입
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy)]">
                  <input
                    type="radio"
                    name="account-type"
                    value="general"
                    checked={accountType === 'general'}
                    onChange={(event) => setAccountType(event.target.value)}
                  />
                  일반 회원가입
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="signup-email">
                이메일
              </label>
              <input
                id="signup-email"
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={onChange('email')}
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="signup-password">
                비밀번호
              </label>
              <input
                id="signup-password"
                type="password"
                className="form-input"
                placeholder="8자 이상 비밀번호"
                value={form.password}
                onChange={onChange('password')}
                minLength={8}
                required
              />
            </div>

            {accountType === 'enterprise' ? (
              <>
                <div>
                  <label className="form-label" htmlFor="signup-company-name">
                    기업명
                  </label>
                  <input
                    id="signup-company-name"
                    type="text"
                    className="form-input"
                    placeholder="민웰파워"
                    value={form.companyName}
                    onChange={onChange('companyName')}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="signup-business-number">
                    사업자등록번호
                  </label>
                  <input
                    id="signup-business-number"
                    type="text"
                    className="form-input"
                    placeholder="123-45-67890"
                    value={form.businessNumber}
                    onChange={onChange('businessNumber')}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label" htmlFor="signup-phone">
                    전화번호
                  </label>
                  <input
                    id="signup-phone"
                    type="text"
                    className="form-input"
                    placeholder="010-1234-5678"
                    value={form.phone}
                    onChange={onChange('phone')}
                    required
                  />
                </div>
              </>
            ) : null}

            {error ? <p className="sm:col-span-2 text-sm font-medium text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="sm:col-span-2 w-full rounded-md bg-[var(--gold)] px-4 py-3 text-sm font-bold tracking-[0.05em] text-[#101a2f] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <p className="mt-6 text-sm text-[var(--muted)]">
            이미 계정이 있나요?{' '}
            <Link to="/login" className="font-semibold text-[var(--navy)] hover:underline">
              로그인
            </Link>
          </p>
        </section>

        <aside className="hidden rounded-2xl border border-[var(--line)] bg-[linear-gradient(150deg,#0c1831_0%,#15284d_58%,#1f3560_100%)] p-8 text-white shadow-[0_28px_60px_-40px_rgba(8,14,30,0.75)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-white/70">MEANWELLPOWER ONBOARDING</p>
            <h2 className="mt-3 font-brand text-4xl leading-tight tracking-[0.07em]">민웰파워</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              회원 유형을 선택해 가입하고 로그인 후 견적 요청, 주문 진행 기능을 사용할 수 있습니다.
            </p>
          </div>
          <p className="text-xs tracking-[0.12em] text-white/60">ACCOUNT REGISTRATION</p>
        </aside>
      </div>
    </main>
  );
}

export default SignupPage;
