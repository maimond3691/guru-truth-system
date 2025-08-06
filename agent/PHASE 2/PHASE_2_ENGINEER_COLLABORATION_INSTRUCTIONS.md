# Phase 2: Engineer-AI Collaborative Card Development Instructions

## 🎯 Purpose
These instructions guide the iterative process where engineers work with AI to create comprehensive, accurate Guru cards. The AI must continue asking clarifying questions until the engineer is completely satisfied with the result.

---

## 🔄 Collaboration Workflow

### **Pre-Development Setup**
✅ Engineer has selected a specific card from Phase 1 inventory  
✅ Engineer is positioned in relevant codebase/documentation area  
✅ AI has access to all context-gathering tools  

---

## 🤖 AI Responsibilities & Instructions

### **Critical Success Principles:**
1. **NEVER assume you understand - always verify**
2. **Continue asking clarifying questions until engineer says "perfect"**
3. **Prioritize accuracy over speed**
4. **Focus on solving the specific user problem, not just documenting features**
5. **Test your understanding through examples and edge cases**

### **Step 1: Context Gathering (AI-Driven)**

**AI Action:** Use all available tools to gather comprehensive context:

```bash
# Search for relevant code patterns
codebase_search(query="[specific functionality]", target_directories=["relevant/path"])

# Find configuration examples  
grep_search(query="[config patterns]", include_pattern="*.json,*.yaml,*.env*")

# Read relevant documentation
read_file(target_file="README.md")
read_file(target_file="docs/[relevant-section].md")
```

**AI Must Ask:**
- "I found these code patterns and configurations. Are there other areas I should examine?"
- "What specific scenarios or edge cases should this card address?"
- "Who is the primary audience, and what's their current knowledge level?"
- "What's the most common mistake people make with this system?"

### **Step 2: Document Type Classification (AI-Driven)**

**AI Analysis:** Based on gathered context, classify the card type:

#### **A. Technical Documentation/API Reference**
*Indicators: Code examples, API endpoints, system integration*

#### **B. Process/Tutorial Documentation** 
*Indicators: Step-by-step workflows, procedures, setup guides*

#### **C. Overview/Strategic Documentation**
*Indicators: System architecture, high-level concepts, decision frameworks*

#### **D. Troubleshooting/Problem-Solving Documentation**
*Indicators: Error scenarios, diagnostic steps, common issues*

**AI Must Ask:**
- "Based on the context, I believe this is [TYPE] documentation. Is this correct?"
- "What specific outcome should someone achieve after reading this card?"
- "What would success look like for the person using this information?"

### **Step 3: Card Title Creation & Pain Identification (AI-Driven)**

**AI Action:** Create the card title following strict naming conventions and identify specific user pain.

#### **CRITICAL: Card Naming SOP**

**Step 3a: Identify User Pain**
- **User Category**: Determine which user type from the 5 categories:
  - Tech Reader - NEW HIRE (learning from scratch)
  - Tech Reader - YOUR TEAM (building on existing knowledge)  
  - Tech Reader - OTHER TEAM (specific integration need)
  - Biz Team Reader (need direct answers, no technical details)
  - YOU (expert needing advanced details)

- **Specific Pain**: What exact problem are they experiencing?
- **Context**: When/where does this pain occur?
- **Current State**: What happens when they can't solve this?

**Step 3b: Create Card Title**
**MANDATORY RULE**: First word must be **Who** | **What** | **Where** | **Why** | **How**

**Focus on PAIN addressed, NOT audience or purpose**:
- ❌ **BAD**: "Frontend Team - Authentication Setup Guide"
- ✅ **GOOD**: "HOW to Set Up Authentication"
- ❌ **BAD**: "Backend API - Database Connection Tutorial"  
- ✅ **GOOD**: "HOW to Connect to the Database"

**AI Must Ask:**
- "I've identified the user as [USER TYPE] with the pain: [SPECIFIC PAIN]. Is this accurate?"
- "I propose the title: '[TITLE]'. Does this immediately communicate the pain being solved?"
- "Would someone search for this exact phrase when experiencing this problem?"
- "Does the title start with Who/What/Where/Why/How and focus on the pain, not the audience?"

### **Step 4: Template Selection & Customization (AI-Driven)**

**AI Action:** Select appropriate template and customize based on specific needs.

#### **For Technical Documentation:**
```markdown
# HOW to [Action/Task] - Technical Reference

**Audience:** [Specific user type from 5 categories]
**Pain Addressed:** [Exact problem being solved]  
**Success Criteria:** [What you'll accomplish in [X] minutes]

---

## 🎯 Quick Answer
[The essential answer in 1-2 sentences - for people in a hurry]

## 🏗️ System Context
[Generated mermaid diagram showing how this fits in the larger system]
[Brief explanation of key relationships]

## 🚀 Immediate Solution
[Copy-paste ready code/commands that work for 80% of cases]

## 📋 Complete Implementation
[Detailed step-by-step with all options and configurations]

## 🔧 Advanced Configuration
[Edge cases, customization options, integration points]

## ❓ Troubleshooting
[Common problems with specific solutions]

## 🔗 Related Information
[Links to other Guru cards and external resources]
```

**AI Must Ask:**
- "I've selected the [TEMPLATE] template. Does this structure serve your audience's needs?"
- "What would be the most common entry point for someone reading this card?"
- "Should we prioritize breadth of coverage or depth of detail?"

