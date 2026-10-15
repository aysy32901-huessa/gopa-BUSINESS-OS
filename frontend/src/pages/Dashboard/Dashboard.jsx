
import { useEffect, useState } from "react";

import {
  Activity,
  ArrowDownLeft,
  ArrowUpLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Coins,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { NavLink, useLocation } from "react-router-dom";

import dashboardService from "../../services/dashboardService";
import WorkspaceRoutes from "../../routes/WorkspaceRoutes";

import "./Dashboard.css";

const roleLabels = {
  general_admin: "المدير العام",
  department_manager: "مدير قسم",
  employee: "موظف",
};

const pageTitles = {
  "/": "مركز القيادة",
  "/clients": "العملاء",
  "/leads": "العملاء المحتملون",
  "/projects": "المشروعات",
  "/tasks": "المهام",
  "/departments": "أداء الأقسام",
  "/finance": "المالية",
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US").format(value || 0);

const formatCurrency = (value, currency = "EGP") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `${formatNumber(value)} ${currency}`;
  }
};

function StatCard({ title, value, description, icon: Icon, accent }) {
  return (
    <article className={`stat-card ${accent}`}>
      <div className="stat-card-top">
        <span className="stat-card-icon">
          <Icon size={21} strokeWidth={1.8} />
        </span>

        <span className="stat-card-label">{title}</span>
      </div>

      <strong className="stat-card-value">
        {formatNumber(value)}
      </strong>

      <span className="stat-card-description">
        {description}
      </span>
    </article>
  );
}

