
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FolderPlus,
  Save,
  LoaderCircle,
  CalendarDays,
  Wallet,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import api from "../../services/api";
import "./CreateProject.css";

// ======================================================
// INITIAL FORM
// ======================================================

const initialForm = {
  name: "",
  description: "",
  client: "",
  status: "",
  priority: "medium",
  startDate: "",
  dueDate: "",
  budget: "0",
  contractValue: "0",
  paidAmount: "0",
  currency: "EGP",
  progress: "0",
};

// ======================================================
// OPTIONS
// ======================================================

const statusOptions = [
  { value: "planning", label: "قيد التخطيط" },
  { value: "active", label: "نشط" },
  { value: "on_hold", label: "متوقف مؤقتًا" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];

const priorityOptions = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];

const currencyOptions = [
  { value: "EGP", label: "جنيه مصري (EGP)" },
  { value: "USD", label: "دولار أمريكي (USD)" },
  { value: "SAR", label: "ريال سعودي (SAR)" },
  { value: "AED", label: "درهم إماراتي (AED)" },
  { value: "EUR", label: "يورو (EUR)" },
];

// ======================================================
// HELPERS
// ======================================================

function getClientsFromResponse(response) {
  const payload = response?.data?.data ?? response?.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.clients)) {
    return payload.clients;
  }

  return [];
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

// ======================================================
// CREATE PROJECT COMPONENT
// ======================================================

