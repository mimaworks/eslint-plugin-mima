/**
 * Tests for mima/no-unattested-ai-call rule.
 *
 * Valid = no warning (call is attested or not an AI call).
 * Invalid = rule fires (unattested AI call detected).
 */

import { RuleTester } from "@typescript-eslint/rule-tester"
import rule from "../src/rules/no-unattested-ai-call"
import { describe, it, afterAll } from "vitest"

// Required for @typescript-eslint/rule-tester v8+
RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
})

tester.run("no-unattested-ai-call", rule, {
  valid: [
    // ── Attested calls (wrapped in withAttestation) ────────────────────────
    {
      code: `
        import OpenAI from 'openai'
        const client = new OpenAI()
        withAttestation(() => {
          client.chat.completions.create({ model: 'gpt-4' })
        })
      `,
    },
    {
      code: `
        import Anthropic from '@anthropic-ai/sdk'
        const client = new Anthropic()
        attest(() => {
          client.messages.create({ model: 'claude-3' })
        })
      `,
    },
    // ── Attested via mima.attest() ──────────────────────────────────────────
    {
      code: `
        import OpenAI from 'openai'
        const client = new OpenAI()
        mima.attest(() => {
          client.chat.completions.create({ model: 'gpt-4' })
        })
      `,
    },
    // ── Non-AI calls — should never trigger ─────────────────────────────────
    {
      code: `
        import axios from 'axios'
        axios.get('/api/data')
      `,
    },
    {
      code: `
        const db = new Database()
        db.query('SELECT 1')
      `,
    },
    // ── AI import but non-inference method ───────────────────────────────────
    {
      code: `
        import OpenAI from 'openai'
        const client = new OpenAI()
        client.models.list()
      `,
    },
  ],

  invalid: [
    // ── Bare OpenAI call without attestation ────────────────────────────────
    {
      code: `
        import OpenAI from 'openai'
        const client = new OpenAI()
        client.chat.completions.create({ model: 'gpt-4' })
      `,
      errors: [{ messageId: "unattestedAiCall" }],
    },
    // ── Anthropic call without attestation ───────────────────────────────────
    {
      code: `
        import Anthropic from '@anthropic-ai/sdk'
        const client = new Anthropic()
        client.messages.create({ model: 'claude-3' })
      `,
      errors: [{ messageId: "unattestedAiCall" }],
    },
    // ── Vercel AI SDK direct function import ─────────────────────────────────
    {
      code: `
        import { generateText } from 'ai'
        generateText({ model: openai('gpt-4') })
      `,
      errors: [{ messageId: "unattestedAiCall" }],
    },
    // ── require() pattern ────────────────────────────────────────────────────
    {
      code: `
        const OpenAI = require('openai')
        const client = new OpenAI()
        client.chat.completions.create({ model: 'gpt-4' })
      `,
      errors: [{ messageId: "unattestedAiCall" }],
    },
    // ── Multiple calls, all unattested ───────────────────────────────────────
    {
      code: `
        import OpenAI from 'openai'
        import Anthropic from '@anthropic-ai/sdk'
        const oai = new OpenAI()
        const ant = new Anthropic()
        oai.chat.completions.create({ model: 'gpt-4' })
        ant.messages.create({ model: 'claude-3' })
      `,
      errors: [
        { messageId: "unattestedAiCall" },
        { messageId: "unattestedAiCall" },
      ],
    },
    // ── Attestation wrapper exists but call is OUTSIDE it ────────────────────
    {
      code: `
        import OpenAI from 'openai'
        const client = new OpenAI()
        withAttestation(() => {
          console.log('inside')
        })
        client.chat.completions.create({ model: 'gpt-4' })
      `,
      errors: [{ messageId: "unattestedAiCall" }],
    },
  ],
})
