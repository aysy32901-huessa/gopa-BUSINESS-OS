
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Users,
  Target,
  Trophy,
  Phone,
  Mail,
  Building2,
  CalendarDays,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Save,
  ChevronRight,
  ChevronLeft,
  Filter,
  CircleDollarSign,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import leadService from "../../services/leadService";
import "./Leads.css";

// ==========================================
// CONSTANTS
// ==========================================

const STATUSES = [
  { value: "new", label: "جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "qualified", label: "مؤهل" },
  { value: "proposal", label: "عرض سعر" },
  { value: "negotiation", label: "تفاوض" },
  { value: "won", label: "تم الفوز" },
  { value: "lost", label: "خسارة" },
];

const SOURCES = [
  "Facebook",
  "Instagram",
  "Website",
  "Referral",
  "Google",
  "WhatsApp",
  "Other",
];

const INITIAL_FORM = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  source: "Other",
  status: "new",
  estimatedValue: 0,
  currency: "EGP",
  expectedCloseDate: "",
  notes: "",
};

// ==========================================
// HELPERS
// ==========================================

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("kemetix_user") || "{}");
  } catch {
    return {};
  }
};

const formatMoney = (value, currency = "EGP") => {
  const amount = Number(value || 0);

  return (
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(amount) + ` ${currency}`
  );
};

const formatDate = (date) => {
  if (!date) return "غير محدد";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "غير محدد";
  }

  return parsedDate.toLocaleDateString("ar-EG");
};

const getStatusLabel = (status) => {
  return STATUSES.find((item) => item.value === status)?.label || status;
};

