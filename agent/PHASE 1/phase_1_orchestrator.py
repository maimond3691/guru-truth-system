#!/usr/bin/env python3
"""
Phase 1 Orchestrator: Organizational Discovery & Planning
Automates the systematic analysis of all data sources to determine what Guru cards need to exist.
"""

import json
import asyncio
import aiohttp
import csv
import os
from pathlib import Path
from typing import List, Dict, Any, Set, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import argparse
from analyzer import GuruCardAnalyzer

@dataclass
class DataSource:
    """Represents a data source to analyze"""
    name: str
    type: str  # "github_repo", "guru_export", "google_doc", "config_files", etc.
    path: str  # Local path or URL
    priority: str  # "critical", "important", "nice-to-have"
    last_updated: Optional[str] = None
    analysis_status: str = "pending"  # "pending", "analyzing", "complete", "error"

@dataclass 
class CardRequirement:
    """Represents a required Guru card identified through analysis"""
    title: str
    target_audience: str  # Role/persona
    primary_purpose: str  # What question does it answer?
    priority_level: str  # "critical", "important", "nice-to-have"
    data_sources: List[str]  # Where knowledge currently lives
    sme_contact: str  # Who can verify accuracy?
    estimated_complexity: str  # "simple", "medium", "complex"
    dependencies: List[str]  # What other cards must exist first?
    evidence_snippets: List[str]  # Supporting evidence from analysis
    confidence_score: float  # 0.0-1.0 confidence in this requirement
    category: str  # "technical", "process", "overview", "troubleshooting"

@dataclass
class AnalysisResult:
    """Results from analyzing a single data source"""
    data_source: str
    cards_identified: List[CardRequirement]
    knowledge_gaps: List[str]
    repeated_questions: List[str]
    undocumented_processes: List[str]
    token_usage: Dict[str, int]
    analysis_timestamp: str

