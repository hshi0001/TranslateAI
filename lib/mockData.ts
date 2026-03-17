import { BlueprintVersion } from "./types";

const MOCK_BLUEPRINT_CONTENT = `APP BLUEPRINT

1. Idea Summary
Blueprint AI is a pre-coding workspace that turns raw app ideas into concise, structured build blueprints focused strictly on MVP scope.

2. Target Users
- Solo developers validating new product ideas
- Small teams planning first implementation
- Technical founders who want clear build plans

3. Core Problem
Developers waste time and tokens jumping straight into coding or AI code generation without a clear product architecture, causing scope creep and rework.

4. MVP Features
- Single idea input page with large textarea and generate button
- Blueprint workspace with current blueprint and refinement chat
- Version history within the current session only
- Export build pack for README, architecture, roadmap, and Cursor prompts

5. User Flow
- User lands on home page and describes the app they want to build
- User generates an initial blueprint from the raw idea
- User refines the blueprint iteratively via structured prompts
- User reviews versions and exports a build pack when satisfied

6. Tech Stack
- Frontend: Next.js App Router, TypeScript, Tailwind CSS
- Backend: Next.js API routes, in-memory and browser-local state only
- AI: Gemini API (with mock mode fallback for local development)

7. Project Structure
- app/
  - page.tsx (idea input)
  - workspace/page.tsx (blueprint + refinement)
  - export/page.tsx (build pack export)
- components/
  - IdeaInput.tsx
  - BlueprintPanel.tsx
  - RefinementChat.tsx
  - VersionHistory.tsx
  - ExportPanel.tsx
- lib/
  - gemini.ts
  - prompts.ts
  - types.ts
  - mockData.ts

8. Development Roadmap
- Phase 1: Core pages, mock mode, and local version history
- Phase 2: Gemini integration and UX polish
- Phase 3: Additional export formats and blueprint templates

9. Cursor Prompts
- \"Act as an AI Product Architect for the Blueprint AI app. Help implement only the MVP features defined in the blueprint. Avoid adding login, billing, analytics, or collaboration until explicitly added to scope.\"
- \"Given the current blueprint, suggest the minimal Next.js components and API routes required to ship the first usable version.\"
- \"Review the current implementation against the blueprint and highlight any scope creep or unnecessary complexity.\"

10. Competitive Landscape & Advantage
- Summary: Competes with generic AI coding assistants and planning tools that mix architecture with code generation.
- Key competitors: Notion + AI planning docs, generic AI chat in IDEs, product spec templates in tools like Linear or Jira.
- Advantages:
  - Single-purpose: optimised purely for pre-coding architecture, not chatting或写代码
  - Structured outputs: consistent blueprint and build pack format, easy paste into Cursor
  - Scope control: explicitly fights scope creep and over-building in early stages
`;

export const MOCK_INITIAL_BLUEPRINT = (rawIdea: string): BlueprintVersion => {
  const now = new Date().toISOString();
  return {
    id: "mock-initial",
    createdAt: now,
    updatedAt: now,
    version: 1,
    rawIdea,
    content: MOCK_BLUEPRINT_CONTENT,
    changesSummary: "Initial blueprint generated in mock mode for your idea."
  };
};

export const MOCK_REFINED_BLUEPRINT = (
  previous: BlueprintVersion,
  userInstruction: string
): BlueprintVersion => {
  const now = new Date().toISOString();
  return {
    ...previous,
    id: `mock-v${previous.version + 1}`,
    version: previous.version + 1,
    updatedAt: now,
    changesSummary: `Mock refinement applied: ${userInstruction}`
  };
};

export const MOCK_BUILD_PACK = {
  readme: `# Blueprint AI (Mock Build Pack)

This is a mock README generated without an AI backend.

Use this as a placeholder while wiring up the real Gemini API.
`,
  architecture: `# Architecture (Mock)

- Next.js App Router + TypeScript + Tailwind
- No database, all state in memory or browser-local
- API routes for blueprint generation, refinement, and export
`,
  roadmap: `# Roadmap (Mock)

- [ ] Replace mock mode with real Gemini API calls
- [ ] Tighten blueprint formatting and prompt engineering
- [ ] Improve UI polish and keyboard shortcuts
`,
  cursorPrompts: `# Cursor Prompts (Mock)

- \"You are helping implement Blueprint AI in mock mode. Do not add login, billing, or analytics.\"
`
};

