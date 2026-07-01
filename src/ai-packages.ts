/**
 * Known AI SDK packages and the method patterns that constitute an inference call.
 *
 * This registry is the single source of truth for what eslint-plugin-mima considers
 * an "AI call site." If a method call doesn't match any entry here, it's not flagged.
 *
 * Format: package name → array of call patterns.
 * A call pattern is a dot-separated method path from the imported binding.
 * "*" matches any single property access (e.g. "chat.completions.create" or "messages.create").
 */
export const AI_PACKAGES: Record<string, string[]> = {
  // OpenAI
  openai: [
    "chat.completions.create",
    "completions.create",
    "images.generate",
    "embeddings.create",
    "audio.transcriptions.create",
    "audio.translations.create",
  ],

  // Anthropic
  "@anthropic-ai/sdk": [
    "messages.create",
    "messages.stream",
  ],

  // Vercel AI SDK
  ai: [
    "generateText",
    "streamText",
    "generateObject",
    "streamObject",
  ],

  // LangChain
  langchain: [
    "invoke",
    "stream",
    "batch",
  ],
  "@langchain/core": [
    "invoke",
    "stream",
    "batch",
  ],
  "@langchain/openai": [
    "invoke",
    "stream",
  ],
  "@langchain/anthropic": [
    "invoke",
    "stream",
  ],

  // Google Gemini
  "@google/generative-ai": [
    "generateContent",
    "generateContentStream",
  ],

  // Azure OpenAI
  "@azure/openai": [
    "getChatCompletions",
    "streamChatCompletions",
  ],

  // Cohere
  "cohere-ai": [
    "chat",
    "generate",
    "embed",
  ],

  // Mistral
  "@mistralai/mistralai": [
    "chat",
    "chatStream",
  ],
}

/**
 * Attestation wrapper names that mark a call as governed.
 * If a call site is inside one of these, it's considered attested and not flagged.
 */
export const ATTEST_WRAPPERS = [
  "withAttestation",
  "attest",
  "mimaAttest",
  "mima.attest",
]
