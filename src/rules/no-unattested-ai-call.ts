/**
 * eslint-plugin-mima/no-unattested-ai-call
 *
 * Flags AI SDK method calls that are not wrapped in an attestation context.
 *
 * This is a DEVELOPER FEEDBACK mechanism. It does not generate evidence records.
 * "This rule passes" does NOT mean "we have compliance evidence." Only explicit
 * attestation (@mima.attest / withAttestation) + evidence push produces auditable
 * records for the GRC ledger.
 */

import { ESLintUtils, TSESTree, AST_NODE_TYPES } from "@typescript-eslint/utils"
import { AI_PACKAGES, ATTEST_WRAPPERS } from "../ai-packages"

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://docs.mima.ai/eslint/${name}`
)

type MessageIds = "unattestedAiCall"

export default createRule<[], MessageIds>({
  name: "no-unattested-ai-call",
  meta: {
    type: "problem",
    docs: {
      description:
        "Require AI SDK calls to be wrapped in an attestation context (withAttestation, @mima.attest)",
    },
    messages: {
      unattestedAiCall:
        "Unattested AI call: {{callText}}. Wrap with withAttestation(() => { ... }) to govern this call.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Track which local identifiers are bound to known AI packages.
    // e.g. `import OpenAI from 'openai'` → localBindings.set('OpenAI', 'openai')
    const localBindings = new Map<string, string>()

    // Track which local identifiers are instances of AI clients.
    // e.g. `const client = new OpenAI()` → instanceBindings.set('client', 'openai')
    const instanceBindings = new Map<string, string>()

    return {
      // ── Collect imports ────────────────────────────────────────────────────

      ImportDeclaration(node) {
        const source = node.source.value
        if (!AI_PACKAGES[source]) return

        for (const spec of node.specifiers) {
          localBindings.set(spec.local.name, source)
        }
      },

      // ── Collect `require()` calls ─────────────────────────────────────────

      VariableDeclarator(node) {
        // const OpenAI = require('openai')
        if (
          node.init?.type === AST_NODE_TYPES.CallExpression &&
          node.init.callee.type === AST_NODE_TYPES.Identifier &&
          node.init.callee.name === "require" &&
          node.init.arguments.length === 1 &&
          node.init.arguments[0].type === AST_NODE_TYPES.Literal &&
          typeof node.init.arguments[0].value === "string"
        ) {
          const source = node.init.arguments[0].value
          if (!AI_PACKAGES[source]) return
          if (node.id.type === AST_NODE_TYPES.Identifier) {
            localBindings.set(node.id.name, source)
          }
        }

        // const client = new OpenAI(...)
        if (
          node.init?.type === AST_NODE_TYPES.NewExpression &&
          node.init.callee.type === AST_NODE_TYPES.Identifier &&
          node.id.type === AST_NODE_TYPES.Identifier
        ) {
          const className = node.init.callee.name
          const pkg = localBindings.get(className)
          if (pkg) {
            instanceBindings.set(node.id.name, pkg)
          }
        }
      },

      // ── Check call expressions ────────────────────────────────────────────

      CallExpression(node) {
        const callChain = getMemberChain(node.callee)
        if (!callChain) return

        const [root, ...rest] = callChain
        const pkg = localBindings.get(root) ?? instanceBindings.get(root)
        if (!pkg) return

        const methodPath = rest.join(".")
        const patterns = AI_PACKAGES[pkg]
        if (!patterns) return

        // Check if this method path matches any known AI call pattern.
        const isAiCall = patterns.some((pattern) => {
          // Direct function imports (e.g. `generateText(...)` from 'ai')
          if (pattern === root && rest.length === 0) return true
          // Method chain match
          return methodPath === pattern || methodPath.endsWith(`.${pattern}`)
        })

        if (!isAiCall) {
          // Also check: is the root itself a directly-imported function?
          // e.g. `import { generateText } from 'ai'; generateText(...)`
          if (rest.length === 0 && patterns.includes(root)) {
            if (!isInsideAttestationContext(node)) {
              context.report({
                node,
                messageId: "unattestedAiCall",
                data: { callText: root },
              })
            }
          }
          return
        }

        if (!isInsideAttestationContext(node)) {
          context.report({
            node,
            messageId: "unattestedAiCall",
            data: { callText: `${root}.${methodPath}` },
          })
        }
      },
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Walk up the AST to see if the call is inside an attestation wrapper.
     * Checks for:
     *   - withAttestation(() => { ... })
     *   - attest(() => { ... })
     *   - function decorated with @Attest()
     */
    function isInsideAttestationContext(
      node: TSESTree.Node
    ): boolean {
      let current: TSESTree.Node | undefined = node.parent

      while (current) {
        // Check: are we inside a call to withAttestation / attest / etc.?
        if (
          current.type === AST_NODE_TYPES.CallExpression &&
          isAttestationCall(current.callee)
        ) {
          return true
        }

        // Check: are we inside a function/method with an @Attest decorator?
        if (
          (current.type === AST_NODE_TYPES.FunctionDeclaration ||
            current.type === AST_NODE_TYPES.MethodDefinition) &&
          hasAttestDecorator(current)
        ) {
          return true
        }

        current = current.parent
      }
      return false
    }

    function isAttestationCall(callee: TSESTree.Expression): boolean {
      // withAttestation(...)
      if (
        callee.type === AST_NODE_TYPES.Identifier &&
        ATTEST_WRAPPERS.includes(callee.name)
      ) {
        return true
      }
      // mima.attest(...) or something.withAttestation(...)
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        ATTEST_WRAPPERS.includes(callee.property.name)
      ) {
        return true
      }
      return false
    }

    function hasAttestDecorator(
      node: TSESTree.FunctionDeclaration | TSESTree.MethodDefinition
    ): boolean {
      // MethodDefinition has decorators on itself or its parent class member
      if (node.type === AST_NODE_TYPES.MethodDefinition) {
        const decorators = (node as any).decorators as
          | TSESTree.Decorator[]
          | undefined
        if (!decorators) return false
        return decorators.some((d) => {
          const expr =
            d.expression.type === AST_NODE_TYPES.CallExpression
              ? d.expression.callee
              : d.expression
          if (expr.type === AST_NODE_TYPES.Identifier) {
            return ATTEST_WRAPPERS.includes(expr.name)
          }
          if (
            expr.type === AST_NODE_TYPES.MemberExpression &&
            expr.property.type === AST_NODE_TYPES.Identifier
          ) {
            return ATTEST_WRAPPERS.includes(expr.property.name)
          }
          return false
        })
      }
      return false
    }

    /**
     * Given a callee expression, return the chain of identifiers.
     * e.g. `client.chat.completions.create` → ['client', 'chat', 'completions', 'create']
     * Returns null if the expression is not a simple member chain.
     */
    function getMemberChain(node: TSESTree.Expression): string[] | null {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return [node.name]
      }
      if (
        node.type === AST_NODE_TYPES.MemberExpression &&
        !node.computed &&
        node.property.type === AST_NODE_TYPES.Identifier
      ) {
        const parent = getMemberChain(node.object as TSESTree.Expression)
        if (!parent) return null
        return [...parent, node.property.name]
      }
      return null
    }
  },
})
