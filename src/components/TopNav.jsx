import { Link, NavLink } from 'react-router-dom';
import { USER_ROLES, roleLabel } from '../lib/roles';

const navItems = [
  { label: 'BUSINESS', to: '/business' },
  { label: 'MEANWELL SMPS' , to: '/products' },
  { label: 'VALUES' , to: '/value' },
  { label: 'CONTACT', to: '/contact' },
];

function TopNav({ user, profile, onLogout }) {
  const userLabel = user?.isAnonymous ? '관리자 세션' : profile?.companyName || user?.email;
  const isAdmin = profile?.role === USER_ROLES.ADMIN;
  const roleClassName =
    isAdmin
      ? 'border-sky-300/80 bg-sky-100 text-sky-800'
      : profile?.role === USER_ROLES.ENTERPRISE
        ? 'border-emerald-300/80 bg-emerald-100 text-emerald-800'
        : 'border-amber-300/80 bg-amber-100 text-amber-800';

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[rgba(7,16,36,0.92)] backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-[1320px] items-center justify-between px-5 sm:px-10">
        <Link to="/" className="font-brand text-lg uppercase tracking-[0.14em] text-[var(--gold)] sm:text-2xl">
          MEANWELL POWER
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) =>
            item.to ? (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `text-xs font-semibold tracking-[0.08em] transition ${
                    isActive ? 'text-[var(--gold)]' : 'text-white/90 hover:text-[var(--gold)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ) : (
              <button
                key={item.label}
                className="text-xs font-semibold tracking-[0.08em] text-white/90 transition hover:text-[var(--gold)]"
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
          {user ? (
            <>
              <span className="hidden rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 font-medium text-white/85 lg:block">
                {userLabel}
              </span>
              {profile?.role ? (
                <span
                  className={`rounded-md border px-2.5 py-1.5 font-semibold tracking-[0.04em] ${roleClassName}`}
                >
                  {roleLabel(profile.role)}
                </span>
              ) : null}
              {isAdmin ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `rounded-md border px-2.5 py-1.5 font-semibold tracking-[0.06em] transition sm:px-3 ${
                      isActive
                        ? 'border-[var(--gold)] bg-[var(--gold)] text-[#101a2f]'
                        : 'border-[var(--gold)]/70 text-[var(--gold)] hover:border-[var(--gold)]'
                    }`
                  }
                >
                  ADMIN
                </NavLink>
              ) : (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-md border border-white/20 px-2.5 py-1.5 font-semibold tracking-[0.06em] text-white/45 sm:px-3"
                >
                  ADMIN
                </button>
              )}
              <button
                onClick={onLogout}
                className="rounded-md bg-[var(--gold)] px-2.5 py-1.5 font-bold tracking-[0.06em] text-[#101a2f] sm:px-3"
              >
                로그아웃
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `rounded-md border px-2.5 py-1.5 font-semibold tracking-[0.06em] transition sm:px-3 ${
                  isActive
                    ? 'border-[var(--gold)] text-[var(--gold)]'
                    : 'border-white/25 text-white/85 hover:border-white/50'
                }`
              }
            >
              사업자 로그인
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopNav;
