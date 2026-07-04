/**
 * @mima-ai/eslint-plugin-mima
 *
 * ESLint rules for detecting unattested AI SDK calls in TypeScript.
 *
 * IMPORTANT: This plugin is a developer-feedback mechanism.
 * It does NOT generate evidence records. "All rules pass" does NOT mean
 * "we have compliance evidence." Only explicit attestation + evidence push
 * produces auditable records for the GRC ledger. The plugin finds WHERE
 * you need attestation; the attestation itself produces evidence.
 */

import noUnattestedAiCall from "./rules/no-unattested-ai-call"

export const rules = {
  "no-unattested-ai-call": noUnattestedAiCall,
}

export const configs = {
  recommended: {
    plugins: ["@mima-ai/mima"],
    rules: {
      "@mima-ai/mima/no-unattested-ai-call": "warn",
    },
  },
  strict: {
    plugins: ["@mima-ai/mima"],
    rules: {
      "@mima-ai/mima/no-unattested-ai-call": "error",
    },
  },
}