### **Step 5: Content Development (Iterative)**

**Round 1: Initial Draft**

**AI Action:** Create complete first draft using gathered context.

**AI Must Ask:**
- "I've created an initial draft. What critical information am I missing?"
- "Are there specific examples from your experience that would be helpful?"
- "What questions would a new team member still have after reading this?"

**Round 2+: Iterative Refinement**

**AI Action:** Refine based on engineer feedback, continue asking questions:

**Technical Accuracy Questions:**
- "Walk me through how you would actually implement this in practice"
- "What happens if [specific edge case scenario]?"
- "Are there any gotchas or common misconceptions I should address?"

**Audience Appropriateness Questions:**
- "Does this assume too much background knowledge?"
- "What would trip up someone who's new to [specific technology/process]?"
- "Should I include more context about why this approach was chosen?"

**Completeness Questions:**
- "What related tasks would someone need to do before/after this?"
- "Are there prerequisites I haven't mentioned?"
- "What would make this information actionable faster?"

**Clarity Questions:**
- "Which section would be confusing for someone reading this at 9 PM?"
- "Should I reorganize the information flow?"
- "Are the examples realistic and relevant?"

### **Step 6: Knowledge Validation Quiz (AI-Driven)**

**AI Action:** Test your understanding by asking the engineer detailed questions:

**Process Validation:**
- "If someone followed step 3 and got [specific error], what would that indicate?"
- "How would you verify that the setup is working correctly?"
- "What's the difference between [approach A] and [approach B] in this context?"

**Edge Case Understanding:**
- "What happens in [specific environmental condition]?"
- "How does this behave when [specific constraint exists]?"
- "What would be the warning signs that this needs to be updated?"

**Practical Application:**
- "Give me a scenario where someone might need to deviate from these instructions"
- "What would be the next logical task after completing this?"
- "How does this integrate with [related system/process]?"

**AI Must Continue Until:** Engineer confirms "You clearly understand this topic as well as I do."

### **Step 7: Mermaid Diagram Generation (AI-Driven)**

**AI Action:** Create relevant diagrams to enhance understanding:

```mermaid
# Example: System Context Diagram
graph TB
    subgraph "User Journey"
        A[Current State] --> B[Problem/Need]
        B --> C[Using This Card] 
        C --> D[Desired Outcome]
    end
    
    subgraph "Technical Context"
        E[System Component] --> F[Integration Point]
        F --> G[Dependencies]
    end
    
    C --> E
```

**AI Must Ask:**
- "I've created a diagram showing [concept]. Would a different visual representation be more helpful?"
- "Are there important relationships or flows I haven't captured?"
- "Should this diagram focus more on [technical details] or [process flow]?"

### **Step 8: Final Validation (Engineer-Driven)**

**Engineer Checklist:**
- [ ] This card solves a real problem I've seen people struggle with
- [ ] Someone could follow this and be successful on their first try  
- [ ] The information is accurate and current
- [ ] Nothing critical is missing
- [ ] The format helps people find answers quickly
- [ ] Examples are realistic and relevant

**AI Final Questions:**
- "On a scale of 1-10, how confident are you that this card will help your teammates?"
- "If you had to improve one thing about this card, what would it be?"
- "Is this exactly what the team needs, or should we iterate further?"

**Continue Iteration Until:** Engineer responds with complete satisfaction and approval.

---

## 🔧 AI Decision Framework

### **When to Ask More Questions:**
- Engineer provides vague or uncertain responses
- Technical details seem incomplete or inconsistent
- Audience needs aren't clearly defined
- Success criteria are ambiguous
- Examples don't match real-world usage

### **When to Move Forward:**
- Engineer provides specific, confident answers
- Technical accuracy is verified through multiple sources
- Content serves a clear user need
- All success criteria are met
- Engineer explicitly approves the content

### **Red Flags to Address:**
- 🚫 "This is probably right" → Ask for verification
- 🚫 "Users should figure it out" → Ask for specific guidance
- 🚫 "It's complicated" → Ask for breakdown into simpler steps
- 🚫 "That's advanced" → Ask if it should be included or referenced
- 🚫 "I think this works" → Ask for testing or verification

---

## 📋 Quality Checkpoints

### **After Each Iteration:**
- [ ] Does this answer a specific question completely?
- [ ] Can someone achieve success within the promised timeframe?
- [ ] Are examples copy-paste ready and tested?
- [ ] Is the cognitive load appropriate for the audience?
- [ ] Would this reduce interruptions and questions?

### **Before Final Approval:**
- [ ] SME has verified technical accuracy
- [ ] Content matches Phase 1 success definitions
- [ ] All cross-references are valid
- [ ] Diagrams enhance rather than complicate understanding
- [ ] Card title and content align with user search terms

---

## 🎯 Success Metrics

**Card Development Success:**
- Engineer approval in ≤ 5 iterations
- 0 technical inaccuracies identified in SME review
- Content enables task completion within stated timeframe
- Reduces related questions by ≥ 80%

**AI Performance Success:**
- Asks meaningful clarifying questions each round
- Demonstrates growing understanding through examples
- Identifies edge cases and integration points
- Maintains focus on user outcomes vs. feature documentation

Remember: The goal is not just to document what exists, but to create a resource that genuinely helps people solve problems faster and more effectively. 