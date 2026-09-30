import { describe, expect, it } from "vitest";
import { recommendationsFor } from "@/lib/recommendations/catalogue";
import type { InsurancePolicy } from "@/lib/types";

const pol = (p: Partial<InsurancePolicy>): InsurancePolicy => ({
  id: "p",
  customerId: "c",
  type: "home",
  coveredHouseholdMembers: 1,
  premium: 1,
  renewalDate: "2027-01-01",
  ...p,
});
const home = { policies: [pol({ type: "home", insuredAddress: "x" })] };
const family = { policies: [pol({ type: "family_liability" })] };

const kinds = (recs: { kind: string }[]) => recs.map((r) => r.kind);

describe("consent filter", () => {
  it("tailored -> service first, then all commercial", () => {
    expect(kinds(recommendationsFor("moved_house", "tailored", home))).toEqual(["service", "commercial", "commercial"]);
  });
  it("basic -> service + at most 1 commercial", () => {
    expect(kinds(recommendationsFor("new_baby", "basic", family))).toEqual(["service", "commercial"]);
  });
  it("none -> service only", () => {
    expect(kinds(recommendationsFor("moved_house", "none", home))).toEqual(["service"]);
  });
});

describe("travel cover", () => {
  const covered = { policies: [pol({ type: "travel", includesTravelCover: true })] };
  it("already covered -> 'you're covered', never a sale", () => {
    for (const consent of ["none", "basic", "tailored"] as const) {
      const recs = recommendationsFor("frequent_traveller", consent, covered);
      expect(recs.map((r) => r.id)).toEqual(["rec_travel_already_covered"]);
    }
  });
  it("not covered + tailored -> annual travel insurance offer", () => {
    const recs = recommendationsFor("frequent_traveller", "tailored", { policies: [] });
    expect(recs.map((r) => r.id)).toEqual(["rec_travel_annual_insurance"]);
  });
  it("not covered + none -> nothing", () => {
    expect(recommendationsFor("frequent_traveller", "none", { policies: [] })).toEqual([]);
  });
});
