
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  Plus,
  Search,
  LayoutGrid,
  List,
  CalendarDays,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Wallet,
  RefreshCw,
  Eye,
  ArrowUpRight,
  Trash2,
} from "lucide-react";

import api from "../../services/api";
import "./Projects.css";

// ==========================================
// LABELS
// ==========================================

const statusLabels = {
  planning: "قيد التخطيط",
  active: "قيد التنفيذ",
  on_hold: "متوقف مؤقتًا",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const priorityLabels = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

const paymentLabels = {
  unpaid: "غير مدفوع",
  partial: "مدفوع جزئيًا",
  paid: "مدفوع بالكامل",
};

// ==========================================
// HELPERS
// ==========================================

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount, currency = "EGP") {
  const value = Number(amount || 0);
  const safeValue = Number.isFinite(value) ? value : 0;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "EGP",
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `${safeValue.toLocaleString("en-US")} ${currency || "EGP"}`;
  }
}

function getClientName(client) {
  if (!client) return "بدون عميل";

  if (typeof client === "string") {
    return "عميل";
  }

  return client.companyName || client.contactName || "عميل";
}

function getRemaining(project) {
  const contractValue = Number(project.contractValue || 0);
  const paidAmount = Number(project.paidAmount || 0);

  return Math.max(0, contractValue - paidAmount);
}

function getPriorityLabel(priority) {
  return priorityLabels[priority] || "غير محددة";
}

function getStatusLabel(status) {
  return statusLabels[status] || status || "غير محدد";
}

function getPaymentLabel(paymentStatus) {
  return paymentLabels[paymentStatus] || "غير محدد";
}

function getProgress(progress) {
  const value = Number(progress || 0);

  if (!Number.isFinite(value)) return 0;

  return Math.min(100, Math.max(0, value));
}

// ==========================================
// PROJECTS PAGE
// ==========================================

