import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { EmployeeDashboard } from "./EmployeeDashboard";

/** KBC-side dashboard. Employee session required (checked server-side). */
export default async function EmployeePage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "employee") redirect("/dashboard");
  // Debug tools (explain-the-math, demo reset) are never available in production.
  return <EmployeeDashboard devTools={process.env.NODE_ENV !== "production"} />;
}
