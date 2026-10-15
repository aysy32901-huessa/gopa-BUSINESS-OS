
import { Navigate, Route, Routes } from "react-router-dom";

// ==================================================
// WORKSPACE PAGES
// ==================================================

import Clients from "../pages/Clients/Clients";
import Leads from "../pages/Leads/Leads";
import Projects from "../pages/Projects/Projects";
import CreateProject from "../pages/Projects/CreateProject";
import Tasks from "../pages/Tasks/Tasks";
import Departments from "../pages/Departments/Departments";
import Finance from "../pages/Finance/Finance";

// ==================================================
// WORKSPACE ROUTES
// ==================================================

export default function WorkspaceRoutes({ children, user }) {
  const role = user?.role || user?.accountType || "";

  const canViewDepartments = [
    "general_admin",
    "department_manager",
  ].includes(role);

  const canViewFinance = role === "general_admin";

  return (
    <Routes>
      {/* MAIN DASHBOARD */}
      <Route
        path="/"
        element={children}
      />

      {/* CLIENTS */}
      <Route
        path="/clients"
        element={<Clients />}
      />

      {/* LEADS */}
      <Route
        path="/leads"
        element={<Leads />}
      />

      {/* PROJECTS */}
      <Route
        path="/projects"
        element={<Projects />}
      />

      {/* CREATE PROJECT */}
      <Route
        path="/projects/new"
        element={<CreateProject />}
      />

      {/* TASKS */}
      <Route
        path="/tasks"
        element={<Tasks />}
      />

      {/* DEPARTMENTS */}
      <Route
        path="/departments"
        element={
          canViewDepartments ? (
            <Departments />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* FINANCE */}
      <Route
        path="/finance"
        element={
          canViewFinance ? (
            <Finance />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* UNKNOWN ROUTES */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
