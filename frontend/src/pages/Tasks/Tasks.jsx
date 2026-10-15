import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  LayoutGrid,
  List,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Pencil,
  UserRound,
  X,
} from "lucide-react";

import api from "../../services/api";
import "./Tasks.css";

// ======================================================
// CONSTANTS
// ======================================================

const STATUS = {
  todo: { label: "جديدة", color: "todo" },
  in_progress: { label: "قيد التنفيذ", color: "progress" },
  review: { label: "قيد المراجعة", color: "review" },
  completed: { label: "مكتملة", color: "completed" },
  cancelled: { label: "ملغاة", color: "cancelled" },
};

const PRIORITY = {
  low: { label: "منخفضة", color: "low" },
  medium: { label: "متوسطة", color: "medium" },
  high: { label: "عالية", color: "high" },
  urgent: { label: "عاجلة", color: "urgent" },
};

const EMPTY_FORM = {
  title: "",
  description: "",
  project: "",
  assignedTo: "",
  department: "",
  status: "todo",
  priority: "medium",
  progress: 0,
  startDate: "",
  dueDate: "",
};

// ======================================================
// HELPERS
// ======================================================

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const getName = (user) => {
  if (!user) return "غير محدد";

  if (typeof user === "string") return user;

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return fullName || user.name || user.email || "غير محدد";
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const isOverdue = (task, currentTime) => {
  if (!task.dueDate) return false;

  if (["completed", "cancelled"].includes(task.status)) {
    return false;
  }

  return new Date(task.dueDate).getTime() < currentTime;
};

const isDueSoon = (task, currentTime) => {
  if (!task.dueDate) return false;

  if (["completed", "cancelled"].includes(task.status)) {
    return false;
  }

  const dueTime = new Date(task.dueDate).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return dueTime >= currentTime && dueTime <= currentTime + sevenDays;
};

const getResponseData = (response) => {
  return response?.data?.data ?? response?.data ?? {};
};

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || fallback;
};

// ======================================================
// TASK FORM MODAL
// ======================================================

