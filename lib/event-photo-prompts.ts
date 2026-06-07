export const EVENT_PHOTO_PROMPTS = [
  { key: "group_photo", label: "Best group photo", description: "Full chapter or large group shot — well-lit, everyone visible" },
  { key: "candid", label: "Best candid moment", description: "Natural, unposed moment that captures the vibe" },
  { key: "outfit", label: "Outfit / formal look", description: "Styled fits, formals, or theme-appropriate attire" },
  { key: "philanthropy", label: "Philanthropy moment", description: "Service, fundraising, or giving back — no alcohol" },
  { key: "senior_dump", label: "Senior photo dump", description: "Seniors celebrating — nationals-safe content only" },
  { key: "big_little", label: "Big / little moment", description: "Mentorship pairs or families — positive interactions" },
] as const;

export type EventPhotoPromptKey = (typeof EVENT_PHOTO_PROMPTS)[number]["key"];
