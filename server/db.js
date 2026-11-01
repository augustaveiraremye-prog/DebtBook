require('dotenv').config();
const mongoose = require('mongoose');

/* ============================================================
   1. CONNECTION
============================================================ */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (e) {
    console.error('❌ MongoDB error:', e.message);
    process.exit(1);
  }
}

/* ============================================================
   2. SCHEMAS
============================================================ */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    preferred_language: { type: String, enum: ['en', 'rw'], default: 'en' }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const customerSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const paymentSchema = new mongoose.Schema(
  {
    amount_paid: { type: Number, required: true },
    payment_date: { type: Date, default: Date.now },
    notes: { type: String, default: null }
  },
  { _id: true }
);

const debtSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    product_name: { type: String, required: true, trim: true },
    product_price: { type: Number, required: true },
    amount_paid: { type: Number, default: 0 },
    date_issued: { type: Date, required: true },
    due_date: { type: Date, required: true },
    repayment_period: { type: String, enum: ['short', 'long'], default: 'short' },
    status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid', index: true },
    paid_at: { type: Date, default: null },
    payments: [paymentSchema]
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

/* ============================================================
   3. MODELS
============================================================ */
const User = mongoose.model('User', userSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Debt = mongoose.model('Debt', debtSchema);

/* ============================================================
   4. SERIALIZERS — shape Mongo docs like MySQL rows
   (frontend expects `id`, `customer_name`, `product_price`, ...)
============================================================ */
function serializeCustomer(c) {
  if (!c) return null;
  return {
    id: c._id.toString(),
    user_id: c.user_id?.toString(),
    name: c.name,
    phone: c.phone
  };
}

function serializeDebt(d) {
  if (!d) return null;
  const populated =
    d.customer_id &&
    typeof d.customer_id === 'object' &&
    d.customer_id.name !== undefined;

  return {
    id: d._id.toString(),
    customer_id: populated ? d.customer_id._id.toString() : d.customer_id?.toString(),
    customer_name: populated ? d.customer_id.name : null,
    customer_phone: populated ? d.customer_id.phone : null,
    product_name: d.product_name,
    product_price: d.product_price,
    amount_paid: d.amount_paid,
    date_issued: d.date_issued,
    due_date: d.due_date,
    repayment_period: d.repayment_period,
    status: d.status,
    paid_at: d.paid_at,
    payments: (d.payments || []).map((p) => ({
      id: p._id.toString(),
      amount_paid: p.amount_paid,
      payment_date: p.payment_date,
      notes: p.notes
    }))
  };
}

/* ============================================================
   5. DATA ACCESS HELPERS (called by server.js)
============================================================ */
const db = {
  // ---- USERS ----
  createUser: (data) => User.create(data),
  findUserByEmail: (email) => User.findOne({ email }),
  findUserById: (id) => User.findById(id),

  // ---- CUSTOMERS ----
  listCustomers: (userId) => Customer.find({ user_id: userId }).sort({ created_at: 1 }),
  createCustomer: (data) => Customer.create(data),
  countCustomers: (userId) => Customer.countDocuments({ user_id: userId }),

  // ---- DEBTS ----
  listDebts: (userId) =>
    Debt.find({ user_id: userId })
      .populate('customer_id', 'name phone')
      .sort({ due_date: 1 }),

  getDebt: (id, userId) =>
    Debt.findOne({ _id: id, user_id: userId }).populate('customer_id', 'name phone'),

  createDebt: (data) => Debt.create(data),

  deleteDebt: (id, userId) =>
    Debt.deleteOne({ _id: id, user_id: userId }),

  // ---- STATS ----
  async dashboardStats(userId) {
    const uid = new mongoose.Types.ObjectId(userId);
    const [agg] = await Debt.aggregate([
      { $match: { user_id: uid } },
      {
        $group: {
          _id: null,
          total_debt: { $sum: { $subtract: ['$product_price', '$amount_paid'] } },
          paid_count: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          pending_count: { $sum: { $cond: [{ $ne: ['$status', 'paid'] }, 1, 0] } },
          overdue_count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'paid'] },
                    { $lt: ['$due_date', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const total_customers = await Customer.countDocuments({ user_id: uid });

    return {
      total_debt: agg?.total_debt || 0,
      paid_count: agg?.paid_count || 0,
      pending_count: agg?.pending_count || 0,
      overdue_count: agg?.overdue_count || 0,
      total_customers
    };
  },

  // ---- PAYMENT (embedded inside Debt) ----
  async addPayment(debtId, userId, amount_paid, notes) {
    const d = await Debt.findOne({ _id: debtId, user_id: userId });
    if (!d) throw new Error('Debt not found');

    const newPaid = Number(d.amount_paid) + Number(amount_paid);
    const full = Number(d.product_price);

    d.amount_paid = newPaid;
    d.status = newPaid >= full ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    d.paid_at = d.status === 'paid' ? new Date() : null;
    d.payments.push({ amount_paid: Number(amount_paid), notes: notes || null });

    await d.save();
    return { status: d.status, amount_paid: d.amount_paid };
  }
};

/* ============================================================
   6. EXPORTS
============================================================ */
module.exports = {
  connectDB,
  User,
  Customer,
  Debt,
  serializeCustomer,
  serializeDebt,
  db
};