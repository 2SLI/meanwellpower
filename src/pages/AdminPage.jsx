import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  AlertTriangle,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  PackagePlus,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Wallet
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { db, isFirebaseConfigured, storage } from '../lib/firebase';
import { products as sampleProducts } from '../data/products';
import { USER_ROLES, resolveRole, roleLabel } from '../lib/roles';
import { readOrderRequests, subscribeOrderUpdates } from '../lib/orderRequests';
import { getCatalogProducts, normalizeSlug, subscribeCatalogUpdates, upsertCatalogProduct } from '../lib/productCatalog';

const ADMIN_TABS = [
  { id: 'product-create', label: '상품등록', icon: PackagePlus },
  { id: 'product-status', label: '상품현황', icon: Boxes },
  { id: 'companies', label: '기업현황', icon: Building2 },
  { id: 'orders', label: '발주현황', icon: ClipboardList },
  { id: 'quotes', label: '견적요청', icon: FileText }
];

const ROLE_COLORS = {
  [USER_ROLES.PENDING]: '#f59e0b',
  [USER_ROLES.ENTERPRISE]: '#059669',
  [USER_ROLES.ADMIN]: '#0284c7'
};

const ORDER_STATUS = ['접수대기', '검토중', '출고완료'];

const EMPTY_PRODUCT_FORM = {
  brand: 'MEAN WELL',
  slug: '',
  model: '',
  category: '',
  spec: '',
  leadTime: '',
  supplyPrice: '',
  wholesalePrice: '',
  image: '',
  detailImage1: '',
  detailImage2: '',
  detailImage3: '',
  description: '',
  features: '',
  specInput: '',
  specOutputVoltage: '',
  specOutputCurrent: '',
  specPower: '',
  specEfficiency: '',
  specOperatingTemp: ''
};

function toDate(timestamp) {
  if (!timestamp) {
    return null;
  }
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
  return null;
}

function parsePrice(value) {
  return Number(String(value ?? '').replace(/[^\d]/g, '')) || 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit'
  }).format(value);
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function statusClass(status) {
  if (status === '출고완료') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  }
  if (status === '검토중') {
    return 'border-sky-300 bg-sky-50 text-sky-700';
  }
  return 'border-amber-300 bg-amber-50 text-amber-700';
}

