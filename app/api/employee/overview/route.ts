import { z } from "zod";
import { jsonError, noStore } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { buildOverview } from "@/lib/detection/overview";

const Query = z.object({ threshold: z.coerce.number().min(0).max(1).default(0.5) });

/** Population-level detection quality (synthetic customers). Employee role only. */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return jsonError(401);
  if (s.role !== "employee") return jsonError(403);

  const parsed = Query.safeParse({ threshold: new URL(req.url).searchParams.get("threshold") ?? undefined });
  if (!parsed.success) return jsonError(400);

  return noStore(buildOverview(parsed.data.threshold));
}
