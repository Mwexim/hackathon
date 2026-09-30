// Route-level security tests: the real route handlers, with the session cookie
// supplied through a mocked next/headers.

import { beforeEach, describe, expect, it, vi } from "vitest";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookieValue ? { value: cookieValue } : undefined) }),
}));

const { createSessionToken } = await import("@/lib/auth/session");
const { getEvents, getPolicies, getCustomer, resetState } = await import("@/lib/data/store");
const confirmRoute = await import("@/app/api/events/[eventId]/confirm/route");
const dismissRoute = await import("@/app/api/events/[eventId]/dismiss/route");
const actionRoute = await import("@/app/api/me/actions/[recommendationId]/route");
const recsRoute = await import("@/app/api/me/recommendations/route");
const customerRoute = await import("@/app/api/me/customer/route");
const debugRoute = await import("@/app/api/debug/events/route");
const resetRoute = await import("@/app/api/debug/reset/route");
const overviewRoute = await import("@/app/api/employee/overview/route");

const as = (customerId: string) => {
  cookieValue = createSessionToken({ role: "customer", customerId });
};
const asEmployee = () => {
  cookieValue = createSessionToken({ role: "employee" });
};
const post = (url = "http://localhost/x", body?: unknown) =>
  new Request(url, { method: "POST", headers: { host: "localhost" }, body: body === undefined ? undefined : JSON.stringify(body) });
const params = <T,>(p: T) => Promise.resolve(p);

const eventOf = (customerId: string) => getEvents(customerId)[0];

beforeEach(() => {
  resetState();
  cookieValue = undefined;
});