function cleanFeatures(value) {
  return String(value ?? '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function AdminPage({ user, profile, authReady }) {
  const [activeTab, setActiveTab] = useState('product-status');
  const [catalogProducts, setCatalogProducts] = useState(() => getCatalogProducts());

  const [members, setMembers] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [orderRequests, setOrderRequests] = useState(() => readOrderRequests());

  const [fxRate, setFxRate] = useState(null);
  const [fxUpdatedAt, setFxUpdatedAt] = useState('');
  const [fxError, setFxError] = useState('');

  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [registerNotice, setRegisterNotice] = useState('');
  const [registerError, setRegisterError] = useState('');

  // ✅ 이미지 업로드 상태
  const [uploadingField, setUploadingField] = useState('');
  const [uploadProgressText, setUploadProgressText] = useState('');

  const isAdmin = authReady && profile?.role === USER_ROLES.ADMIN;

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        const aTime = a.createdAt?.seconds ?? 0;
        const bTime = b.createdAt?.seconds ?? 0;
        return bTime - aTime;
      }),
    [members]
  );

  const roleStats = useMemo(() => {
    const base = {
      [USER_ROLES.PENDING]: 0,
      [USER_ROLES.ENTERPRISE]: 0,
      [USER_ROLES.ADMIN]: 0
    };

    sortedMembers.forEach((member) => {
      const role = resolveRole(member);
      base[role] += 1;
    });

    return base;
  }, [sortedMembers]);

  const roleChartData = useMemo(
    () => [
      { name: '승인 대기중', value: roleStats[USER_ROLES.PENDING], color: ROLE_COLORS[USER_ROLES.PENDING] },
      { name: '기업 회원', value: roleStats[USER_ROLES.ENTERPRISE], color: ROLE_COLORS[USER_ROLES.ENTERPRISE] },
      { name: '관리자', value: roleStats[USER_ROLES.ADMIN], color: ROLE_COLORS[USER_ROLES.ADMIN] }
    ],
    [roleStats]
  );

  const signupTrend = useMemo(() => {
    const grouped = new Map();

    sortedMembers.forEach((member) => {
      const created = toDate(member.createdAt);
      if (!created) {
        return;
      }

      const key = created.toISOString().slice(0, 10);
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([key, value]) => ({
        date: formatDate(new Date(`${key}T00:00:00`)),
        가입수: value
      }));
  }, [sortedMembers]);

  const productCategoryData = useMemo(() => {
    const map = new Map();

    catalogProducts.forEach((product) => {
      map.set(product.category, (map.get(product.category) ?? 0) + 1);
    });

    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }, [catalogProducts]);

  const productMarginData = useMemo(
    () =>
      catalogProducts.map((product) => {
        const supply = parsePrice(product.supplyPrice);
        const wholesale = parsePrice(product.wholesalePrice);
        const discountRate = supply > 0 ? (((supply - wholesale) / supply) * 100).toFixed(1) : 0;

        return {
          slug: product.slug,
          image: product.image,
          model: product.model,
          category: product.category,
          spec: product.spec,
          source: product.source === 'custom' ? '직접등록' : '기본샘플',
          supplyPrice: product.supplyPrice,
          wholesalePrice: product.wholesalePrice,
          공급가: Math.round(supply / 1000),
          도매가: Math.round(wholesale / 1000),
          할인율: Number(discountRate)
        };
      }),
    [catalogProducts]
  );

  const orderSummary = useMemo(() => {
    const totalAmount = orders.reduce((sum, row) => sum + row.total, 0);
    const totalItems = orders.reduce((sum, row) => sum + row.totalProducts, 0);

    return {
      count: orders.length,
      totalAmount,
      avgAmount: orders.length ? Math.round(totalAmount / orders.length) : 0,
      totalItems
    };
  }, [orders]);

  const orderRequestsByType = useMemo(
    () => ({
      orders: orderRequests.filter((row) => row.type !== 'quote'),
      quotes: orderRequests.filter((row) => row.type === 'quote')
    }),
    [orderRequests]
  );

  const orderRequestSummary = useMemo(() => {
    const totalAmount = orderRequestsByType.orders.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    return {
      count: orderRequestsByType.orders.length,
      totalAmount
    };
  }, [orderRequestsByType]);

  const quoteRequestSummary = useMemo(() => {
    const totalAmount = orderRequestsByType.quotes.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    return {
      count: orderRequestsByType.quotes.length,
      totalAmount
    };
  }, [orderRequestsByType]);

  const loadMembers = useCallback(async () => {
    if (!db) {
      return;
    }

    try {
      setMemberLoading(true);
      setMemberError('');

      const snapshot = await getDocs(collection(db, 'businessUsers'));
      const rows = snapshot.docs.map((snapshotDoc) => {
        const data = snapshotDoc.data();
        return {
          id: snapshotDoc.id,
          ...data,
          role: resolveRole(data)
        };
      });

      setMembers(rows);
    } catch (fetchError) {
      setMemberError('회원 목록을 불러오지 못했습니다. Firestore 규칙을 확인하세요.');
    } finally {
      setMemberLoading(false);
    }
  }, []);

  const loadExchangeRate = useCallback(async () => {
    try {
      setFxError('');
      const response = await fetch('https://open.er-api.com/v6/latest/USD');

      if (!response.ok) {
        throw new Error('exchange-rate-fetch-failed');
      }

      const data = await response.json();
      const value = Number(data?.rates?.KRW ?? 0);
      if (!value) {
        throw new Error('exchange-rate-invalid');
      }

      setFxRate(value);
      setFxUpdatedAt(data?.time_last_update_utc ?? '');
    } catch (error) {
      setFxError('환율 API를 불러오지 못했습니다. 잠시 후 다시 시도하세요.');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      setOrdersError('');

      const response = await fetch('https://dummyjson.com/carts?limit=18');
      if (!response.ok) {
        throw new Error('orders-fetch-failed');
      }

      const data = await response.json();
      const mapped = (data?.carts ?? []).map((cart) => {
        const status = ORDER_STATUS[cart.id % ORDER_STATUS.length];

        return {
          id: cart.id,
          userId: cart.userId,
          total: Number(cart.total ?? 0),
          discountedTotal: Number(cart.discountedTotal ?? 0),
          totalProducts: Number(cart.totalProducts ?? 0),
          totalQuantity: Number(cart.totalQuantity ?? 0),
          status,
          createdAt: new Date(Date.now() - cart.id * 86400000)
        };
      });

      setOrders(mapped);
    } catch (error) {
      setOrdersError('발주 API를 불러오지 못했습니다. 기본 데이터로 표시합니다.');

      const source = catalogProducts.length ? catalogProducts : sampleProducts;
      const fallback = source.map((product, index) => ({
        id: index + 1,
        userId: 100 + index,
        total: parsePrice(product.wholesalePrice) * 5,
        discountedTotal: parsePrice(product.wholesalePrice) * 4,
        totalProducts: 1,
        totalQuantity: 5,
        status: ORDER_STATUS[index % ORDER_STATUS.length],
        createdAt: new Date(Date.now() - index * 86400000)
      }));

      setOrders(fallback);
    } finally {
      setOrdersLoading(false);
    }
  }, [catalogProducts]);

  useEffect(() => {
    return subscribeCatalogUpdates(() => {
      setCatalogProducts(getCatalogProducts());
    });
  }, []);

  useEffect(() => {
    if (!authReady || !user || profile?.role !== USER_ROLES.ADMIN) {
      setOrderRequests([]);
      return () => {};
    }

    return subscribeOrderUpdates(
      () => {
        setOrderRequests(readOrderRequests());
      },
      { uid: user.uid, role: profile?.role }
    );
  }, [authReady, user?.uid, profile?.role]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    loadMembers();
    loadExchangeRate();
    setCatalogProducts(getCatalogProducts());
    setOrderRequests(readOrderRequests());
  }, [isAdmin, loadExchangeRate, loadMembers]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'orders') {
      return;
    }

    loadOrders();
  }, [isAdmin, activeTab, loadOrders]);

  const onSetRole = async (member, nextRole) => {
    if (!db) {
      return;
    }

    try {
      setUpdatingId(member.id);
      setMemberError('');

      await updateDoc(doc(db, 'businessUsers', member.id), {
        role: nextRole,
        approved: nextRole !== USER_ROLES.PENDING,
        approvedAt: nextRole === USER_ROLES.PENDING ? null : serverTimestamp()
      });

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id
            ? {
                ...row,
                role: nextRole,
                approved: nextRole !== USER_ROLES.PENDING
              }
            : row
        )
      );
    } catch (updateError) {
      setMemberError('역할 변경에 실패했습니다.');
    } finally {
      setUpdatingId('');
    }
  };

  const onChangeProductForm = (field) => (event) => {
    setProductForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onApplyTemplate = (template) => {
    setRegisterError('');
    setRegisterNotice(`${template.model} 템플릿을 불러왔습니다.`);

    setProductForm({
      brand: template.brand ?? 'MEAN WELL',
      slug: template.slug ?? '',
      model: template.model ?? '',
      category: template.category ?? '',
      spec: template.spec ?? '',
      leadTime: template.leadTime ?? '',
      supplyPrice: template.supplyPrice ?? '',
      wholesalePrice: template.wholesalePrice ?? '',
      image: template.image ?? '',
      detailImage1: template.detailImages?.[0] ?? template.image ?? '',
      detailImage2: template.detailImages?.[1] ?? '',
      detailImage3: template.detailImages?.[2] ?? '',
      description: template.description ?? '',
      features: (template.features ?? []).join(', '),
      specInput: template.specs?.input ?? '',
      specOutputVoltage: template.specs?.outputVoltage ?? '',
      specOutputCurrent: template.specs?.outputCurrent ?? '',
      specPower: template.specs?.power ?? '',
      specEfficiency: template.specs?.efficiency ?? '',
      specOperatingTemp: template.specs?.operatingTemp ?? ''
    });
  };

  // ✅ Storage 업로드 유틸
  const uploadImageToStorage = async (file, pathPrefix = 'products') => {
    if (!storage) {
      throw new Error('storage-not-configured');
    }
    if (!file) {
      throw new Error('file-empty');
    }

    const safeName = String(file.name || 'image')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '');

    const ext = safeName.includes('.') ? safeName.split('.').pop() : 'jpg';
    const fileId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const storagePath = `${pathPrefix}/${fileId}.${ext}`;

    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type || undefined
    });

    const url = await getDownloadURL(storageRef);
    return url;
  };

  const onPickImageFile = (field) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 같은 파일 다시 선택해도 change 뜨게 초기화
    event.target.value = '';

    try {
      setRegisterError('');
      setRegisterNotice('');
      setUploadingField(field);
      setUploadProgressText('이미지 업로드 중...');

      const folderKey = normalizeSlug(productForm.slug || productForm.model || 'unknown');
      const url = await uploadImageToStorage(file, `products/${folderKey}`);

      setProductForm((prev) => ({
        ...prev,
        [field]: url
      }));

      setRegisterNotice('이미지 업로드 완료! URL이 자동 입력되었습니다.');
    } catch (err) {
      setRegisterError('이미지 업로드에 실패했습니다. Storage 설정/권한을 확인해 주세요.');
    } finally {
      setUploadProgressText('');
      setUploadingField('');
    }
  };

  const onSubmitProductForm = (event) => {
    event.preventDefault();

    setRegisterError('');
    setRegisterNotice('');

    const slug = normalizeSlug(productForm.slug || productForm.model);
    const model = productForm.model.trim();
    const category = productForm.category.trim();
    const spec = productForm.spec.trim();
    const mainImage = productForm.image.trim();

    if (!slug || !model || !category || !spec || !mainImage) {
      setRegisterError('모델명, 카테고리, 스펙, 메인이미지는 필수입니다.');
      return;
    }

    const detailImages = [productForm.detailImage1, productForm.detailImage2, productForm.detailImage3]
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      slug,
      brand: productForm.brand.trim() || 'MEAN WELL',
      model,
      category,
      spec,
      leadTime: productForm.leadTime.trim() || '납기 확인 필요',
      supplyPrice: productForm.supplyPrice.trim(),
      wholesalePrice: productForm.wholesalePrice.trim(),
      image: mainImage,
      detailImages: detailImages.length ? detailImages : [mainImage],
      description: productForm.description.trim(),
      features: cleanFeatures(productForm.features),
      specs: {
        input: productForm.specInput.trim(),
        outputVoltage: productForm.specOutputVoltage.trim(),
        outputCurrent: productForm.specOutputCurrent.trim(),
        power: productForm.specPower.trim(),
        efficiency: productForm.specEfficiency.trim(),
        operatingTemp: productForm.specOperatingTemp.trim()
      }
    };

    try {
      upsertCatalogProduct(payload);
      setCatalogProducts(getCatalogProducts());
      setRegisterNotice(`${model} 상품이 등록되었습니다. 판매 페이지에서 바로 확인할 수 있습니다.`);
      setProductForm(EMPTY_PRODUCT_FORM);
      setActiveTab('product-status');
    } catch (error) {
      setRegisterError('상품 등록에 실패했습니다. 입력값을 다시 확인해 주세요.');
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1320px] items-center px-6 pb-20 pt-28 sm:px-10">
        <section className="w-full rounded-2xl border border-[var(--line)] bg-white p-8">
          <h1 className="font-brand text-3xl text-[var(--navy)]">Admin Page</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Firebase가 설정되지 않아 관리자 페이지를 사용할 수 없습니다. `public/firebase-config.js`를 먼저 확인하세요.
          </p>
        </section>
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1320px] px-6 pb-20 pt-28 sm:px-10">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
          <p className="text-sm text-[var(--muted)]">로그인 정보를 확인하는 중입니다...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ message: '관리자 계정으로 로그인 후 접근할 수 있습니다.' }} />;
  }

  if (!profile) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1320px] px-6 pb-20 pt-28 sm:px-10">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-8">
          <p className="text-sm text-[var(--muted)]">권한 정보를 불러오지 못했습니다. 다시 로그인해 주세요.</p>
        </section>
      </main>
    );
  }

  if (profile.role !== USER_ROLES.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1320px] px-6 pb-20 pt-28 sm:px-10">
      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_26px_55px_-38px_rgba(15,23,42,0.55)]">
        <div className="bg-[linear-gradient(120deg,#0c1831_0%,#15284d_55%,#1f3560_100%)] px-7 py-7 text-white sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-white/70">COMMERCE CONTROL TOWER</p>
              <h1 className="mt-2 font-brand text-3xl tracking-[0.05em]">MEANWELL ADMIN</h1>
              <p className="mt-2 text-sm text-white/80">
                쇼핑몰 운영 데이터, 상품 노출, 기업 회원 승인, 발주 상태를 한 페이지에서 관리합니다.
              </p>
            </div>
            <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-3">
              <p className="text-[11px] font-semibold tracking-[0.1em] text-white/70">LIVE USD/KRW</p>
              <p className="mt-1 font-brand text-2xl">{fxRate ? formatNumber(fxRate) : '-'}</p>
              <p className="mt-1 text-[11px] text-white/65">{fxUpdatedAt ? fxUpdatedAt : '환율 업데이트 대기중'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-[var(--line)] bg-[#f8fbff] p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">등록 상품</p>
                <Boxes className="h-4 w-4 text-[var(--muted)]" />
              </div>
              <p className="mt-3 font-brand text-3xl text-[var(--navy)]">{formatNumber(catalogProducts.length)}</p>
            </article>

            <article className="rounded-xl border border-[var(--line)] bg-[#f8fbff] p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">기업 회원</p>
                <Building2 className="h-4 w-4 text-[var(--muted)]" />
              </div>
              <p className="mt-3 font-brand text-3xl text-[var(--navy)]">{formatNumber(roleStats[USER_ROLES.ENTERPRISE])}</p>
            </article>

            <article className="rounded-xl border border-[var(--line)] bg-[#f8fbff] p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">승인 대기</p>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-3 font-brand text-3xl text-[var(--navy)]">{formatNumber(roleStats[USER_ROLES.PENDING])}</p>
            </article>

            <article className="rounded-xl border border-[var(--line)] bg-[#f8fbff] p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">월 발주 금액(예시)</p>
                <Wallet className="h-4 w-4 text-[var(--muted)]" />
              </div>
              <p className="mt-3 font-brand text-3xl text-[var(--navy)]">{formatNumber(orderSummary.totalAmount)}원</p>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <article className="rounded-xl border border-[var(--line)] bg-[#fcfdff] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold tracking-[0.05em] text-[var(--navy)]">최근 7일 기업 가입 추이</p>
                <TrendingUp className="h-4 w-4 text-[var(--muted)]" />
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={signupTrend.length ? signupTrend : [{ date: '데이터 없음', 가입수: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f2" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="가입수" stroke="#0c1831" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-xl border border-[var(--line)] bg-[#fcfdff] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold tracking-[0.05em] text-[var(--navy)]">회원 역할 분포</p>
                <ShieldCheck className="h-4 w-4 text-[var(--muted)]" />
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>
                      {roleChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={24} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <nav className="grid gap-2 sm:grid-cols-2 lg:flex">
            {ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold tracking-[0.04em] transition ${
                    activeTab === tab.id
                      ? 'border-[var(--navy)] bg-[var(--navy)] text-white'
                      : 'border-[var(--line)] bg-white text-[var(--navy)] hover:border-[var(--navy)]/35'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {activeTab === 'product-create' ? (
            <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
              <form className="rounded-xl border border-[var(--line)] bg-[#fcfdff] p-6" onSubmit={onSubmitProductForm}>
                <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">PRODUCT FORM</p>
                <h2 className="mt-2 font-brand text-2xl tracking-[0.04em] text-[var(--navy)]">샘플과 동일한 구조로 상품등록</h2>

                <div className="mt-4 flex flex-wrap gap-2">
                  {sampleProducts.map((template) => (
                    <button
                      key={template.slug}
                      type="button"
                      onClick={() => onApplyTemplate(template)}
                      className="rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--navy)] hover:border-[var(--navy)]/40"
                    >
                      {template.model} 템플릿
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="form-label">브랜드</label>
                    <input className="form-input" value={productForm.brand} onChange={onChangeProductForm('brand')} />
                  </div>
                  <div>
                    <label className="form-label">모델명 *</label>
                    <input className="form-input" value={productForm.model} onChange={onChangeProductForm('model')} required />
                  </div>
                  <div>
                    <label className="form-label">Slug (선택)</label>
                    <input
                      className="form-input"
                      value={productForm.slug}
                      onChange={onChangeProductForm('slug')}
                      placeholder="비우면 모델명 기반 자동생성"
                    />
                  </div>
                  <div>
                    <label className="form-label">카테고리 *</label>
                    <input className="form-input" value={productForm.category} onChange={onChangeProductForm('category')} required />
                  </div>
                  <div>
                    <label className="form-label">스펙 *</label>
                    <input className="form-input" value={productForm.spec} onChange={onChangeProductForm('spec')} required />
                  </div>
                  <div>
                    <label className="form-label">리드타임</label>
                    <input className="form-input" value={productForm.leadTime} onChange={onChangeProductForm('leadTime')} />
                  </div>
                  <div>
                    <label className="form-label">공급가 *</label>
                    <input className="form-input" value={productForm.supplyPrice} onChange={onChangeProductForm('supplyPrice')} required />
                  </div>
                  <div>
                    <label className="form-label">도매가 *</label>
                    <input className="form-input" value={productForm.wholesalePrice} onChange={onChangeProductForm('wholesalePrice')} required />
                  </div>

                  {/* ✅ 메인 이미지: URL + 파일 업로드 + 미리보기 */}
                  <div className="sm:col-span-2">
                    <label className="form-label">메인 이미지 *</label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        className="form-input"
                        value={productForm.image}
                        onChange={onChangeProductForm('image')}
                        placeholder="URL을 직접 붙여넣거나, 오른쪽에서 파일 업로드"
                        required
                      />
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--navy)] hover:border-[var(--navy)]/40">
                        {uploadingField === 'image' ? '업로드 중...' : '파일 업로드'}
                        <input type="file" accept="image/*" className="hidden" onChange={onPickImageFile('image')} />
                      </label>
                    </div>

                    {productForm.image ? (
                      <div className="mt-2 flex items-center gap-3 rounded-lg border border-[var(--line)] bg-white p-3">
                        <img
                          src={productForm.image}
                          alt="메인 이미지 미리보기"
                          className="h-16 w-16 rounded-md border border-[var(--line)] object-cover"
                        />
                        <p className="min-w-0 flex-1 truncate text-xs text-[var(--muted)]">{productForm.image}</p>
                      </div>
                    ) : null}
                  </div>

                  {/* ✅ 상세 이미지 1 */}
                  <div>
                    <label className="form-label">상세 이미지 1</label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        className="form-input"
                        value={productForm.detailImage1}
                        onChange={onChangeProductForm('detailImage1')}
                        placeholder="URL 또는 파일 업로드"
                      />
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--navy)] hover:border-[var(--navy)]/40">
                        {uploadingField === 'detailImage1' ? '업로드 중...' : '업로드'}
                        <input type="file" accept="image/*" className="hidden" onChange={onPickImageFile('detailImage1')} />
                      </label>
                    </div>
                    {productForm.detailImage1 ? (
                      <img
                        src={productForm.detailImage1}
                        alt="상세 이미지 1 미리보기"
                        className="mt-2 h-16 w-full rounded-md border border-[var(--line)] object-cover"
                      />
                    ) : null}
                  </div>

                  {/* ✅ 상세 이미지 2 */}
                  <div>
                    <label className="form-label">상세 이미지 2</label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        className="form-input"
                        value={productForm.detailImage2}
                        onChange={onChangeProductForm('detailImage2')}
                        placeholder="URL 또는 파일 업로드"
                      />
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--navy)] hover:border-[var(--navy)]/40">
                        {uploadingField === 'detailImage2' ? '업로드 중...' : '업로드'}
                        <input type="file" accept="image/*" className="hidden" onChange={onPickImageFile('detailImage2')} />
                      </label>
                    </div>
                    {productForm.detailImage2 ? (
                      <img
                        src={productForm.detailImage2}
                        alt="상세 이미지 2 미리보기"
                        className="mt-2 h-16 w-full rounded-md border border-[var(--line)] object-cover"
                      />
                    ) : null}
                  </div>

                  {/* ✅ 상세 이미지 3 */}
                  <div className="sm:col-span-2">
                    <label className="form-label">상세 이미지 3</label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        className="form-input"
                        value={productForm.detailImage3}
                        onChange={onChangeProductForm('detailImage3')}
                        placeholder="URL 또는 파일 업로드"
                      />
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--navy)] hover:border-[var(--navy)]/40">
                        {uploadingField === 'detailImage3' ? '업로드 중...' : '업로드'}
                        <input type="file" accept="image/*" className="hidden" onChange={onPickImageFile('detailImage3')} />
                      </label>
                    </div>
                    {productForm.detailImage3 ? (
                      <img
                        src={productForm.detailImage3}
                        alt="상세 이미지 3 미리보기"
                        className="mt-2 h-20 w-full rounded-md border border-[var(--line)] object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="form-label">설명</label>
                    <textarea className="form-input min-h-24" value={productForm.description} onChange={onChangeProductForm('description')} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">특징 (쉼표 또는 줄바꿈 구분)</label>
                    <textarea className="form-input min-h-20" value={productForm.features} onChange={onChangeProductForm('features')} />
                  </div>

                  <div>
                    <label className="form-label">입력 전압</label>
                    <input className="form-input" value={productForm.specInput} onChange={onChangeProductForm('specInput')} />
                  </div>
                  <div>
                    <label className="form-label">출력 전압</label>
                    <input className="form-input" value={productForm.specOutputVoltage} onChange={onChangeProductForm('specOutputVoltage')} />
                  </div>
                  <div>
                    <label className="form-label">출력 전류</label>
                    <input className="form-input" value={productForm.specOutputCurrent} onChange={onChangeProductForm('specOutputCurrent')} />
                  </div>
                  <div>
                    <label className="form-label">정격 출력</label>
                    <input className="form-input" value={productForm.specPower} onChange={onChangeProductForm('specPower')} />
                  </div>
                  <div>
                    <label className="form-label">효율</label>
                    <input className="form-input" value={productForm.specEfficiency} onChange={onChangeProductForm('specEfficiency')} />
                  </div>
                  <div>
                    <label className="form-label">동작 온도</label>
                    <input className="form-input" value={productForm.specOperatingTemp} onChange={onChangeProductForm('specOperatingTemp')} />
                  </div>
                </div>

                <button
                  disabled={Boolean(uploadingField)}
                  className="mt-4 rounded-md bg-[var(--gold)] px-5 py-2.5 text-sm font-bold tracking-[0.06em] text-[#101a2f] disabled:opacity-60"
                >
                  상품 업로드
                </button>

                {uploadProgressText ? <p className="mt-3 text-sm font-medium text-amber-700">{uploadProgressText}</p> : null}
                {registerNotice ? <p className="mt-4 text-sm font-medium text-emerald-700">{registerNotice}</p> : null}
                {registerError ? <p className="mt-4 text-sm font-medium text-red-600">{registerError}</p> : null}
              </form>

              <aside className="rounded-xl border border-[var(--line)] bg-[#0f1d38] p-6 text-white">
                <p className="text-xs font-semibold tracking-[0.12em] text-white/70">UPLOAD GUIDE</p>
                <h3 className="mt-2 font-brand text-2xl tracking-[0.04em]">등록 규칙</h3>
                <ul className="mt-4 space-y-2 text-sm text-white/85">
                  <li>샘플과 동일한 필드 구조(스펙/상세이미지/특징)로 등록됩니다.</li>
                  <li>같은 slug로 업로드하면 기존 상품이 자동 덮어쓰기 됩니다.</li>
                  <li>등록 즉시 쇼핑몰 목록/상세 페이지에 반영됩니다.</li>
                </ul>
                <p className="mt-6 text-xs text-white/65">
                  현재 등록 데이터는 브라우저 로컬 저장소 기준입니다. 운영 시 Firestore products 컬렉션으로 이관하세요.
                </p>
                </aside>
            </section>
          ) : null}

          {activeTab === 'product-status' ? (
            <section className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <article className="rounded-xl border border-[var(--line)] bg-[#fcfdff] p-5">
                  <p className="text-sm font-semibold tracking-[0.05em] text-[var(--navy)]">카테고리별 상품 수</p>
                  <div className="mt-3 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productCategoryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f2" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0c1831" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="rounded-xl border border-[var(--line)] bg-[#fcfdff] p-5">
                  <p className="text-sm font-semibold tracking-[0.05em] text-[var(--navy)]">모델별 가격(단위: 천원)</p>
                  <div className="mt-3 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productMarginData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e9f2" />
                        <XAxis dataKey="model" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="공급가" fill="#6b7280" radius={[5, 5, 0, 0]} />
                        <Bar dataKey="도매가" fill="#0c1831" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              </div>

              <article className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
                <table className="min-w-[1220px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[var(--navy)] text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">이미지</th>
                      <th className="px-4 py-3 font-semibold">모델명</th>
                      <th className="px-4 py-3 font-semibold">카테고리</th>
                      <th className="px-4 py-3 font-semibold">스펙</th>
                      <th className="px-4 py-3 font-semibold">공급가</th>
                      <th className="px-4 py-3 font-semibold">도매가</th>
                      <th className="px-4 py-3 font-semibold">할인율</th>
                      <th className="px-4 py-3 font-semibold">등록유형</th>
                      <th className="px-4 py-3 font-semibold">판매 페이지</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productMarginData.map((item) => (
                      <tr key={item.slug} className="border-t border-[var(--line)] bg-white">
                        <td className="px-4 py-3">
                          <img
                            src={item.image}
                            alt={`${item.model} 썸네일`}
                            className="h-14 w-14 rounded-md border border-[var(--line)] object-cover"
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--navy)]">{item.model}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{item.category}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{item.spec}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{item.supplyPrice}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{item.wholesalePrice}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{item.할인율}%</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                              item.source === '직접등록'
                                ? 'border border-sky-300 bg-sky-50 text-sky-700'
                                : 'border border-emerald-300 bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.source}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/products/${item.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-[var(--navy)] px-3 py-1.5 text-xs font-semibold tracking-[0.05em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
                          >
                            판매 페이지 보기
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {productMarginData.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-[var(--muted)]" colSpan={9}>
                          등록된 상품이 없습니다.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </article>
            </section>
          ) : null}

          {activeTab === 'companies' ? (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={loadMembers}
                  className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)]"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  회원 새로고침
                </button>
                <span className="rounded-md bg-[var(--navy)] px-3 py-2 text-xs font-semibold tracking-[0.06em] text-white">
                  회원 수 {sortedMembers.length}
                </span>
              </div>

              <article className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
                <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[var(--navy)] text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">이메일</th>
                      <th className="px-4 py-3 font-semibold">비밀번호</th>
                      <th className="px-4 py-3 font-semibold">기업명</th>
                      <th className="px-4 py-3 font-semibold">사업자등록번호</th>
                      <th className="px-4 py-3 font-semibold">전화번호</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMembers.map((member) => (
                      <tr key={member.id} className="border-t border-[var(--line)] bg-white align-top">
                        <td className="px-4 py-3 text-[var(--ink)]">{member.email ?? '-'}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{member.password ?? '-'}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{member.companyName ?? '-'}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{member.businessNumber ?? '-'}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{member.phone ?? '-'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-[#f3f5f8] px-2.5 py-1.5 text-xs font-semibold text-[var(--navy)]">
                            {roleLabel(member.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => onSetRole(member, USER_ROLES.PENDING)}
                              disabled={updatingId === member.id || member.role === USER_ROLES.PENDING}
                              className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 disabled:opacity-50"
                            >
                              승인대기
                            </button>
                            <button
                              onClick={() => onSetRole(member, USER_ROLES.ENTERPRISE)}
                              disabled={updatingId === member.id || member.role === USER_ROLES.ENTERPRISE}
                              className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                            >
                              기업회원
                            </button>
                            <button
                              onClick={() => onSetRole(member, USER_ROLES.ADMIN)}
                              disabled={updatingId === member.id || member.role === USER_ROLES.ADMIN}
                              className="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 disabled:opacity-50"
                            >
                              관리자
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {!memberLoading && sortedMembers.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-[var(--muted)]" colSpan={7}>
                          등록된 회원 정보가 없습니다.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </article>
            </section>
          ) : null}

          {activeTab === 'orders' ? (
            <section className="space-y-4">
              <article className="rounded-xl border border-[var(--line)] bg-[#fcfdff] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">SITE REQUESTS</p>
                    <h3 className="mt-1 font-brand text-xl tracking-[0.04em] text-[var(--navy)]">사이트 주문 요청</h3>
                  </div>
                  <span className="rounded-md bg-[var(--navy)] px-3 py-2 text-xs font-semibold tracking-[0.06em] text-white">
                    요청 {orderRequestSummary.count}건
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  누적 요청 금액(부가세 포함): {formatNumber(orderRequestSummary.totalAmount)}원
                </p>

                <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
                  <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
                    <thead className="bg-[var(--navy)] text-white">
                      <tr>
                        <th className="px-4 py-3 font-semibold">요청번호</th>
                        <th className="px-4 py-3 font-semibold">구분</th>
                        <th className="px-4 py-3 font-semibold">기업/이메일</th>
                        <th className="px-4 py-3 font-semibold">품목</th>
                        <th className="px-4 py-3 font-semibold">결제금액(부가세포함)</th>
                        <th className="px-4 py-3 font-semibold">상태</th>
                        <th className="px-4 py-3 font-semibold">요청시각</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderRequestsByType.orders.map((request) => (
                        <tr key={request.id} className="border-t border-[var(--line)] bg-white">
                          <td className="px-4 py-3 font-semibold text-[var(--navy)]">{request.id}</td>
                          <td className="px-4 py-3 text-[var(--ink)]">주문하기</td>
                          <td className="px-4 py-3 text-[var(--ink)]">
                            <p>{request.customer?.companyName || '-'}</p>
                            <p className="text-xs text-[var(--muted)]">{request.customer?.email || '-'}</p>
                          </td>
                          <td className="px-4 py-3 text-[var(--ink)]">
                            {(request.items || []).map((item) => `${item.model} x${item.quantity}`).join(', ')}
                          </td>
                          <td className="px-4 py-3 text-[var(--ink)]">{formatNumber(request.totalAmount)}원</td>
                          <td className="px-4 py-3 text-[var(--ink)]">{request.status || '-'}</td>
                          <td className="px-4 py-3 text-[var(--ink)]">{formatDateTime(request.requestedAt)}</td>
                        </tr>
                      ))}

                      {orderRequestsByType.orders.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-[var(--muted)]" colSpan={7}>
                            접수된 주문 요청이 없습니다.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={loadOrders}
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-2 text-xs font-semibold tracking-[0.06em] text-[var(--navy)]"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    발주 새로고침
                  </button>
                  <span className="rounded-md bg-[var(--navy)] px-3 py-2 text-xs font-semibold tracking-[0.06em] text-white">
                    주문 {orderSummary.count}건
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">External API: dummyjson.com / open.er-api.com</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-xl border border-[var(--line)] bg-[#f8fbff] p-4">
                  <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">총 발주 금액</p>
                  <p className="mt-3 font-brand text-2xl text-[var(--navy)]">{formatNumber(orderSummary.totalAmount)}원</p>
                </article>
                <article className="rounded-xl border border-[var(--line)] bg-[#f8fbff] p-4">
                  <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">평균 발주 금액</p>
                  <p className="mt-3 font-brand text-2xl text-[var(--navy)]">{formatNumber(orderSummary.avgAmount)}원</p>
                </article>
                <article className="rounded-xl border border-[var(--line)] bg-[#f8fbff] p-4">
                  <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">총 주문 수량</p>
                  <p className="mt-3 font-brand text-2xl text-[var(--navy)]">{formatNumber(orderSummary.totalItems)}</p>
                </article>
                <article className="rounded-xl border border-[var(--line)] bg-[#f8fbff] p-4">
                  <p className="text-xs font-semibold tracking-[0.1em] text-[var(--muted)]">환율 반영가(USD)</p>
                  <p className="mt-3 font-brand text-2xl text-[var(--navy)]">
                    {fxRate ? `$${formatNumber(Math.round(orderSummary.totalAmount / fxRate))}` : '-'}
                  </p>
                </article>
              </div>

              <article className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
                <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[var(--navy)] text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">주문번호</th>
                      <th className="px-4 py-3 font-semibold">고객ID</th>
                      <th className="px-4 py-3 font-semibold">품목수</th>
                      <th className="px-4 py-3 font-semibold">수량</th>
                      <th className="px-4 py-3 font-semibold">주문금액</th>
                      <th className="px-4 py-3 font-semibold">할인금액</th>
                      <th className="px-4 py-3 font-semibold">상태</th>
                      <th className="px-4 py-3 font-semibold">주문일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-[var(--line)] bg-white">
                        <td className="px-4 py-3 font-semibold text-[var(--navy)]">#{order.id}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">U-{order.userId}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{order.totalProducts}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{order.totalQuantity}</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{formatNumber(order.total)}원</td>
                        <td className="px-4 py-3 text-[var(--ink)]">{formatNumber(order.total - order.discountedTotal)}원</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${statusClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--ink)]">{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}

                    {!ordersLoading && orders.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-[var(--muted)]" colSpan={8}>
                          발주 데이터가 없습니다.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </article>
            </section>
          ) : null}

          {activeTab === 'quotes' ? (
            <section className="space-y-4">
              <article className="rounded-xl border border-[var(--line)] bg-[#fcfdff] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)]">QUOTE REQUESTS</p>
                    <h3 className="mt-1 font-brand text-xl tracking-[0.04em] text-[var(--navy)]">사이트 견적 요청</h3>
                  </div>
                  <span className="rounded-md bg-[var(--navy)] px-3 py-2 text-xs font-semibold tracking-[0.06em] text-white">
                    요청 {quoteRequestSummary.count}건
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  누적 요청 금액(부가세 포함): {formatNumber(quoteRequestSummary.totalAmount)}원
                </p>

                <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
                  <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
                    <thead className="bg-[var(--navy)] text-white">
                      <tr>
                        <th className="px-4 py-3 font-semibold">요청번호</th>
                        <th className="px-4 py-3 font-semibold">구분</th>
                        <th className="px-4 py-3 font-semibold">기업/이메일</th>
                        <th className="px-4 py-3 font-semibold">품목</th>
                        <th className="px-4 py-3 font-semibold">결제금액(부가세포함)</th>
                        <th className="px-4 py-3 font-semibold">상태</th>
                        <th className="px-4 py-3 font-semibold">요청시각</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderRequestsByType.quotes.map((request) => (
                        <tr key={request.id} className="border-t border-[var(--line)] bg-white">
                          <td className="px-4 py-3 font-semibold text-[var(--navy)]">{request.id}</td>
                          <td className="px-4 py-3 text-[var(--ink)]">견적요청</td>
                          <td className="px-4 py-3 text-[var(--ink)]">
                            <p>{request.customer?.companyName || '-'}</p>
                            <p className="text-xs text-[var(--muted)]">{request.customer?.email || '-'}</p>
                          </td>
                          <td className="px-4 py-3 text-[var(--ink)]">
                            {(request.items || []).map((item) => `${item.model} x${item.quantity}`).join(', ')}
                          </td>
                          <td className="px-4 py-3 text-[var(--ink)]">{formatNumber(request.totalAmount)}원</td>
                          <td className="px-4 py-3 text-[var(--ink)]">{request.status || '-'}</td>
                          <td className="px-4 py-3 text-[var(--ink)]">{formatDateTime(request.requestedAt)}</td>
                        </tr>
                      ))}

                      {orderRequestsByType.quotes.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-[var(--muted)]" colSpan={7}>
                            접수된 견적 요청이 없습니다.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          ) : null}

          {memberLoading ? <p className="text-sm text-[var(--muted)]">회원 목록 로딩 중...</p> : null}
          {ordersLoading ? <p className="text-sm text-[var(--muted)]">발주 데이터 로딩 중...</p> : null}
          {memberError ? <p className="text-sm font-medium text-red-600">{memberError}</p> : null}
          {ordersError ? <p className="text-sm font-medium text-amber-600">{ordersError}</p> : null}
          {fxError ? <p className="text-sm font-medium text-amber-600">{fxError}</p> : null}
        </div>
      </section>
    </main>
  );
}

export default AdminPage;