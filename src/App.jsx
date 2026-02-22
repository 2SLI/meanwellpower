import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import TopNav from './components/TopNav';
import GlobalOrderDock from './components/GlobalOrderDock';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProductDetailPage from './pages/ProductDetailPage';
import BusinessPage from './pages/BusinessPage';
import ContactPage from './pages/ContactPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import QuoteRequestsPage from './pages/QuoteRequestsPage';
import { auth, db } from './lib/firebase';
import { canLogin, resolveRole } from './lib/roles';
import ValuePage from './pages/ValuePage';
import ProductPage from './pages/ProductPage';

const AdminPage = lazy(() => import('./pages/AdminPage'));

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setProfile(null);
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser || !db) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, 'businessUsers', nextUser.uid));
        const profileData = snapshot.exists() ? snapshot.data() : null;
        const role = resolveRole(profileData);

        if (!canLogin(role)) {
          await signOut(auth);
          setUser(null);
          setProfile(null);
          return;
        }

        setProfile({ ...(profileData || {}), role });
      } catch (error) {
        setProfile(null);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (!auth) {
      return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      // noop
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <TopNav user={user} profile={profile} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage user={user} profile={profile} />} />
        <Route path="/business" element={<BusinessPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/value" element={<ValuePage />} />
        <Route path="/login" element={<LoginPage user={user} />} />
        <Route path="/signup" element={<SignupPage user={user} />} />
        <Route path="/orders/history" element={<OrderHistoryPage user={user} profile={profile} authReady={authReady} />} />
        <Route path="/quotes/requests" element={<QuoteRequestsPage user={user} profile={profile} authReady={authReady} />} />
        <Route
          path="/admin"
          element={
            <Suspense
              fallback={
                <main className="mx-auto min-h-screen w-full max-w-[1320px] px-6 pb-20 pt-28 sm:px-10">
                  <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
                    <p className="text-sm text-[var(--muted)]">관리자 페이지 로딩 중...</p>
                  </section>
                </main>
              }
            >
              <AdminPage user={user} profile={profile} authReady={authReady} />
            </Suspense>
          }
        />
        <Route path="/products/:slug" element={<ProductDetailPage user={user} profile={profile} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/products" element={<ProductPage user={user} profile={profile} />} />
      </Routes>
      <GlobalOrderDock user={user} profile={profile} />
    </div>
  );
}

export default App;
