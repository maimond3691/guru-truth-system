# Guru Document Generation Instructions

## Overview

This document provides comprehensive instructions for automatically generating Guru cards from markdown context documents, with special attention to mermaid diagram conversion and content structure optimization based on document type.

## Process Overview

```
Context Document Analysis → Mermaid Diagram Conversion → Content Structure Planning → Guru Card Generation
```

---

## Phase 1: Context Document Analysis

### Step 1: Document Type Classification

Analyze the context document to determine its primary type and structure:

#### A. **Technical Documentation/API Reference**
**Indicators:**
- Contains code snippets, API endpoints, technical specifications
- Includes system architecture details, implementation specifics
- Has sections like "Installation", "Configuration", "Usage", "API Reference"
- Example: Doc1.md (Peak Content Moderation Platform)

**Structure Approach:**
- Lead with executive summary
- Use tabbed sections for different technical aspects
- Place architecture diagrams prominently near the top
- Group related technical concepts together
- Include code examples in collapsible sections

#### B. **Process/Tutorial Documentation**
**Indicators:**
- Step-by-step instructions, sequential workflows
- Contains numbered lists, checkboxes, action items
- Has words like "How to", "Step-by-step", "Guide", "Tutorial"
- Flow diagrams showing process progression

**Structure Approach:**
- Start with prerequisites and overview
- Use sequential numbered sections
- Place process flow diagrams between major sections
- Include checkboxes for actionable items
- End with troubleshooting or next steps

#### C. **Overview/Strategic Documentation**
**Indicators:**
- High-level concepts, business context, strategic information
- Contains organizational information, mission/vision statements
- Has sections like "Overview", "Background", "Strategy", "Goals"
- System overview diagrams

**Structure Approach:**
- Lead with mission/vision statement
- Use hierarchical organization (high-level to detailed)
- Place system overview diagrams early
- Break into digestible conceptual sections
- Include relevant stakeholder information

#### D. **Onboarding/Training Documentation**
**Indicators:**
- Learning objectives, skill development, role-specific information
- Contains training schedules, learning paths, competency frameworks
- Has sections like "Day 1", "Week 1", "Learning Objectives"

**Structure Approach:**
- Start with welcome and objectives
- Use timeline-based organization
- Include progress tracking elements
- Place role/responsibility diagrams strategically
- End with assessment or next steps

### Step 2: Content Complexity Assessment

**Simple (< 5 sections):**
- Single Guru card with integrated diagrams
- Linear narrative structure

**Medium (5-15 sections):**
- Single comprehensive card with tabbed sections
- Strategic diagram placement for flow

**Complex (15+ sections):**
- Consider breaking into multiple linked cards
- Master overview card linking to detailed cards
- Shared diagram library approach

---

## Phase 2: Mermaid Diagram Conversion

### Step 3: Mermaid Detection and Extraction

Scan the context document for mermaid code blocks:

```markdown
```mermaid
[mermaid code content]
```
```

### Step 4: Diagram Conversion Process

For each detected mermaid block:

1. **Extract the mermaid code**
2. **Generate descriptive filename** based on first line or diagram type
3. **Call the mermaid MCP generate tool:**

```javascript
mcp_mermaid_generate({
  code: "[extracted mermaid code]",
  name: "[descriptive_filename]", // e.g., "system_architecture", "user_signup_flow"
  folder: "./diagrams",
  theme: "forest", // or "default", "dark", "neutral"
  outputFormat: "png",
  backgroundColor: "white"
})
```

### Step 5: Diagram Categorization and Placement Strategy

#### **Architecture Diagrams** (system, database schemas)
- **Placement:** Early in document, after overview section
- **Purpose:** Establish mental model before diving into details
- **Size:** Full-width, prominent placement

#### **Process Flow Diagrams** (workflows, user journeys)
- **Placement:** Beginning of relevant process sections
- **Purpose:** Visual roadmap before detailed steps
- **Size:** Medium to full-width

#### **Entity Relationship Diagrams** (database, data models)
- **Placement:** In technical reference sections
- **Purpose:** Reference material during implementation
- **Size:** Medium width, with zoom capability

