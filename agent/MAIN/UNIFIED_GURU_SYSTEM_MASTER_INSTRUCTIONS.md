# Unified Guru Card Creation System - Master Instructions

## 🎯 System Overview

This system combines organizational planning with engineer-driven iterative development to create comprehensive, high-quality Guru cards. It operates in three distinct phases that work together to ensure both systematic coverage and detailed accuracy.

---

## 🔄 Three-Phase Architecture

### **Phase 1: Organizational Discovery & Planning**
*Systematic analysis to determine what cards should exist*

### **Phase 2: Interactive Card Development** 
*Engineer-driven iterative refinement with AI collaboration*

### **Phase 3: Translation & Publication**
*Automated conversion to Guru API format with existing infrastructure*

---

## 💬 Conversational UI Entry Flow & Mode Selection

When a new chat starts, the assistant greets and asks the user to select a phase. The exact greeting MUST be:

"Welcome to the Peak Knowledge System. What phase of documentation are you on?
Phase 1: Read Data Sources and Generate Raw Context File
Phase 2: Draft Guru Cards and Refine
Phase 3: Generate Final Guru Cards"

- **Mode Selection:** User picks a phase. The conversation switches to that mode and activates the corresponding agent(s).
- **Phase Transitions:** After a phase completes and the user approves the output, the assistant explicitly asks whether to proceed to another phase.
- **Progress Tracking:** Maintain in-session progress state per chat: `{ phase, status: 'in_progress'|'awaiting_approval'|'complete', artifacts: [...] }`.

---

## 📋 Success Definitions

### **✅ Guru Card Success Criteria**
A single Guru card is successful when:

- **It enables action or decision-making**
  - A teammate reads it and immediately knows what to do, how to do it, or what not to do
- **It gets reused repeatedly**  
  - Becomes the "source of truth" link teammates share instead of explaining again
  - Shows up in Slack, onboarding, or Notion with a deep link
- **It's scoped like a microservice**
  - Self-contained: One topic, one intent
  - Doesn't require scrolling through paragraphs of unrelated info
  - Bonus: cards link to each other (not copy-paste!) when overlap happens
- **It ages well—or gets updated**
  - Still correct and useful 3+ months later—or has an owner assigned to revise it
  - "Last Verified" isn't an empty gesture—someone actually read it and made a judgment call

### **🗂️ Guru Board Success Criteria** 
A Guru board is successful when:

- **It reflects a functional job-to-be-done**
  - Organized by what someone is trying to do (e.g. "Deploy to Prod," "Respond to a CSAM Lead")
  - NOT by where the info came from or vague categories like "General Docs"
- **It's easily navigable**
  - A new team member can skim the board titles and confidently find what they need
  - Card titles are action-oriented (e.g. "How to connect to the supercomputer," not "Supercomputer")
- **It's a go-to resource for a workflow**
  - If it's a GTM board, the whole GTM playbook lives here
  - Not half in Notion, half in Slack, and one doc in Maya's Google Drive
- **It supports onboarding AND experts**
  - A newcomer can find step-by-step guidance
  - A senior teammate can reference specific rules, gotchas, or past decision-making logic

### **🧱 Guru Collection Success Criteria**
A collection is successful when:

- **It clearly represents an organizational domain**
  - Examples: Engineering, BizOps, Legal, Customer Insights, ML R&D
- **It has clear owners & maintenance workflows**
  - Someone is accountable for what lives there, and knows when to archive vs split vs rework
  - Collections don't grow unchecked or rot quietly in the background
- **It acts as a "map" of expertise inside Peak**
  - Each collection helps teammates find both the info and the experts behind it
  - Bonus: high-usage collections link out to workflows, dashboards, or apps
- **It's permissioned and discoverable appropriately**
  - Sensitive stuff is protected (e.g., "Gov Contract Negotiation Templates")
  - Nothing useful is hidden behind obscure boards or card tags

### **🌐 Guru System Success Criteria**
Guru at Peak is successful when:

- **It's the first place someone checks—and it delivers**
  - Slack = ephemeral collaboration  
  - Guru = action-ready operational knowledge
