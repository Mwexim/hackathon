// Demo login options (synthetic personas). Safe to import on the client:
// contains nothing beyond what the login screen shows. Hints never reveal the event.

export const EMPLOYEE_LOGIN_ID = "kbc_employee";

export type DemoLogin = {
  id: string;
  name: string;
  hint: string;
  consentLabel: string;
  role: "customer" | "employee";
};

export const DEMO_LOGINS: DemoLogin[] = [
  { id: "customer_001", name: "Benjamin", hint: "Recently busy with a lot of changes", consentLabel: "Personal proposals", role: "customer" },
  { id: "customer_002", name: "Sarah", hint: "A full summer at home", consentLabel: "Light suggestions", role: "customer" },
  { id: "customer_003", name: "Thomas", hint: "A packed agenda lately", consentLabel: "Only what protects my contracts", role: "customer" },
  { id: "customer_004", name: "Emma", hint: "Just a regular few months", consentLabel: "Personal proposals", role: "customer" },
  { id: EMPLOYEE_LOGIN_ID, name: "KBC employee", hint: "Detection quality dashboard", consentLabel: "", role: "employee" },
];

export const DEMO_LOGIN_IDS = DEMO_LOGINS.map((l) => l.id) as [string, ...string[]];
