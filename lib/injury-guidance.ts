/** Injury type → "What to do" guidance (config table — not hardcoded in UI). */

export type InjuryType =
  | "muscle_strain"
  | "fracture"
  | "concussion"
  | "laceration"
  | "other";

export const INJURY_TYPES: Array<{ value: InjuryType; label: string }> = [
  { value: "muscle_strain", label: "Muscle strain" },
  { value: "fracture", label: "Fracture" },
  { value: "concussion", label: "Concussion" },
  { value: "laceration", label: "Laceration" },
  { value: "other", label: "Other" },
];

export const INJURY_SEVERITY = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
] as const;

export const INJURY_GUIDANCE: Record<InjuryType, string> = {
  muscle_strain:
    "Remove from play. Apply RICE (rest, ice, compression, elevation). No return until pain-free through full range of motion. Refer to athletic trainer if not improved in 48 hours.",
  fracture:
    "Immobilize the area. Do not return to play. Seek immediate medical evaluation and imaging. Clearance required from team physician before return.",
  concussion:
    "Remove player from play immediately. Do not return to play same day. Refer to team physician. Follow graduated return-to-play protocol — no contact until medically cleared.",
  laceration:
    "Control bleeding with direct pressure. Clean and dress wound. Stitches may be required. Player may return only after wound is closed and cleared by medical staff.",
  other:
    "Remove from play and assess. Document symptoms. Refer to athletic trainer or team physician. Do not return until evaluated and cleared.",
};

export function guidanceForInjuryType(type: string): string {
  return INJURY_GUIDANCE[type as InjuryType] ?? INJURY_GUIDANCE.other;
}
