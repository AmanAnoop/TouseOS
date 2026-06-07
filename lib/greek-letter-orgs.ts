export type GreekOrgKind = "fraternity" | "sorority";

export interface GreekLetterOrg {
  id: string;
  name: string;
  letters: string;
  kind: GreekOrgKind;
  /** Primary / dominant color */
  primary: string;
  /** Secondary / accent */
  secondary: string;
}

/** NIC fraternities & NPC sororities — traditional chapter colors (verify locally for branding). */
export const GREEK_LETTER_ORGS: GreekLetterOrg[] = [
  // ——— Fraternities ———
  { id: "alpha-epsilon-pi", name: "Alpha Epsilon Pi", letters: "ΑΕΠ", kind: "fraternity", primary: "#00498F", secondary: "#FFD700" },
  { id: "alpha-gamma-rho", name: "Alpha Gamma Rho", letters: "ΑΓΡ", kind: "fraternity", primary: "#006341", secondary: "#FFD700" },
  { id: "alpha-kappa-lambda", name: "Alpha Kappa Lambda", letters: "ΑΚΛ", kind: "fraternity", primary: "#7D55C7", secondary: "#FFD700" },
  { id: "alpha-phi-alpha", name: "Alpha Phi Alpha", letters: "ΑΦΑ", kind: "fraternity", primary: "#000000", secondary: "#B8860B" },
  { id: "alpha-sigma-phi", name: "Alpha Sigma Phi", letters: "ΑΣΦ", kind: "fraternity", primary: "#9D2235", secondary: "#FFFFFF" },
  { id: "alpha-tau-omega", name: "Alpha Tau Omega", letters: "ΑΤΩ", kind: "fraternity", primary: "#0065BD", secondary: "#FFD700" },
  { id: "beta-theta-pi", name: "Beta Theta Pi", letters: "ΒΘΠ", kind: "fraternity", primary: "#A6237C", secondary: "#FFFFFF" },
  { id: "beta-upsilon-chi", name: "Beta Upsilon Chi", letters: "ΒΥΧ", kind: "fraternity", primary: "#002366", secondary: "#FFFFFF" },
  { id: "chi-phi", name: "Chi Phi", letters: "ΧΦ", kind: "fraternity", primary: "#9B0E27", secondary: "#FFFFFF" },
  { id: "delta-chi", name: "Delta Chi", letters: "ΔΧ", kind: "fraternity", primary: "#B01B2E", secondary: "#FFFFFF" },
  { id: "delta-kappa-epsilon", name: "Delta Kappa Epsilon", letters: "ΔΚΕ", kind: "fraternity", primary: "#003DA5", secondary: "#FFD700" },
  { id: "delta-sigma-phi", name: "Delta Sigma Phi", letters: "ΔΣΦ", kind: "fraternity", primary: "#A30046", secondary: "#FFFFFF" },
  { id: "delta-tau-delta", name: "Delta Tau Delta", letters: "ΔΤΔ", kind: "fraternity", primary: "#703F8F", secondary: "#FFD700" },
  { id: "delta-upsilon", name: "Delta Upsilon", letters: "ΔΥ", kind: "fraternity", primary: "#FFD200", secondary: "#003DA5" },
  { id: "farmhouse", name: "FarmHouse", letters: "FH", kind: "fraternity", primary: "#006738", secondary: "#FFD700" },
  { id: "kappa-alpha-order", name: "Kappa Alpha Order", letters: "ΚΑ", kind: "fraternity", primary: "#97273D", secondary: "#FFD700" },
  { id: "kappa-alpha-psi", name: "Kappa Alpha Psi", letters: "ΚΑΨ", kind: "fraternity", primary: "#C41E3A", secondary: "#F0E68C" },
  { id: "kappa-sigma", name: "Kappa Sigma", letters: "ΚΣ", kind: "fraternity", primary: "#B21F34", secondary: "#FFFFFF" },
  { id: "lambda-chi-alpha", name: "Lambda Chi Alpha", letters: "ΛΧΑ", kind: "fraternity", primary: "#5A2D9D", secondary: "#FFD700" },
  { id: "lambda-phi-epsilon", name: "Lambda Phi Epsilon", letters: "ΛΦΕ", kind: "fraternity", primary: "#003DA5", secondary: "#FFFFFF" },
  { id: "lambda-sigma-upsilon", name: "Lambda Sigma Upsilon", letters: "ΛΣΥ", kind: "fraternity", primary: "#003DA5", secondary: "#FFFFFF" },
  { id: "omega-psi-phi", name: "Omega Psi Phi", letters: "ΩΨΦ", kind: "fraternity", primary: "#4B0082", secondary: "#FFD700" },
  { id: "phi-beta-sigma", name: "Phi Beta Sigma", letters: "ΦΒΣ", kind: "fraternity", primary: "#003DA5", secondary: "#FFFFFF" },
  { id: "phi-delta-theta", name: "Phi Delta Theta", letters: "ΦΔΘ", kind: "fraternity", primary: "#009CDD", secondary: "#FFFFFF" },
  { id: "phi-gamma-delta", name: "Phi Gamma Delta", letters: "ΦΓΔ", kind: "fraternity", primary: "#4C2177", secondary: "#FFFFFF" },
  { id: "phi-iota-alpha", name: "Phi Iota Alpha", letters: "ΦΙΑ", kind: "fraternity", primary: "#9D2235", secondary: "#003DA5" },
  { id: "phi-kappa-psi", name: "Phi Kappa Psi", letters: "ΦΚΨ", kind: "fraternity", primary: "#7D2248", secondary: "#FFFFFF" },
  { id: "phi-kappa-sigma", name: "Phi Kappa Sigma", letters: "ΦΚΣ", kind: "fraternity", primary: "#9B0E27", secondary: "#FFFFFF" },
  { id: "phi-kappa-tau", name: "Phi Kappa Tau", letters: "ΦΚΤ", kind: "fraternity", primary: "#8A1538", secondary: "#FFFFFF" },
  { id: "phi-sigma-kappa", name: "Phi Sigma Kappa", letters: "ΦΣΚ", kind: "fraternity", primary: "#8B0000", secondary: "#FFD700" },
  { id: "pi-kappa-alpha", name: "Pi Kappa Alpha", letters: "ΠΚΑ", kind: "fraternity", primary: "#9B1B30", secondary: "#FFD700" },
  { id: "pi-kappa-phi", name: "Pi Kappa Phi", letters: "ΠΚΦ", kind: "fraternity", primary: "#003066", secondary: "#FFFFFF" },
  { id: "pi-lambda-phi", name: "Pi Lambda Phi", letters: "ΠΛΦ", kind: "fraternity", primary: "#003DA5", secondary: "#FFFFFF" },
  { id: "psi-upsilon", name: "Psi Upsilon", letters: "ΨΥ", kind: "fraternity", primary: "#FFD700", secondary: "#000000" },
  { id: "sigma-alpha-epsilon", name: "Sigma Alpha Epsilon", letters: "ΣΑΕ", kind: "fraternity", primary: "#8654BE", secondary: "#FFD700" },
  { id: "sigma-alpha-mu", name: "Sigma Alpha Mu", letters: "ΣΑΜ", kind: "fraternity", primary: "#004B87", secondary: "#FFFFFF" },
  { id: "sigma-chi", name: "Sigma Chi", letters: "ΣΧ", kind: "fraternity", primary: "#0065BD", secondary: "#FFD700" },
  { id: "sigma-nu", name: "Sigma Nu", letters: "ΣΝ", kind: "fraternity", primary: "#000000", secondary: "#FFD700" },
  { id: "sigma-phi-epsilon", name: "Sigma Phi Epsilon", letters: "ΣΦΕ", kind: "fraternity", primary: "#5E2580", secondary: "#C41E3A" },
  { id: "sigma-pi", name: "Sigma Pi", letters: "ΣΠ", kind: "fraternity", primary: "#701E8C", secondary: "#FFFFFF" },
  { id: "sigma-tau-gamma", name: "Sigma Tau Gamma", letters: "ΣΤΓ", kind: "fraternity", primary: "#0033A0", secondary: "#FFD700" },
  { id: "tau-kappa-epsilon", name: "Tau Kappa Epsilon", letters: "ΤΚΕ", kind: "fraternity", primary: "#BA0C2F", secondary: "#808080" },
  { id: "theta-chi", name: "Theta Chi", letters: "ΘΧ", kind: "fraternity", primary: "#8B0000", secondary: "#FFD700" },
  { id: "theta-xi", name: "Theta Xi", letters: "ΘΞ", kind: "fraternity", primary: "#87CEEB", secondary: "#FFFFFF" },
  { id: "theta-tau", name: "Theta Tau", letters: "ΘΤ", kind: "fraternity", primary: "#003DA5", secondary: "#FFFFFF" },
  { id: "triangle", name: "Triangle", letters: "Δ", kind: "fraternity", primary: "#FFD700", secondary: "#000000" },
  { id: "zeta-beta-tau", name: "Zeta Beta Tau", letters: "ΖΒΤ", kind: "fraternity", primary: "#003DA5", secondary: "#FFFFFF" },
  { id: "zeta-psi", name: "Zeta Psi", letters: "ΖΨ", kind: "fraternity", primary: "#006B3F", secondary: "#FFD700" },
  { id: "acacia", name: "Acacia", letters: "ΑΚΑ", kind: "fraternity", primary: "#000000", secondary: "#FFD700" },
  // ——— Sororities ———
  { id: "alpha-chi-omega", name: "Alpha Chi Omega", letters: "ΑΧΩ", kind: "sorority", primary: "#8B0000", secondary: "#006655" },
  { id: "alpha-delta-pi", name: "Alpha Delta Pi", letters: "ΑΔΠ", kind: "sorority", primary: "#B8D4E3", secondary: "#FFFFFF" },
  { id: "alpha-epsilon-phi", name: "Alpha Epsilon Phi", letters: "ΑΕΦ", kind: "sorority", primary: "#006655", secondary: "#FFD700" },
  { id: "alpha-gamma-delta", name: "Alpha Gamma Delta", letters: "ΑΓΔ", kind: "sorority", primary: "#F15A66", secondary: "#006655" },
  { id: "alpha-kappa-alpha", name: "Alpha Kappa Alpha", letters: "ΑΚΑ", kind: "sorority", primary: "#E91E8C", secondary: "#006655" },
  { id: "alpha-kappa-delta", name: "Alpha Kappa Delta", letters: "ΑΚΔ", kind: "sorority", primary: "#7D2248", secondary: "#FFFFFF" },
  { id: "alpha-omicron-pi", name: "Alpha Omicron Pi", letters: "ΑΟΠ", kind: "sorority", primary: "#B0171F", secondary: "#FFFFFF" },
  { id: "alpha-phi", name: "Alpha Phi", letters: "ΑΦ", kind: "sorority", primary: "#A7A9AC", secondary: "#7C001F" },
  { id: "alpha-sigma-alpha", name: "Alpha Sigma Alpha", letters: "ΑΣΑ", kind: "sorority", primary: "#9D2235", secondary: "#FFFFFF" },
  { id: "alpha-sigma-tau", name: "Alpha Sigma Tau", letters: "ΑΣΤ", kind: "sorority", primary: "#006655", secondary: "#FFFFFF" },
  { id: "alpha-xi-delta", name: "Alpha Xi Delta", letters: "ΑΞΔ", kind: "sorority", primary: "#B8D4E3", secondary: "#FFD700" },
  { id: "chi-omega", name: "Chi Omega", letters: "ΧΩ", kind: "sorority", primary: "#7C001F", secondary: "#FFD700" },
  { id: "delta-delta-delta", name: "Delta Delta Delta", letters: "ΔΔΔ", kind: "sorority", primary: "#0066B2", secondary: "#FFD700" },
  { id: "delta-gamma", name: "Delta Gamma", letters: "ΔΓ", kind: "sorority", primary: "#7A6855", secondary: "#F4C2C2" },
  { id: "delta-phi-epsilon", name: "Delta Phi Epsilon", letters: "ΔΦΕ", kind: "sorority", primary: "#800080", secondary: "#FFD700" },
  { id: "delta-zeta", name: "Delta Zeta", letters: "ΔΖ", kind: "sorority", primary: "#91191A", secondary: "#006655" },
  { id: "gamma-phi-beta", name: "Gamma Phi Beta", letters: "ΓΦΒ", kind: "sorority", primary: "#856B4B", secondary: "#FFFFFF" },
  { id: "kappa-alpha-theta", name: "Kappa Alpha Theta", letters: "ΚΑΘ", kind: "sorority", primary: "#000000", secondary: "#FFD700" },
  { id: "kappa-delta", name: "Kappa Delta", letters: "ΚΔ", kind: "sorority", primary: "#007A53", secondary: "#FFFFFF" },
  { id: "kappa-kappa-gamma", name: "Kappa Kappa Gamma", letters: "ΚΚΓ", kind: "sorority", primary: "#003366", secondary: "#FFFFFF" },
  { id: "phi-mu", name: "Phi Mu", letters: "ΦΜ", kind: "sorority", primary: "#FF69B4", secondary: "#FFFFFF" },
  { id: "phi-sigma-sigma", name: "Phi Sigma Sigma", letters: "ΦΣΣ", kind: "sorority", primary: "#003DA5", secondary: "#FFD700" },
  { id: "pi-beta-phi", name: "Pi Beta Phi", letters: "ΠΒΦ", kind: "sorority", primary: "#800020", secondary: "#FFD700" },
  { id: "sigma-delta-tau", name: "Sigma Delta Tau", letters: "ΣΔΤ", kind: "sorority", primary: "#8B7355", secondary: "#FFFFFF" },
  { id: "sigma-kappa", name: "Sigma Kappa", letters: "ΣΚ", kind: "sorority", primary: "#9370DB", secondary: "#FFFFFF" },
  { id: "sigma-sigma-sigma", name: "Sigma Sigma Sigma", letters: "ΣΣΣ", kind: "sorority", primary: "#800080", secondary: "#FFD700" },
  { id: "theta-phi-alpha", name: "Theta Phi Alpha", letters: "ΘΦΑ", kind: "sorority", primary: "#0066CC", secondary: "#FFFFFF" },
  { id: "zeta-phi-beta", name: "Zeta Phi Beta", letters: "ΖΦΒ", kind: "sorority", primary: "#1E4D8B", secondary: "#FFFFFF" },
  { id: "zeta-tau-alpha", name: "Zeta Tau Alpha", letters: "ΖΤΑ", kind: "sorority", primary: "#008080", secondary: "#FFD700" },
  { id: "custom", name: "Custom chapter colors", letters: "—", kind: "fraternity", primary: "#004225", secondary: "#0B1F3A" },
];

export function getGreekOrgById(id: string | null | undefined): GreekLetterOrg | undefined {
  if (!id) return undefined;
  return GREEK_LETTER_ORGS.find((o) => o.id === id);
}

export function greekOrgsForKind(kind: "fraternity" | "sorority" | "club_sports" | "general_org"): GreekLetterOrg[] {
  if (kind === "fraternity") return GREEK_LETTER_ORGS.filter((o) => o.kind === "fraternity" || o.id === "custom");
  if (kind === "sorority") return GREEK_LETTER_ORGS.filter((o) => o.kind === "sorority" || o.id === "custom");
  return [];
}
