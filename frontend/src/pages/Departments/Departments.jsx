
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Building2,
  Users,
  ListTodo,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Pencil,
  Eye,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BriefcaseBusiness,
  Mail,
  CalendarDays,
  LoaderCircle,
  AlertCircle,
  Power,
  ChartNoAxesCombined,
} from "lucide-react";

import api from "../../services/api";
import useAuth from "../../hooks/useAuth";
import "./Departments.css";

// ==================================================
// HELPERS
// ==================================================

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  "حدث خطأ غير متوقع. حاول مرة أخرى.";

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getManagerName = (manager) => {
  if (!manager) return "لم يتم تعيين مدير";

  return (
    [manager.firstName, manager.lastName]
      .filter(Boolean)
      .join(" ") ||
    manager.email ||
    "مدير القسم"
  );
};

// ==================================================
// DEPARTMENT MODAL
// ==================================================

function DepartmentModal({
  department,
  onClose,
  onSave,
  saving,
}) {
  const [form, setForm] = useState({
    name: department?.name || "",
    description: department?.description || "",
  });

  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.name.trim().length < 2) {
      setError("اسم القسم يجب أن يحتوي على حرفين على الأقل.");
      return;
    }

    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim(),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div
      className="dept-modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className="dept-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dept-modal-header">
          <div>
            <span className="dept-eyebrow">
              KEMETIX BUSINESS OS
            </span>

            <h2>
              {department ? "تعديل القسم" : "إنشاء قسم جديد"}
            </h2>

            <p>
              {department
                ? "حدّث بيانات القسم داخل شركتك."
                : "أضف قسمًا جديدًا لتنظيم فريق العمل والمهام."}
            </p>
          </div>

          <button
            type="button"
            className="dept-icon-button"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dept-form">
          <label>
            اسم القسم <span>*</span>

            <input
              type="text"
              value={form.name}
              maxLength={100}
              placeholder="مثال: قسم البرمجة"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              autoFocus
            />
          </label>

          <label>
            وصف القسم

            <textarea
              value={form.description}
              maxLength={500}
              rows={4}
              placeholder="اكتب نبذة مختصرة عن مسؤوليات القسم..."
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />

            <small>{form.description.length}/500</small>
          </label>

          {error && (
            <div className="dept-alert error">
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          <div className="dept-modal-actions">
            <button
              type="button"
              className="dept-button secondary"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="dept-button primary"
              disabled={saving}
            >
              {saving ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Plus size={17} />
              )}

              {saving
                ? "جارٍ الحفظ..."
                : department
                  ? "حفظ التعديلات"
                  : "إنشاء القسم"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================================================
// DEPARTMENT DETAILS
// ==================================================

function DepartmentDetails({ department, onClose }) {
  const analytics = department.analytics || {};

  const completionRate = Math.min(
    100,
    Math.max(0, analytics.completionRate || 0)
  );

  return (
    <div
      className="dept-modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className="dept-modal dept-details-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dept-modal-header">
          <div>
            <span className="dept-eyebrow">
              DEPARTMENT OVERVIEW
            </span>

            <h2>{department.name}</h2>

            <p>
              {department.description ||
                "لا يوجد وصف لهذا القسم."}
            </p>
          </div>

          <button
            type="button"
            className="dept-icon-button"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={19} />
          </button>
        </div>

        <div className="dept-details-manager">
          <div className="dept-manager-avatar">
            <BriefcaseBusiness size={21} />
          </div>

          <div>
            <span>مدير القسم</span>

            <strong>
              {getManagerName(department.manager)}
            </strong>

            {department.manager?.email && (
              <small>
                <Mail size={13} />
                {department.manager.email}
              </small>
            )}
          </div>
        </div>

        <div className="dept-details-grid">
          <DetailStat
            icon={<Users />}
            label="الموظفون"
            value={analytics.employeeCount ?? 0}
          />

          <DetailStat
            icon={<ListTodo />}
            label="إجمالي المهام"
            value={analytics.totalTasks ?? 0}
          />

          <DetailStat
            icon={<CheckCircle2 />}
            label="المهام المكتملة"
            value={analytics.completedTasks ?? 0}
          />

          <DetailStat
            icon={<Clock3 />}
            label="المهام المفتوحة"
            value={analytics.openTasks ?? 0}
          />

          <DetailStat
            icon={<AlertTriangle />}
            label="المهام المتأخرة"
            value={analytics.overdueTasks ?? 0}
          />

          <DetailStat
            icon={<ChartNoAxesCombined />}
            label="نسبة الإنجاز"
            value={`${analytics.completionRate ?? 0}%`}
          />
        </div>

        <div className="dept-progress-section">
          <div className="dept-progress-heading">
            <span>معدل إنجاز المهام</span>

            <strong>
              {analytics.completionRate ?? 0}%
            </strong>
          </div>

          <div className="dept-progress-track">
            <div
              className="dept-progress-fill"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="dept-details-footer">
          <span>
            <CalendarDays size={15} />
            تاريخ الإنشاء: {formatDate(department.createdAt)}
          </span>

          <span
            className={`dept-status ${
              department.isActive ? "active" : "inactive"
            }`}
          >
            {department.isActive ? "نشط" : "غير نشط"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// DETAIL STAT
// ==================================================

function DetailStat({ icon, label, value }) {
  return (
    <div className="dept-detail-stat">
      <div className="dept-detail-stat-icon">
        {icon}
      </div>

      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

// ==================================================
// DEPARTMENT CARD
// ==================================================

function DepartmentCard({
  department,
  canManage,
  onView,
  onEdit,
  onDeactivate,
}) {
  const analytics = department.analytics || {};

  const completionRate = Math.min(
    100,
    Math.max(0, analytics.completionRate || 0)
  );

  return (
    <article className="dept-card">
      <div className="dept-card-top">
        <div className="dept-card-icon">
          <Building2 size={22} />
        </div>

        <span
          className={`dept-status ${
            department.isActive ? "active" : "inactive"
          }`}
        >
          {department.isActive ? "نشط" : "غير نشط"}
        </span>
      </div>

      <div className="dept-card-info">
        <h3>{department.name}</h3>

        <p>
          {department.description ||
            "لا يوجد وصف لهذا القسم."}
        </p>
      </div>

      <div className="dept-card-manager">
        <div className="dept-manager-avatar small">
          <BriefcaseBusiness size={16} />
        </div>

        <div>
          <span>مدير القسم</span>

          <strong>
            {getManagerName(department.manager)}
          </strong>
        </div>
      </div>

      <div className="dept-card-stats">
        <div>
          <Users size={15} />
          <strong>{analytics.employeeCount ?? 0}</strong>
          <span>موظف</span>
        </div>

        <div>
          <ListTodo size={15} />
          <strong>{analytics.totalTasks ?? 0}</strong>
          <span>مهمة</span>
        </div>

        <div>
          <CheckCircle2 size={15} />
          <strong>{analytics.completedTasks ?? 0}</strong>
          <span>مكتملة</span>
        </div>
      </div>

      <div className="dept-card-progress">
        <div>
          <span>معدل الإنجاز</span>

          <strong>
            {analytics.completionRate ?? 0}%
          </strong>
        </div>

        <div className="dept-progress-track">
          <div
            className="dept-progress-fill"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      <div className="dept-card-actions">
        <button
          type="button"
          className="dept-button secondary"
          onClick={() => onView(department)}
        >
          <Eye size={16} />
          التفاصيل
        </button>

        {canManage && department.isActive && (
          <>
            <button
              type="button"
              className="dept-icon-button"
              onClick={() => onEdit(department)}
              title="تعديل القسم"
              aria-label="تعديل القسم"
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              className="dept-icon-button danger"
              onClick={() => onDeactivate(department)}
              title="تعطيل القسم"
              aria-label="تعطيل القسم"
            >
              <Power size={16} />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

// ==================================================
// OVERVIEW CARD
// ==================================================

function OverviewCard({ icon, label, value, note }) {
  return (
    <article className="dept-overview-card">
      <div className="dept-overview-top">
        <span>{label}</span>

        <div>{icon}</div>
      </div>

      <strong>{value}</strong>

      <small>{note}</small>
    </article>
  );
}

// ==================================================
// MAIN DEPARTMENTS PAGE
// ==================================================

export default function Departments() {
  const { user } = useAuth();

  const role = user?.role || user?.accountType || "";
  const canManage = role === "general_admin";

  const [departments, setDepartments] = useState([]);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // ==================================================
  // LOAD DEPARTMENTS
  // ==================================================

  const loadDepartments = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {
        const response = await api.get("/departments", {
          params: {
            search: search.trim(),
            status,
            page,
            limit: 20,
            sort: "newest",
          },
        });

        const data = response.data?.data;

        setDepartments(data?.departments || []);

        setPagination(
          data?.pagination || {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
          }
        );
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status, page]
  );

  // ==================================================
  // AUTO LOAD / FILTERS
  // ==================================================

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadDepartments();
    }, 300);

    return () => clearTimeout(timeout);
  }, [loadDepartments]);

  // ==================================================
  // SUCCESS MESSAGE
  // ==================================================

  const showSuccess = (message) => {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  };

  // ==================================================
  // CREATE / UPDATE DEPARTMENT
  // ==================================================

  const handleSave = async (payload) => {
    setSaving(true);

    try {
      if (editingDepartment) {
        await api.put(
          `/departments/${editingDepartment._id}`,
          payload
        );

        showSuccess("تم تحديث بيانات القسم بنجاح.");
      } else {
        await api.post("/departments", payload);

        showSuccess("تم إنشاء القسم بنجاح.");
      }

      setShowForm(false);
      setEditingDepartment(null);

      // إذا كنا في صفحة أخرى، نرجع للأولى
      // وسيقوم useEffect بتحميل البيانات تلقائيًا.
      if (!editingDepartment && page !== 1) {
        setPage(1);
      } else {
        await loadDepartments();
      }
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // DEACTIVATE DEPARTMENT
  // ==================================================

  const handleDeactivate = async (department) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من تعطيل قسم "${department.name}"؟\nلن يتم حذف بيانات القسم أو المهام المرتبطة به.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/departments/${department._id}`);

      showSuccess("تم تعطيل القسم بنجاح.");

      await loadDepartments({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // ==================================================
  // MODAL HANDLERS
  // ==================================================

  const openCreate = () => {
    setEditingDepartment(null);
    setShowForm(true);
  };

  const openEdit = (department) => {
    setEditingDepartment(department);
    setShowForm(true);
  };

  // ==================================================
  // OVERVIEW CALCULATIONS
  // ==================================================

  const totalEmployees = departments.reduce(
    (sum, item) =>
      sum + (item.analytics?.employeeCount || 0),
    0
  );

  const totalTasks = departments.reduce(
    (sum, item) =>
      sum + (item.analytics?.totalTasks || 0),
    0
  );

  const totalCompleted = departments.reduce(
    (sum, item) =>
      sum + (item.analytics?.completedTasks || 0),
    0
  );

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <main className="departments-page" dir="rtl">
      <header className="dept-page-header">
        <div>
          <span className="dept-eyebrow">
            KEMETIX BUSINESS OS / ORGANIZATION
          </span>

          <h1>
            إدارة <span>الأقسام</span>
          </h1>

          <p>
            نظّم هيكل شركتك، تابع أداء الفرق، وراقب إنجاز المهام
            من مكان واحد.
          </p>
        </div>

        <div className="dept-header-actions">
          <button
            type="button"
            className="dept-button secondary"
            onClick={() =>
              loadDepartments({ silent: true })
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "spin" : ""}
            />
            تحديث
          </button>

          {canManage && (
            <button
              type="button"
              className="dept-button primary"
              onClick={openCreate}
            >
              <Plus size={18} />
              قسم جديد
            </button>
          )}
        </div>
      </header>

      {/* PAGE ERROR */}

      {error && (
        <div className="dept-alert error page-alert">
          <AlertCircle size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="dept-alert success page-alert">
          <CheckCircle2 size={18} />

          {success}

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="إغلاق"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* OVERVIEW */}

      <section className="dept-overview-grid">
        <OverviewCard
          icon={<Building2 />}
          label="إجمالي الأقسام"
          value={pagination.total}
          note="الأقسام المطابقة للفلاتر"
        />

        <OverviewCard
          icon={<Users />}
          label="الموظفون"
          value={totalEmployees}
          note="ضمن الأقسام المعروضة"
        />

        <OverviewCard
          icon={<ListTodo />}
          label="إجمالي المهام"
          value={totalTasks}
          note="المهام المرتبطة بالأقسام"
        />

        <OverviewCard
          icon={<CheckCircle2 />}
          label="المهام المكتملة"
          value={totalCompleted}
          note="ضمن الأقسام المعروضة"
        />
      </section>

      {/* DEPARTMENTS CONTENT */}

      <section className="dept-content-panel">
        <div className="dept-content-heading">
          <div>
            <h2>هيكل الأقسام</h2>

            <p>
              استعرض الأقسام ومؤشرات الأداء الخاصة بها.
            </p>
          </div>

          <span className="dept-results-count">
            {pagination.total} قسم
          </span>
        </div>

        {/* SEARCH AND FILTERS */}

        <div className="dept-toolbar">
          <div className="dept-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              placeholder="ابحث باسم القسم أو الوصف..."
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="مسح البحث"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="حالة القسم"
          >
            <option value="all">كل الحالات</option>
            <option value="active">الأقسام النشطة</option>
            <option value="inactive">الأقسام غير النشطة</option>
          </select>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="dept-state">
            <LoaderCircle className="spin" size={30} />

            <strong>جارٍ تحميل الأقسام...</strong>

            <span>
              نجهز بيانات الأقسام ومؤشرات الأداء.
            </span>
          </div>
        ) : departments.length === 0 ? (
          /* EMPTY STATE */

          <div className="dept-state empty">
            <div className="dept-empty-icon">
              <Building2 size={30} />
            </div>

            <strong>لا توجد أقسام لعرضها</strong>

            <span>
              {search
                ? "جرّب تغيير كلمات البحث أو الفلاتر."
                : "لم تتم إضافة أي أقسام حتى الآن."}
            </span>

            {canManage &&
              !search &&
              status !== "inactive" && (
                <button
                  type="button"
                  className="dept-button primary"
                  onClick={openCreate}
                >
                  <Plus size={17} />
                  إنشاء أول قسم
                </button>
              )}
          </div>
        ) : (
          /* DEPARTMENT CARDS */

          <div className="dept-cards-grid">
            {departments.map((department) => (
              <DepartmentCard
                key={department._id}
                department={department}
                canManage={canManage}
                onView={setSelectedDepartment}
                onEdit={openEdit}
                onDeactivate={handleDeactivate}
              />
            ))}
          </div>
        )}

        {/* PAGINATION */}

        {!loading && pagination.totalPages > 1 && (
          <div className="dept-pagination">
            <span>
              صفحة {pagination.page} من{" "}
              {pagination.totalPages}
            </span>

            <div>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((prev) => Math.max(1, prev - 1))
                }
                aria-label="الصفحة السابقة"
              >
                <ChevronRight size={18} />
              </button>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() =>
                  setPage((prev) =>
                    Math.min(pagination.totalPages, prev + 1)
                  )
                }
                aria-label="الصفحة التالية"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}

      {showForm && (
        <DepartmentModal
          department={editingDepartment}
          onClose={() => {
            setShowForm(false);
            setEditingDepartment(null);
          }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* DETAILS MODAL */}

      {selectedDepartment && (
        <DepartmentDetails
          department={selectedDepartment}
          onClose={() => setSelectedDepartment(null)}
        />
      )}
    </main>
  );
}