#### **Sequential Diagrams** (interactions, communications)
- **Placement:** Within detailed process explanations
- **Purpose:** Clarify complex interactions
- **Size:** Full-width for readability

---

## Phase 3: Guru Card Structure Planning

### Step 6: Content Organization Strategy

#### For **Technical Documentation** (like Doc1.md):

```markdown
# [Title] - Technical Reference

**Audience:** [Target audience]
**Overview:** [2-3 sentence summary]

---

## 🏗️ System Architecture
[Architecture diagram - full width]
[Brief explanation of key components]

---

## 📋 Quick Reference
- **Technology Stack:** [Key technologies]
- **API Endpoints:** [Primary endpoints]
- **Dependencies:** [Major dependencies]

---

## 🔧 Core Components

### [Component 1]
[Component diagram if applicable]
[Description and key features]

### [Component 2]
[Component diagram if applicable]
[Description and key features]

---

## 📊 Data Flow & Processing
[Data flow diagram]
[Step-by-step process explanation]

---

## 🚀 Getting Started
### Prerequisites
[List requirements]

### Installation
[Step-by-step setup]

### Configuration
[Configuration details]

---

## 📡 API Reference
[API documentation sections]

---

## 🔐 Security & Authentication
[Security-related information]

---

## 📈 Monitoring & Analytics
[Monitoring setup and analytics]
```

#### For **Process/Tutorial Documentation**:

```markdown
# [Title] - Process Guide

**Audience:** [Target audience]
**Time Required:** [Estimated duration]
**Prerequisites:** [Required knowledge/setup]

---

## 🎯 Overview
[Process flow diagram]
[2-3 sentence summary of the process]

---

## ✅ Prerequisites Checklist
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]
- [ ] [Prerequisite 3]

---

## 📋 Step-by-Step Process

### Step 1: [Step Name]
[Detailed instructions]
[Supporting diagrams if needed]

**Expected Outcome:** [What should happen]
**Troubleshooting:** [Common issues and solutions]

### Step 2: [Step Name]
[Continue pattern...]

---

## 🔧 Advanced Configuration
[Optional advanced steps]

---

## ❓ Troubleshooting
[Common issues and solutions]

---

## 📚 Additional Resources
[Links to related documentation]
```

#### For **Overview/Strategic Documentation**:

```markdown
# [Title] - Strategic Overview

**Audience:** [Stakeholders]
**Last Updated:** [Date]

---

## 🎯 Executive Summary
[High-level system overview diagram]
[Mission/vision statement or key value proposition]

---

## 🏢 Organizational Context
[Organizational charts or stakeholder diagrams if applicable]
[Background and strategic context]

---

## 🏗️ System Overview
[System architecture diagram]
[High-level component descriptions]

---

## 📊 Key Metrics & KPIs
[Dashboard or metrics diagrams]
[Important measurements and targets]

---

## 🛣️ Roadmap & Strategy
[Timeline or roadmap diagrams]
[Strategic direction and future plans]

---

## 👥 Stakeholders & Contacts
[Contact information and responsibilities]
```

### Step 7: Diagram Integration Guidelines

#### **Placement Principles:**
1. **Context Before Detail:** Place overview diagrams before detailed explanations
2. **Progressive Disclosure:** Start with high-level, drill down to specifics
3. **Visual Breaks:** Use diagrams to break up large text sections
4. **Reference Positioning:** Place technical diagrams near related content

#### **Sizing Guidelines:**
- **System Architecture:** Full-width, prominent
- **Process Flows:** 75% width, centered
- **Technical Details:** 50% width, inline with text
- **Supporting Diagrams:** 25-50% width, floating right

---

## Phase 4: Guru Card Generation

### Step 8: Guru Card Creation Process

Use the Guru MCP tools to create the card:

