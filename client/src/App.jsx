import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api, { useAuth } from './api.jsx';

/* ============================================================
   NAVBAR
============================================================ */
function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  
  if (!user) return null;

  return (
    <nav className="navbar">
      {/* Brand / Logo */}
      <Link to="/" className="nav-brand">
        📒 {t('app_name')}
      </Link>

      {/* Navigation Links */}
      <div className="nav-links">
        <Link to="/">{t('dashboard')}</Link>
        <Link to="/debts">{t('debt_list')}</Link>
        <Link to="/debts/new">{t('add_debt')}</Link>
      </div>

      {/* Right Side (Language + Logout) */}
      <div className="nav-actions">
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="lang-select"
        >
          <option value="en">🌐 EN</option>
          <option value="rw">🇷🇼 RW</option>
        </select>
        
        <button 
          onClick={() => { logout(); nav('/login'); }} 
          className="btn-logout"
        >
          {t('logout')}
        </button>
      </div>
    </nav>
  );
}
/* ============================================================
   AUTH PAGE (Login + Register)
============================================================ */
function AuthPage({ mode }) {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'login') await login(f.email, f.password);
      else await register(f.name, f.email, f.password);
      nav('/');
    } catch (e) {
      alert(e.response?.data?.message || 'Error');
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      <h2 style={{ marginTop: 0 }}>
        {mode === 'login' ? t('login') : t('register')}
      </h2>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
        {mode === 'register' && (
          <input
            placeholder={t('name')}
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            required
          />
        )}
        <input
          type="email"
          placeholder={t('email')}
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
          required
        />
               <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('password')}
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            required
            style={{ width: '100%', paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#64748b'
            }}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        <button type="submit">
          {mode === 'login' ? t('login') : t('register')}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginBottom: 0 }}>
        <Link to={mode === 'login' ? '/register' : '/login'}>
          {mode === 'login' ? t('register') : t('login')}
        </Link>
      </p>
    </div>
  );
}