function TaskFormModal({
  onClose,
  onSubmit,
  initialData,
  options,
  saving,
}) {
  const [form, setForm] = useState(() => {
    if (!initialData) return { ...EMPTY_FORM };

    return {
      title: initialData.title || "",
      description: initialData.description || "",
      project: getId(initialData.project),
      assignedTo: getId(initialData.assignedTo),
      department: getId(initialData.department),
      status: initialData.status || "todo",
      priority: initialData.priority || "medium",
      progress: Number(initialData.progress || 0),
      startDate: initialData.startDate
        ? String(initialData.startDate).slice(0, 10)
        : "",
      dueDate: initialData.dueDate
        ? String(initialData.dueDate).slice(0, 10)
        : "",
    };
  });

  const [formError, setFormError] = useState("");

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.title.trim()) {
      setFormError("اكتب عنوان المهمة أولاً.");
      return;
    }

    if (
      form.startDate &&
      form.dueDate &&
      new Date(form.dueDate) < new Date(form.startDate)
    ) {
      setFormError("تاريخ التسليم يجب أن يكون بعد تاريخ البداية.");
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      project: form.project || null,
      assignedTo: form.assignedTo || null,
      department: form.department || null,
      progress: Number(form.progress),
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
    };

    await onSubmit(payload);
  };

  return (
    <div className="task-modal-overlay" onMouseDown={onClose}>
      <div
        className="task-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="task-modal-header">
          <div>
            <span className="task-modal-eyebrow">KEMETIX WORKSPACE</span>
            <h2>{initialData ? "تعديل المهمة" : "إنشاء مهمة جديدة"}</h2>
            <p>أدخل بيانات المهمة وتابع تنفيذها من مكان واحد.</p>
          </div>

          <button
            type="button"
            className="task-icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="task-form-group">
            <label>عنوان المهمة *</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="مثال: تصميم الصفحة الرئيسية"
              maxLength={150}
              required
            />
          </div>

          <div className="task-form-group">
            <label>وصف المهمة</label>
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="اكتب تفاصيل المهمة..."
              rows={3}
            />
          </div>

          <div className="task-form-grid">
            <div className="task-form-group">
              <label>المشروع</label>
              <select
                value={form.project}
                onChange={(event) =>
                  updateField("project", event.target.value)
                }
              >
                <option value="">بدون مشروع</option>

                {options.projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-group">
              <label>المسؤول عن المهمة</label>
              <select
                value={form.assignedTo}
                onChange={(event) =>
                  updateField("assignedTo", event.target.value)
                }
              >
                <option value="">غير محدد</option>

                {options.users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {getName(user)}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-group">
              <label>القسم</label>
              <select
                value={form.department}
                onChange={(event) =>
                  updateField("department", event.target.value)
                }
              >
                <option value="">بدون قسم</option>

                {options.departments.map((department) => (
                  <option key={department._id} value={department._id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-group">
              <label>الأولوية</label>
              <select
                value={form.priority}
                onChange={(event) =>
                  updateField("priority", event.target.value)
                }
              >
                {Object.entries(PRIORITY).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-group">
              <label>الحالة</label>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value)
                }
              >
                {Object.entries(STATUS).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="task-form-group">
              <label>نسبة الإنجاز (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(event) =>
                  updateField("progress", event.target.value)
                }
              />
            </div>

            <div className="task-form-group">
              <label>تاريخ البداية</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  updateField("startDate", event.target.value)
                }
              />
            </div>

            <div className="task-form-group">
              <label>تاريخ التسليم</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  updateField("dueDate", event.target.value)
                }
              />
            </div>
          </div>

          {formError && (
            <div className="task-form-error">
              <AlertCircle size={17} />
              {formError}
            </div>
          )}

          <div className="task-modal-actions">
            <button
              type="button"
              className="task-button task-button-secondary"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="task-button task-button-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoaderCircle className="spin" size={17} />
                  جارٍ الحفظ...
                </>
              ) : initialData ? (
                "حفظ التعديلات"
              ) : (
                <>
                  <Plus size={17} />
                  إنشاء المهمة
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ======================================================
// TASK CARD
// ======================================================

function TaskCard({
  task,
  currentTime,
  onEdit,
  onDelete,
  onProgressChange,
}) {
  const overdue = isOverdue(task, currentTime);
  const status = STATUS[task.status] || STATUS.todo;
  const priority = PRIORITY[task.priority] || PRIORITY.medium;

  return (
    <article className="task-card">
      <div className="task-card-top">
        <span className={`task-status-badge ${status.color}`}>
          {status.label}
        </span>

        <span className={`task-priority-badge ${priority.color}`}>
          {priority.label}
        </span>
      </div>

      <h3>{task.title}</h3>

      {task.description && (
        <p className="task-card-description">{task.description}</p>
      )}

      <div className="task-card-meta">
        <span>
          <UserRound size={15} />
          {getName(task.assignedTo)}
        </span>

        <span>
          <FolderKanban size={15} />
          {task.project?.name || "بدون مشروع"}
        </span>

        <span className={overdue ? "is-overdue" : ""}>
          <CalendarDays size={15} />
          {formatDate(task.dueDate)}
        </span>
      </div>

      <div className="task-progress-heading">
        <span>نسبة الإنجاز</span>
        <strong>{Number(task.progress || 0)}%</strong>
      </div>

      <div className="task-progress-track">
        <div
          className="task-progress-fill"
          style={{
            width: `${Math.min(100, Math.max(0, Number(task.progress || 0)))}%`,
          }}
        />
      </div>

      <div className="task-card-actions">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={Number(task.progress || 0)}
          onChange={(event) =>
            onProgressChange(task._id, Number(event.target.value))
          }
          aria-label="نسبة إنجاز المهمة"
        />

        <button
          type="button"
          className="task-icon-button"
          onClick={() => onEdit(task)}
          title="تعديل المهمة"
        >
          <Pencil size={17} />
        </button>

        <button
          type="button"
          className="task-icon-button danger"
          onClick={() => onDelete(task)}
          title="حذف المهمة"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </article>
  );
}

// ======================================================
// MAIN TASKS PAGE
// ======================================================

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState({
    users: [],
    departments: [],
    projects: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [view, setView] = useState("table");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // ----------------------------------------------------
  // Fetch tasks
  // No synchronous state updates before the API request.
  // ----------------------------------------------------

  const fetchTasks = useCallback(async () => {
    try {
      const params = {
        page,
        limit: 100,
        sort: "createdAt",
      };

      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;

      const response = await api.get("/tasks", { params });
      const data = getResponseData(response);

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.tasks)
          ? data.tasks
          : [];

      setTasks(list);

      setPagination({
        total: data.pagination?.total ?? list.length,
        pages: data.pagination?.pages ?? 1,
      });

      setError("");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "حدث خطأ أثناء تحميل المهام. تأكد من اتصال الخادم."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter]);

  // ----------------------------------------------------
  // Fetch form options
  // ----------------------------------------------------

  const fetchOptions = useCallback(async () => {
    try {
      const response = await api.get("/tasks/options");
      const data = getResponseData(response);

      setOptions({
        users: Array.isArray(data.users) ? data.users : [],
        departments: Array.isArray(data.departments)
          ? data.departments
          : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
      });
    } catch (requestError) {
      console.error(
        "Failed to load task options:",
        requestError?.response?.data || requestError
      );
    }
  }, []);

  // ----------------------------------------------------
  // Effects
  // ----------------------------------------------------

// ======================================================
// EFFECTS
// ======================================================

// تحميل المهام
useEffect(() => {
  let isMounted = true;

  const timer = window.setTimeout(async () => {
    if (!isMounted) return;
    await fetchTasks();
  }, 0);

  return () => {
    isMounted = false;
    window.clearTimeout(timer);
  };
}, [fetchTasks]);

// تحميل بيانات النموذج
useEffect(() => {
  let isMounted = true;

  const timer = window.setTimeout(async () => {
    if (!isMounted) return;
    await fetchOptions();
  }, 0);

  return () => {
    isMounted = false;
    window.clearTimeout(timer);
  };
}, [fetchOptions]);

// تحديث الوقت كل دقيقة
useEffect(() => {
  const timer = window.setInterval(() => {
    setCurrentTime(Date.now());
  }, 60 * 1000);

  return () => {
    window.clearInterval(timer);
  };
}, []);
  // ----------------------------------------------------
  // Statistics
  // ----------------------------------------------------

  const stats = useMemo(() => {
    const total = pagination.total;
    const completed = tasks.filter(
      (task) => task.status === "completed"
    ).length;

    const open = tasks.filter((task) =>
      ["todo", "in_progress", "review"].includes(task.status)
    ).length;

    const overdue = tasks.filter((task) =>
      isOverdue(task, currentTime)
    ).length;

    const dueSoon = tasks.filter((task) =>
      isDueSoon(task, currentTime)
    ).length;

    const completionRate =
      tasks.length > 0
        ? Math.round((completed / tasks.length) * 100)
        : 0;

    return {
      total,
      completed,
      open,
      overdue,
      dueSoon,
      completionRate,
    };
  }, [tasks, pagination.total, currentTime]);

  // ----------------------------------------------------
  // Modal controls
  // ----------------------------------------------------

  const openCreateModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingTask(null);
  };

  // ----------------------------------------------------
  // Create / Update task
  // ----------------------------------------------------

  const saveTask = async (payload) => {
    setSaving(true);

    try {
      if (editingTask?._id) {
        await api.put(`/tasks/${editingTask._id}`, payload);
      } else {
        await api.post("/tasks", payload);
      }

      setModalOpen(false);
      setEditingTask(null);

      await fetchTasks();
    } catch (requestError) {
      alert(
        getErrorMessage(
          requestError,
          "حدث خطأ أثناء حفظ المهمة."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------
  // Update progress
  // ----------------------------------------------------

  const updateProgress = async (taskId, progress) => {
    try {
      await api.patch(`/tasks/${taskId}/progress`, {
        progress,
      });

      await fetchTasks();
    } catch (requestError) {
      alert(
        getErrorMessage(
          requestError,
          "تعذر تحديث نسبة إنجاز المهمة."
        )
      );
    }
  };

  // ----------------------------------------------------
  // Delete task
  // ----------------------------------------------------

  const deleteTask = async (task) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المهمة "${task.title}"؟`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/tasks/${task._id}`);
      await fetchTasks();
    } catch (requestError) {
      alert(
        getErrorMessage(
          requestError,
          "حدث خطأ أثناء حذف المهمة."
        )
      );
    }
  };

  // ----------------------------------------------------
  // Render helpers
  // ----------------------------------------------------

  const renderTaskStatus = (task) => {
    const status = STATUS[task.status] || STATUS.todo;

    return (
      <span className={`task-status-badge ${status.color}`}>
        {status.label}
      </span>
    );
  };

  const renderTaskPriority = (task) => {
    const priority = PRIORITY[task.priority] || PRIORITY.medium;

    return (
      <span className={`task-priority-badge ${priority.color}`}>
        {priority.label}
      </span>
    );
  };

  const renderTable = () => (
    <div className="tasks-table-wrapper">
      <table className="tasks-table">
        <thead>
          <tr>
            <th>المهمة</th>
            <th>المشروع</th>
            <th>المسؤول</th>
            <th>الأولوية</th>
            <th>الحالة</th>
            <th>الإنجاز</th>
            <th>موعد التسليم</th>
            <th>الإجراءات</th>
          </tr>
        </thead>

        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan="8" className="tasks-empty">
                لا توجد مهام لعرضها.
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task._id}>
                <td>
                  <strong>{task.title}</strong>

                  {task.description && (
                    <small>{task.description}</small>
                  )}
                </td>

                <td>{task.project?.name || "—"}</td>

                <td>{getName(task.assignedTo)}</td>

                <td>{renderTaskPriority(task)}</td>

                <td>{renderTaskStatus(task)}</td>

                <td>
                  <div className="task-table-progress">
                    <span>{Number(task.progress || 0)}%</span>
                    <div className="task-progress-track">
                      <div
                        className="task-progress-fill"
                        style={{
                          width: `${Number(task.progress || 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </td>

                <td>
                  <span
                    className={
                      isOverdue(task, currentTime) ? "is-overdue" : ""
                    }
                  >
                    {formatDate(task.dueDate)}
                  </span>
                </td>

                <td>
                  <div className="task-table-actions">
                    <button
                      type="button"
                      className="task-icon-button"
                      onClick={() => openEditModal(task)}
                      title="تعديل"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      className="task-icon-button danger"
                      onClick={() => deleteTask(task)}
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderCards = () => (
    <div className="tasks-cards-grid">
      {tasks.length === 0 ? (
        <div className="tasks-empty">لا توجد مهام لعرضها.</div>
      ) : (
        tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            currentTime={currentTime}
            onEdit={openEditModal}
            onDelete={deleteTask}
            onProgressChange={updateProgress}
          />
        ))
      )}
    </div>
  );

  const renderKanban = () => {
    const columns = [
      { key: "todo", title: "جديدة" },
      { key: "in_progress", title: "قيد التنفيذ" },
      { key: "review", title: "قيد المراجعة" },
      { key: "completed", title: "مكتملة" },
    ];

    return (
      <div className="tasks-kanban">
        {columns.map((column) => {
          const columnTasks = tasks.filter(
            (task) => task.status === column.key
          );

          return (
            <section className="kanban-column" key={column.key}>
              <div className="kanban-column-header">
                <h3>{column.title}</h3>
                <span>{columnTasks.length}</span>
              </div>

              <div className="kanban-column-body">
                {columnTasks.map((task) => (
                  <article className="kanban-task" key={task._id}>
                    <div className="kanban-task-top">
                      {renderTaskPriority(task)}
                    </div>

                    <h4>{task.title}</h4>

                    <p>{getName(task.assignedTo)}</p>

                    <div className="task-progress-track">
                      <div
                        className="task-progress-fill"
                        style={{
                          width: `${Number(task.progress || 0)}%`,
                        }}
                      />
                    </div>

                    <div className="kanban-task-footer">
                      <span>{Number(task.progress || 0)}%</span>

                      <button
                        type="button"
                        className="task-icon-button"
                        onClick={() => openEditModal(task)}
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </article>
                ))}

                {columnTasks.length === 0 && (
                  <p className="kanban-empty">لا توجد مهام</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  // ====================================================
  // MAIN RENDER
  // ====================================================

  return (
    <div className="tasks-page" dir="rtl">
      <div className="tasks-page-header">
        <div>
          <span className="tasks-eyebrow">KEMETIX BUSINESS OS</span>
          <h1>إدارة المهام</h1>
          <p>
            نظّم أعمال فريقك، تابع التقدم، وحافظ على مواعيد التسليم.
          </p>
        </div>

        <div className="tasks-header-actions">
          <button
            type="button"
            className="task-button task-button-secondary"
            onClick={fetchTasks}
          >
            <RefreshCw size={17} />
            تحديث
          </button>

          <button
            type="button"
            className="task-button task-button-primary"
            onClick={openCreateModal}
          >
            <Plus size={18} />
            مهمة جديدة
          </button>
        </div>
      </div>

      {/* Statistics */}

      <div className="tasks-stats-grid">
        <div className="task-stat-card">
          <div className="task-stat-icon">
            <Activity size={21} />
          </div>
          <span>إجمالي المهام</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon">
            <CircleDot size={21} />
          </div>
          <span>المهام المفتوحة</span>
          <strong>{stats.open}</strong>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon">
            <CheckCircle2 size={21} />
          </div>
          <span>المهام المكتملة</span>
          <strong>{stats.completed}</strong>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon">
            <AlertCircle size={21} />
          </div>
          <span>المهام المتأخرة</span>
          <strong className={stats.overdue > 0 ? "is-overdue" : ""}>
            {stats.overdue}
          </strong>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon">
            <Clock3 size={21} />
          </div>
          <span>تستحق خلال 7 أيام</span>
          <strong>{stats.dueSoon}</strong>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon">
            <CheckCircle2 size={21} />
          </div>
          <span>معدل الإنجاز</span>
          <strong>{stats.completionRate}%</strong>
        </div>
      </div>

      {/* Filters */}

      <div className="tasks-toolbar">
        <div className="tasks-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="ابحث عن مهمة..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">كل الحالات</option>
          {Object.entries(STATUS).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => {
            setPriorityFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">كل الأولويات</option>
          {Object.entries(PRIORITY).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </select>

        <div className="tasks-view-switch">
          <button
            type="button"
            className={view === "table" ? "active" : ""}
            onClick={() => setView("table")}
            title="عرض الجدول"
          >
            <List size={18} />
          </button>

          <button
            type="button"
            className={view === "cards" ? "active" : ""}
            onClick={() => setView("cards")}
            title="عرض البطاقات"
          >
            <LayoutGrid size={18} />
          </button>

          <button
            type="button"
            className={view === "kanban" ? "active" : ""}
            onClick={() => setView("kanban")}
            title="عرض Kanban"
          >
            <FolderKanban size={18} />
          </button>
        </div>
      </div>

      {/* Content */}

      {error && (
        <div className="tasks-error">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button type="button" onClick={fetchTasks}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="tasks-loading">
          <LoaderCircle className="spin" size={30} />
          <span>جارٍ تحميل المهام...</span>
        </div>
      ) : (
        <>
          {view === "table" && renderTable()}
          {view === "cards" && renderCards()}
          {view === "kanban" && renderKanban()}

          {pagination.pages > 1 && (
            <div className="tasks-pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((previous) => previous - 1)}
              >
                السابق
              </button>

              <span>
                صفحة {page} من {pagination.pages}
              </span>

              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => setPage((previous) => previous + 1)}
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}

      {/* Conditional mounting resets form state on every opening */}

      {modalOpen && (
        <TaskFormModal
          onClose={closeModal}
          onSubmit={saveTask}
          initialData={editingTask}
          options={options}
          saving={saving}
        />
      )}
    </div>
  );
}