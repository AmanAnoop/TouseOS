import type { Appearance } from "@clerk/types";

/** Clerk prebuilt UI — matches TouseOS design tokens (CSS variables). */
export const clerkAppearance: Appearance = {
  variables: {
    colorBackground: "var(--color-bg-raised)",
    colorInputBackground: "var(--color-bg-raised)",
    colorText: "var(--color-text-primary)",
    colorTextSecondary: "var(--color-text-secondary)",
    colorPrimary: "var(--color-org-primary)",
    colorDanger: "var(--color-error)",
    colorSuccess: "var(--color-success)",
    colorWarning: "var(--color-warning)",
    borderRadius: "6px",
    fontFamily: "var(--font-body)",
    fontFamilyButtons: "var(--font-body)",
    fontSize: "14px",
  },
  elements: {
    card: {
      backgroundColor: "var(--color-bg-raised)",
      border: "1px solid var(--color-border)",
      boxShadow: "var(--shadow-lg)",
      borderRadius: "8px",
    },
    headerTitle: {
      fontFamily: "var(--font-display)",
      fontSize: "24px",
      fontWeight: 400,
    },
    formButtonPrimary: {
      backgroundColor: "var(--color-org-primary)",
      color: "var(--color-text-on-brand)",
      fontSize: "13px",
      fontWeight: 500,
      height: "36px",
    },
    formFieldInput: {
      height: "36px",
      border: "1px solid var(--color-border)",
    },
    footerActionLink: {
      color: "var(--color-org-primary)",
    },
  },
};