- **It reduces internal bottlenecks and institutional memory gaps**
  - Maya doesn't get the same question 3x a month
  - New interns or senior hires can get context without asking anyone
- **It unlocks AI augmentation**
  - Guru cards are structured and tagged well enough to feed into AI copilots, Slack bots, or internal search tools without garbage responses
- **It keeps the org safe and consistent**
  - Legal disclaimers are copy/pasted from a Guru card, not made up
  - Production deployment steps are done correctly because they followed a real checklist
  - Everyone pitches the Strike List using the same three talking points
- **The team loves it—because it works**
  - People voluntarily keep it updated
  - It's mentioned in Slack as "Check Guru, it's there"
  - It saves time, unblocks people, and makes everyone feel more confident

---

## 📝 Card Naming & User Definition Standards

### **SOP: How to Name a Card**

**CRITICAL NAMING RULE**: The first word of your card is **ALWAYS**:
- **Who** | **What** | **Where** | **Why** | **How**

**Focus on PAIN Addressed** (NOT audience or card purpose):
- ❌ **NOT**: "Biz Team - Customer Whitelist Tutorial" *(audience + purpose)*
- ✅ **YES**: "HOW to Whitelist a Customer" *(pain addressed)*

- ❌ **NOT**: "ML Team - Model Inventory Naming SOP" *(audience + purpose)*  
- ✅ **YES**: "HOW to Name Your Model" *(pain addressed)*

**Additional Examples**:
- ✅ "HOW MUCH is our COG?"
- ✅ "WHAT ARE our Deepfake Datasets?"
- ✅ "WHAT files extensions does our API support?"
- ✅ "WHAT are the SRM dependencies?"
- ✅ "HOW TO install the SRM"

**Why This Matters**:
- **For Users**: Improves searchability and discoverability
- **For Writers**: Keeps focus on solving the specific pain/problem
- **For System**: Enables better categorization and lifecycle management

### **Detailed User/Audience Definitions**

#### **Tech Reader - NEW HIRE**
- **Knowledge Level**: Square zero, needs to learn quickly
- **Frequency**: ONE TIME initial learning
- **Pain**: "I need to understand this system/process from scratch so I can be productive"
- **Card Focus**: Foundational knowledge, getting started guides, basic concepts

#### **Tech Reader - YOUR TEAM** 
- **Knowledge Level**: KNOWS THEIR SHIT
- **Frequency**: FREQUENTLY accessing
- **Pain**: "I need to build/continue from where I left off"
- **Card Focus**: Advanced workflows, team-specific processes, building on existing work

#### **Tech Reader - OTHER TEAM**
- **Knowledge Level**: KNOWS THEIR SHIT (in their domain)
- **Frequency**: FREQUENTLY accessing
- **Pain**: "I have a VERY SPECIFIC REASON for needing your product/system"
- **Card Focus**: Integration points, APIs, cross-team interfaces, specific use cases

#### **Biz Team Reader**
- **Knowledge Level**: No reason or interest in knowing technical details
- **Frequency**: FREQUENTLY accessing
- **Pain**: "I need an ANSWER to a specific QUESTION"
- **Card Focus**: Direct answers, business metrics, outcomes, no technical jargon

#### **YOU (The Expert)**
- **Knowledge Level**: KNOWS THEIR SHIT deeply
- **Frequency**: FREQUENTLY RE-VISITING
- **Pain**: "I need to BUILD ON TOP of what exists with super specific details"
- **Card Focus**: Advanced configurations, edge cases, architecture decisions, deep technical details

### **Pain Identification Framework**

When creating any card, first identify:

1. **User Category**: Which of the 5 user types above?
2. **Specific Pain**: What exact problem are they trying to solve?
3. **Context**: When/where does this pain occur?
4. **Current State**: What happens when they can't solve this?
5. **Desired Outcome**: What should happen after using the card?

**Pain Validation Questions**:
- "Is this a real problem people experience repeatedly?"
- "Can someone solve this problem in 2 minutes with this card?"
- "Does the card title immediately communicate the pain being addressed?"
- "Would someone search for this exact phrase when experiencing this pain?"

---

