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
  - Notion = long-form strategy and planning
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

### Step 1.1: Data Source Collection
Collect ALL relevant data sources with team assistance:

**Code & Documentation Sources:**
- [ ] All GitHub repositories (main + feature branches)
- [ ] Existing Guru cards export (use existing `guru_cards_export/` functionality)
- [ ] README files, wikis, and inline documentation
- [ ] API documentation and OpenAPI specs

**Operational Sources:**
- [ ] Key Google Sheets (process docs, runbooks, contact lists)
- [ ] Key Google Docs (strategic docs, technical specs)
- [ ] Engineering Dashboard Archive
- [ ] Slack pinned messages and important threads

**Infrastructure Sources:**
- [ ] Tech stack snapshots (Vercel, Supabase, Abstract, etc.)
- [ ] Configuration files (docker-compose, k8s configs, env templates)
- [ ] Monitoring dashboards and runbooks
- [ ] Deployment and CI/CD documentation

### Step 1.2: LLM-Driven Gap Analysis
For each data source, use the existing `analyzer.py` infrastructure to ask:

```
Based on this [DATA SOURCE], what Guru cards need to exist for the team?
Consider:
- What knowledge gaps would new team members encounter?
- What questions get asked repeatedly?
- What processes are undocumented or scattered?
- What would someone need to know to be effective with this system?
```

### Step 1.3: Comprehensive Card Inventory
Build master spreadsheet with columns:
- **Card Title**
- **Target Audience** (Role/Persona)
- **Primary Purpose** (What question does it answer?)
- **Priority Level** (Critical/Important/Nice-to-have)
- **Data Sources** (Where knowledge currently lives)
- **SME Contact** (Who can verify accuracy?)
- **Estimated Complexity** (Simple/Medium/Complex)
- **Dependencies** (What other cards must exist first?)

### Step 1.4: Human Review & Prioritization
Use judgment and team input for:
- **Additions**: Missing cards identified through experience
- **Removals**: Cards that duplicate existing resources
- **Changes**: Scope adjustments or title refinements  
- **FAVORITES**: Mark the 20% of cards that deliver 80% of value

### Step 1.5: LLM-Driven Final Optimization
Run complete card inventory through LLM for:
- Logical grouping and sequencing
- Dependency identification and ordering
- Gap detection in coverage areas
- Standardization of titles and descriptions

### Step 1.6: Organizational Structure Design
Use LLM to design final Boards and Collections structure:
- **Collections**: Major knowledge domains (Engineering, Product, Operations)
- **Boards**: User journey stages or functional areas within collections
- **Card Sequences**: Logical flow within boards

---

## 🔧 Phase 2: Interactive Card Development

*Execute this phase for each individual card, driven by the engineer most familiar with the topic*

### Step 2.1: Context Gathering & Analysis
**Engineer selects target card from Phase 1 inventory and navigates to relevant codebase/documentation**

Use existing `codebase_search` and analysis tools to gather comprehensive context:
- Related code files and functions
- Existing documentation fragments
- Configuration examples
- Test cases and usage patterns
- Error scenarios and troubleshooting info

### Step 2.2: Guru Card Template Selection
**AI automatically determines appropriate template based on success definitions:**

#### **For Technical Documentation/API Reference:**
```markdown
# [Title] - Technical Reference

**Audience:** [Specific role - e.g., "Frontend developers integrating authentication"]
**Use Case:** [Specific scenario - e.g., "When implementing login flow"]
**Time to Complete:** [Estimated time to solve problem]

---

## 🎯 What You'll Accomplish
[Single sentence describing the outcome]

## 🏗️ System Overview
[Architecture diagram - generated from mermaid]
[2-3 sentence explanation of key components]

## 🚀 Quick Start
[Minimum viable implementation - copy/paste ready]

## 📋 Detailed Implementation
[Step-by-step with code examples]

## 🔧 Configuration Options
[Advanced settings and customization]

## ❓ Troubleshooting
[Common issues with solutions]

## 🔗 Related Resources
[Links to other Guru cards and external docs]
```

#### **For Process/Tutorial Documentation:**
```markdown
# [Title] - Process Guide

**Audience:** [Specific role]
**Prerequisites:** [Required knowledge/setup]
**Time Required:** [Estimated duration]

---

## 🎯 Process Overview
[Process flow diagram - generated from mermaid]
[What you'll accomplish and why it matters]

## ✅ Prerequisites Checklist
- [ ] [Prerequisite 1 with verification method]
- [ ] [Prerequisite 2 with verification method]

## 📋 Step-by-Step Process
### Step 1: [Action-oriented title]
[Detailed instructions with screenshots/code]
**Expected Result:** [What should happen]
**If this fails:** [Troubleshooting steps]

[Continue for each step...]

## 🔧 Advanced Options
[Optional enhancements]

## 📚 Next Steps
[What to do after completing this process]
```