function Projects() {
  // ========================================
  // STATES
  // ========================================

  const [projects, setProjects] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    pages: 1,
  });

  const [view, setView] = useState("table");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // ========================================
  // FETCH PROJECTS
  // ========================================

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/projects", {
          params: {
            page: 1,
            limit: 100,
            search: search.trim() || undefined,
            status: status || undefined,
            priority: priority || undefined,
          },
        });

        if (cancelled) return;

        const result = response.data?.data;
        const fetchedProjects = result?.projects || [];

        setProjects(fetchedProjects);

        setPagination(
          result?.pagination || {
            page: 1,
            limit: 100,
            total: fetchedProjects.length,
            pages: 1,
          }
        );
      } catch (err) {
        if (cancelled) return;

        setProjects([]);

        setError(
          err.response?.data?.message ||
            "حدث خطأ أثناء تحميل المشروعات. حاول مرة أخرى."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProjects();

    return () => {
      cancelled = true;
    };
  }, [search, status, priority, refreshKey]);

  // ========================================
  // SUMMARY STATISTICS
  // ========================================

  const activeCount = projects.filter(
    (project) => project.status === "active"
  ).length;

  const completedCount = projects.filter(
    (project) => project.status === "completed"
  ).length;

  const unpaidCount = projects.filter(
    (project) => project.paymentStatus === "unpaid"
  ).length;

  // ========================================
  // REFRESH PROJECTS
  // ========================================

  function refreshProjects() {
    setRefreshKey((value) => value + 1);
  }

  // ========================================
  // DELETE PROJECT
  // ========================================

  async function handleDeleteProject(project) {
    if (!project?._id || deletingId) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المشروع "${project.name}"؟\n\nلا يمكن التراجع عن هذه العملية.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(project._id);
      setActionError("");

      await api.delete(`/projects/${project._id}`);

      setProjects((currentProjects) =>
        currentProjects.filter(
          (item) => item._id !== project._id
        )
      );

      setPagination((current) => ({
        ...current,
        total: Math.max(0, Number(current.total || 0) - 1),
      }));
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "تعذر حذف المشروع. تأكد من صلاحياتك وحاول مرة أخرى."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <main className="projects-page" dir="rtl">

      {/* PAGE HEADER */}

      <header className="projects-header">

        <div className="projects-heading">

          <div className="projects-heading-icon">
            <FolderKanban size={25} />
          </div>

          <div>
            <span className="projects-eyebrow">
              KEMETIX BUSINESS OS
            </span>

            <h1>إدارة المشروعات</h1>

            <p>
              تابع مشروعات شركتك ومواعيد التسليم والمستحقات المالية
              من مكان واحد.
            </p>
          </div>

        </div>

        <Link to="/projects/new" className="projects-add-button">
          <Plus size={19} />
          <span>إضافة مشروع جديد</span>
        </Link>

      </header>

      {/* SUMMARY STATS */}

      <section className="projects-stats">

        <article className="project-stat-card">

          <div className="project-stat-icon gold">
            <FolderKanban size={21} />
          </div>

          <div>
            <span>إجمالي المشروعات المعروضة</span>
            <strong>{loading ? "—" : projects.length}</strong>
          </div>

        </article>

        <article className="project-stat-card">

          <div className="project-stat-icon blue">
            <Clock3 size={21} />
          </div>

          <div>
            <span>قيد التنفيذ</span>
            <strong>{loading ? "—" : activeCount}</strong>
          </div>

        </article>

        <article className="project-stat-card">

          <div className="project-stat-icon green">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>مشروعات مكتملة</span>
            <strong>{loading ? "—" : completedCount}</strong>
          </div>

        </article>

        <article className="project-stat-card">

          <div className="project-stat-icon red">
            <Wallet size={21} />
          </div>

          <div>
            <span>غير مدفوع بالكامل</span>
            <strong>{loading ? "—" : unpaidCount}</strong>
          </div>

        </article>

      </section>

      {/* TOOLBAR */}

      <section className="projects-toolbar">

        <div className="projects-search">

          <Search size={19} />

          <input
            type="search"
            placeholder="ابحث باسم المشروع..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

        </div>

        <div className="projects-filters">

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="planning">قيد التخطيط</option>
            <option value="active">قيد التنفيذ</option>
            <option value="on_hold">متوقف مؤقتًا</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
          </select>

          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="">كل الأولويات</option>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>

          <button
            type="button"
            className="projects-refresh"
            onClick={refreshProjects}
            title="تحديث المشروعات"
          >
            <RefreshCw size={18} />
          </button>

        </div>

        <div className="projects-view-switch">

          <button
            type="button"
            className={view === "table" ? "active" : ""}
            onClick={() => setView("table")}
            title="عرض الجدول"
          >
            <List size={19} />
          </button>

          <button
            type="button"
            className={view === "cards" ? "active" : ""}
            onClick={() => setView("cards")}
            title="عرض البطاقات"
          >
            <LayoutGrid size={19} />
          </button>

        </div>

      </section>

      {/* ACTION ERROR */}

      {actionError && (
        <div className="projects-message projects-error">

          <AlertCircle size={21} />

          <p>{actionError}</p>

          <button
            type="button"
            onClick={() => setActionError("")}
          >
            إغلاق
          </button>

        </div>
      )}

      {/* RESULTS */}

      <section className="projects-content">

        {/* LOADING */}

        {loading ? (

          <div className="projects-message">
            <RefreshCw className="projects-loader" size={27} />
            <p>جاري تحميل المشروعات...</p>
          </div>

        ) : error ? (

          /* ERROR */

          <div className="projects-message projects-error">

            <AlertCircle size={30} />

            <p>{error}</p>

            <button
              type="button"
              onClick={refreshProjects}
            >
              إعادة المحاولة
            </button>

          </div>

        ) : projects.length === 0 ? (

          /* EMPTY STATE */

          <div className="projects-empty">

            <div className="projects-empty-icon">
              <FolderKanban size={35} />
            </div>

            <h2>لا توجد مشروعات حتى الآن</h2>

            <p>
              ابدأ بإضافة أول مشروع لشركتك، وستظهر بياناته هنا.
            </p>

            <Link
              to="/projects/new"
              className="projects-add-button"
            >
              <Plus size={18} />
              إضافة أول مشروع
            </Link>

          </div>

        ) : view === "table" ? (

          /* TABLE VIEW */

          <div className="projects-table-wrapper">

            <table className="projects-table">

              <thead>
                <tr>
                  <th>اسم المشروع</th>
                  <th>العميل</th>
                  <th>تاريخ الاستلام</th>
                  <th>موعد التسليم</th>
                  <th>قيمة العقد</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>الأولوية</th>
                  <th>حالة الدفع</th>
                  <th>حالة المشروع</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>

              <tbody>

                {projects.map((project) => (

                  <tr key={project._id}>

                    <td className="project-name-cell">
                      <strong>
                        {project.name || "مشروع بدون اسم"}
                      </strong>
                    </td>

                    <td>
                      {getClientName(project.client)}
                    </td>

                    <td>
                      {formatDate(project.startDate)}
                    </td>

                    <td>
                      {formatDate(project.dueDate)}
                    </td>

                    <td className="money-cell">
                      {formatMoney(
                        project.contractValue,
                        project.currency
                      )}
                    </td>

                    <td className="money-cell paid-cell">
                      {formatMoney(
                        project.paidAmount,
                        project.currency
                      )}
                    </td>

                    <td className="money-cell remaining-cell">
                      {formatMoney(
                        getRemaining(project),
                        project.currency
                      )}
                    </td>

                    <td>
                      <span
                        className={`project-priority ${project.priority || "medium"}`}
                      >
                        {getPriorityLabel(project.priority)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`project-payment ${project.paymentStatus || "unpaid"}`}
                      >
                        {getPaymentLabel(project.paymentStatus)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`project-status ${project.status || "planning"}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                    </td>

                    {/* ACTIONS */}

                    <td>
                      <div className="project-actions">

                        <Link
                          to={`/projects/${project._id}`}
                          className="project-details-link"
                          title="عرض التفاصيل"
                        >
                          <Eye size={18} />
                        </Link>

                        <button
                          type="button"
                          className="project-delete-button"
                          title="حذف المشروع"
                          disabled={deletingId !== null}
                          onClick={() => handleDeleteProject(project)}
                        >
                          {deletingId === project._id ? (
                            <RefreshCw
                              size={17}
                              className="projects-loader"
                            />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>

                      </div>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        ) : (

          /* CARDS VIEW */

          <div className="projects-cards-grid">

            {projects.map((project) => {

              const progress = getProgress(project.progress);

              return (
                <article
                  className="project-card"
                  key={project._id}
                >

                  {/* CARD HEADER */}

                  <div className="project-card-top">

                    <div className="project-card-icon">
                      <FolderKanban size={22} />
                    </div>

                    <span
                      className={`project-status ${project.status || "planning"}`}
                    >
                      {getStatusLabel(project.status)}
                    </span>

                  </div>

                  {/* PROJECT TITLE */}

                  <div className="project-card-title">

                    <h3>
                      {project.name || "مشروع بدون اسم"}
                    </h3>

                    <p>
                      {getClientName(project.client)}
                    </p>

                  </div>

                  {/* PRIORITY */}

                  <div className="project-card-priority">

                    <span>الأولوية</span>

                    <strong
                      className={`project-priority ${project.priority || "medium"}`}
                    >
                      {getPriorityLabel(project.priority)}
                    </strong>

                  </div>

                  {/* PROGRESS */}

                  <div className="project-card-progress">

                    <div>
                      <span>نسبة الإنجاز</span>
                      <strong>{progress}%</strong>
                    </div>

                    <div className="project-progress-track">

                      <span
                        style={{ width: `${progress}%` }}
                      />

                    </div>

                  </div>

                  {/* DATES */}

                  <div className="project-card-dates">

                    <div>
                      <CalendarDays size={16} />
                      <span>
                        الاستلام: {formatDate(project.startDate)}
                      </span>
                    </div>

                    <div>
                      <Clock3 size={16} />
                      <span>
                        التسليم: {formatDate(project.dueDate)}
                      </span>
                    </div>

                  </div>

                  {/* FINANCIAL INFORMATION */}

                  <div className="project-card-finance">

                    <div>
                      <span>قيمة العقد</span>
                      <strong>
                        {formatMoney(
                          project.contractValue,
                          project.currency
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>المدفوع</span>
                      <strong className="paid-cell">
                        {formatMoney(
                          project.paidAmount,
                          project.currency
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>المتبقي</span>
                      <strong className="remaining-cell">
                        {formatMoney(
                          getRemaining(project),
                          project.currency
                        )}
                      </strong>
                    </div>

                  </div>

                  {/* PAYMENT STATUS */}

                  <div className="project-card-payment">

                    <span>حالة الدفع</span>

                    <strong
                      className={`project-payment ${project.paymentStatus || "unpaid"}`}
                    >
                      {getPaymentLabel(project.paymentStatus)}
                    </strong>

                  </div>

                  {/* PROJECT ACTIONS */}

                  <div className="project-card-actions">

                    <Link
                      to={`/projects/${project._id}`}
                      className="project-card-link"
                    >
                      عرض تفاصيل المشروع
                      <ArrowUpRight size={17} />
                    </Link>

                    <button
                      type="button"
                      className="project-delete-button"
                      title="حذف المشروع"
                      disabled={deletingId !== null}
                      onClick={() => handleDeleteProject(project)}
                    >
                      {deletingId === project._id ? (
                        <RefreshCw
                          size={17}
                          className="projects-loader"
                        />
                      ) : (
                        <>
                          <Trash2 size={17} />
                          حذف
                        </>
                      )}
                    </button>

                  </div>

                </article>
              );
            })}

          </div>

        )}

      </section>

      {/* FOOTER */}

      {!loading && !error && projects.length > 0 && (

        <footer className="projects-footer">

          <span>
            إجمالي النتائج: {pagination.total ?? projects.length}
          </span>

          <span>
            يتم عرض حتى 100 مشروع في هذه المرحلة
          </span>

        </footer>

      )}

    </main>
  );
}

export default Projects;
