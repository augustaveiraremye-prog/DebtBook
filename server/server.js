require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path'); // 👈 ADDED

const { connectDB, db, serializeCustomer, serializeDebt } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ---- AUTH middleware ----
const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ message: 'No token' });
  try { 
    req.user = jwt.verify(h.split(' ')[1], process.env.JWT_SECRET); 
    next(); 
  } catch { 
    res.status(401).json({ message: 'Invalid token' }); 
  }
};

// ============================================================
// API ROUTES
// ============================================================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exists = await db.findUserByEmail(email);
    if (exists) throw new Error('Email already exists');

    const hash = await bcrypt.hash(password, 10);
    const u = await db.createUser({ name, email, password_hash: hash });
    res.status(201).json({ id: u._id, name, email });
  } catch (e) { 
    res.status(400).json({ message: e.message }); 
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const u = await db.findUserByEmail(email);
  if (!u) return res.status(401).json({ message: 'Invalid credentials' });
  if (!await bcrypt.compare(password, u.password_hash))
    return res.status(401).json({ message: 'Invalid credentials' });
  
  const token = jwt.sign({ id: u._id.toString(), name: u.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: u._id, name: u.name, email: u.email } });
});

app.get('/api/customers', auth, async (req, res) => {
  const rows = await db.listCustomers(req.user.id);
  res.json(rows.map(serializeCustomer));
});

app.post('/api/customers', auth, async (req, res) => {
  const { name, phone } = req.body;
  const c = await db.createCustomer({
    user_id: req.user.id, 
    name, 
    phone: phone || null
  });
  res.status(201).json(serializeCustomer(c));
});

app.get('/api/debts', auth, async (req, res) => {
  const rows = await db.listDebts(req.user.id);
  res.json(rows.map(serializeDebt));
});

app.get('/api/debts/stats/dashboard', auth, async (req, res) => {
  const stats = await db.dashboardStats(req.user.id);
  res.json(stats);
});

app.get('/api/debts/:id', auth, async (req, res) => {
  try {
    const d = await db.getDebt(req.params.id, req.user.id);
    if (!d) return res.status(404).json({ message: 'Not found' });
    res.json(serializeDebt(d));
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.post('/api/debts', auth, async (req, res) => {
  const { customer_id, product_name, product_price, date_issued, due_date, repayment_period } = req.body;
  try {
    const d = await db.createDebt({
      user_id: req.user.id, 
      customer_id, 
      product_name, 
      product_price, 
      date_issued, 
      due_date, 
      repayment_period: repayment_period || 'short'
    });
    res.status(201).json({ id: d._id });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete('/api/debts/:id', auth, async (req, res) => {
  await db.deleteDebt(req.params.id, req.user.id);
  res.json({ message: 'Deleted' });
});

app.post('/api/payments', auth, async (req, res) => {
  const { debt_id, amount_paid, notes } = req.body;
  try {
    const result = await db.addPayment(debt_id, req.user.id, amount_paid, notes);
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ============================================================
// SERVE FRONTEND (React Build)
// ============================================================

// 1. Tell Express where the built frontend lives (../client/dist)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// 2. Catch-all route: If the user visits any URL that isn't an API route, 
//    send them the React index.html (so React Router can handle the page)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// ============================================================
// START SERVER
// ============================================================
connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`✅ Server running on http://localhost:${process.env.PORT || 5000}`)
  );
});