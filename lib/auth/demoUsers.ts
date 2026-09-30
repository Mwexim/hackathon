// Demo login options (synthetic personas). Safe to import on the client:
// contains no data beyond what the login screen shows.

export const EMPLOYEE_LOGIN_ID = "kbc_employee";

export type DemoLogin = {
  id: string;
  name: string;
  subtitle: string;
  role: "customer" | "employee";
};

export const DEMO_LOGINS: DemoLogin[] = [
  { id: "customer_001", name: "Benjamin", subtitle: "Consent: tailored", role: "customer" },
  { id: "customer_002", name: "Sarah", subtitle: "Consent: basic", role: "customer" },
  { id: "customer_003", name: "Thomas", subtitle: "Consent: none", role: "customer" },
  { id: "customer_004", name: "Emma", subtitle: "Consent: tailored", role: "customer" },
  { id: EMPLOYEE_LOGIN_ID, name: "KBC employee", subtitle: "Detection debug view (dev only)", role: "employee" },
];

export const DEMO_LOGIN_IDS = DEMO_LOGINS.map((l) => l.id) as [string, ...string[]];
