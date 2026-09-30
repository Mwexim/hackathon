// Notification wording. Ask, never assert. Warm, no pressure.
// (Later: optional LLM rewording behind an env variable, with these as fallback.)

import type { LifeEventType, QuestionTier } from "@/lib/types";

type Template = { title: string; message: string };

const TEMPLATES: Record<LifeEventType, Record<"direct" | "soft", Template>> = {
  moved_house: {
    direct: {
      title: "Have you recently moved?",
      message:
        "We noticed some changes in your recent payments. If you've moved, we can help you check that everything is set up for your new home. If not, just let us know.",
    },
    soft: {
      title: "Anything changing at home?",
      message:
        "Some of your recent payments look a little different. Is something changing at home? No need to reply if not.",
    },
  },
  new_baby: {
    direct: {
      title: "Has your family grown?",
      message:
        "We noticed some changes in your recent payments. If there's a new little one at home, we can help make sure your family is well covered. If not, just let us know.",
    },
    soft: {
      title: "Anything new in your family?",
      message:
        "Some of your recent payments look a little different. Is something changing in your family? No need to reply if not.",
    },
  },
  frequent_traveller: {
    direct: {
      title: "Are you travelling more often?",
      message:
        "We noticed several travel bookings recently. If you're travelling more, we can check that you're well covered on the road. If not, just let us know.",
    },
    soft: {
      title: "Planning some trips?",
      message:
        "We noticed a few travel bookings recently. Would it help to check your travel cover? No need to reply if not.",
    },
  },
};

export function lifeEventMessage(type: LifeEventType, tier: QuestionTier): Template {
  return TEMPLATES[type][tier === "direct" ? "direct" : "soft"];
}
