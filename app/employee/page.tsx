import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DebugView } from "./DebugView";

/** KBC employee detection debug view. Dev only; employee session required. */
export default async function EmployeePage() {
  if (process.env.NODE_ENV === "production") notFound();
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "employee") redirect("/dashboard");
  return <DebugView />;
}
