
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Users,
  Building2,
  Mail,
  Phone,
  Eye,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserRound,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Filter,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import api from "../../services/api";
import useAuth from "../../hooks/useAuth";
import "./Clients.css";

const emptyForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  industry: "Other",
  source: "Other",
  status: "active",
  notes: "",
};

const industries = [
  "Other",
  "Technology",
  "Marketing",
  "Retail",
  "Healthcare",
  "Education",
  "Real Estate",
  "Construction",
  "Finance",
  "Manufacturing",
];

const sources = [
  "Other",
  "Website",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Referral",
  "Advertisement",
  "Cold Call",
];

const defaultPagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "حدث خطأ غير متوقع. حاول مرة أخرى."
  );
}

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function getUserName(user) {
  if (!user) return "غير محدد";

  const name = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user.email || "غير محدد";
}

function getClientResponse(response) {
  const result = response.data?.data;

  return {
    clients: Array.isArray(result?.clients)
      ? result.clients
      : [],
    pagination: result?.pagination || defaultPagination,
  };
}

export default function Clients() {
  const { user } = useAuth();

  const role = user?.role || user?.accountType || "";

  const canManage = [
    "general_admin",
    "department_manager",
  ].includes(role);

  const canDelete = role === "general_admin";

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [pagination, setPagination] = useState(defaultPagination);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // ==================================================
  // AUTOMATIC CLIENT FETCHING
  // ==================================================

  useEffect(() => {
    let active = true;

    const fetchClients = async () => {
      try {
        const response = await api.get("/clients", {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
            page: 1,
            limit: pagination.limit,
          },
        });

        if (!active) return;

        const result = getClientResponse(response);

        setClients(result.clients);
        setPagination(result.pagination);
        setError("");
      } catch (requestError) {
        if (!active) return;

        setError(getErrorMessage(requestError));
        setClients([]);
        setPagination((current) => ({
          ...current,
          page: 1,
        }));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchClients();

    return () => {
      active = false;
    };
  }, [search, statusFilter, pagination.limit]);

  // ==================================================
  // MANUAL CLIENT FETCHING
  // ==================================================

  const loadClients = useCallback(
    async ({ showRefresh = false, page = 1 } = {}) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await api.get("/clients", {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
            page,
            limit: pagination.limit,
          },
        });

        const result = getClientResponse(response);

        setClients(result.clients);
        setPagination(result.pagination);
        setError("");

        return true;
      } catch (requestError) {
        setError(getErrorMessage(requestError));
        return false;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, statusFilter, pagination.limit]
  );

  // ==================================================
  // MODALS
  // ==================================================

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (client) => {
    setEditingId(client._id);

    setForm({
      companyName: client.companyName || "",
      contactName: client.contactName || "",
      email: client.email || "",
      phone: client.phone || "",
      industry: client.industry || "Other",
      source: client.source || "Other",
      status: client.status || "active",
      notes: client.notes || "",
    });

    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  // ==================================================
  // FORM HANDLING
  // ==================================================

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.companyName.trim()) {
      setError("اكتب اسم الشركة أو العميل أولًا.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        industry: form.industry,
        source: form.source,
        status: form.status,
        notes: form.notes.trim(),
      };

      if (editingId) {
        await api.put(`/clients/${editingId}`, payload);
        setSuccess("تم تحديث بيانات العميل بنجاح.");
      } else {
        await api.post("/clients", payload);
        setSuccess("تمت إضافة العميل بنجاح.");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadClients({ page: 1 });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // CLIENT DETAILS
  // ==================================================

  const openDetails = (client) => {
    setSelectedClient(client);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedClient(null);
  };

  // ==================================================
  // DELETE CLIENT
  // ==================================================

  const handleDelete = async (client) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف العميل "${client.companyName}"؟ لا يمكن التراجع عن هذا الإجراء.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/clients/${client._id}`);

      setSuccess("تم حذف العميل بنجاح.");

      if (selectedClient?._id === client._id) {
        closeDetails();
      }

      const nextPage =
        clients.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await loadClients({ page: nextPage });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  // ==================================================
  // SEARCH AND FILTERS
  // ==================================================

  const handleSearch = (event) => {
    event.preventDefault();

    const nextSearch = searchInput.trim();

    if (nextSearch === search) return;

    setLoading(true);
    setSearch(nextSearch);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setLoading(true);
  };

  const handleStatusChange = (event) => {
    setLoading(true);
    setStatusFilter(event.target.value);
  };

  // ==================================================
  // PAGINATION
  // ==================================================

  const changePage = (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      nextPage === pagination.page ||
      loading
    ) {
      return;
    }

    loadClients({ page: nextPage });
  };

  // ==================================================
  // STATISTICS
  // ==================================================

  const activeCount = clients.filter(
    (client) => client.status === "active"
  ).length;

  const inactiveCount = clients.filter(
    (client) => client.status === "inactive"
  ).length;

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <section className="clients-page" dir="rtl">

      {/* PAGE HEADER */}

      <div className="clients-page-header">
        <div>
          <div className="clients-eyebrow">
            <span className="clients-eyebrow-line" />
            KEMETIX BUSINESS OS
          </div>

          <h1>إدارة العملاء</h1>

          <p>
            نظّم علاقات شركتك، واحتفظ ببيانات عملائك في مكان واحد.
          </p>
        </div>

        <div className="clients-header-actions">
          <button
            type="button"
            className="clients-refresh-btn"
            onClick={() =>
              loadClients({
                showRefresh: true,
                page: pagination.page,
              })
            }
            disabled={loading || refreshing}
            title="تحديث البيانات"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "clients-spin" : ""}
            />
          </button>

          {canManage && (
            <button
              type="button"
              className="clients-primary-btn"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              <span>إضافة عميل</span>
            </button>
          )}
        </div>
      </div>

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="clients-alert clients-alert-success">
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

      {/* ERROR MESSAGE */}

      {error && !modalOpen && (
        <div className="clients-alert clients-alert-error">
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

      {/* STATISTICS */}

      <div className="clients-stats-grid">

        <div className="clients-stat-card">
          <div className="clients-stat-icon clients-stat-icon-gold">
            <Users size={21} />
          </div>

          <div className="clients-stat-content">
            <span>إجمالي العملاء</span>
            <strong>{pagination.total}</strong>
            <small>جميع العملاء ضمن نطاق صلاحياتك</small>
          </div>
        </div>

        <div className="clients-stat-card">
          <div className="clients-stat-icon clients-stat-icon-green">
            <CheckCircle2 size={21} />
          </div>

          <div className="clients-stat-content">
            <span>عملاء نشطون</span>
            <strong>{activeCount}</strong>
            <small>في الصفحة الحالية</small>
          </div>
        </div>

        <div className="clients-stat-card">
          <div className="clients-stat-icon clients-stat-icon-muted">
            <UserRound size={21} />
          </div>

          <div className="clients-stat-content">
            <span>عملاء غير نشطين</span>
            <strong>{inactiveCount}</strong>
            <small>في الصفحة الحالية</small>
          </div>
        </div>

      </div>

      {/* CLIENTS CONTENT */}

      <div className="clients-content-card">

        <div className="clients-toolbar">

          <div className="clients-toolbar-title">
            <div className="clients-toolbar-icon">
              <Building2 size={19} />
            </div>

            <div>
              <h2>قائمة العملاء</h2>
              <span>{pagination.total} عميل مسجل</span>
            </div>
          </div>

          <div className="clients-filters">

            <form
              className="clients-search"
              onSubmit={handleSearch}
            >
              <Search size={17} />

              <input
                type="search"
                placeholder="ابحث عن عميل..."
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="مسح البحث"
                >
                  <X size={15} />
                </button>
              )}
            </form>

            <label className="clients-status-filter">
              <Filter size={16} />

              <select
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <option value="">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </label>

          </div>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="clients-state">
            <LoaderCircle
              className="clients-spin"
              size={32}
            />

            <h3>جاري تحميل العملاء</h3>

            <p>
              بنجيب أحدث البيانات من قاعدة البيانات...
            </p>
          </div>

        ) : clients.length === 0 ? (

          /* EMPTY STATE */

          <div className="clients-state">
            <div className="clients-empty-icon">
              <Users size={32} />
            </div>

            <h3>
              {search || statusFilter
                ? "لا توجد نتائج مطابقة"
                : "لسه مفيش عملاء"}
            </h3>

            <p>
              {search || statusFilter
                ? "جرّب تغيير كلمات البحث أو فلتر الحالة."
                : "ابدأ بإضافة أول عميل لشركتك، وهتظهر بياناته هنا."}
            </p>

            {canManage && !search && !statusFilter && (
              <button
                type="button"
                className="clients-primary-btn"
                onClick={openCreateModal}
              >
                <Plus size={17} />
                إضافة أول عميل
              </button>
            )}
          </div>

        ) : (

          /* CLIENTS TABLE */

          <>
            <div className="clients-table-wrapper">
              <table className="clients-table">

                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>الشخص المسؤول</th>
                    <th>بيانات التواصل</th>
                    <th>الحالة</th>
                    <th>تاريخ الإضافة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {clients.map((client) => (
                    <tr key={client._id}>

                      <td>
                        <div className="clients-name-cell">
                          <div className="clients-avatar">
                            {getInitials(client.companyName)}
                          </div>

                          <div>
                            <strong>{client.companyName}</strong>
                            <span>{client.industry || "Other"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="clients-contact-name">
                          <UserRound size={15} />
                          {client.contactName || "غير محدد"}
                        </div>
                      </td>

                      <td>
                        <div className="clients-contact-info">

                          {client.email && (
                            <span>
                              <Mail size={13} />
                              {client.email}
                            </span>
                          )}

                          {client.phone && (
                            <span>
                              <Phone size={13} />
                              {client.phone}
                            </span>
                          )}

                          {!client.email && !client.phone && (
                            <span className="clients-no-data">
                              لا توجد بيانات
                            </span>
                          )}

                        </div>
                      </td>

                      <td>
                        <span
                          className={`clients-status ${
                            client.status === "active"
                              ? "is-active"
                              : "is-inactive"
                          }`}
                        >
                          <span />

                          {client.status === "active"
                            ? "نشط"
                            : "غير نشط"}
                        </span>
                      </td>

                      <td>
                        <span className="clients-date">
                          {formatDate(client.createdAt)}
                        </span>
                      </td>

                      <td>
                        <div className="clients-row-actions">

                          <button
                            type="button"
                            title="عرض التفاصيل"
                            onClick={() => openDetails(client)}
                          >
                            <Eye size={16} />
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              title="تعديل العميل"
                              onClick={() => openEditModal(client)}
                            >
                              <Pencil size={16} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              className="clients-delete-action"
                              title="حذف العميل"
                              onClick={() => handleDelete(client)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            {/* PAGINATION */}

            <div className="clients-pagination">

              <span>
                عرض {clients.length} من {pagination.total} عميل
              </span>

              <div className="clients-pagination-actions">

                <button
                  type="button"
                  onClick={() =>
                    changePage(pagination.page - 1)
                  }
                  disabled={pagination.page <= 1 || loading}
                  aria-label="الصفحة السابقة"
                >
                  <ChevronRight size={17} />
                </button>

                <span>
                  {pagination.page} /{" "}
                  {Math.max(1, pagination.totalPages)}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    changePage(pagination.page + 1)
                  }
                  disabled={
                    pagination.page >= pagination.totalPages ||
                    loading
                  }
                  aria-label="الصفحة التالية"
                >
                  <ChevronLeft size={17} />
                </button>

              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}

      {modalOpen && (
        <div
          className="clients-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            className="clients-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clients-modal-title"
          >

            <div className="clients-modal-header">

              <div>
                <span>KEMETIX CLIENT MANAGEMENT</span>

                <h2 id="clients-modal-title">
                  {editingId
                    ? "تعديل بيانات العميل"
                    : "إضافة عميل جديد"}
                </h2>

                <p>
                  {editingId
                    ? "حدّث بيانات العميل واحفظ التغييرات."
                    : "أدخل بيانات العميل لإضافته إلى قاعدة بيانات شركتك."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="clients-form-grid">

                <label className="clients-form-field clients-field-full">
                  <span>اسم الشركة / العميل *</span>

                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleFormChange}
                    placeholder="مثال: KEMETIX Technologies"
                    maxLength={150}
                    required
                  />
                </label>

                <label className="clients-form-field">
                  <span>اسم الشخص المسؤول</span>

                  <input
                    name="contactName"
                    value={form.contactName}
                    onChange={handleFormChange}
                    placeholder="الاسم بالكامل"
                    maxLength={100}
                  />
                </label>

                <label className="clients-form-field">
                  <span>البريد الإلكتروني</span>

                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="name@company.com"
                  />
                </label>

                <label className="clients-form-field">
                  <span>رقم الهاتف</span>

                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="+20 100 000 0000"
                  />
                </label>

                <label className="clients-form-field">
                  <span>مجال العمل</span>

                  <select
                    name="industry"
                    value={form.industry}
                    onChange={handleFormChange}
                  >
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="clients-form-field">
                  <span>مصدر العميل</span>

                  <select
                    name="source"
                    value={form.source}
                    onChange={handleFormChange}
                  >
                    {sources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="clients-form-field">
                  <span>حالة العميل</span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </label>

                <label className="clients-form-field clients-field-full">
                  <span>ملاحظات</span>

                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="اكتب أي معلومات إضافية عن العميل..."
                    rows={4}
                    maxLength={3000}
                  />
                </label>

              </div>

              {error && (
                <div className="clients-alert clients-alert-error">
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              <div className="clients-modal-footer">

                <button
                  type="button"
                  className="clients-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="clients-primary-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="clients-spin"
                      />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editingId
                        ? "حفظ التعديلات"
                        : "إضافة العميل"}
                    </>
                  )}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT DETAILS MODAL */}

      {detailsOpen && selectedClient && (
        <div
          className="clients-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDetails();
            }
          }}
        >
          <div
            className="clients-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clients-details-title"
          >

            <div className="clients-details-top">

              <button
                type="button"
                onClick={closeDetails}
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>

              <div className="clients-details-avatar">
                {getInitials(selectedClient.companyName)}
              </div>

              <h2 id="clients-details-title">
                {selectedClient.companyName}
              </h2>

              <p>{selectedClient.industry || "Other"}</p>

              <span
                className={`clients-status ${
                  selectedClient.status === "active"
                    ? "is-active"
                    : "is-inactive"
                }`}
              >
                <span />

                {selectedClient.status === "active"
                  ? "عميل نشط"
                  : "عميل غير نشط"}
              </span>

            </div>

            <div className="clients-details-body">

              <h3>معلومات العميل</h3>

              <div className="clients-detail-row">
                <UserRound size={17} />

                <div>
                  <span>الشخص المسؤول</span>
                  <strong>
                    {selectedClient.contactName || "غير محدد"}
                  </strong>
                </div>
              </div>

              <div className="clients-detail-row">
                <Mail size={17} />

                <div>
                  <span>البريد الإلكتروني</span>
                  <strong>
                    {selectedClient.email || "غير متوفر"}
                  </strong>
                </div>
              </div>

              <div className="clients-detail-row">
                <Phone size={17} />

                <div>
                  <span>رقم الهاتف</span>
                  <strong>
                    {selectedClient.phone || "غير متوفر"}
                  </strong>
                </div>
              </div>

              <div className="clients-detail-row">
                <BriefcaseBusiness size={17} />

                <div>
                  <span>مصدر العميل</span>
                  <strong>
                    {selectedClient.source || "Other"}
                  </strong>
                </div>
              </div>

              <div className="clients-detail-row">
                <CalendarDays size={17} />

                <div>
                  <span>تاريخ الإضافة</span>
                  <strong>
                    {formatDate(selectedClient.createdAt)}
                  </strong>
                </div>
              </div>

              <div className="clients-detail-row">
                <UserRound size={17} />

                <div>
                  <span>الموظف المسؤول</span>
                  <strong>
                    {getUserName(selectedClient.assignedTo)}
                  </strong>
                </div>
              </div>

              <div className="clients-detail-notes">

                <div>
                  <FileText size={17} />
                  <strong>ملاحظات</strong>
                </div>

                <p>
                  {selectedClient.notes ||
                    "لا توجد ملاحظات مسجلة."}
                </p>

              </div>
            </div>

            <div className="clients-details-footer">

              {canManage && (
                <button
                  type="button"
                  className="clients-primary-btn"
                  onClick={() => {
                    setDetailsOpen(false);
                    openEditModal(selectedClient);
                  }}
                >
                  <Pencil size={16} />
                  تعديل البيانات
                </button>
              )}

              <button
                type="button"
                className="clients-cancel-btn"
                onClick={closeDetails}
              >
                إغلاق
              </button>

            </div>
          </div>
        </div>
      )}

    </section>
  );
}