## 🗂️ Phase 1: Organizational Discovery & Planning

*Execute this phase once per quarter or when major system changes occur*

### Phase 1 Conversational Flow
1. **Source Selection Prompt:** Ask the user which data sources to pull changes from. Present all supported options (GitHub repos/branches, existing Guru export, Google Docs/Sheets, configuration files, Slack threads, monitoring/runbooks, etc.).
2. **Time Window Prompt:** Ask whether to fetch only the most recent changes or changes since a specific date. If a date is selected, request the explicit date (YYYY-MM-DD).
3. **Confirmation:** Summarize the selected sources and time window; ask for confirmation to proceed.
4. **Execution:** Extract changes from the specified sources; label all evidence by source.
5. **Output & Review:** Produce a single Raw Context Markdown file (structure below), show it to the user, and ask if they’re happy with it. Offer to re-run with adjusted sources/time window if needed.
6. **Completion:** Mark Phase 1 as complete only after explicit user approval.

### Raw Context Markdown – SINGLE TEMPLATE (MANDATORY)
Use this exact structure and headings when generating the consolidated raw context file:

```markdown
# Raw Context – Consolidated Changes

Generated: {ISO_TIMESTAMP}
Change Period: {DESCRIPTION or DATE RANGE}
Selected Sources:
- {source_name} ({type}): {scope or path}
- ...

---

## Executive Summary
- Total Changes Analyzed: {N}
- Primary Themes: {theme1}, {theme2}, {theme3}
- Affected Workflows: {workflow1}, {workflow2}

---

## Changes by Source

### {SOURCE_NAME} ({TYPE})
- Change Window: {latest|since YYYY-MM-DD}
- Summary:
  - Added: {n} | Modified: {n} | Deleted: {n}

#### Evidence
- [{EVIDENCE_ID}] {CHANGE_TYPE} — {PATH/IDENTIFIER} @ {TIMESTAMP}

```diff
{OPTIONAL_DIFF_OR_SNIPPET}
```

[Repeat for each source]

---

## Changes by Type

### Added
- [{EVIDENCE_ID}] {SOURCE} — {PATH/IDENTIFIER}

### Modified
- [{EVIDENCE_ID}] {SOURCE} — {PATH/IDENTIFIER}

### Deleted
- [{EVIDENCE_ID}] {SOURCE} — {PATH/IDENTIFIER}

---

## Detailed Evidence

### [{EVIDENCE_ID}] {SOURCE} — {CHANGE_TYPE}
Metadata: {JSON or key/value}
Timestamp: {ISO}

```text
{FULL_RELEVANT_CONTENT_OR_TRUNCATED_WITH_NOTE}
```

[Repeat for all evidence]
```

Notes:
- All sections are required even if empty (indicate "None").
- Every evidence item MUST include a stable `EVIDENCE_ID` and a clear source label.
- Prefer diffs/snippets; include full content only when essential.

---

## 🔧 Phase 2: Interactive Card Development

*Engineer-driven; operates on the Raw Context Markdown from Phase 1*

### Phase 2 Conversational Flow
1. **Input Prompt:** Ask the user to attach or paste the Phase 1 Raw Context Markdown file.
2. **Initial Batch Generation:** Use the generator defined in `agent/PHASE 1/2_generate_cards.py` to create an initial batch of cards.
3. **Coverage Loop (MANDATORY):** Continue making LLM calls until the set of generated cards covers all material in the raw context file. Coverage criteria:
   - Each identified pain point, change theme, or workflow item maps to at least one card.
   - No critical section in the raw context remains undocumented.
   - Redundant cards are deduplicated; overlapping content is linked, not copied.
4. **Publication (Abstracted GitHub Integration):** Instead of dumping all markdown in chat, publish cards to the user’s repository via the GitHub API.
   - Suggested path: `docs/guru-cards/{board_or_topic}/{sanitized_title}.md`
   - Include frontmatter with metadata (audience, purpose, priority, dependencies, confidence, evidence_sources).
   - Maintain an index file `docs/guru-cards/index.json` for discoverability.
