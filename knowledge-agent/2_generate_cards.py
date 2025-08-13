#!/usr/bin/env python3
"""
Intelligent Guru Card Generator
Processes consolidated markdown file and generates Guru cards following system guidelines.
"""

import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from openai import AsyncOpenAI
import argparse

@dataclass
class GuruCardGeneration:
    """Represents a generated Guru card with metadata"""
    title: str
    target_audience: str
    primary_purpose: str
    priority_level: str
    estimated_complexity: str
    card_type: str  # "technical", "process", "overview", "troubleshooting"
    content: str
    evidence_sources: List[str]
    confidence_score: float
    dependencies: List[str]
    suggested_collection: str
    suggested_board: str
    generation_timestamp: str
    token_usage: Dict[str, int]

class IntelligentCardGenerator:
    """Generates Guru cards from consolidated source of truth using LLM intelligence"""
    
    def __init__(self, api_key: str, output_dir: str = "./generated_cards"):
        self.api_key = api_key
        self.client = AsyncOpenAI(api_key=api_key)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Load Guru system guidelines
        self.guru_guidelines = self._load_guru_guidelines()
        self.success_criteria = self._load_success_criteria()
    
    def _load_guru_guidelines(self) -> str:
        """Load Guru system guidelines from the master instructions"""
        guidelines_path = Path("agent/MAIN/UNIFIED_GURU_SYSTEM_MASTER_INSTRUCTIONS.md")
        if guidelines_path.exists():
            return guidelines_path.read_text(encoding='utf-8')
        else:
            return """
            CRITICAL CARD NAMING REQUIREMENTS:
            - Card titles MUST start with: Who, What, Where, Why, OR How
            - Focus on PAIN addressed, NOT audience or purpose
            - Examples: "HOW to Deploy the API", "WHAT are our Database Dependencies"
            
            USER CATEGORIES:
            - Tech Reader - NEW HIRE: Needs to learn from scratch
            - Tech Reader - YOUR TEAM: Knows their domain, building frequently 
            - Tech Reader - OTHER TEAM: Knows their domain, specific integration need
            - Biz Team Reader: Needs direct answers, no technical details
            - YOU (Expert): Deep knowledge, building advanced features
            """
    
    def _load_success_criteria(self) -> str:
        """Load success criteria from master instructions"""
        return """
        GURU CARD SUCCESS CRITERIA:
        - Must enable immediate action or decision-making
        - Should become reusable "source of truth" that teammates share
        - Scoped like a microservice (one topic, one intent)
        - Must age well with clear ownership for updates
        
        GURU BOARD SUCCESS CRITERIA:
        - Reflects functional job-to-be-done
        - Easily navigable with action-oriented titles
        - Go-to resource for complete workflows
        - Supports both onboarding AND experts
        
        GURU SYSTEM SUCCESS CRITERIA:
        - First place someone checks and it delivers
        - Reduces internal bottlenecks and knowledge gaps
        - Enables AI augmentation through good structure
        - Keeps organization safe with consistent processes
        """
    
    async def process_consolidated_file(self, consolidated_file_path: Path) -> List[GuruCardGeneration]:
        """Process consolidated markdown file and generate Guru cards"""
        print(f"🤖 Processing consolidated file: {consolidated_file_path}")
        
        # Read consolidated content
        consolidated_content = consolidated_file_path.read_text(encoding='utf-8')
        
        # Generate cards using LLM
        cards = await self._generate_cards_from_content(consolidated_content)
        
        # Save generated cards
        self._save_generated_cards(cards)
        
        print(f"✅ Generated {len(cards)} Guru cards")
        return cards
    
    async def _generate_cards_from_content(self, content: str) -> List[GuruCardGeneration]:
        """Use LLM to generate Guru cards from consolidated content"""
        
        # Create comprehensive prompt with guidelines
        prompt = self._create_card_generation_prompt(content)
        
        # Call LLM
        response = await self._call_llm_for_generation(prompt)
        
        # Parse and structure response
        return self._parse_card_generation_response(response)
    
    def _create_card_generation_prompt(self, content: str) -> str:
        """Create comprehensive LLM prompt for card generation"""
        
        # Calculate available space for content (leaving room for prompt structure)
        max_prompt_tokens = 120000  # GPT-4 Turbo context limit
        prompt_structure_estimate = 3000  # Estimated tokens for prompt structure
        available_content_tokens = max_prompt_tokens - prompt_structure_estimate
        
        # Rough estimate: 4 characters per token
        max_content_chars = available_content_tokens * 4
        
        # Use full content if it fits, otherwise truncate with warning
        if len(content) > max_content_chars:
            print(f"⚠️ Content too large ({len(content)} chars), truncating to {max_content_chars} chars")
            content_to_use = content[:max_content_chars]
        else:
            print(f"✅ Using full consolidated content ({len(content)} characters)")
            content_to_use = content
        
        return f"""
You are an expert technical documentation specialist creating Guru cards for a development team.

SYSTEM GUIDELINES:
{self.guru_guidelines}

SUCCESS CRITERIA:
{self.success_criteria}

YOUR TASK:
Analyze the consolidated changes below and generate comprehensive Guru cards that solve real team problems.

CONSOLIDATED CONTENT:
{content_to_use}

CRITICAL REQUIREMENTS:

1. CARD NAMING (MANDATORY):
   - MUST start with: Who | What | Where | Why | How
   - Focus on PAIN addressed, NOT audience or purpose
   - Examples: "HOW to Deploy the Backend API", "WHAT are our CSAM Detection Dependencies"

2. USER-FOCUSED DESIGN:
   - Each card solves a specific pain point
   - Target one of these user types:
     * Tech Reader - NEW HIRE (learning from scratch)
     * Tech Reader - YOUR TEAM (building on existing knowledge)
     * Tech Reader - OTHER TEAM (specific integration need)
     * Biz Team Reader (direct answers, no technical details)
     * YOU (expert needing advanced details)

3. SUCCESS-ORIENTED CONTENT:
   - Enable immediate action/decision-making
   - Become reusable "source of truth"
   - Scoped like microservice (one topic, one intent)
   - Age well with clear maintenance needs

4. EVIDENCE-BASED GENERATION:
   - Only create cards supported by evidence in the content
   - Reference specific changes, files, or processes mentioned
   - Avoid assumptions not supported by the data

5. PRACTICAL STRUCTURE:
   - Quick answer for people in hurry
   - Step-by-step implementation details
   - Troubleshooting for common issues
   - Links to related information

ANALYSIS INSTRUCTIONS:

Step 1: Identify PAIN POINTS from the changes
- What problems would these changes create for team members?
- What questions would people ask about these changes?
- What workflows might be affected?

Step 2: Determine CARD OPPORTUNITIES
- Which pain points justify a dedicated Guru card?
- What knowledge gaps exist that cards could fill?
- Which processes need documentation?

Step 3: Design CARD SPECIFICATIONS
- Create clear, pain-focused titles starting with Who/What/Where/Why/How
- Identify target user type and their specific need
- Define success criteria (what should someone accomplish?)

Step 4: Generate CARD CONTENT
- Structure for immediate usability
- Include evidence from the consolidated content
- Provide actionable steps and examples
- Add troubleshooting guidance

FORMAT YOUR RESPONSE AS JSON:
{{
  "analysis_summary": {{
    "total_changes_analyzed": "number",
    "primary_themes": ["theme1", "theme2", "theme3"],
    "affected_workflows": ["workflow1", "workflow2"],
    "key_pain_points": ["pain1", "pain2", "pain3"]
  }},
  "generated_cards": [
    {{
      "title": "HOW to [specific action/task]",
      "target_audience": "Tech Reader - NEW HIRE",
      "primary_purpose": "Solve the specific pain of [exactly what problem this addresses]",
      "priority_level": "critical|important|nice-to-have",
      "estimated_complexity": "simple|medium|complex",
      "card_type": "technical|process|overview|troubleshooting",
      "content": "FULL CARD CONTENT in markdown format with:\n# Title\n## Quick Answer\n## Implementation Steps\n## Troubleshooting\n## Related Information",
      "evidence_sources": ["specific references to consolidated content"],
      "confidence_score": 0.85,
      "dependencies": ["other cards that should exist first"],
      "suggested_collection": "Engineering|Product|Operations|etc",
      "suggested_board": "specific board name based on workflow",
      "reasoning": "Why this card is needed and how it serves users"
    }}
  ],
  "recommendations": {{
    "high_priority_cards": ["card titles that should be created first"],
    "content_gaps": ["areas needing more information"],
    "suggested_workflows": ["end-to-end processes that need card sequences"]
  }}
}}

QUALITY CHECKLIST - Each card must:
✅ Solve a real problem evidenced in the consolidated content
✅ Have title starting with Who/What/Where/Why/How
✅ Target specific user type with clear pain point
✅ Provide actionable steps someone can follow immediately
✅ Include troubleshooting for likely issues
✅ Reference specific evidence from the changes
✅ Enable successful task completion within reasonable time

Generate cards that will genuinely help your teammates work more effectively!
"""
    
    async def _call_llm_for_generation(self, prompt: str) -> Dict[str, Any]:
        """Call OpenAI API for card generation"""
        
        response = await self.client.chat.completions.create(
            model="gpt-4-turbo-preview",  # Use most capable model
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert technical documentation specialist with deep understanding of developer workflows and knowledge management systems. Your goal is to create genuinely useful Guru cards that solve real problems for development teams."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            temperature=0.1,  # Low temperature for consistency
            max_tokens=8000,  # Allow for detailed responses
            response_format={"type": "json_object"}  # Ensure JSON response
        )
        
        content = response.choices[0].message.content
        token_usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
        
        try:
            parsed_response = json.loads(content)
            parsed_response["token_usage"] = token_usage
            return parsed_response
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing LLM response as JSON: {e}")
            print(f"Raw response: {content[:500]}...")
            return {
                "generated_cards": [],
                "analysis_summary": {"error": f"Failed to parse JSON: {e}"},
                "token_usage": token_usage
            }
    
    def _parse_card_generation_response(self, response: Dict[str, Any]) -> List[GuruCardGeneration]:
        """Parse LLM response into structured card objects"""
        
        cards = []
        
        if "generated_cards" not in response:
            print("⚠️ No cards found in LLM response")
            return cards
        
        for card_data in response["generated_cards"]:
            try:
                card = GuruCardGeneration(
                    title=card_data.get("title", "Untitled Card"),
                    target_audience=card_data.get("target_audience", "Unknown"),
                    primary_purpose=card_data.get("primary_purpose", "Unknown purpose"),
                    priority_level=card_data.get("priority_level", "nice-to-have"),
                    estimated_complexity=card_data.get("estimated_complexity", "medium"),
                    card_type=card_data.get("card_type", "general"),
                    content=card_data.get("content", "No content provided"),
                    evidence_sources=card_data.get("evidence_sources", []),
                    confidence_score=card_data.get("confidence_score", 0.5),
                    dependencies=card_data.get("dependencies", []),
                    suggested_collection=card_data.get("suggested_collection", "General"),
                    suggested_board=card_data.get("suggested_board", "Miscellaneous"),
                    generation_timestamp=datetime.now().isoformat(),
                    token_usage=response.get("token_usage", {})
                )
                cards.append(card)
            except Exception as e:
                print(f"⚠️ Error parsing card data: {e}")
                continue
        
        return cards
    
    def _save_generated_cards(self, cards: List[GuruCardGeneration]):
        """Save generated cards to files"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save as JSON for programmatic access
        json_file = self.output_dir / f"generated_cards_{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump([asdict(card) for card in cards], f, indent=2, ensure_ascii=False)
        
        # Save as markdown for human review
        md_file = self.output_dir / f"generated_cards_{timestamp}.md"
        with open(md_file, 'w', encoding='utf-8') as f:
            self._write_cards_markdown(f, cards)
        
        print(f"💾 Saved generated cards:")
        print(f"   JSON: {json_file}")
        print(f"   Markdown: {md_file}")
    
    def _write_cards_markdown(self, f, cards: List[GuruCardGeneration]):
        """Write cards in readable markdown format"""
        f.write("# Generated Guru Cards\n\n")
        f.write(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Total Cards**: {len(cards)}\n\n")
        f.write("---\n\n")
        
        # Summary by priority
        f.write("## Priority Summary\n\n")
        priority_counts = {}
        for card in cards:
            priority_counts[card.priority_level] = priority_counts.get(card.priority_level, 0) + 1
        
        for priority in ["critical", "important", "nice-to-have"]:
            count = priority_counts.get(priority, 0)
            f.write(f"- **{priority.title()}**: {count} cards\n")
        
        f.write("\n---\n\n")
        
        # Cards by priority
        for priority in ["critical", "important", "nice-to-have"]:
            priority_cards = [c for c in cards if c.priority_level == priority]
            if priority_cards:
                f.write(f"## {priority.title()} Priority Cards\n\n")
                
                for i, card in enumerate(priority_cards, 1):
                    f.write(f"### {i}. {card.title}\n\n")
                    f.write(f"**Audience**: {card.target_audience}\n")
                    f.write(f"**Purpose**: {card.primary_purpose}\n")
                    f.write(f"**Complexity**: {card.estimated_complexity}\n")
                    f.write(f"**Type**: {card.card_type}\n")
                    f.write(f"**Collection**: {card.suggested_collection}\n")
                    f.write(f"**Board**: {card.suggested_board}\n")
                    f.write(f"**Confidence**: {card.confidence_score:.2f}\n\n")
                    
                    if card.evidence_sources:
                        f.write("**Evidence Sources**:\n")
                        for source in card.evidence_sources:
                            f.write(f"- {source}\n")
                        f.write("\n")
                    
                    if card.dependencies:
                        f.write("**Dependencies**:\n")
                        for dep in card.dependencies:
                            f.write(f"- {dep}\n")
                        f.write("\n")
                    
                    f.write("**Card Content**:\n")
                    f.write("```markdown\n")
                    f.write(card.content)
                    f.write("\n```\n\n")
                    f.write("---\n\n")
    
    def generate_implementation_plan(self, cards: List[GuruCardGeneration]) -> Dict[str, Any]:
        """Generate implementation plan for Phase 2"""
        
        # Sort cards by priority and dependencies
        critical_cards = [c for c in cards if c.priority_level == "critical"]
        important_cards = [c for c in cards if c.priority_level == "important"]
        
        # Identify foundation cards (no dependencies)
        foundation_cards = [c for c in critical_cards if not c.dependencies]
        
        plan = {
            "phase_2_recommendations": {
                "start_with": [c.title for c in foundation_cards[:3]],  # Top 3 foundation cards
                "high_priority_sequence": [c.title for c in critical_cards],
                "suggested_collections": list(set(c.suggested_collection for c in cards)),
                "estimated_effort": {
                    "critical_cards": len(critical_cards),
                    "important_cards": len(important_cards),
                    "total_estimated_hours": len(critical_cards) * 2 + len(important_cards) * 1.5
                }
            },
            "sme_assignments": {
                collection: [c.title for c in cards if c.suggested_collection == collection]
                for collection in set(c.suggested_collection for c in cards)
            },
            "quality_checklist": [
                "Verify technical accuracy with SME",
                "Test all code examples and procedures",
                "Ensure card titles follow Who/What/Where/Why/How pattern",
                "Confirm cards solve real team pain points",
                "Add cross-references to related cards",
                "Set up verification schedule for content freshness"
            ]
        }
        
        return plan

async def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="Intelligent Guru Card Generator")
    parser.add_argument("--api-key", required=True, help="OpenAI API key")
    parser.add_argument("--consolidated-file", required=True, help="Path to consolidated changes file")
    parser.add_argument("--output-dir", default="./generated_cards", help="Output directory")
    
    args = parser.parse_args()
    
    # Initialize generator
    generator = IntelligentCardGenerator(args.api_key, args.output_dir)
    
    # Process consolidated file
    consolidated_file = Path(args.consolidated_file)
    if not consolidated_file.exists():
        print(f"❌ Consolidated file not found: {consolidated_file}")
        return
    
    print("🚀 Starting intelligent card generation...")
    
    # Generate cards
    cards = await generator.process_consolidated_file(consolidated_file)
    
    # Generate implementation plan
    plan = generator.generate_implementation_plan(cards)
    
    # Save implementation plan
    plan_file = generator.output_dir / f"implementation_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(plan_file, 'w', encoding='utf-8') as f:
        json.dump(plan, f, indent=2)
    
    print(f"📋 Implementation plan saved: {plan_file}")
    print(f"✅ Card generation complete! Ready for Phase 2 engineer collaboration.")

if __name__ == "__main__":
    asyncio.run(main()) 