class Phase1Orchestrator:
    """Orchestrates the complete Phase 1 discovery and planning process"""
    
    def __init__(self, api_key: str, output_dir: str = "./phase1_output"):
        self.api_key = api_key
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Initialize analyzer
        self.analyzer = GuruCardAnalyzer("./guru_cards_export", api_key)
        
        # Data tracking
        self.data_sources: List[DataSource] = []
        self.analysis_results: List[AnalysisResult] = []
        self.card_requirements: List[CardRequirement] = []
        self.organizational_structure = {}
        
        # Create CSV files for tracking
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.data_sources_csv = self.output_dir / f"data_sources_{timestamp}.csv"
        self.card_requirements_csv = self.output_dir / f"card_requirements_{timestamp}.csv"
        self.analysis_log_csv = self.output_dir / f"analysis_log_{timestamp}.csv"
        
        self.init_csv_files()
    
    def init_csv_files(self):
        """Initialize CSV files for tracking progress"""
        # Data sources tracking
        with open(self.data_sources_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['name', 'type', 'path', 'priority', 'last_updated', 'analysis_status'])
        
        # Card requirements tracking
        with open(self.card_requirements_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'title', 'target_audience', 'primary_purpose', 'priority_level',
                'data_sources', 'sme_contact', 'estimated_complexity', 'dependencies',
                'confidence_score', 'category', 'evidence_count'
            ])
        
        # Analysis log
        with open(self.analysis_log_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'data_source', 'timestamp', 'cards_identified', 'knowledge_gaps_found',
                'repeated_questions_found', 'undocumented_processes_found',
                'prompt_tokens', 'completion_tokens', 'total_tokens'
            ])

    async def discover_data_sources(self):
        """Step 1.1: Automatically discover available data sources"""
        print("🔍 Discovering data sources...")
        
        # GitHub repositories (scan current directory structure)
        await self._discover_github_repos()
        
        # Existing Guru cards
        await self._discover_guru_exports()
        
        # Documentation files
        await self._discover_documentation()
        
        # Configuration files
        await self._discover_config_files()
        
        # Tech stack snapshots
        await self._discover_tech_stack()
        
        print(f"📋 Discovered {len(self.data_sources)} data sources")
        self._save_data_sources()

    async def _discover_github_repos(self):
        """Discover GitHub repositories and documentation"""
        current_dir = Path(".")
        
        # Look for git repositories
        if (current_dir / ".git").exists():
            self.data_sources.append(DataSource(
                name="Current Repository",
                type="github_repo",
                path=str(current_dir.absolute()),
                priority="critical"
            ))
        
        # Look for README files
        for readme in current_dir.glob("**/README*"):
            if not any(skip in str(readme) for skip in ["node_modules", ".git", "__pycache__"]):
                self.data_sources.append(DataSource(
                    name=f"README: {readme.parent.name}",
                    type="documentation",
                    path=str(readme),
                    priority="important"
                ))

    async def _discover_guru_exports(self):
        """Discover existing Guru card exports"""
        guru_export_dir = Path("./guru_cards_export")
        if guru_export_dir.exists():
            self.data_sources.append(DataSource(
                name="Existing Guru Cards Export",
                type="guru_export",
                path=str(guru_export_dir),
                priority="critical"
            ))
        
        # Look for processed card files
        for card_file in Path(".").glob("guru_cards_*.json"):
            self.data_sources.append(DataSource(
                name=f"Processed Cards: {card_file.name}",
                type="guru_processed",
                path=str(card_file),
                priority="critical"
            ))

    async def _discover_documentation(self):
        """Discover documentation files"""
        doc_patterns = ["*.md", "*.rst", "*.txt"]
        doc_dirs = ["docs/", "documentation/", "wiki/"]
        
        # Check for documentation directories
        for doc_dir in doc_dirs:
            doc_path = Path(doc_dir)
            if doc_path.exists():
                self.data_sources.append(DataSource(
                    name=f"Documentation Directory: {doc_dir}",
                    type="documentation_dir",
                    path=str(doc_path),
                    priority="important"
                ))
        
        # Find standalone documentation files
        for pattern in doc_patterns:
            for doc_file in Path(".").glob(pattern):
                if not any(skip in str(doc_file) for skip in ["node_modules", ".git"]):
                    self.data_sources.append(DataSource(
                        name=f"Doc: {doc_file.name}",
                        type="documentation",
                        path=str(doc_file),
                        priority="important"
                    ))

    async def _discover_config_files(self):
        """Discover configuration files"""
        config_patterns = [
            "package.json", "requirements.txt", "Pipfile", "poetry.lock",
            "docker-compose*.yml", "Dockerfile*", "*.env*",
            "tsconfig.json", "next.config.js", "tailwind.config.js"
        ]
        
        for pattern in config_patterns:
            for config_file in Path(".").glob(pattern):
                if not any(skip in str(config_file) for skip in ["node_modules", ".git"]):
                    self.data_sources.append(DataSource(
                        name=f"Config: {config_file.name}",
                        type="configuration",
                        path=str(config_file),
                        priority="important"
                    ))

    async def _discover_tech_stack(self):
        """Discover tech stack related files"""
        # Look for deployment and infrastructure files
        infra_patterns = ["vercel.json", "netlify.toml", "*.yml", "*.yaml"]
        
        for pattern in infra_patterns:
            for infra_file in Path(".").glob(pattern):
                if not any(skip in str(infra_file) for skip in ["node_modules", ".git"]):
                    self.data_sources.append(DataSource(
                        name=f"Infrastructure: {infra_file.name}",
                        type="infrastructure",
                        path=str(infra_file),
                        priority="nice-to-have"
                    ))

    async def analyze_data_sources(self):
        """Step 1.2: LLM-driven gap analysis of each data source"""
        print(f"\n🤖 Analyzing {len(self.data_sources)} data sources...")
        
        for i, data_source in enumerate(self.data_sources, 1):
            print(f"📊 Analyzing {i}/{len(self.data_sources)}: {data_source.name}")
            
            try:
                data_source.analysis_status = "analyzing"
                result = await self._analyze_single_source(data_source)
                
                self.analysis_results.append(result)
                data_source.analysis_status = "complete"
                
                # Log progress
                self._log_analysis_result(result)
                
            except Exception as e:
                print(f"❌ Error analyzing {data_source.name}: {e}")
                data_source.analysis_status = "error"
        
        print(f"✅ Analysis complete. Found {sum(len(r.cards_identified) for r in self.analysis_results)} potential cards")

    async def _analyze_single_source(self, data_source: DataSource) -> AnalysisResult:
        """Analyze a single data source using LLM"""
        
        # Read the content based on source type
        content = await self._read_data_source_content(data_source)
        
        # Create analysis prompt
        prompt = self._create_analysis_prompt(data_source, content)
        
        # Call LLM for analysis
        response = await self._call_llm_for_analysis(prompt)
        
        # Parse response into structured result
        return self._parse_analysis_response(data_source.name, response)

    async def _read_data_source_content(self, data_source: DataSource) -> str:
        """Read content from data source based on type"""
        path = Path(data_source.path)
        
        if data_source.type == "documentation":
            return path.read_text(encoding='utf-8', errors='ignore')
        
        elif data_source.type == "configuration":
            return path.read_text(encoding='utf-8', errors='ignore')
        
        elif data_source.type == "guru_processed":
            # Load and summarize guru cards
            with open(path, 'r', encoding='utf-8') as f:
                cards_data = json.load(f)
            
            summary = f"Existing Guru Cards ({len(cards_data)} cards):\n"
            for card in cards_data[:10]:  # Limit to first 10 for analysis
                summary += f"- {card.get('title', 'Untitled')}: {card.get('content', '')[:200]}...\n"
            return summary
        
        elif data_source.type == "documentation_dir":
            # Summarize documentation directory
            summary = f"Documentation directory: {path}\n"
            for doc_file in path.glob("**/*.md"):
                try:
                    content = doc_file.read_text(encoding='utf-8', errors='ignore')
                    summary += f"\n{doc_file.name}:\n{content[:300]}...\n"
                except:
                    continue
            return summary
        
        else:
            return f"Data source type: {data_source.type}\nPath: {data_source.path}"

    def _create_analysis_prompt(self, data_source: DataSource, content: str) -> str:
        """Create LLM prompt for analyzing data source"""
        
        return f"""
You are analyzing a data source to identify what Guru cards need to exist for a development team.

DATA SOURCE: {data_source.name}
TYPE: {data_source.type}
PRIORITY: {data_source.priority}

CONTENT:
{content[:8000]}  # Limit content to prevent token overflow

Based on this data source, identify:

1. REQUIRED GURU CARDS: What specific cards would help team members work effectively with this system/process?

2. KNOWLEDGE GAPS: What information is missing that new team members would need?

3. REPEATED QUESTIONS: What questions would people likely ask about this content?

4. UNDOCUMENTED PROCESSES: What processes are implied but not clearly documented?

CRITICAL CARD NAMING REQUIREMENTS:
- Card titles MUST start with: Who, What, Where, Why, OR How
- Focus on PAIN addressed, NOT audience or purpose
- Examples: "HOW to Deploy the API", "WHAT are our Database Dependencies", "WHERE to Find Error Logs"

USER CATEGORIES (identify which applies):
- Tech Reader - NEW HIRE: Needs to learn from scratch, one-time learning
- Tech Reader - YOUR TEAM: Knows their domain, building frequently 
- Tech Reader - OTHER TEAM: Knows their domain, specific integration need
- Biz Team Reader: Needs direct answers, no technical details
- YOU (Expert): Deep knowledge, building advanced features

For each potential Guru card, provide:
- Title (MUST start with Who/What/Where/Why/How and address specific pain)
- Target Audience (one of the 5 user categories above)
- Primary Purpose (what specific pain/problem it solves)
- Priority Level (critical/important/nice-to-have)
- Estimated Complexity (simple/medium/complex)
- Evidence (specific examples from the content that support this need)

Format your response as JSON:
{{
  "cards_identified": [
    {{
      "title": "HOW to configure X for Y",
      "target_audience": "Tech Reader - NEW HIRE",
      "primary_purpose": "Solve the pain of not knowing how to set up X when Y condition exists",
      "priority_level": "critical",
      "estimated_complexity": "medium",
      "evidence": ["Specific quote or reference from content"],
      "category": "technical"
    }}
  ],
  "knowledge_gaps": ["Gap 1", "Gap 2"],
  "repeated_questions": ["Question 1", "Question 2"],
  "undocumented_processes": ["Process 1", "Process 2"]
}}
"""

    async def _call_llm_for_analysis(self, prompt: str) -> Dict[str, Any]:
        """Call OpenAI API for analysis"""
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=self.api_key)
        
        response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert technical documentation analyst helping identify knowledge management needs."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=4000
        )
        
        # Parse JSON response
        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # If JSON parsing fails, return structured error
            return {
                "cards_identified": [],
                "knowledge_gaps": [f"Failed to parse analysis for this source: {content[:200]}"],
                "repeated_questions": [],
                "undocumented_processes": []
            }

    def _parse_analysis_response(self, source_name: str, response: Dict[str, Any]) -> AnalysisResult:
        """Parse LLM response into AnalysisResult"""
        
        cards = []
        for card_data in response.get("cards_identified", []):
            card = CardRequirement(
                title=card_data.get("title", ""),
                target_audience=card_data.get("target_audience", ""),
                primary_purpose=card_data.get("primary_purpose", ""),
                priority_level=card_data.get("priority_level", "nice-to-have"),
                data_sources=[source_name],
                sme_contact="TBD",  # Will be filled in human review
                estimated_complexity=card_data.get("estimated_complexity", "medium"),
                dependencies=[],  # Will be filled in later analysis
                evidence_snippets=card_data.get("evidence", []),
                confidence_score=0.8,  # Initial confidence
                category=card_data.get("category", "general")
            )
            cards.append(card)
        
        return AnalysisResult(
            data_source=source_name,
            cards_identified=cards,
            knowledge_gaps=response.get("knowledge_gaps", []),
            repeated_questions=response.get("repeated_questions", []),
            undocumented_processes=response.get("undocumented_processes", []),
            token_usage={"prompt": 0, "completion": 0, "total": 0},  # Would need to extract from API response
            analysis_timestamp=datetime.now().isoformat()
        )

    def consolidate_card_requirements(self):
        """Step 1.3: Build comprehensive card inventory"""
        print("\n📋 Consolidating card requirements...")
        
        # Collect all cards from analysis results
        all_cards = []
        for result in self.analysis_results:
            all_cards.extend(result.cards_identified)
        
        # Group similar cards and deduplicate
        consolidated_cards = self._deduplicate_cards(all_cards)
        
        # Enhance with additional metadata
        self.card_requirements = self._enhance_card_metadata(consolidated_cards)
        
        print(f"📊 Consolidated to {len(self.card_requirements)} unique card requirements")
        self._save_card_requirements()

    def _deduplicate_cards(self, cards: List[CardRequirement]) -> List[CardRequirement]:
        """Remove duplicate cards and merge similar ones"""
        # Simple deduplication by title similarity
        unique_cards = {}
        
        for card in cards:
            # Normalize title for comparison
            normalized_title = card.title.lower().strip()
            
            if normalized_title in unique_cards:
                # Merge with existing card
                existing = unique_cards[normalized_title]
                existing.data_sources.extend(card.data_sources)
                existing.evidence_snippets.extend(card.evidence_snippets)
                existing.confidence_score = max(existing.confidence_score, card.confidence_score)
            else:
                unique_cards[normalized_title] = card
        
        return list(unique_cards.values())

    def _enhance_card_metadata(self, cards: List[CardRequirement]) -> List[CardRequirement]:
        """Add additional metadata to cards"""
        for card in cards:
            # Remove duplicate data sources
            card.data_sources = list(set(card.data_sources))
            
            # Remove duplicate evidence
            card.evidence_snippets = list(set(card.evidence_snippets))
            
            # Ensure priority level is valid
            if card.priority_level not in ["critical", "important", "nice-to-have"]:
                card.priority_level = "nice-to-have"
        
        return cards

    def _save_data_sources(self):
        """Save data sources to CSV"""
        with open(self.data_sources_csv, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            for source in self.data_sources:
                writer.writerow([
                    source.name, source.type, source.path, 
                    source.priority, source.last_updated, source.analysis_status
                ])

    def _save_card_requirements(self):
        """Save card requirements to CSV"""
        with open(self.card_requirements_csv, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            for card in self.card_requirements:
                writer.writerow([
                    card.title, card.target_audience, card.primary_purpose,
                    card.priority_level, ';'.join(card.data_sources), card.sme_contact,
                    card.estimated_complexity, ';'.join(card.dependencies),
                    card.confidence_score, card.category, len(card.evidence_snippets)
                ])

    def _log_analysis_result(self, result: AnalysisResult):
        """Log analysis result to CSV"""
        with open(self.analysis_log_csv, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                result.data_source, result.analysis_timestamp,
                len(result.cards_identified), len(result.knowledge_gaps),
                len(result.repeated_questions), len(result.undocumented_processes),
                result.token_usage.get("prompt", 0),
                result.token_usage.get("completion", 0),
                result.token_usage.get("total", 0)
            ])

    def generate_summary_report(self):
        """Generate final summary report"""
        print("\n📄 Generating summary report...")
        
        report_path = self.output_dir / f"phase1_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("# Phase 1: Organizational Discovery & Planning - Summary Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Data Sources Summary
            f.write("## 📊 Data Sources Analyzed\n\n")
            f.write(f"**Total Sources:** {len(self.data_sources)}\n\n")
            
            for source_type in set(s.type for s in self.data_sources):
                count = len([s for s in self.data_sources if s.type == source_type])
                f.write(f"- **{source_type}:** {count}\n")
            
            # Card Requirements Summary
            f.write(f"\n## 📋 Card Requirements Identified\n\n")
            f.write(f"**Total Cards:** {len(self.card_requirements)}\n\n")
            
            # Priority breakdown
            for priority in ["critical", "important", "nice-to-have"]:
                count = len([c for c in self.card_requirements if c.priority_level == priority])
                f.write(f"- **{priority.title()}:** {count}\n")
            
            # Category breakdown
            f.write(f"\n### By Category\n\n")
            for category in set(c.category for c in self.card_requirements):
                count = len([c for c in self.card_requirements if c.category == category])
                f.write(f"- **{category.title()}:** {count}\n")
            
            # High priority cards
            f.write(f"\n### Critical Priority Cards\n\n")
            critical_cards = [c for c in self.card_requirements if c.priority_level == "critical"]
            for card in critical_cards[:10]:  # Top 10
                f.write(f"- **{card.title}**\n")
                f.write(f"  - Audience: {card.target_audience}\n")
                f.write(f"  - Purpose: {card.primary_purpose}\n\n")
            
            # Next steps
            f.write(f"\n## 🚀 Next Steps\n\n")
            f.write("1. **Human Review & Prioritization** (Step 1.4)\n")
            f.write("   - Review card requirements in `card_requirements_*.csv`\n")
            f.write("   - Add SME contacts for each card\n")
            f.write("   - Adjust priorities based on team needs\n\n")
            
            f.write("2. **LLM-Driven Final Optimization** (Step 1.5)\n")
            f.write("   - Run consolidated cards through LLM for grouping\n")
            f.write("   - Identify dependencies between cards\n")
            f.write("   - Standardize titles and descriptions\n\n")
            
            f.write("3. **Organizational Structure Design** (Step 1.6)\n")
            f.write("   - Design Collections and Boards structure\n")
            f.write("   - Plan card sequences and navigation\n\n")
            
            f.write("4. **Begin Phase 2: Interactive Card Development**\n")
            f.write("   - Start with highest priority cards\n")
            f.write("   - Use engineer-driven iterative process\n")
        
        print(f"📄 Summary report saved to: {report_path}")

async def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description="Phase 1: Organizational Discovery & Planning")
    parser.add_argument("--api-key", required=True, help="OpenAI API key")
    parser.add_argument("--output-dir", default="./phase1_output", help="Output directory")
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    orchestrator = Phase1Orchestrator(args.api_key, args.output_dir)
    
    print("🚀 Starting Phase 1: Organizational Discovery & Planning")
    
    # Execute all steps
    await orchestrator.discover_data_sources()
    await orchestrator.analyze_data_sources()
    orchestrator.consolidate_card_requirements()
    orchestrator.generate_summary_report()
    
    print("\n✅ Phase 1 complete! Review the outputs and proceed to human review & prioritization.")

if __name__ == "__main__":
    asyncio.run(main()) 