### Step 2.3: Iterative Content Refinement
**AI-Engineer Collaboration Loop (continue until engineer approval):**

**Round 1:** AI creates initial draft based on gathered context
**Engineer Review:** Identifies gaps, inaccuracies, or improvements needed
**Round 2:** AI refines content based on feedback
**Engineer Review:** Further refinements...
**Round N:** Continue until engineer says "This is exactly what the team needs"

**Key AI Responsibilities During Iteration:**
- Ask clarifying questions about edge cases
- Request specific examples from engineer's experience
- Validate technical accuracy against codebase
- Ensure content matches target audience needs
- Optimize for "time to solution" success metric

### Step 2.4: Knowledge Integration & Quiz Validation
**AI performs comprehensive knowledge integration:**

1. **Source Integration**: Combines information from all relevant sources
2. **Cross-Reference Check**: Ensures consistency with related cards
3. **Knowledge Quiz**: AI tests its understanding by asking engineer questions like:
   - "If someone followed this process and encountered [scenario], what should happen?"
   - "What would be the most common mistake someone makes in step 3?"
   - "How would you verify that the setup is working correctly?"

4. **Quiz Validation**: Engineer confirms AI truly understands the topic
5. **Content Finalization**: Only proceed when AI demonstrates mastery

### Step 2.5: SME Review & Approval
- **Technical Accuracy Review**: SME verifies all technical details
- **Audience Appropriateness**: Confirms content serves target users
- **Completeness Check**: Ensures no critical information is missing
- **Final Approval**: SME signs off on content quality

---

## 🚀 Phase 3: Translation & Publication

*Automated conversion using existing infrastructure*

### Step 3.1: Mermaid Diagram Processing
**Use existing mermaid infrastructure and MCP tools:**

```javascript
// For each mermaid block found in content:
mcp_mermaid_generate({
  code: "[extracted mermaid code]",
  name: "[descriptive_filename]", 
  folder: "./diagrams",
  theme: "forest",
  outputFormat: "png",
  backgroundColor: "white"
})
```

### Step 3.2: Content Format Translation
**Convert to Guru-specific HTML format using existing patterns:**

- Use existing `Guru_Document_Generation_Instructions.md` formatting guidelines
- Apply semantic HTML classes for Guru cards
- Embed generated diagrams with proper sizing
- Format code snippets and technical content
- Add cross-reference links to related cards

### Step 3.3: Guru API Integration
**Use existing Guru MCP tools for publication:**

```javascript
// Create the card
mcp_Zapier_guru_create_card({
  instructions: "Create [document_type] card for [topic]",
  title: "[title]",
  content: "[formatted_content_with_diagrams]",
  collection_id: "[determined in Phase 1]"
})

// Add tags (use existing tagging infrastructure)
mcp_Zapier_guru_add_tag_to_card({
  instructions: "Add relevant tags for categorization",
  card_id: "[generated card ID]",
  tag_id: "[relevant tag IDs from guru_tag_generator.py]"
})

// Verify when ready
mcp_Zapier_guru_verify_card({
  instructions: "Verify card content is accurate and complete",
  card_id: "[generated card ID]"
})
```

### Step 3.4: Quality Assurance
**Automated validation using existing analyzer infrastructure:**
- Run content through quality checks
- Validate all links and references
- Confirm diagram accessibility
- Test card navigation and user flow
- Generate verification report

---

## 🔄 System Integration Points

### **Leveraging Existing Infrastructure:**
- **`analyzer.py`**: Powers gap analysis and content validation
- **`guru_tag_generator.py`**: Provides intelligent tagging
- **`Guru_Document_Generation_Instructions.md`**: Formatting standards
- **Mermaid MCP tools**: Diagram generation and embedding
- **Guru API tools**: Card creation and management

### **New Components Required:**
- **Phase 1 orchestration script**: Automates organizational discovery
- **Phase 2 instruction templates**: Guide iterative development
- **Integration workflows**: Connect all three phases seamlessly

### **Success Tracking:**
- **Card Usage Analytics**: Track which cards solve problems fastest
- **Team Feedback Loops**: Regular reviews of card effectiveness
- **Continuous Improvement**: Refine templates based on outcomes

---