/* ============================================================
   DASHBOARD
============================================================ */
function Dashboard() {
  const { t } = useTranslation();
  const [s, setS] = useState(null);

  useEffect(() => {
    api.get('/debts/stats/dashboard').then((r) => setS(r.data));
  }, []);

  if (!s) return <p style={{ padding: 20 }}>Loading...</p>;

  const cards = [
    [t('total_debt'), `${Number(s.total_debt).toLocaleString()} RWF`, '#e63946'],
    [t('paid_debts'), s.paid_count, '#2a9d8f'],
    [t('pending_debts'), s.pending_count, '#f4a261'],
    [t('overdue_debts'), s.overdue_count, '#d62828'],
    [t('total_customers'), s.total_customers, '#457b9d']
  ];

  return (
    <div style={{ padding: 20 }}>
      <h1>{t('dashboard')}</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14
        }}
      >
        {cards.map(([label, value, color], i) => (
          <div
            key={i}
            style={{
              background: '#fff',
              padding: 16,
              borderLeft: `6px solid ${color}`,
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,.08)'
            }}
          >
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{label}</p>
            <h2 style={{ margin: '6px 0 0', fontSize: 22 }}>{value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ADD DEBT
============================================================ */
function AddDebt() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [f, setF] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    product_name: '',
    product_price: '',
    date_issued: '',
    due_date: '',
    repayment_period: 'short'
  });

  useEffect(() => {
    api.get('/customers').then((r) => setCustomers(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      let cid = f.customer_id;
      if (!cid) {
        const { data } = await api.post('/customers', {
          name: f.customer_name,
          phone: f.customer_phone
        });
        cid = data.id;
      }
      await api.post('/debts', { ...f, customer_id: cid });
      nav('/debts');
    } catch (e) {
      alert(e.response?.data?.message || 'Error');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 540 }}>
      <h1>{t('add_debt')}</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          {t('customer_name')}
          <select
            value={f.customer_id}
            onChange={(e) => setF({ ...f, customer_id: e.target.value })}
          >
            <option value="">+ New customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        {!f.customer_id && (
          <>
            <input
              placeholder={t('customer_name')}
              value={f.customer_name}
              onChange={(e) => setF({ ...f, customer_name: e.target.value })}
              required
            />
            <input
              placeholder={t('customer_phone')}
              value={f.customer_phone}
              onChange={(e) => setF({ ...f, customer_phone: e.target.value })}
            />
          </>
        )}

        <input
          placeholder={t('product_name')}
          value={f.product_name}
          onChange={(e) => setF({ ...f, product_name: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder={t('product_price')}
          value={f.product_price}
          onChange={(e) => setF({ ...f, product_price: e.target.value })}
          required
        />
        <label style={{ display: 'grid', gap: 4 }}>
          {t('date_issued')}
          <input
            type="date"
            value={f.date_issued}
            onChange={(e) => setF({ ...f, date_issued: e.target.value })}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          {t('due_date')}
          <input
            type="date"
            value={f.due_date}
            onChange={(e) => setF({ ...f, due_date: e.target.value })}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          {t('repayment_period')}
          <select
            value={f.repayment_period}
            onChange={(e) => setF({ ...f, repayment_period: e.target.value })}
          >
            <option value="short">{t('short')}</option>
            <option value="long">{t('long')}</option>
          </select>
        </label>
        <button type="submit">{t('save')}</button>
      </form>
    </div>
  );
}

function DebtList() {
  const { t } = useTranslation();
  const [debts, setDebts] = useState([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');

  const load = () => api.get('/debts').then((r) => setDebts(r.data));
  useEffect(() => { load(); }, []);

  const open = async (id) => {
    const { data } = await api.get(`/debts/${id}`);
    setSelected(data);
  };

  const pay = async () => {
    if (!amount || Number(amount) <= 0) return;
    await api.post('/payments', { debt_id: selected.id, amount_paid: amount });
    setSelected(null);
    setAmount('');
    load();
  };

  const markAll = async (d) => {
    const remaining = Number(d.product_price) - Number(d.amount_paid);
    await api.post('/payments', { debt_id: d.id, amount_paid: remaining });
    load();
  };

  const filtered = debts.filter((d) =>
    (d.customer_name + ' ' + d.product_name).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="page-container">
      <h1>{t('debt_list')}</h1>
      
      {/* Responsive Search Bar */}
      <input
        placeholder={t('search')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="search-input"
      />

      {/* Wrapper for horizontal scrolling on mobile */}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>{t('customer_name')}</th>
              <th>{t('product_name')}</th>
              <th>{t('product_price')}</th>
              <th>{t('due_date')}</th>
              <th>{t('status')}</th>
              <th>✓</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr
                key={d.id}
                onClick={() => open(d.id)}
                className="clickable-row"
              >
                <td>{d.customer_name}</td>
                <td>{d.product_name}</td>
                <td>{Number(d.product_price).toLocaleString()} RWF</td>
                <td>{d.due_date?.slice(0, 10)}</td>
                <td>{t(d.status)}</td>
                <td>
                  {d.status !== 'paid' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markAll(d); }}
                      className="btn-pay"
                    >
                      ✓
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan="6" style={{ padding: 16, textAlign: 'center', color: '#94a3b8' }}>
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Responsive Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {selected.customer_name} — {selected.product_name}
            </h3>
            <p><b>{t('product_price')}:</b> {Number(selected.product_price).toLocaleString()} RWF</p>
            <p><b>{t('amount_paid')}:</b> {Number(selected.amount_paid).toLocaleString()} RWF</p>
            <p><b>{t('status')}:</b> {t(selected.status)}</p>
            {selected.customer_phone && (
              <p><b>{t('customer_phone')}:</b> {selected.customer_phone}</p>
            )}

            {selected.status !== 'paid' && (
              <>
                <h4>{t('add_payment')}</h4>
                <div className="payment-input-group">
                  <input
                    type="number"
                    placeholder="RWF"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <button onClick={pay}>{t('save')}</button>
                </div>
              </>
            )}

            <h4>{t('payment_history')}</h4>
            <ul style={{ paddingLeft: 18 }}>
              {selected.payments?.length
                ? selected.payments.map((p) => (
                    <li key={p.id}>
                      {Number(p.amount_paid).toLocaleString()} RWF — {p.payment_date?.slice(0, 10)}
                    </li>
                  ))
                : <li>—</li>}
            </ul>

            <button
              onClick={() => setSelected(null)}
              className="btn-close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PROTECTED + ROUTER
============================================================ */
function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/debts" element={<Protected><DebtList /></Protected>} />
        <Route path="/debts/new" element={<Protected><AddDebt /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}