describe("life event confirm/dismiss", () => {
  it("returns 401 without a session", async () => {
    const res = await confirmRoute.POST(post(), { params: params({ eventId: eventOf("customer_001").id }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 for another customer's event (IDOR)", async () => {
    const benjaminsEvent = eventOf("customer_001");
    as("customer_004");
    const res = await confirmRoute.POST(post(), { params: params({ eventId: benjaminsEvent.id }) });
    expect(res.status).toBe(404);
    const res2 = await dismissRoute.POST(post(), { params: params({ eventId: benjaminsEvent.id }) });
    expect(res2.status).toBe(404);
    expect(eventOf("customer_001").status).toBe("detected");
  });

  it("returns 409 when confirming or dismissing an already-confirmed event", async () => {
    as("customer_001");
    const id = eventOf("customer_001").id;
    expect((await confirmRoute.POST(post(), { params: params({ eventId: id }) })).status).toBe(200);
    expect((await confirmRoute.POST(post(), { params: params({ eventId: id }) })).status).toBe(409);
    expect((await dismissRoute.POST(post(), { params: params({ eventId: id }) })).status).toBe(409);
  });

  it("rejects cross-site requests", async () => {
    as("customer_001");
    const req = new Request("http://localhost/x", { method: "POST", headers: { host: "localhost", origin: "https://evil.example" } });
    expect((await confirmRoute.POST(req, { params: params({ eventId: eventOf("customer_001").id }) })).status).toBe(403);
  });

  it("ignores a customer id in the query string", async () => {
    as("customer_004");
    const res = await customerRoute.GET();
    expect((await res.json()).id).toBe("customer_004");
  });

  it("rejects a tampered session cookie", async () => {
    as("customer_004");
    const [data, sig] = cookieValue!.split(".");
    const forged = Buffer.from(JSON.stringify({ role: "customer", customerId: "customer_001", exp: 9999999999 })).toString("base64url");
    cookieValue = `${forged}.${sig}`;
    expect(data).not.toBe(forged);
    expect((await customerRoute.GET()).status).toBe(401);
  });
});

describe("recommendations and actions", () => {
  it("recommendations only appear after confirmation", async () => {
    as("customer_001");
    expect(await (await recsRoute.GET()).json()).toEqual([]);
    await confirmRoute.POST(post(), { params: params({ eventId: eventOf("customer_001").id }) });
    const groups = await (await recsRoute.GET()).json();
    expect(groups).toHaveLength(1);
    expect(groups[0].recommendations[0].kind).toBe("service");
  });

  it("an action is 404 before its event is confirmed", async () => {
    as("customer_001");
    const res = await actionRoute.POST(post(), { params: params({ recommendationId: "rec_move_update_home_insurance" }) });
    expect(res.status).toBe(404);
  });

  it("an action for another customer's event is 404", async () => {
    as("customer_001");
    await confirmRoute.POST(post(), { params: params({ eventId: eventOf("customer_001").id }) });
    as("customer_002");
    const res = await actionRoute.POST(post(), { params: params({ recommendationId: "rec_move_update_home_insurance" }) });
    expect(res.status).toBe(404);
  });

  it("a commercial action filtered out by consent is 404", async () => {
    as("customer_003"); // consent none
    await confirmRoute.POST(post(), { params: params({ eventId: eventOf("customer_003").id }) });
    const res = await actionRoute.POST(post(), { params: params({ recommendationId: "rec_travel_annual_insurance" }) });
    expect(res.status).toBe(404);
  });

  it("update address closes the loop and can only be done once", async () => {
    as("customer_001");
    await confirmRoute.POST(post(), { params: params({ eventId: eventOf("customer_001").id }) });
    const ok = await actionRoute.POST(post(undefined, {}), { params: params({ recommendationId: "rec_move_update_home_insurance" }) });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ status: "done" });

    const home = getPolicies("customer_001").find((p) => p.type === "home")!;
    expect(home.insuredAddress).toBe(getCustomer("customer_001")!.address);

    const { scoreCustomer } = await import("@/lib/detection/detector");
    const moved = scoreCustomer("customer_001").find((s) => s.type === "moved_house")!;
    expect(moved.evidence.map((e) => e.signal)).not.toContain("insured_address_outdated");

    const again = await actionRoute.POST(post(), { params: params({ recommendationId: "rec_move_update_home_insurance" }) });
    expect(again.status).toBe(409);
  });

  it("add child increases covered household members", async () => {
    as("customer_002");
    await confirmRoute.POST(post(), { params: params({ eventId: eventOf("customer_002").id }) });
    await actionRoute.POST(post(), { params: params({ recommendationId: "rec_baby_add_to_family_insurance" }) });
    expect(getPolicies("customer_002").find((p) => p.type === "family_liability")!.coveredHouseholdMembers).toBe(3);
  });

  it("rejects a non-empty action body", async () => {
    as("customer_001");
    await confirmRoute.POST(post(), { params: params({ eventId: eventOf("customer_001").id }) });
    const res = await actionRoute.POST(post(undefined, { customerId: "customer_002" }), {
      params: params({ recommendationId: "rec_move_update_home_insurance" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("employee routes", () => {
  const get = (url: string) => new Request(url, { headers: { host: "localhost" } });

  it("customers cannot reach debug, reset or overview", async () => {
    as("customer_001");
    expect((await debugRoute.GET(get("http://localhost/api/debug/events"))).status).toBe(403);
    expect((await resetRoute.POST(post())).status).toBe(403);
    expect((await overviewRoute.GET(get("http://localhost/api/employee/overview"))).status).toBe(403);
  });

  it("employee can explain the math for a demo customer", async () => {
    asEmployee();
    const res = await debugRoute.GET(get("http://localhost/api/debug/events?customer=customer_001"));
    const body = await res.json();
    expect(body.events.find((e: { type: string }) => e.type === "moved_house").confidence).toBeGreaterThan(0.85);
  });

  it("overview validates the threshold", async () => {
    asEmployee();
    expect((await overviewRoute.GET(get("http://localhost/api/employee/overview?threshold=2"))).status).toBe(400);
    const res = await overviewRoute.GET(get("http://localhost/api/employee/overview?threshold=0.5"));
    const body = await res.json();
    expect(body.totalCustomers).toBe(2000);
    for (const e of body.perEvent) {
      expect(e.precision).toBeGreaterThan(0.5);
      expect(e.recall).toBeGreaterThan(0.5);
    }
  });

  it("reset restores the initial state", async () => {
    as("customer_001");
    await confirmRoute.POST(post(), { params: params({ eventId: eventOf("customer_001").id }) });
    asEmployee();
    expect((await resetRoute.POST(post())).status).toBe(200);
    expect(eventOf("customer_001").status).toBe("detected");
  });
});