```javascript
// 1. Create the card
mcp_Zapier_guru_create_card({
  instructions: "Create a new Guru card for [document title] with content structured for [document type]",
  title: "[Document Title]",
  content: "[Formatted content with embedded diagrams]",
  collection_id: "[appropriate collection ID]"
})

// 2. Add relevant tags
mcp_Zapier_guru_add_tag_to_card({
  instructions: "Add relevant tags for categorization and discovery",
  card_id: "[generated card ID]",
  tag_id: "[relevant tag IDs]"
})

// 3. Verify the card if ready
mcp_Zapier_guru_verify_card({
  instructions: "Verify the card content is accurate and complete",
  card_id: "[generated card ID]"
})
```

### Step 9: Content Formatting for Guru

#### **HTML Structure for Guru Cards:**
- Use semantic HTML classes that match existing Guru card patterns
- Include proper heading hierarchy (`h1`, `h2`, `h3`)
- Use appropriate list structures (`ul`, `ol`)
- Include dividers (`hr`) between major sections
- Format code snippets with `<code>` tags
- Use highlighting for important information

#### **Image Embedding:**
Replace mermaid code blocks with:
```html
<span class="ghq-card-content__image-container">
  <img class="ghq-card-content__image" 
       src="./diagrams/[diagram_name].png" 
       alt="[Descriptive alt text]" 
       data-ghq-card-content-type="IMAGE" 
       style="width:[appropriate width]px">
</span>
```

#### **Cross-Reference Links:**
```html
<a class="ghq-card-content__guru-card" 
   href="[guru card URL]" 
   data-ghq-guru-card-id="[card ID]" 
   data-ghq-card-content-type="GURU_CARD">
   [Link text]
</a>
```

---

## Phase 5: Quality Assurance

### Step 10: Content Review Checklist

#### **Structure Review:**
- [ ] Content type correctly identified
- [ ] Appropriate structure template used
- [ ] Logical information hierarchy
- [ ] Clear section breaks and organization

#### **Diagram Review:**
- [ ] All mermaid diagrams converted successfully
- [ ] Diagrams placed appropriately for content flow
- [ ] Image alt text is descriptive
- [ ] Diagram sizing appropriate for content

#### **Content Review:**
- [ ] Information accuracy maintained from source
- [ ] Technical details preserved correctly
- [ ] Action items clearly marked
- [ ] Links and references updated appropriately

#### **Guru-Specific Review:**
- [ ] HTML formatting matches Guru patterns
- [ ] Appropriate tags applied
- [ ] Verification settings configured
- [ ] Collection assignment correct

---

## Advanced Scenarios

### Multi-Document Processing
For complex documentation that spans multiple source documents:
1. Create a master overview card
2. Generate specialized detail cards
3. Cross-link between related cards
4. Maintain consistent diagram library
5. Use consistent tagging strategy

### Version Control Integration
When source documents are frequently updated:
1. Implement change detection
2. Update only modified sections
3. Maintain diagram version consistency
4. Update cross-references automatically
5. Trigger re-verification when needed

### Collaborative Document Management
For team-maintained documentation:
1. Assign appropriate verifiers based on content type
2. Set appropriate verification schedules
3. Configure notification preferences
4. Enable collaborative editing where appropriate

---

## Troubleshooting

### Common Issues and Solutions

#### **Mermaid Conversion Failures:**
- Check mermaid syntax validity
- Verify theme compatibility
- Ensure output directory exists
- Try alternative mermaid themes

#### **Guru Card Creation Issues:**
- Verify collection permissions
- Check content length limits
- Validate HTML formatting
- Ensure proper authentication

#### **Diagram Display Problems:**
- Verify image file paths
- Check image file accessibility
- Validate HTML image syntax
- Confirm appropriate sizing

---

## Best Practices Summary

1. **Always analyze document type first** - this drives all subsequent decisions
2. **Convert all diagrams before content generation** - ensures availability during card creation
3. **Plan diagram placement strategically** - context before detail, visual breaks for readability
4. **Use consistent formatting patterns** - maintain professional appearance and usability
5. **Include comprehensive metadata** - facilitates discovery and maintenance
6. **Test all links and references** - ensure Guru card functionality
7. **Plan for maintenance** - consider update frequency and ownership

---

## Template Quick Reference

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

This comprehensive guide ensures consistent, high-quality Guru card generation from any type of context document while optimizing the integration of visual diagrams for maximum clarity and usability. 