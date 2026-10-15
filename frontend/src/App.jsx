
import { useState } from "react";

import {
  ArrowUpLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  Phone,
} from "lucide-react";

import useAuth from "./hooks/useAuth";
import Dashboard from "./pages/Dashboard/Dashboard";

import "./App.css";

const initialForm = {
  companyName: "",
  companyEmail: "",
  companyPhone: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

function App() {
  const {
    user,
    isAuthenticated,
    loading: authLoading,
    login,
    register,
    logout,
  } = useAuth();

  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [form, setForm] = useState(initialForm);

  const isRegister = mode === "register";

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMessage("");
    setMessageType("");
    setShowPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = isRegister
        ? await register(form)
        : await login({
            email: form.email,
            password: form.password,
          });

      setMessage(response.message || "تمت العملية بنجاح.");
      setMessageType("success");
    } catch (error) {
      const serverError = error.response?.data;

      let errorMessage = "حدث خطأ غير متوقع. حاول مرة أخرى.";

      if (Array.isArray(serverError?.errors)) {
        errorMessage = serverError.errors.join(" ");
      } else if (typeof serverError?.errors === "string") {
        errorMessage = serverError.errors;
      } else if (serverError?.message) {
        errorMessage = serverError.message;
      } else if (!error.response) {
        errorMessage =
          "تعذر الاتصال بالخادم. تأكد من تشغيل Backend.";
      }

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setForm(initialForm);
    setMode("login");
    setMessage("");
    setMessageType("");
    setShowPassword(false);
  };

  // Authentication loading
  if (authLoading) {
    return (
      <main className="welcome-screen" dir="rtl">
        <div className="welcome-card">
          <div className="brand-mark">
            <Building2 size={30} />
          </div>

          <span className="eyebrow">KEMETIX WORKSPACE</span>

          <h1>جارٍ تجهيز مساحة العمل...</h1>
        </div>
      </main>
    );
  }

  // Authenticated user dashboard
  if (isAuthenticated) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // Login and registration
  return (
    <main className="auth-page" dir="rtl">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="auth-shell">
        <aside className="brand-panel">
          <div className="brand-top">
            <div className="brand-logo">
              <span>K</span>
              <div className="brand-logo-glow" />
            </div>

            <div className="brand-name">
              <strong>KEMETIX</strong>
              <span>BUSINESS MANAGEMENT</span>
            </div>
          </div>

          <div className="brand-content">
            <span className="eyebrow">
              <Sparkles size={14} />
              YOUR BUSINESS. ONE SYSTEM.
            </span>

            <h1>
              إدارة أذكى.
              <br />
              <span>مستقبل أقوى.</span>
            </h1>

            <p>
              منصة واحدة تجمع فريقك وأقسام شركتك ومشروعاتك
              وعملياتك اليومية في نظام إداري متكامل.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <ShieldCheck size={19} />
                <span>بيئة عمل آمنة ومنظمة</span>
              </div>

              <div className="feature-item">
                <Building2 size={19} />
                <span>إدارة متكاملة للشركات والأقسام</span>
              </div>

              <div className="feature-item">
                <Sparkles size={19} />
                <span>رؤية واضحة لأداء أعمالك</span>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <span>POWERED BY KEMETIX</span>
            <span>© 2026</span>
          </div>

          <div className="decorative-orbit orbit-one" />
          <div className="decorative-orbit orbit-two" />
        </aside>

        <section className="form-panel">
          <div className="mobile-brand">
            <div className="brand-logo">
              <span>K</span>
            </div>

            <strong>KEMETIX</strong>
          </div>

          <div className="form-container">
            <div className="form-heading">
              <span className="form-kicker">
                {isRegister
                  ? "CREATE YOUR WORKSPACE"
                  : "WELCOME BACK"}
              </span>

              <h2>
                {isRegister
                  ? "أنشئ مساحة عملك"
                  : "مرحبًا بعودتك"}
              </h2>

              <p>
                {isRegister
                  ? "ابدأ بإعداد شركتك وحساب المدير العام."
                  : "سجّل الدخول للوصول إلى مساحة عمل شركتك."}
              </p>
            </div>

            <div className="mode-switch">
              <button
                type="button"
                className={!isRegister ? "active" : ""}
                onClick={() => switchMode("login")}
              >
                تسجيل الدخول
              </button>

              <button
                type="button"
                className={isRegister ? "active" : ""}
                onClick={() => switchMode("register")}
              >
                إنشاء شركة
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {isRegister && (
                <>
                  <div className="field-group">
                    <label htmlFor="companyName">
                      اسم الشركة
                    </label>

                    <div className="input-wrap">
                      <Building2 size={18} />

                      <input
                        id="companyName"
                        name="companyName"
                        value={form.companyName}
                        onChange={updateField}
                        placeholder="مثال: KEMETIX"
                        required
                        minLength={2}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor="companyEmail">
                      البريد الإلكتروني للشركة
                    </label>

                    <div className="input-wrap">
                      <Mail size={18} />

                      <input
                        id="companyEmail"
                        name="companyEmail"
                        type="email"
                        value={form.companyEmail}
                        onChange={updateField}
                        placeholder="company@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor="companyPhone">
                      رقم هاتف الشركة <span>اختياري</span>
                    </label>

                    <div className="input-wrap">
                      <Phone size={18} />

                      <input
                        id="companyPhone"
                        name="companyPhone"
                        value={form.companyPhone}
                        onChange={updateField}
                        placeholder="+20 100 000 0000"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="field-group">
                      <label htmlFor="firstName">
                        الاسم الأول
                      </label>

                      <div className="input-wrap">
                        <UserRound size={18} />

                        <input
                          id="firstName"
                          name="firstName"
                          value={form.firstName}
                          onChange={updateField}
                          placeholder="الاسم"
                          required
                        />
                      </div>
                    </div>

                    <div className="field-group">
                      <label htmlFor="lastName">
                        اسم العائلة
                      </label>

                      <div className="input-wrap">
                        <input
                          id="lastName"
                          name="lastName"
                          value={form.lastName}
                          onChange={updateField}
                          placeholder="العائلة"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="field-group">
                <label htmlFor="email">
                  البريد الإلكتروني
                </label>

                <div className="input-wrap">
                  <Mail size={18} />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="field-group">
                <div className="label-row">
                  <label htmlFor="password">
                    كلمة المرور
                  </label>

                  {!isRegister && (
                    <span className="secure-label">
                      <ShieldCheck size={13} />
                      اتصال آمن
                    </span>
                  )}
                </div>

                <div className="input-wrap">
                  <LockKeyhole size={18} />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={updateField}
                    placeholder="••••••••"
                    autoComplete={
                      isRegister
                        ? "new-password"
                        : "current-password"
                    }
                    minLength={isRegister ? 8 : undefined}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={
                      showPassword
                        ? "إخفاء كلمة المرور"
                        : "إظهار كلمة المرور"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {isRegister && (
                  <small className="field-hint">
                    يجب ألا تقل كلمة المرور عن 8 أحرف.
                  </small>
                )}
              </div>

              {message && (
                <div className={`form-message ${messageType}`}>
                  {messageType === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <ShieldCheck size={18} />
                  )}

                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "جارٍ المعالجة..."
                    : isRegister
                      ? "إنشاء مساحة العمل"
                      : "تسجيل الدخول"}
                </span>

                {!loading && <ArrowUpLeft size={19} />}
              </button>
            </form>

            <div className="form-bottom">
              <ShieldCheck size={15} />

              <span>
                بياناتك محمية داخل مساحة عمل شركتك.
              </span>
            </div>
          </div>

          <div className="panel-footer">
            <span>KEMETIX CRM</span>
            <span>BUILT FOR BETTER BUSINESS</span>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