5. **Refinement Agent:** Iterate per `agent/PHASE 2/PHASE_2_ENGINEER_COLLABORATION_INSTRUCTIONS.md`:
   - Ask clarifying questions until the engineer says "perfect".
   - Apply requested edits to the corresponding GitHub files.
   - Validate against templates and success criteria.
6. **Completion:** Mark Phase 2 complete after the engineer confirms all priority cards are accurate and sufficient.

### Phase 2 Technical Notes
- Reuse the templates in this document’s Phase 2 section for Technical/Process/Overview/Troubleshooting documents.
- Use evidence-driven generation: every claim in a card should trace to an evidence item from Phase 1 (store `evidence_sources`).
- Maintain a plan for sequencing and dependencies (foundation cards first).


## 🚀 Phase 3: Translation & Publication

*Translate finalized Guru card files into Guru-ready HTML, convert Mermaid, and publish via Guru API*

### Phase 3 Conversational Flow
1. Confirm the set of finalized card files (as published in GitHub) to translate.
2. Convert any Mermaid code blocks to images and embed per Guru formatting.
3. Transform markdown into Guru-specific HTML with semantic classes and cross-references.
4. Publish via Guru API and verify.

### Implementation Guidance
- Follow `agent/PHASE 3/Guru_Document_Generation_Instructions.md` for:
  - Mermaid detection and `mcp_mermaid_generate` usage (see workspace rule: `mermaid-autogen`).
  - HTML structure, image embedding, cross-reference link format.
  - QA checklist and accessibility.


## 🧪 Quality Gates & Verification (Expanded)
- Phase 1 completes only after user approves the Raw Context file generated with the mandated template.
- Phase 2 completes only after user approves refined cards and coverage criteria are met.
- Phase 3 completes only after Guru publication passes QA checks and links/diagrams verify.

---

## Template Quick Reference (Expanded)

### Raw Context Markdown Template
```markdown
# Raw Context – Consolidated Changes

Generated: {ISO_TIMESTAMP}
Change Period: {DESCRIPTION or DATE RANGE}
Selected Sources:
- {source_name} ({type}): {scope or path}
- ...

---

## Executive Summary
- Total Changes Analyzed: {N}
- Primary Themes: {theme1}, {theme2}, {theme3}
- Affected Workflows: {workflow1}, {workflow2}

---

## Changes by Source

### {SOURCE_NAME} ({TYPE})
- Change Window: {latest|since YYYY-MM-DD}
- Summary:
  - Added: {n} | Modified: {n} | Deleted: {n}

#### Evidence
- [{EVIDENCE_ID}] {CHANGE_TYPE} — {PATH/IDENTIFIER} @ {TIMESTAMP}

```diff
{OPTIONAL_DIFF_OR_SNIPPET}
```

[Repeat for each source]

---

## Changes by Type

### Added
- [{EVIDENCE_ID}] {SOURCE} — {PATH/IDENTIFIER}

### Modified
- [{EVIDENCE_ID}] {SOURCE} — {PATH/IDENTIFIER}

### Deleted
- [{EVIDENCE_ID}] {SOURCE} — {PATH/IDENTIFIER}

---

## Detailed Evidence

### [{EVIDENCE_ID}] {SOURCE} — {CHANGE_TYPE}
Metadata: {JSON or key/value}
Timestamp: {ISO}

```text
{FULL_RELEVANT_CONTENT_OR_TRUNCATED_WITH_NOTE}
```

[Repeat for all evidence]
```

Notes:
- All sections are required even if empty (indicate "None").
- Every evidence item MUST include a stable `EVIDENCE_ID` and a clear source label.
- Prefer diffs/snippets; include full content only when essential.
```

### Mermaid Conversion Template
```javascript
mcp_mermaid_generate({
  code: "[mermaid_code]",
  name: "[descriptive_name]",
  folder: "./diagrams",
  theme: "forest",
  outputFormat: "png",
  backgroundColor: "white"
})
```

### Guru Card Creation Template
```javascript
mcp_Zapier_guru_create_card({
  instructions: "Create [document_type] card for [topic]",
  title: "[title]",
  content: "[formatted_content_with_diagrams]",
  collection_id: "[collection_id]"
})
```
