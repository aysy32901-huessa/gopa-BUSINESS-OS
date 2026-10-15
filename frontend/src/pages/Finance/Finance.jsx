
import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Plus,
  Search,
  RefreshCw,
  Receipt,
  ShoppingBag,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  CalendarDays,
  RotateCcw,
  Filter,
  CircleDollarSign,
} from "lucide-react";

import api from "../../services/api";
import "./Finance.css";

// ==========================================
// INITIAL DATA
// ==========================================

const INITIAL_TRANSACTION = {
  type: "expense",
  category: "",
  description: "",
  amount: "",
  currency: "EGP",
  transactionDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "cash",
  notes: "",
};

const INITIAL_SALE = {
  title: "",
  amount: "",
  currency: "EGP",
  saleDate: new Date().toISOString().slice(0, 10),
  paymentMethod: "other",
  notes: "",
};

const INITIAL_PAYMENT = {
  amount: "",
  paymentMethod: "cash",
  transactionDate: new Date().toISOString().slice(0, 10),
  description: "",
  notes: "",
};

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدي" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "card", label: "بطاقة" },
  { value: "online", label: "أونلاين" },
  { value: "other", label: "أخرى" },
];

const CURRENCIES = ["EGP", "USD", "SAR", "AED", "EUR"];

// ==========================================
// HELPERS
// ==========================================

function formatMoney(value, currency = "EGP") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en-US")} ${currency}`;
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB");
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "حدث خطأ غير متوقع"
  );
}

function getPaymentMethodLabel(method) {
  return (
    PAYMENT_METHODS.find((item) => item.value === method)?.label ||
    method ||
    "—"
  );
}

function getSaleStatusLabel(status) {
  const labels = {
    pending: "قيد الانتظار",
    confirmed: "مؤكدة",
    cancelled: "ملغاة",
    refunded: "مستردة",
  };

  return labels[status] || status || "—";
}

function getPaymentStatusLabel(status) {
  const labels = {
    unpaid: "غير مدفوعة",
    partially_paid: "مدفوعة جزئيًا",
    paid: "مدفوعة بالكامل",
    refunded: "مستردة",
  };

  return labels[status] || status || "—";
}

// ==========================================
// REUSABLE COMPONENTS
// ==========================================