function EmptyState({ message }) {
  return (
    <div className="dashboard-empty">
      <Activity size={25} />
      <span>{message}</span>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const location = useLocation();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Update the displayed date automatically.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Load dashboard data from the backend.
  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const data = await dashboardService.getOverview();

        if (isMounted) {
          setDashboard(data);
          setError("");
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError.response?.data?.message ||
              "تعذر تحميل بيانات لوحة القيادة. حاول تحديث الصفحة."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const overview = dashboard?.overview;
  const finance = dashboard?.finance;

  const departmentPerformance =
    dashboard?.departmentPerformance || [];

  const currentRole = dashboard?.scope?.role || user?.role;

  const isGeneralAdmin = currentRole === "general_admin";

  const isDepartmentManager =
    currentRole === "department_manager";

  const roleLabel = roleLabels[currentRole] || "عضو الفريق";

  const monthLabel = new Intl.DateTimeFormat("ar-EG", {
    month: "long",
    year: "numeric",
  }).format(currentDate);

  const pageTitle =
    pageTitles[location.pathname] || "مركز القيادة";

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const navClass = ({ isActive }) =>
    `sidebar-link${isActive ? " active" : ""}`;

  const workspaceUser = {
    ...user,
    role: currentRole,
  };

  // Loading screen.
  if (loading) {
    return (
      <main className="dashboard-loading" dir="rtl">
        <div className="loading-mark">K</div>
        <div className="loading-spinner" />

        <h2>جارٍ تجهيز مركز القيادة</h2>
        <p>نحمّل بيانات مساحة عملك...</p>
      </main>
    );
  }

  // Error screen.
  if (error) {
    return (
      <main className="dashboard-error-screen" dir="rtl">
        <div className="dashboard-error-card">
          <CircleAlert size={34} />

          <h2>لم نتمكن من تحميل لوحة القيادة</h2>
          <p>{error}</p>

          <button onClick={() => window.location.reload()}>
            إعادة المحاولة
          </button>

          <button className="error-logout" onClick={onLogout}>
            تسجيل الخروج
          </button>
        </div>
      </main>
    );
  }

  // Dashboard statistics.
  const stats = [
    {
      title: "إجمالي العملاء",
      value: overview?.clients?.total,
      description: `${formatNumber(
        overview?.clients?.newThisMonth
      )} عميل جديد هذا الشهر`,
      icon: Users,
      accent: "silver",
    },
    {
      title: "العملاء المحتملون",
      value: overview?.leads?.total,
      description: `${formatNumber(
        overview?.leads?.newThisMonth
      )} فرصة جديدة هذا الشهر`,
      icon: UserRound,
      accent: "gold",
    },
    {
      title: "المشروعات النشطة",
      value: overview?.projects?.active,
      description: `${formatNumber(
        overview?.projects?.total
      )} إجمالي المشروعات`,
      icon: FolderKanban,
      accent: "blue",
    },
    {
      title: "المهام المفتوحة",
      value: overview?.tasks?.open,
      description: `${formatNumber(
        overview?.tasks?.overdue
      )} مهمة متأخرة`,
      icon: ClipboardList,
      accent: "purple",
    },
  ];

  return (
    <main className="command-center" dir="rtl">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="إغلاق القائمة"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar ${
          sidebarOpen ? "is-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">K</div>

          <div className="sidebar-brand-text">
            <strong>KEMETIX</strong>
            <span>BUSINESS OS</span>
          </div>

          <button
            className="sidebar-close"
            onClick={closeSidebar}
            aria-label="إغلاق القائمة"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">
          WORKSPACE
        </div>

        {/* Main navigation */}
        <nav className="sidebar-navigation">
          <NavLink
            to="/"
            end
            className={navClass}
            onClick={closeSidebar}
          >
            <LayoutDashboard size={19} />
            <span>نظرة عامة</span>
          </NavLink>
        </nav>

        <div className="sidebar-section-label">
          مساحة العمل
        </div>

        {/* Workspace navigation */}
        <div className="sidebar-navigation">
          <NavLink
            to="/clients"
            className={navClass}
            onClick={closeSidebar}
          >
            <Users size={19} />
            <span>العملاء</span>
          </NavLink>

          <NavLink
            to="/leads"
            className={navClass}
            onClick={closeSidebar}
          >
            <BriefcaseBusiness size={19} />
            <span>العملاء المحتملون</span>
          </NavLink>

          <NavLink
            to="/projects"
            className={navClass}
            onClick={closeSidebar}
          >
            <FolderKanban size={19} />
            <span>المشروعات</span>
          </NavLink>

          <NavLink
            to="/tasks"
            className={navClass}
            onClick={closeSidebar}
          >
            <ClipboardList size={19} />
            <span>المهام</span>
          </NavLink>

          {(isGeneralAdmin || isDepartmentManager) && (
            <NavLink
              to="/departments"
              className={navClass}
              onClick={closeSidebar}
            >
              <Activity size={19} />
              <span>أداء الأقسام</span>
            </NavLink>
          )}

          {isGeneralAdmin && (
            <NavLink
              to="/finance"
              className={navClass}
              onClick={closeSidebar}
            >
              <Wallet size={19} />
              <span>المالية</span>
            </NavLink>
          )}
        </div>

        {/* Sidebar user information */}
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(user?.firstName || "K")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="sidebar-user-details">
              <strong>
                {user?.firstName} {user?.lastName}
              </strong>

              <span>{roleLabel}</span>
            </div>
          </div>

          <button
            className="sidebar-logout"
            onClick={onLogout}
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main dashboard area */}
      <section className="dashboard-main">
        {/* Topbar */}
        <header className="dashboard-topbar">
          <div className="topbar-right">
            <button
              className="mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu size={22} />
            </button>

            <div className="topbar-heading">
              <span className="topbar-eyebrow">
                KEMETIX / WORKSPACE
              </span>

              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="topbar-left">
            <div className="topbar-date">
              <CalendarDays size={17} />
              <span>{monthLabel}</span>
            </div>

            <div className="topbar-avatar">
              {(user?.firstName || "K")
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </header>

        {/* Workspace routes */}
        <WorkspaceRoutes user={workspaceUser}>
          <div className="dashboard-content">
            {/* Welcome section */}
            <section className="dashboard-welcome">
              <div>
                <span className="welcome-overline">
                  <span className="online-dot" />
                  WORKSPACE OVERVIEW
                </span>

                <h2>
                  أهلًا بك، {user?.firstName || "مرحبًا"}.
                </h2>

                <p>
                  إليك نظرة على أداء أعمالك وما يحدث داخل مساحة العمل.
                </p>
              </div>

              <div className="welcome-decoration">
                <span>K</span>
              </div>
            </section>

            {/* Performance statistics */}
            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">
                    PERFORMANCE
                  </span>

                  <h2>ملخص الأداء</h2>
                </div>

                <span className="section-period">
                  {monthLabel}
                </span>
              </div>

              <div className="stats-grid">
                {stats.map((stat) => (
                  <StatCard
                    key={stat.title}
                    {...stat}
                  />
                ))}
              </div>
            </section>

            {/* Tasks and sales */}
            <section className="dashboard-middle-grid">
              <article className="dashboard-panel tasks-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">
                      TASK MANAGEMENT
                    </span>

                    <h3>حالة المهام</h3>
                  </div>

                  <ClipboardList size={20} />
                </div>

                <div className="task-summary-grid">
                  <div className="task-summary-item">
                    <span className="task-summary-dot open-dot" />
                    <span>مفتوحة</span>

                    <strong>
                      {formatNumber(overview?.tasks?.open)}
                    </strong>
                  </div>

                  <div className="task-summary-item">
                    <span className="task-summary-dot completed-dot" />
                    <span>مكتملة</span>

                    <strong>
                      {formatNumber(overview?.tasks?.completed)}
                    </strong>
                  </div>

                  <div className="task-summary-item">
                    <span className="task-summary-dot overdue-dot" />
                    <span>متأخرة</span>

                    <strong>
                      {formatNumber(overview?.tasks?.overdue)}
                    </strong>
                  </div>
                </div>

                <div className="task-total">
                  <span>إجمالي المهام</span>

                  <strong>
                    {formatNumber(overview?.tasks?.total)}
                  </strong>
                </div>
              </article>

              <article className="dashboard-panel sales-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">
                      SALES OVERVIEW
                    </span>

                    <h3>المبيعات المؤكدة</h3>
                  </div>

                  <Coins size={20} />
                </div>

                <div className="sales-count">
                  <strong>
                    {formatNumber(
                      overview?.sales?.confirmedCount
                    )}
                  </strong>

                  <span>عملية بيع مؤكدة</span>
                </div>

                <div className="currency-list">
                  {overview?.sales?.byCurrency?.length ? (
                    overview.sales.byCurrency.map((item) => (
                      <div
                        className="currency-row"
                        key={item.currency}
                      >
                        <span>{item.currency}</span>

                        <strong>
                          {formatCurrency(
                            item.amount,
                            item.currency
                          )}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <EmptyState message="لا توجد مبيعات مؤكدة حتى الآن." />
                  )}
                </div>
              </article>
            </section>

            {/* Department performance */}
            {(isGeneralAdmin || isDepartmentManager) && (
              <section className="dashboard-panel department-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">
                      TEAM PERFORMANCE
                    </span>

                    <h3>أداء الأقسام</h3>
                  </div>

                  <Activity size={20} />
                </div>

                {departmentPerformance.length ? (
                  <div className="department-chart">
                    <ResponsiveContainer
                      width="100%"
                      height={280}
                    >
                      <BarChart
                        data={departmentPerformance}
                        margin={{
                          top: 12,
                          right: 8,
                          left: 8,
                          bottom: 8,
                        }}
                      >
                        <CartesianGrid
                          stroke="#ffffff"
                          strokeOpacity={0.07}
                          vertical={false}
                        />

                        <XAxis
                          dataKey="departmentName"
                          tick={{
                            fill: "#a7a7ad",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />

                        <YAxis
                          allowDecimals={false}
                          tick={{
                            fill: "#a7a7ad",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />

                        <Tooltip
                          cursor={{
                            fill: "rgba(255,255,255,0.04)",
                          }}
                          contentStyle={{
                            background: "#171719",
                            border: "1px solid #343438",
                            borderRadius: 10,
                            color: "#ffffff",
                          }}
                        />

                        <Bar
                          dataKey="completedTasks"
                          name="المهام المكتملة"
                          fill="#c5a76a"
                          radius={[5, 5, 0, 0]}
                        />

                        <Bar
                          dataKey="openTasks"
                          name="المهام المفتوحة"
                          fill="#777b86"
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="لا توجد بيانات أداء للأقسام حتى الآن." />
                )}

                {departmentPerformance.length > 0 && (
                  <div className="department-details">
                    {departmentPerformance.map((department) => (
                      <div
                        className="department-detail-row"
                        key={department.departmentId}
                      >
                        <strong>
                          {department.departmentName}
                        </strong>

                        <span>
                          {formatNumber(
                            department.completedTasks
                          )}{" "}
                          مكتملة
                        </span>

                        <span>
                          {formatNumber(
                            department.openTasks
                          )}{" "}
                          مفتوحة
                        </span>

                        <span>
                          {formatNumber(
                            department.totalTasks
                          )}{" "}
                          إجمالي
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Financial overview */}
            {isGeneralAdmin && finance?.available && (
              <section className="dashboard-section finance-section">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">
                      FINANCIAL OVERVIEW
                    </span>

                    <h2>نظرة مالية</h2>
                  </div>

                  <span className="finance-access">
                    <CheckCircle2 size={15} />
                    المدير العام
                  </span>
                </div>

                <div className="finance-grid">
                  <article className="finance-card income-card">
                    <div className="finance-card-heading">
                      <span>الإيرادات</span>
                      <ArrowUpLeft size={20} />
                    </div>

                    {finance.incomeByCurrency?.length ? (
                      finance.incomeByCurrency.map((item) => (
                        <div
                          className="finance-amount"
                          key={item.currency}
                        >
                          <strong>
                            {formatCurrency(
                              item.amount,
                              item.currency
                            )}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <EmptyState message="لا توجد إيرادات مسجلة." />
                    )}
                  </article>

                  <article className="finance-card expense-card">
                    <div className="finance-card-heading">
                      <span>المصروفات</span>
                      <ArrowDownLeft size={20} />
                    </div>

                    {finance.expensesByCurrency?.length ? (
                      finance.expensesByCurrency.map((item) => (
                        <div
                          className="finance-amount"
                          key={item.currency}
                        >
                          <strong>
                            {formatCurrency(
                              item.amount,
                              item.currency
                            )}
                          </strong>
                        </div>
                      ))
                    ) : (
                      <EmptyState message="لا توجد مصروفات مسجلة." />
                    )}
                  </article>
                </div>
              </section>
            )}

            {/* Footer */}
            <footer className="dashboard-footer">
              <span>KEMETIX BUSINESS OS</span>
              <span>BUILT FOR BETTER BUSINESS</span>
            </footer>
          </div>
        </WorkspaceRoutes>
      </section>
    </main>
  );
}

export default Dashboard;