const getErrorMessage = (error) => {
  return (
    error.response?.data?.message ||
    error.message ||
    "حدث خطأ غير متوقع. حاول مرة أخرى."
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function Leads() {
  // ------------------------------------------
  // USER & PERMISSIONS
  // ------------------------------------------

  const user = useMemo(() => getStoredUser(), []);

  const role = user?.role || user?.accountType || "";

  const canManage = [
    "general_admin",
    "department_manager",
  ].includes(role);

  const canDelete = role === "general_admin";

  // ------------------------------------------
  // STATE
  // ------------------------------------------

  const [leads, setLeads] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);

  // ==========================================
  // FETCH LEADS
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    leadService
      .getLeads({
        page: currentPage,
        limit: 10,
        search: search.trim(),
        status: statusFilter,
      })
      .then((response) => {
        if (cancelled) return;

        const data = response?.data || {};

        const receivedLeads = Array.isArray(data.leads)
          ? data.leads
          : [];

        setLeads(receivedLeads);

        setPagination({
          page: data.pagination?.page || currentPage,
          limit: data.pagination?.limit || 10,
          total: data.pagination?.total ?? receivedLeads.length,
          totalPages: data.pagination?.totalPages || 1,
        });

        setError("");
      })
      .catch((err) => {
        if (cancelled) return;

        setError(getErrorMessage(err));
        setLeads([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, search, statusFilter, refreshKey]);

  // ==========================================
  // SUCCESS MESSAGE
  // ==========================================

  const showSuccess = (message) => {
    setSuccess(message);
    setError("");

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  };

  // ==========================================
  // STATISTICS
  // ==========================================

  const stats = useMemo(() => {
    const total = pagination.total;

    const won = leads.filter(
      (lead) => lead.status === "won"
    ).length;

    const active = leads.filter(
      (lead) => !["won", "lost"].includes(lead.status)
    ).length;

    const pipelineValue = leads
      .filter(
        (lead) => !["won", "lost"].includes(lead.status)
      )
      .reduce(
        (sum, lead) => sum + Number(lead.estimatedValue || 0),
        0
      );

    return {
      total,
      active,
      won,
      pipelineValue,
    };
  }, [leads, pagination.total]);

  // ==========================================
  // MODAL HANDLERS
  // ==========================================

  const openCreateModal = () => {
    setEditingLead(null);
    setForm({ ...INITIAL_FORM });
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (lead) => {
    setEditingLead(lead);

    setForm({
      name: lead.name || "",
      companyName: lead.companyName || "",
      email: lead.email || "",
      phone: lead.phone || "",
      source: lead.source || "Other",
      status: lead.status || "new",
      estimatedValue: lead.estimatedValue || 0,
      currency: lead.currency || "EGP",
      expectedCloseDate: lead.expectedCloseDate
        ? new Date(lead.expectedCloseDate)
            .toISOString()
            .slice(0, 10)
        : "",
      notes: lead.notes || "",
    });

    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (actionLoading) return;

    setModalOpen(false);
    setEditingLead(null);
    setForm({ ...INITIAL_FORM });
  };

  // ==========================================
  // FORM HANDLERS
  // ==========================================

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // CREATE / UPDATE LEAD
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("من فضلك أدخل اسم العميل المحتمل.");
      return;
    }

    try {
      setActionLoading(true);
      setLoading(true);
      setError("");

      const payload = {
        ...form,
        name: form.name.trim(),
        companyName: form.companyName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        estimatedValue: Number(form.estimatedValue || 0),
        expectedCloseDate: form.expectedCloseDate || null,
      };

      if (editingLead) {
        await leadService.updateLead(
          editingLead._id,
          payload
        );

        showSuccess("تم تحديث بيانات العميل المحتمل بنجاح.");
      } else {
        await leadService.createLead(payload);

        showSuccess("تمت إضافة العميل المحتمل بنجاح.");
      }

      setModalOpen(false);
      setEditingLead(null);
      setForm({ ...INITIAL_FORM });

      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        setRefreshKey((previous) => previous + 1);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // DELETE LEAD
  // ==========================================

  const handleDelete = async (lead) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف العميل المحتمل "${lead.name}"؟`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setLoading(true);
      setError("");

      await leadService.deleteLead(lead._id);

      showSuccess("تم حذف العميل المحتمل بنجاح.");

      if (leads.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        setRefreshKey((previous) => previous + 1);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // CONVERT LEAD TO CLIENT
  // ==========================================

  const handleConvert = async (lead) => {
    const confirmed = window.confirm(
      `هل تريد تحويل "${lead.name}" إلى عميل داخل قائمة العملاء؟`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setLoading(true);
      setError("");

      await leadService.convertLead(lead._id);

      showSuccess(
        "تم تحويل العميل المحتمل إلى عميل بنجاح."
      );

      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // SEARCH & FILTER
  // ==========================================

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
    setLoading(true);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
    setLoading(true);
  };

  // ==========================================
  // PAGINATION
  // ==========================================

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) {
      return;
    }

    setCurrentPage(page);
    setLoading(true);
  };

  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((previous) => previous + 1);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <main className="leads-page" dir="rtl">

      {/* HEADER */}

      <header className="leads-header">
        <div>
          <div className="leads-eyebrow">
            <span className="leads-eyebrow-dot" />
            KEMETIX BUSINESS OS
          </div>

          <h1>العملاء المحتملون</h1>

          <p>
            تابع فرص البيع، ونظّم علاقاتك التجارية،
            وحوّل المهتمين إلى عملاء.
          </p>
        </div>

        <div className="leads-header-actions">
          <button
            type="button"
            className="leads-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="تحديث البيانات"
          >
            <RefreshCw
              size={17}
              className={loading ? "leads-spin" : ""}
            />
          </button>

          {canManage && (
            <button
              type="button"
              className="leads-primary-btn"
              onClick={openCreateModal}
            >
              <Plus size={19} />
              <span>إضافة عميل محتمل</span>
            </button>
          )}
        </div>
      </header>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="leads-alert leads-alert-error">
          <AlertCircle size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="إغلاق"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="leads-alert leads-alert-success">
          <CheckCircle2 size={18} />

          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="إغلاق"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <section className="leads-stats-grid">

        <article className="leads-stat-card">
          <div className="leads-stat-top">
            <span className="leads-stat-icon">
              <Users size={21} />
            </span>

            <span className="leads-stat-caption">
              إجمالي النتائج
            </span>
          </div>

          <strong>{stats.total}</strong>

          <small>إجمالي العملاء المحتملين</small>
        </article>

        <article className="leads-stat-card">
          <div className="leads-stat-top">
            <span className="leads-stat-icon">
              <Target size={21} />
            </span>

            <span className="leads-stat-caption">
              فرص نشطة
            </span>
          </div>

          <strong>{stats.active}</strong>

          <small>على مستوى الصفحة الحالية</small>
        </article>

        <article className="leads-stat-card">
          <div className="leads-stat-top">
            <span className="leads-stat-icon">
              <Trophy size={21} />
            </span>

            <span className="leads-stat-caption">
              فرص فائزة
            </span>
          </div>

          <strong>{stats.won}</strong>

          <small>على مستوى الصفحة الحالية</small>
        </article>

        <article className="leads-stat-card leads-stat-highlight">
          <div className="leads-stat-top">
            <span className="leads-stat-icon">
              <CircleDollarSign size={21} />
            </span>

            <span className="leads-stat-caption">
              قيمة الفرص الحالية
            </span>
          </div>

          <strong className="leads-stat-money">
            {formatMoney(stats.pipelineValue)}
          </strong>

          <small>الفرص النشطة في الصفحة الحالية</small>
        </article>

      </section>

      {/* LEADS CONTENT */}

      <section className="leads-content-card">

        <div className="leads-content-heading">
          <div>
            <h2>قائمة العملاء المحتملين</h2>

            <p>
              إدارة ومتابعة جميع فرص البيع الخاصة بك.
            </p>
          </div>

          <span className="leads-total-badge">
            {pagination.total} نتيجة
          </span>
        </div>

        {/* TOOLBAR */}

        <div className="leads-toolbar">

          <div className="leads-search-box">
            <Search size={19} />

            <input
              type="search"
              placeholder="ابحث بالاسم أو الشركة أو البريد أو الهاتف..."
              value={search}
              onChange={handleSearchChange}
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                  setLoading(true);
                }}
                aria-label="مسح البحث"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="leads-filter-box">
            <Filter size={17} />

            <select
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="">كل المراحل</option>

              {STATUSES.map((status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* TABLE */}

        <div className="leads-table-wrapper">
          <table className="leads-table">

            <thead>
              <tr>
                <th>العميل المحتمل</th>
                <th>بيانات التواصل</th>
                <th>المصدر</th>
                <th>القيمة المتوقعة</th>
                <th>مرحلة البيع</th>
                <th>موعد الإغلاق</th>
                <th>الإجراءات</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="7" className="leads-state-cell">
                    <RefreshCw
                      size={25}
                      className="leads-spin"
                    />

                    <span>جاري تحميل البيانات...</span>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="7">

                    <div className="leads-empty-state">
                      <div className="leads-empty-icon">
                        <Users size={30} />
                      </div>

                      <h3>لا توجد نتائج حتى الآن</h3>

                      <p>
                        {search || statusFilter
                          ? "جرّب تغيير كلمات البحث أو الفلتر."
                          : "ابدأ بإضافة أول عميل محتمل إلى نظامك."}
                      </p>

                      {canManage && !search && !statusFilter && (
                        <button
                          type="button"
                          className="leads-primary-btn"
                          onClick={openCreateModal}
                        >
                          <Plus size={18} />
                          إضافة أول عميل
                        </button>
                      )}
                    </div>

                  </td>
                </tr>
              ) : (
                leads.map((lead) => (

                  <tr key={lead._id}>

                    {/* LEAD INFO */}

                    <td>
                      <div className="leads-person-cell">

                        <div className="leads-avatar">
                          {(lead.name || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>{lead.name}</strong>

                          <span>
                            <Building2 size={13} />

                            {lead.companyName ||
                              "شركة غير محددة"}
                          </span>
                        </div>

                      </div>
                    </td>

                    {/* CONTACT */}

                    <td>
                      <div className="leads-contact-cell">

                        {lead.phone && (
                          <span>
                            <Phone size={13} />
                            {lead.phone}
                          </span>
                        )}

                        {lead.email && (
                          <span>
                            <Mail size={13} />
                            {lead.email}
                          </span>
                        )}

                        {!lead.phone && !lead.email && (
                          <span className="leads-muted">
                            لا توجد بيانات
                          </span>
                        )}

                      </div>
                    </td>

                    {/* SOURCE */}

                    <td>
                      <span className="leads-source">
                        {lead.source || "Other"}
                      </span>
                    </td>

                    {/* VALUE */}

                    <td>
                      <strong className="leads-value">
                        {formatMoney(
                          lead.estimatedValue,
                          lead.currency || "EGP"
                        )}
                      </strong>
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={`leads-status leads-status-${lead.status}`}
                      >
                        <span />
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>

                    {/* EXPECTED CLOSE DATE */}

                    <td>
                      <span className="leads-date">
                        <CalendarDays size={14} />

                        {formatDate(lead.expectedCloseDate)}
                      </span>
                    </td>

                    {/* ACTIONS */}

                    <td>
                      <div className="leads-actions">

                        {canManage && (
                          <button
                            type="button"
                            className="leads-action-btn leads-edit-btn"
                            title="تعديل"
                            onClick={() => openEditModal(lead)}
                          >
                            <Pencil size={16} />
                          </button>
                        )}

                        {canManage && lead.status === "won" && (
                          <button
                            type="button"
                            className="leads-action-btn leads-convert-btn"
                            title="تحويل إلى عميل"
                            onClick={() => handleConvert(lead)}
                            disabled={actionLoading}
                          >
                            <ArrowUpRight size={17} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            className="leads-action-btn leads-delete-btn"
                            title="حذف"
                            onClick={() => handleDelete(lead)}
                            disabled={actionLoading}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>

                ))
              )}

            </tbody>

          </table>
        </div>

        {/* PAGINATION */}

        <div className="leads-pagination">

          <span>
            صفحة {pagination.page} من {pagination.totalPages}
          </span>

          <div>

            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              aria-label="الصفحة السابقة"
            >
              <ChevronRight size={19} />
            </button>

            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={
                currentPage >= pagination.totalPages || loading
              }
              aria-label="الصفحة التالية"
            >
              <ChevronLeft size={19} />
            </button>

          </div>

        </div>

      </section>

      {/* CREATE / EDIT MODAL */}

      {modalOpen && (

        <div
          className="leads-modal-backdrop"
          onMouseDown={closeModal}
        >

          <section
            className="leads-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="leads-modal-title"
          >

            {/* MODAL HEADER */}

            <div className="leads-modal-header">

              <div>
                <span>KEMETIX CRM</span>

                <h2 id="leads-modal-title">
                  {editingLead
                    ? "تعديل بيانات العميل المحتمل"
                    : "إضافة عميل محتمل"}
                </h2>
              </div>

              <button
                type="button"
                className="leads-modal-close"
                onClick={closeModal}
                disabled={actionLoading}
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>

            </div>

            {/* MODAL FORM */}

            <form onSubmit={handleSubmit}>

              <div className="leads-form-grid">

                <label className="leads-form-field">
                  <span>
                    اسم العميل <b>*</b>
                  </span>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="اسم العميل المحتمل"
                    required
                    maxLength={150}
                  />
                </label>

                <label className="leads-form-field">
                  <span>اسم الشركة</span>

                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleFormChange}
                    placeholder="اسم الشركة"
                    maxLength={150}
                  />
                </label>

                <label className="leads-form-field">
                  <span>البريد الإلكتروني</span>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="example@company.com"
                  />
                </label>

                <label className="leads-form-field">
                  <span>رقم الهاتف</span>

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="+20 000 000 0000"
                  />
                </label>

                <label className="leads-form-field">
                  <span>مصدر العميل</span>

                  <select
                    name="source"
                    value={form.source}
                    onChange={handleFormChange}
                  >
                    {SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="leads-form-field">
                  <span>مرحلة البيع</span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    {STATUSES.map((status) => (
                      <option
                        key={status.value}
                        value={status.value}
                      >
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="leads-form-field">
                  <span>القيمة المتوقعة</span>

                  <input
                    type="number"
                    name="estimatedValue"
                    min="0"
                    value={form.estimatedValue}
                    onChange={handleFormChange}
                    placeholder="0"
                  />
                </label>

                <label className="leads-form-field">
                  <span>العملة</span>

                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleFormChange}
                  >
                    <option value="EGP">
                      EGP - جنيه مصري
                    </option>

                    <option value="USD">
                      USD - دولار
                    </option>

                    <option value="SAR">
                      SAR - ريال سعودي
                    </option>

                    <option value="AED">
                      AED - درهم إماراتي
                    </option>

                    <option value="EUR">
                      EUR - يورو
                    </option>
                  </select>
                </label>

                <label className="leads-form-field leads-form-full">
                  <span>تاريخ الإغلاق المتوقع</span>

                  <input
                    type="date"
                    name="expectedCloseDate"
                    value={form.expectedCloseDate}
                    onChange={handleFormChange}
                  />
                </label>

                <label className="leads-form-field leads-form-full">
                  <span>ملاحظات</span>

                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="اكتب أي تفاصيل أو ملاحظات مهمة عن العميل..."
                    rows="4"
                    maxLength={3000}
                  />
                </label>

              </div>

              {/* MODAL FOOTER */}

              <div className="leads-modal-footer">

                <button
                  type="button"
                  className="leads-cancel-btn"
                  onClick={closeModal}
                  disabled={actionLoading}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="leads-primary-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <RefreshCw
                      size={17}
                      className="leads-spin"
                    />
                  ) : (
                    <Save size={17} />
                  )}

                  {editingLead
                    ? "حفظ التعديلات"
                    : "إضافة العميل"}
                </button>

              </div>

            </form>

          </section>

        </div>

      )}

    </main>
  );
}
