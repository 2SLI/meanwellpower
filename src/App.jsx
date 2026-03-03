import { Suspense, lazy, useEffect, useLayoutEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore/lite';
import TopNav from './components/TopNav';
import GlobalOrderDock from './components/GlobalOrderDock';
import SiteFooter from './components/SiteFooter';
import HomePage from './pages/HomePage';
import { auth, db } from './lib/firebase';
import { canLogin, resolveRole } from './lib/roles';

const AdminPage = lazy(() => import('./pages/AdminPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const BusinessPage = lazy(() => import('./pages/BusinessPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const QuoteRequestsPage = lazy(() => import('./pages/QuoteRequestsPage'));
const OrderCheckoutPage = lazy(() => import('./pages/OrderCheckoutPage'));
const ValuePage = lazy(() => import('./pages/ValuePage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));

function SeoRouteMeta() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const isProductDetail = /^\/products\/[^/]+$/.test(path);

    let title = '민웰파워 | 산업용 전원 쇼핑몰';
    let description =
      '민웰파워는 MEAN WELL(민웰) SMPS 전원공급장치를 공급하는 B2B 전문 쇼핑몰입니다.';

    if (path === '/products') {
      title = 'MEAN WELL SMPS 제품목록 | 민웰파워';
      description = '민웰 SMPS 모델별 공급가와 제품 정보를 확인하고 빠르게 발주하세요.';
    } else if (isProductDetail) {
      title = '민웰 SMPS 제품 상세 | 민웰파워';
      description = '민웰파워 제품 상세 정보, 공급가, 납기 정보를 확인하세요.';
    } else if (path === '/business') {
      title = '기업구매 안내 | 민웰파워';
    } else if (path === '/contact') {
      title = '문의하기 | 민웰파워';
    }

    document.title = title;

    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', description);
    }
  }, [location.pathname]);

  return null;
}

function ScrollToTopOnRouteChange() {
  const location = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const rafId = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    const timeoutId = window.setTimeout(() => {
      window.scrollTo(0, 0);
    }, 120);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname]);

  return null;
}

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
      <SeoRouteMeta />
      <ScrollToTopOnRouteChange />
      <TopNav user={user} profile={profile} onLogout={handleLogout} />
      <Suspense
        fallback={
          <main className="mx-auto min-h-screen w-full max-w-[1320px] px-6 pb-20 pt-28 sm:px-10">
            <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
              <p className="text-sm text-[var(--muted)]">페이지 로딩 중...</p>
            </section>
          </main>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage user={user} profile={profile} />} />
          <Route path="/business" element={<BusinessPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/value" element={<ValuePage />} />
          <Route path="/login" element={<LoginPage user={user} />} />
          <Route path="/signup" element={<SignupPage user={user} />} />
          <Route path="/orders/history" element={<OrderHistoryPage user={user} profile={profile} authReady={authReady} />} />
          <Route path="/orders/checkout" element={<OrderCheckoutPage user={user} profile={profile} authReady={authReady} />} />
          <Route path="/quotes/requests" element={<QuoteRequestsPage user={user} profile={profile} authReady={authReady} />} />
          <Route path="/admin" element={<AdminPage user={user} profile={profile} authReady={authReady} />} />
          <Route path="/products/:slug" element={<ProductDetailPage user={user} profile={profile} />} />
          <Route path="/products" element={<ProductPage user={user} profile={profile} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <SiteFooter />
      <GlobalOrderDock user={user} profile={profile} />
    </div>
  );
}

export default App;