function StatusBadge({ status, payment = false }) {
  const label = payment
    ? getPaymentStatusLabel(status)
    : getSaleStatusLabel(status);

  return (
    <span className={`finance-badge finance-badge--${status || "default"}`}>
      {label}
    </span>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="finance-modal-overlay" onMouseDown={onClose}>
      <div
        className={`finance-modal ${wide ? "finance-modal--wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="finance-modal__header">
          <h2>{title}</h2>

          <button
            type="button"
            className="finance-icon-button"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={19} />
          </button>
        </div>

        <div className="finance-modal__body">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="finance-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

// ==========================================
// TRANSACTION TABLE
// ==========================================

function TransactionTable({ transactions = [] }) {
  if (!transactions.length) {
    return (
      <div className="finance-empty finance-empty--small">
        <Receipt size={30} />
        <h3>لا توجد معاملات</h3>
        <p>ستظهر المعاملات هنا بمجرد تسجيلها.</p>
      </div>
    );
  }

  return (
    <div className="finance-table-wrapper">
      <table className="finance-table">
        <thead>
          <tr>
            <th>الوصف</th>
            <th>التصنيف</th>
            <th>النوع</th>
            <th>المبلغ</th>
            <th>طريقة الدفع</th>
            <th>التاريخ</th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction._id}>
              <td>
                <div className="finance-table__primary">
                  {transaction.description || "—"}
                </div>
              </td>

              <td>{transaction.category || "—"}</td>

              <td>
                <span
                  className={`finance-type finance-type--${transaction.type}`}
                >
                  {transaction.type === "income" ? (
                    <TrendingUp size={14} />
                  ) : (
                    <TrendingDown size={14} />
                  )}

                  {transaction.type === "income" ? "إيراد" : "مصروف"}
                </span>
              </td>

              <td
                className={
                  transaction.type === "income"
                    ? "finance-amount--income"
                    : "finance-amount--expense"
                }
              >
                {formatMoney(transaction.amount, transaction.currency)}
              </td>

              <td>
                {getPaymentMethodLabel(transaction.paymentMethod)}
              </td>

              <td>{formatDate(transaction.transactionDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================
// SALES TABLE
// ==========================================

function SalesTable({ sales = [], onView }) {
  if (!sales.length) {
    return (
      <div className="finance-empty">
        <ShoppingBag size={36} />
        <h3>لا توجد عمليات بيع</h3>
        <p>أنشئ أول عملية بيع لمتابعة مستحقاتك ومدفوعاتك.</p>
      </div>
    );
  }

  return (
    <div className="finance-table-wrapper">
      <table className="finance-table">
        <thead>
          <tr>
            <th>رقم البيع</th>
            <th>اسم العملية</th>
            <th>قيمة البيع</th>
            <th>المبلغ المحصل</th>
            <th>المتبقي</th>
            <th>حالة البيع</th>
            <th>حالة الدفع</th>
            <th>التاريخ</th>
            <th>التفاصيل</th>
          </tr>
        </thead>

        <tbody>
          {sales.map((sale) => (
            <tr key={sale._id}>
              <td>{sale.saleNumber || "—"}</td>

              <td>
                <div className="finance-table__primary">
                  {sale.title || "—"}
                </div>
              </td>

              <td>{formatMoney(sale.amount, sale.currency)}</td>

              <td className="finance-amount--income">
                {formatMoney(
                  sale.financials?.paidAmount || 0,
                  sale.currency
                )}
              </td>

              <td>
                {formatMoney(
                  sale.financials?.remainingAmount ?? sale.amount,
                  sale.currency
                )}
              </td>

              <td>
                <StatusBadge status={sale.status} />
              </td>

              <td>
                <StatusBadge status={sale.paymentStatus} payment />
              </td>

              <td>{formatDate(sale.saleDate)}</td>

              <td>
                <button
                  type="button"
                  className="finance-icon-button finance-view-button"
                  onClick={() => onView(sale)}
                  aria-label="عرض تفاصيل البيع"
                >
                  <Eye size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================
// MAIN FINANCE PAGE
// ==========================================

export default function Finance() {
  // DATA
  const [transactions, setTransactions] = useState([]);
  const [sales, setSales] = useState([]);

  // LOADING AND FEEDBACK
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // TABS AND FILTERS
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [transactionType, setTransactionType] = useState("all");

  // MODALS
  const [transactionModal, setTransactionModal] = useState(false);
  const [saleModal, setSaleModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);

  // SELECTED SALE
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState(null);
  const [saleTransactions, setSaleTransactions] = useState([]);

  // FORMS
  const [transactionForm, setTransactionForm] = useState(
    INITIAL_TRANSACTION
  );

  const [saleForm, setSaleForm] = useState(INITIAL_SALE);
  const [paymentForm, setPaymentForm] = useState(INITIAL_PAYMENT);

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function loadFinanceData() {
      try {
        const [transactionsResponse, salesResponse] = await Promise.all([
          api.get("/transactions", {
            signal: controller.signal,
            params: { page: 1, limit: 100 },
          }),

          api.get("/sales", {
            signal: controller.signal,
            params: { page: 1, limit: 100 },
          }),
        ]);

        if (!isMounted) return;

        const transactionsData =
          transactionsResponse.data?.transactions || [];

        const salesData = salesResponse.data?.data?.sales || [];

        setTransactions(
          Array.isArray(transactionsData) ? transactionsData : []
        );

        setSales(Array.isArray(salesData) ? salesData : []);

        setError("");
      } catch (requestError) {
        if (!isMounted || requestError.name === "CanceledError") return;

        setError(getErrorMessage(requestError));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFinanceData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [reloadKey]);

  // ==========================================
  // REFRESH
  // ==========================================

  const refreshData = () => {
    setLoading(true);
    setReloadKey((current) => current + 1);
  };

  // ==========================================
  // FORM FIELD HANDLERS
  // ==========================================

  const updateTransactionField = (event) => {
    const { name, value } = event.target;

    setTransactionForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updateSaleField = (event) => {
    const { name, value } = event.target;

    setSaleForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updatePaymentField = (event) => {
    const { name, value } = event.target;

    setPaymentForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ==========================================
  // SUMMARY
  // ==========================================

  const currencySummaries = useMemo(() => {
    const currencies = new Set();

    transactions.forEach((transaction) => {
      currencies.add(transaction.currency || "EGP");
    });

    sales.forEach((sale) => {
      currencies.add(sale.currency || "EGP");
    });

    return Array.from(currencies).map((currency) => {
      const currencyTransactions = transactions.filter(
        (item) => (item.currency || "EGP") === currency
      );

      const income = currencyTransactions
        .filter((item) => item.type === "income")
        .reduce((total, item) => total + Number(item.amount || 0), 0);

      const expenses = currencyTransactions
        .filter((item) => item.type === "expense")
        .reduce((total, item) => total + Number(item.amount || 0), 0);

      const confirmedSales = sales
        .filter(
          (sale) =>
            sale.status === "confirmed" &&
            (sale.currency || "EGP") === currency
        )
        .reduce((total, sale) => total + Number(sale.amount || 0), 0);

      return {
        currency,
        income,
        expenses,
        balance: income - expenses,
        sales: confirmedSales,
      };
    });
  }, [transactions, sales]);

  // ==========================================
  // FILTERS
  // ==========================================

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesType =
        transactionType === "all" ||
        transaction.type === transactionType;

      const searchableText = [
        transaction.description,
        transaction.category,
        transaction.type,
        transaction.paymentMethod,
        transaction.currency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [transactions, search, transactionType]);

  const filteredSales = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const searchableText = [
        sale.saleNumber,
        sale.title,
        sale.status,
        sale.paymentStatus,
        sale.currency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        !normalizedSearch || searchableText.includes(normalizedSearch)
      );
    });
  }, [sales, search]);

  // ==========================================
  // CREATE TRANSACTION
  // ==========================================

  const handleCreateTransaction = async (event) => {
    event.preventDefault();

    if (
      !transactionForm.category.trim() ||
      !transactionForm.description.trim() ||
      Number(transactionForm.amount) <= 0
    ) {
      setError("يرجى إدخال بيانات المعاملة بشكل صحيح.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post("/transactions", {
        ...transactionForm,
        amount: Number(transactionForm.amount),
      });

      setTransactionModal(false);
      setTransactionForm({ ...INITIAL_TRANSACTION });
      setNotice("تم تسجيل المعاملة بنجاح.");

      refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // CREATE SALE
  // ==========================================

  const handleCreateSale = async (event) => {
    event.preventDefault();

    if (
      !saleForm.title.trim() ||
      Number(saleForm.amount) <= 0
    ) {
      setError("يرجى إدخال اسم البيع والمبلغ بشكل صحيح.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post("/sales", {
        ...saleForm,
        amount: Number(saleForm.amount),
      });

      setSaleModal(false);
      setSaleForm({ ...INITIAL_SALE });
      setNotice("تم إنشاء عملية البيع بنجاح.");

      refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // SALE DETAILS
  // ==========================================

  const openSaleDetails = async (sale) => {
    setSelectedSale(sale);
    setSaleDetails(null);
    setSaleTransactions([]);
    setDetailsModal(true);
    setError("");

    try {
      const response = await api.get(
        `/sales/${sale._id}/transactions`
      );

      setSaleDetails(response.data?.financials || null);

      setSaleTransactions(
        Array.isArray(response.data?.transactions)
          ? response.data.transactions
          : []
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  // ==========================================
  // OPEN PAYMENT AND REFUND MODALS
  // ==========================================

  const openPaymentModal = () => {
    setPaymentForm({ ...INITIAL_PAYMENT });
    setError("");
    setPaymentModal(true);
  };

  const openRefundModal = () => {
    setPaymentForm({ ...INITIAL_PAYMENT });
    setError("");
    setRefundModal(true);
  };

  // ==========================================
  // RECORD PAYMENT
  // ==========================================

  const handleSalePayment = async (event) => {
    event.preventDefault();

    if (!selectedSale || Number(paymentForm.amount) <= 0) {
      setError("يرجى إدخال مبلغ صحيح.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post(
        `/sales/${selectedSale._id}/payments`,
        {
          ...paymentForm,
          amount: Number(paymentForm.amount),
        }
      );

      setPaymentModal(false);
      setPaymentForm({ ...INITIAL_PAYMENT });
      setNotice("تم تسجيل الدفعة بنجاح.");

      await openSaleDetails(selectedSale);

      refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // RECORD REFUND
  // ==========================================

  const handleSaleRefund = async (event) => {
    event.preventDefault();

    if (!selectedSale || Number(paymentForm.amount) <= 0) {
      setError("يرجى إدخال مبلغ صحيح.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post(
        `/sales/${selectedSale._id}/refunds`,
        {
          ...paymentForm,
          amount: Number(paymentForm.amount),
        }
      );

      setRefundModal(false);
      setPaymentForm({ ...INITIAL_PAYMENT });
      setNotice("تم تسجيل عملية الاسترداد بنجاح.");

      await openSaleDetails(selectedSale);

      refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="finance-page" dir="rtl">

      {/* HEADER */}
      <header className="finance-header">
        <div className="finance-header__content">
          <div className="finance-eyebrow">
            <span className="finance-eyebrow__dot" />
            KEMETIX BUSINESS OS
          </div>

          <h1>الإدارة المالية</h1>

          <p>
            تابع الإيرادات والمصروفات والمبيعات والتدفقات المالية من مكان
            واحد.
          </p>
        </div>

        <div className="finance-header__actions">
          <button
            type="button"
            className="finance-button finance-button--secondary"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "is-spinning" : ""}
            />
            تحديث
          </button>

          <button
            type="button"
            className="finance-button finance-button--primary"
            onClick={() => {
              setError("");
              setTransactionModal(true);
            }}
          >
            <Plus size={18} />
            إضافة معاملة
          </button>
        </div>
      </header>

      {/* ALERTS */}
      {error && (
        <div className="finance-alert finance-alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="إخفاء رسالة الخطأ"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {notice && (
        <div className="finance-alert finance-alert--success">
          <CheckCircle2 size={18} />
          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="إخفاء الرسالة"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* NAVIGATION */}
      <nav className="finance-tabs">
        <button
          type="button"
          className={activeTab === "overview" ? "active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          <Wallet size={17} />
          النظرة العامة
        </button>

        <button
          type="button"
          className={activeTab === "transactions" ? "active" : ""}
          onClick={() => setActiveTab("transactions")}
        >
          <ArrowLeftRight size={17} />
          المعاملات
        </button>

        <button
          type="button"
          className={activeTab === "sales" ? "active" : ""}
          onClick={() => setActiveTab("sales")}
        >
          <ShoppingBag size={17} />
          المبيعات
        </button>
      </nav>

      {/* LOADING */}
      {loading ? (
        <div className="finance-loading">
          <RefreshCw size={25} className="is-spinning" />
          <span>جاري تحميل البيانات المالية...</span>
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <section className="finance-section">
              <div className="finance-section__heading">
                <div>
                  <h2>ملخص الأداء المالي</h2>
                  <p>نظرة سريعة على حركة الأموال المسجلة.</p>
                </div>

                <span className="finance-section__date">
                  <CalendarDays size={15} />
                  {formatDate(new Date())}
                </span>
              </div>

              {currencySummaries.length === 0 ? (
                <div className="finance-empty">
                  <CircleDollarSign size={36} />
                  <h3>لا توجد بيانات مالية حتى الآن</h3>
                  <p>ابدأ بإضافة أول معاملة أو إنشاء عملية بيع.</p>
                </div>
              ) : (
                <div className="finance-summary-grid">
                  {currencySummaries.map((summary) => (
                    <div
                      className="finance-currency-group"
                      key={summary.currency}
                    >
                      <div className="finance-currency-group__heading">
                        <span>{summary.currency}</span>
                        <span>الملخص المالي</span>
                      </div>

                      <div className="finance-stat-grid">
                        <article className="finance-stat-card">
                          <div className="finance-stat-card__icon finance-stat-card__icon--income">
                            <TrendingUp size={20} />
                          </div>

                          <span>إجمالي الإيرادات المسجلة</span>

                          <strong>
                            {formatMoney(summary.income, summary.currency)}
                          </strong>
                        </article>

                        <article className="finance-stat-card">
                          <div className="finance-stat-card__icon finance-stat-card__icon--expense">
                            <TrendingDown size={20} />
                          </div>

                          <span>إجمالي المصروفات</span>

                          <strong>
                            {formatMoney(summary.expenses, summary.currency)}
                          </strong>
                        </article>

                        <article className="finance-stat-card">
                          <div className="finance-stat-card__icon finance-stat-card__icon--balance">
                            <Wallet size={20} />
                          </div>

                          <span>صافي التدفق النقدي</span>

                          <strong>
                            {formatMoney(summary.balance, summary.currency)}
                          </strong>
                        </article>

                        <article className="finance-stat-card">
                          <div className="finance-stat-card__icon finance-stat-card__icon--sales">
                            <ShoppingBag size={20} />
                          </div>

                          <span>قيمة المبيعات المؤكدة</span>

                          <strong>
                            {formatMoney(summary.sales, summary.currency)}
                          </strong>
                        </article>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="finance-section__heading finance-section__heading--spaced">
                <div>
                  <h2>أحدث المعاملات</h2>
                  <p>آخر العمليات المالية المسجلة.</p>
                </div>

                <button
                  type="button"
                  className="finance-text-button"
                  onClick={() => setActiveTab("transactions")}
                >
                  عرض كل المعاملات
                </button>
              </div>

              <TransactionTable
                transactions={transactions.slice(0, 5)}
              />
            </section>
          )}

          {/* TRANSACTIONS */}
          {activeTab === "transactions" && (
            <section className="finance-section">
              <div className="finance-section__heading">
                <div>
                  <h2>سجل المعاملات</h2>
                  <p>جميع الإيرادات والمصروفات المسجلة في النظام.</p>
                </div>

                <button
                  type="button"
                  className="finance-button finance-button--primary"
                  onClick={() => {
                    setError("");
                    setTransactionModal(true);
                  }}
                >
                  <Plus size={17} />
                  معاملة جديدة
                </button>
              </div>

              <div className="finance-toolbar">
                <div className="finance-search">
                  <Search size={18} />

                  <input
                    type="search"
                    placeholder="ابحث في المعاملات..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="finance-filter">
                  <Filter size={17} />

                  <select
                    value={transactionType}
                    onChange={(event) =>
                      setTransactionType(event.target.value)
                    }
                  >
                    <option value="all">كل المعاملات</option>
                    <option value="income">الإيرادات</option>
                    <option value="expense">المصروفات</option>
                  </select>
                </div>
              </div>

              <TransactionTable transactions={filteredTransactions} />
            </section>
          )}

          {/* SALES */}
          {activeTab === "sales" && (
            <section className="finance-section">
              <div className="finance-section__heading">
                <div>
                  <h2>إدارة المبيعات</h2>
                  <p>تابع قيمة العقود والمدفوعات والمبالغ المتبقية.</p>
                </div>

                <button
                  type="button"
                  className="finance-button finance-button--primary"
                  onClick={() => {
                    setError("");
                    setSaleModal(true);
                  }}
                >
                  <Plus size={17} />
                  إنشاء عملية بيع
                </button>
              </div>

              <div className="finance-toolbar">
                <div className="finance-search">
                  <Search size={18} />

                  <input
                    type="search"
                    placeholder="ابحث برقم البيع أو الاسم..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>

              <SalesTable
                sales={filteredSales}
                onView={openSaleDetails}
              />
            </section>
          )}
        </>
      )}

      {/* CREATE TRANSACTION MODAL */}
      {transactionModal && (
        <Modal
          title="إضافة معاملة مالية"
          onClose={() => setTransactionModal(false)}
        >
          <form
            className="finance-form"
            onSubmit={handleCreateTransaction}
          >
            <FormField label="نوع المعاملة">
              <select
                name="type"
                value={transactionForm.type}
                onChange={updateTransactionField}
              >
                <option value="income">إيراد</option>
                <option value="expense">مصروف</option>
              </select>
            </FormField>

            <FormField label="التصنيف">
              <input
                name="category"
                value={transactionForm.category}
                onChange={updateTransactionField}
                placeholder="مثال: رواتب، أدوات، خدمات..."
                required
              />
            </FormField>

            <FormField label="وصف المعاملة">
              <input
                name="description"
                value={transactionForm.description}
                onChange={updateTransactionField}
                placeholder="اكتب وصفًا واضحًا"
                required
              />
            </FormField>

            <div className="finance-form__row">
              <FormField label="المبلغ">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={updateTransactionField}
                  placeholder="0.00"
                  required
                />
              </FormField>

              <FormField label="العملة">
                <select
                  name="currency"
                  value={transactionForm.currency}
                  onChange={updateTransactionField}
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="finance-form__row">
              <FormField label="تاريخ المعاملة">
                <input
                  name="transactionDate"
                  type="date"
                  value={transactionForm.transactionDate}
                  onChange={updateTransactionField}
                  required
                />
              </FormField>

              <FormField label="طريقة الدفع">
                <select
                  name="paymentMethod"
                  value={transactionForm.paymentMethod}
                  onChange={updateTransactionField}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="ملاحظات (اختياري)">
              <textarea
                name="notes"
                value={transactionForm.notes}
                onChange={updateTransactionField}
                rows="3"
                placeholder="أي تفاصيل إضافية..."
              />
            </FormField>

            <div className="finance-form__actions">
              <button
                type="button"
                className="finance-button finance-button--secondary"
                onClick={() => setTransactionModal(false)}
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="finance-button finance-button--primary"
                disabled={submitting}
              >
                {submitting ? "جاري الحفظ..." : "حفظ المعاملة"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE SALE MODAL */}
      {saleModal && (
        <Modal
          title="إنشاء عملية بيع"
          onClose={() => setSaleModal(false)}
        >
          <form className="finance-form" onSubmit={handleCreateSale}>
            <FormField label="اسم العملية">
              <input
                name="title"
                value={saleForm.title}
                onChange={updateSaleField}
                placeholder="اسم الخدمة أو المشروع"
                required
              />
            </FormField>

            <div className="finance-form__row">
              <FormField label="قيمة البيع">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={saleForm.amount}
                  onChange={updateSaleField}
                  placeholder="0.00"
                  required
                />
              </FormField>

              <FormField label="العملة">
                <select
                  name="currency"
                  value={saleForm.currency}
                  onChange={updateSaleField}
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="finance-form__row">
              <FormField label="تاريخ البيع">
                <input
                  name="saleDate"
                  type="date"
                  value={saleForm.saleDate}
                  onChange={updateSaleField}
                  required
                />
              </FormField>

              <FormField label="طريقة الدفع المتوقعة">
                <select
                  name="paymentMethod"
                  value={saleForm.paymentMethod}
                  onChange={updateSaleField}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="ملاحظات">
              <textarea
                name="notes"
                value={saleForm.notes}
                onChange={updateSaleField}
                rows="3"
                placeholder="تفاصيل إضافية عن عملية البيع..."
              />
            </FormField>

            <div className="finance-info-note">
              <AlertCircle size={17} />
              إنشاء البيع لا يعني تحصيل المبلغ. سيتم تسجيل كل دفعة فعلية
              كإيراد مستقل في سجل المعاملات.
            </div>

            <div className="finance-form__actions">
              <button
                type="button"
                className="finance-button finance-button--secondary"
                onClick={() => setSaleModal(false)}
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="finance-button finance-button--primary"
                disabled={submitting}
              >
                {submitting ? "جاري الإنشاء..." : "إنشاء البيع"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* SALE DETAILS MODAL */}
      {detailsModal && selectedSale && (
        <Modal
          title="تفاصيل عملية البيع"
          onClose={() => setDetailsModal(false)}
          wide
        >
          <div className="finance-sale-details">
            <div className="finance-sale-details__heading">
              <div>
                <span>عملية البيع</span>
                <h3>{selectedSale.title}</h3>
                <small>{selectedSale.saleNumber || "—"}</small>
              </div>

              <StatusBadge
                status={selectedSale.paymentStatus}
                payment
              />
            </div>

            <div className="finance-detail-grid">
              <div>
                <span>قيمة البيع</span>
                <strong>
                  {formatMoney(
                    selectedSale.amount,
                    selectedSale.currency
                  )}
                </strong>
              </div>

              <div>
                <span>المبلغ المحصل</span>
                <strong>
                  {formatMoney(
                    saleDetails?.paidAmount ??
                      selectedSale.financials?.paidAmount ??
                      0,
                    selectedSale.currency
                  )}
                </strong>
              </div>

              <div>
                <span>المبلغ المتبقي</span>
                <strong>
                  {formatMoney(
                    saleDetails?.remainingAmount ??
                      selectedSale.financials?.remainingAmount ??
                      selectedSale.amount,
                    selectedSale.currency
                  )}
                </strong>
              </div>

              <div>
                <span>المبلغ المسترد</span>
                <strong>
                  {formatMoney(
                    saleDetails?.refunded ??
                      selectedSale.financials?.refundedAmount ??
                      0,
                    selectedSale.currency
                  )}
                </strong>
              </div>
            </div>

            <div className="finance-sale-details__actions">
              <button
                type="button"
                className="finance-button finance-button--primary"
                onClick={openPaymentModal}
                disabled={selectedSale.status !== "confirmed"}
              >
                <Plus size={17} />
                تسجيل دفعة
              </button>

              <button
                type="button"
                className="finance-button finance-button--secondary"
                onClick={openRefundModal}
              >
                <RotateCcw size={17} />
                تسجيل استرداد
              </button>
            </div>

            <div className="finance-section__heading">
              <div>
                <h3>سجل الدفعات والاستردادات</h3>
                <p>الحركات المالية المرتبطة بعملية البيع.</p>
              </div>
            </div>

            <TransactionTable transactions={saleTransactions} />
          </div>
        </Modal>
      )}

      {/* PAYMENT AND REFUND MODALS */}
      {(paymentModal || refundModal) && selectedSale && (
        <Modal
          title={paymentModal ? "تسجيل دفعة جديدة" : "تسجيل استرداد"}
          onClose={() => {
            setPaymentModal(false);
            setRefundModal(false);
          }}
        >
          <form
            className="finance-form"
            onSubmit={
              paymentModal ? handleSalePayment : handleSaleRefund
            }
          >
            <div className="finance-info-note">
              <CircleDollarSign size={17} />

              {paymentModal
                ? "سيتم تسجيل الدفعة كإيراد مرتبط بعملية البيع."
                : "سيتم تسجيل الاسترداد كمصروف مرتبط بعملية البيع."}
            </div>

            <FormField label="المبلغ">
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={updatePaymentField}
                placeholder="0.00"
                required
              />
            </FormField>

            <FormField label="طريقة الدفع">
              <select
                name="paymentMethod"
                value={paymentForm.paymentMethod}
                onChange={updatePaymentField}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="التاريخ">
              <input
                name="transactionDate"
                type="date"
                value={paymentForm.transactionDate}
                onChange={updatePaymentField}
                required
              />
            </FormField>

            <FormField label="الوصف">
              <input
                name="description"
                value={paymentForm.description}
                onChange={updatePaymentField}
                placeholder={
                  paymentModal ? "دفعة من العميل" : "استرداد للعميل"
                }
              />
            </FormField>

            <FormField label="ملاحظات">
              <textarea
                name="notes"
                value={paymentForm.notes}
                onChange={updatePaymentField}
                rows="3"
                placeholder="ملاحظات إضافية..."
              />
            </FormField>

            <div className="finance-form__actions">
              <button
                type="button"
                className="finance-button finance-button--secondary"
                onClick={() => {
                  setPaymentModal(false);
                  setRefundModal(false);
                }}
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="finance-button finance-button--primary"
                disabled={submitting}
              >
                {submitting
                  ? "جاري الحفظ..."
                  : paymentModal
                    ? "تسجيل الدفعة"
                    : "تسجيل الاسترداد"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
