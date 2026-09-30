import { handleEventStatus } from "@/lib/api/eventStatus";

export async function POST(req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  return handleEventStatus(req, ctx.params, "confirmed");
}