function CreateProject() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);

  const [clients, setClients] = useState([]);

  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ====================================================
  // LOAD CLIENTS
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    async function fetchClients() {
      try {
        const response = await api.get("/clients", {
          params: {
            page: 1,
            limit: 100,
          },
        });

        if (!cancelled) {
          setClients(getClientsFromResponse(response));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "تعذر تحميل قائمة العملاء. حاول تحديث الصفحة."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingClients(false);
        }
      }
    }

    fetchClients();

    return () => {
      cancelled = true;
    };
  }, []);

  // ====================================================
  // HANDLE INPUT CHANGES
  // ====================================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  }

  // ====================================================
  // FORM VALIDATION
  // ====================================================

  function validateForm() {
    if (!form.name.trim()) {
      return "اكتب اسم المشروع أولًا.";
    }

    if (!form.status) {
      return "اختر حالة المشروع قبل الحفظ.";
    }

    if (!statusOptions.some((option) => option.value === form.status)) {
      return "حالة المشروع المختارة غير صحيحة.";
    }

    if (!priorityOptions.some((option) => option.value === form.priority)) {
      return "أولوية المشروع المختارة غير صحيحة.";
    }

    if (!currencyOptions.some((option) => option.value === form.currency)) {
      return "العملة المختارة غير صحيحة.";
    }

    const budget = Number(form.budget);
    const contractValue = Number(form.contractValue);
    const paidAmount = Number(form.paidAmount);
    const progress = Number(form.progress);

    const financialValues = [
      budget,
      contractValue,
      paidAmount,
      progress,
    ];

    if (financialValues.some((value) => !Number.isFinite(value))) {
      return "تأكد من إدخال أرقام صحيحة في الحقول المالية ونسبة الإنجاز.";
    }

    if (budget < 0 || contractValue < 0 || paidAmount < 0) {
      return "القيم المالية لا يمكن أن تكون أقل من صفر.";
    }

    if (paidAmount > contractValue) {
      return "المبلغ المستلم لا يمكن أن يكون أكبر من قيمة العقد.";
    }

    if (progress < 0 || progress > 100) {
      return "نسبة الإنجاز يجب أن تكون بين 0 و100.";
    }

    if (
      form.startDate &&
      form.dueDate &&
      form.dueDate < form.startDate
    ) {
      return "تاريخ التسليم لا يمكن أن يسبق تاريخ بداية المشروع.";
    }

    return "";
  }

  // ====================================================
  // SUBMIT PROJECT
  // ====================================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      budget: Number(form.budget),
      contractValue: Number(form.contractValue),
      paidAmount: Number(form.paidAmount),
      currency: form.currency,
      progress: Number(form.progress),
    };

    if (form.client) {
      payload.client = form.client;
    }

    if (form.startDate) {
      payload.startDate = form.startDate;
    }

    if (form.dueDate) {
      payload.dueDate = form.dueDate;
    }

    try {
      await api.post("/projects", payload);

      setSuccess("تم إنشاء المشروع بنجاح.");

      navigate("/projects");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "لم نتمكن من إنشاء المشروع. راجع البيانات وحاول مرة أخرى."
      );
    } finally {
      setSaving(false);
    }
  }

  // ====================================================
  // FINANCIAL CALCULATIONS
  // ====================================================

  const remainingAmount = Math.max(
    0,
    Number(form.contractValue || 0) -
      Number(form.paidAmount || 0)
  );

  const paymentStatus =
    Number(form.paidAmount) <= 0
      ? "غير مدفوع"
      : Number(form.paidAmount) < Number(form.contractValue)
        ? "مدفوع جزئيًا"
        : Number(form.contractValue) > 0
          ? "مدفوع بالكامل"
          : "غير مدفوع";

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="create-project-page" dir="rtl">

      {/* PAGE HEADER */}

      <div className="create-project-topbar">
        <div>
          <div className="create-project-breadcrumb">
            <Link to="/projects">المشاريع</Link>
            <span>/</span>
            <span>مشروع جديد</span>
          </div>

          <h1>إنشاء مشروع جديد</h1>

          <p>
            أضف تفاصيل المشروع وتابع ميزانيته ومدفوعاته من مكان واحد.
          </p>
        </div>

        <Link to="/projects" className="create-project-back">
          <ArrowRight size={17} />
          العودة للمشاريع
        </Link>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="create-project-alert error" role="alert">
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="create-project-alert success" role="status">
          <CheckCircle2 size={19} />
          <span>{success}</span>
        </div>
      )}

      {/* PROJECT FORM */}

      <form
        className="create-project-form"
        onSubmit={handleSubmit}
        noValidate
      >

        {/* BASIC INFORMATION */}

        <section className="project-form-section">

          <div className="project-section-heading">
            <div className="project-section-icon">
              <FolderPlus size={20} />
            </div>

            <div>
              <h2>المعلومات الأساسية</h2>
              <p>البيانات الرئيسية الخاصة بالمشروع.</p>
            </div>
          </div>

          <div className="project-form-grid">

            {/* PROJECT NAME */}

            <div className="project-field project-field-full">
              <label htmlFor="project-name">
                اسم المشروع <span>*</span>
              </label>

              <input
                id="project-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="مثال: تطوير الموقع الإلكتروني"
                maxLength={150}
                required
              />
            </div>

            {/* CLIENT */}

            <div className="project-field">
              <label htmlFor="project-client">
                العميل
              </label>

              <select
                id="project-client"
                name="client"
                value={form.client}
                onChange={handleChange}
                disabled={loadingClients}
              >
                <option value="">
                  {loadingClients
                    ? "جارٍ تحميل العملاء..."
                    : "بدون عميل محدد"}
                </option>

                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.companyName ||
                      client.contactName ||
                      "عميل بدون اسم"}
                  </option>
                ))}
              </select>

              {!loadingClients && clients.length === 0 && (
                <small>
                  لا توجد عملاء متاحون للاختيار حاليًا.
                </small>
              )}
            </div>

            {/* PROJECT STATUS */}

            <div className="project-field">
              <label htmlFor="project-status">
                حالة المشروع <span>*</span>
              </label>

              <select
                id="project-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  اختر حالة المشروع
                </option>

                {statusOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <small>
                يجب تحديد حالة المشروع قبل إنشائه.
              </small>
            </div>

            {/* PRIORITY */}

            <div className="project-field">
              <label htmlFor="project-priority">
                الأولوية
              </label>

              <select
                id="project-priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
              >
                {priorityOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* PROGRESS */}

            <div className="project-field">
              <label htmlFor="project-progress">
                نسبة الإنجاز (%)
              </label>

              <input
                id="project-progress"
                type="number"
                name="progress"
                min="0"
                max="100"
                step="1"
                value={form.progress}
                onChange={handleChange}
              />
            </div>

            {/* DESCRIPTION */}

            <div className="project-field project-field-full">
              <label htmlFor="project-description">
                وصف المشروع
              </label>

              <textarea
                id="project-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="اكتب نبذة عن المشروع والأهداف المطلوبة..."
                rows={4}
                maxLength={3000}
              />
            </div>

          </div>
        </section>

        {/* TIMELINE */}

        <section className="project-form-section">

          <div className="project-section-heading">
            <div className="project-section-icon">
              <CalendarDays size={20} />
            </div>

            <div>
              <h2>الجدول الزمني</h2>
              <p>حدد موعد البداية والتسليم المستهدف.</p>
            </div>
          </div>

          <div className="project-form-grid">

            <div className="project-field">
              <label htmlFor="project-start-date">
                تاريخ البداية
              </label>

              <input
                id="project-start-date"
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
              />
            </div>

            <div className="project-field">
              <label htmlFor="project-due-date">
                تاريخ التسليم
              </label>

              <input
                id="project-due-date"
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                min={form.startDate || undefined}
              />
            </div>

          </div>
        </section>

        {/* FINANCIAL INFORMATION */}

        <section className="project-form-section">

          <div className="project-section-heading">
            <div className="project-section-icon">
              <Wallet size={20} />
            </div>

            <div>
              <h2>البيانات المالية</h2>
              <p>
                افصل بين تكلفة تنفيذ المشروع وقيمة العقد والمبالغ المستلمة.
              </p>
            </div>
          </div>

          <div className="project-form-grid">

            {/* CURRENCY */}

            <div className="project-field">
              <label htmlFor="project-currency">
                العملة
              </label>

              <select
                id="project-currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
              >
                {currencyOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* INTERNAL BUDGET */}

            <div className="project-field">
              <label htmlFor="project-budget">
                تكلفة التنفيذ الداخلية
              </label>

              <input
                id="project-budget"
                type="number"
                name="budget"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={handleChange}
              />

              <small>
                التكلفة التي تتحملها الشركة لتنفيذ المشروع.
              </small>
            </div>

            {/* CONTRACT VALUE */}

            <div className="project-field">
              <label htmlFor="project-contract">
                قيمة العقد
              </label>

              <input
                id="project-contract"
                type="number"
                name="contractValue"
                min="0"
                step="0.01"
                value={form.contractValue}
                onChange={handleChange}
              />

              <small>
                القيمة المتفق عليها مع العميل.
              </small>
            </div>

            {/* PAID AMOUNT */}

            <div className="project-field">
              <label htmlFor="project-paid">
                المبلغ المستلم
              </label>

              <input
                id="project-paid"
                type="number"
                name="paidAmount"
                min="0"
                step="0.01"
                value={form.paidAmount}
                onChange={handleChange}
              />
            </div>

          </div>

          {/* FINANCIAL PREVIEW */}

          <div className="project-financial-preview">

            <div>
              <span>المتبقي للتحصيل</span>

              <strong>
                {formatMoney(remainingAmount)} {form.currency}
              </strong>
            </div>

            <div>
              <span>حالة السداد المتوقعة</span>

              <strong>{paymentStatus}</strong>
            </div>

          </div>
        </section>

        {/* TENANT INFORMATION */}

        <div className="project-form-note">
          <Building2 size={18} />

          <span>
            سيتم ربط المشروع بشركتك الحالية تلقائيًا، مع تطبيق
            صلاحيات الوصول وعزل بيانات الشركات من خلال الخادم.
          </span>
        </div>

        {/* ACTIONS */}

        <div className="project-form-actions">

          <Link
            to="/projects"
            className="project-cancel-button"
          >
            إلغاء
          </Link>

          <button
            type="submit"
            className="project-submit-button"
            disabled={saving}
          >
            {saving ? (
              <>
                <LoaderCircle className="spin" size={18} />
                جارٍ إنشاء المشروع...
              </>
            ) : (
              <>
                <Save size={18} />
                إنشاء المشروع
              </>
            )}
          </button>

        </div>

      </form>
    </main>
  );
}

export default CreateProject;
