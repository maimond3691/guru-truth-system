#!/usr/bin/env python3
"""
Guru Card Analyzer - Phase 1: Contradiction, Overlap, and Duplication Detection

This script parses all Guru cards, extracts clean content from HTML,
and uses OpenAI's LLM to identify contradictory, overlapping, and duplicated information.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from bs4 import BeautifulSoup
import asyncio
from openai import AsyncOpenAI
from datetime import datetime
import argparse


class GuruCardAnalyzer:
    def __init__(self, cards_directory: str, api_key: str):
        self.cards_directory = Path(cards_directory)
        self.async_client = AsyncOpenAI(api_key=api_key)
        self.cards_data = []
        
    def parse_html_content(self, html_content: str) -> str:
        """Extract clean text from HTML content, preserving structure."""
        if not html_content:
            return ""
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove image tags completely (they don't add meaningful content for analysis)
        for img in soup.find_all('img'):
            img.decompose()
        
        # Convert code blocks to readable format with proper spacing
        for code in soup.find_all(['code', 'pre']):
            # Add spacing around code blocks
            code.insert_before("\n\n")
            code.insert_after("\n\n")
            
        # Convert lists to readable format with proper spacing
        for ul in soup.find_all('ul'):
            ul.insert_before("\n")
            for li in ul.find_all('li'):
                li.insert_before("• ")
                li.insert_after("\n")
            ul.insert_after("\n")
        
        for ol in soup.find_all('ol'):
            ol.insert_before("\n")
            for i, li in enumerate(ol.find_all('li'), 1):
                li.insert_before(f"{i}. ")
                li.insert_after("\n")
            ol.insert_after("\n")
        
        # Convert headers to markdown-style with proper spacing
        for i in range(1, 7):
            for header in soup.find_all(f'h{i}'):
                header.insert_before("\n\n" + "#" * i + " ")
                header.insert_after("\n\n")
        
        # Convert dividers/horizontal rules
        for hr in soup.find_all('hr'):
            hr.replace_with("\n\n---\n\n")
        
        # Get clean text
        text = soup.get_text()
        
        # Remove image references that might have been left as text
        # Pattern: [Image: filename.extension] or [Image: text]
        text = re.sub(r'\[Image:[^\]]+\]', '', text)
        
        # Clean up excessive whitespace and newlines
        # Replace multiple consecutive newlines with maximum of 2
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        
        # Replace multiple spaces with single space
        text = re.sub(r'[ \t]+', ' ', text)
        
        # Clean up lines that have only whitespace
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            cleaned_line = line.strip()
            # Keep the line if it has content, or if it's an empty line for spacing
            # but avoid multiple consecutive empty lines
            if cleaned_line or (not cleaned_lines or cleaned_lines[-1]):
                cleaned_lines.append(cleaned_line)
        
        # Join lines and clean up final spacing
        text = '\n'.join(cleaned_lines)
        
        # Remove any remaining problematic characters or escape sequences
        # Remove zero-width characters and other problematic unicode
        text = re.sub(r'[\u200b-\u200d\ufeff]', '', text)
        
        # Clean up any remaining escape sequences
        text = text.replace('\\n', '\n').replace('\\t', ' ').replace('\\"', '"')
        
        # Final cleanup - ensure no more than 2 consecutive newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text

    def extract_card_data(self, json_file_path: Path) -> Optional[Dict[str, Any]]:
        """Extract relevant data from a single Guru card JSON file."""
        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                card_data = json.load(f)
            
            # Get original HTML content for comparison
            original_html_content = card_data.get('content', '')
            
            # Extract key information
            card_info = {
                'id': card_data.get('id', ''),
                'title': card_data.get('preferredPhrase', ''),
                'content': self.parse_html_content(original_html_content),
                'original_content': original_html_content,  # Keep for statistics
                'tags': [tag.get('value', '') for tag in card_data.get('tags', [])],
                'collection': card_data.get('collection', {}).get('name', ''),
                'owner': f"{card_data.get('owner', {}).get('firstName', '')} {card_data.get('owner', {}).get('lastName', '')}".strip(),
                'lastModified': card_data.get('lastModified', ''),
                'dateCreated': card_data.get('dateCreated', ''),
                'verificationState': card_data.get('verificationState', ''),
                'file_path': str(json_file_path)
            }
            
            # Only include cards with meaningful content
            if card_info['content'] and len(card_info['content'].strip()) > 50:
                return card_info
            
        except Exception as e:
            print(f"Error processing {json_file_path}: {e}")
        
        return None

    def load_all_cards(self) -> List[Dict[str, Any]]:
        """Load and parse all Guru cards from the directory."""
        print("Loading and parsing Guru cards...")
        cards = []
        
        for json_file in self.cards_directory.glob("*.json"):
            card_data = self.extract_card_data(json_file)
            if card_data:
                cards.append(card_data)
        
        print(f"Successfully loaded {len(cards)} cards with meaningful content")
        return cards

    def prepare_cards_for_analysis(self, cards: List[Dict[str, Any]]) -> str:
        """Format cards data for LLM analysis."""
        formatted_cards = []
        
        for i, card in enumerate(cards, 1):
            card_text = f"""
CARD {i}:
ID: {card['id']}
TITLE: {card['title']}
COLLECTION: {card['collection']}
TAGS: {', '.join(card['tags']) if card['tags'] else 'None'}
OWNER: {card['owner']}
LAST_MODIFIED: {card['lastModified']}
VERIFICATION_STATE: {card['verificationState']}

CONTENT:
{card['content']}

---"""
            formatted_cards.append(card_text)
        
        return '\n'.join(formatted_cards)

    async def analyze_contradictions_batch(self, cards_chunk: List[Dict[str, Any]]) -> Dict:
        """Analyze a chunk of cards for contradictions, overlaps, and duplications."""
        
        cards_text = self.prepare_cards_for_analysis(cards_chunk)
        
        system_prompt = {
            "role": "system",
            "content": """You are an expert knowledge management analyst tasked with identifying contradictory, overlapping, and duplicated information in a corpus of technical documentation cards.

Your job is to:
1. CONTRADICTORY INFORMATION: Find cards that contain conflicting facts, procedures, or recommendations about the same topic
2. OVERLAPPING INFORMATION: Find cards that cover similar topics but with different approaches, details, or perspectives
3. DUPLICATED INFORMATION: Find cards that contain essentially the same information, possibly with minor variations

For each issue you identify, provide:
- The specific card IDs involved
- The type of issue (contradiction, overlap, or duplication)
- A clear description of the conflict/overlap/duplication
- Specific quotes or references from the cards
- A confidence score (1-10)
- Recommendations for resolution

Be extremely thorough and look for subtle conflicts, not just obvious ones. Pay special attention to:
- Technical procedures and steps
- API endpoints and configurations
- Version information and compatibility
- Code examples and implementations
- Business processes and policies
- Dates and temporal information"""
        }
        
        user_prompt = f"""
Analyze the following Guru cards for contradictions, overlapping information, and duplications. Be extremely thorough and identify even subtle conflicts or overlaps.

CARDS TO ANALYZE:
{cards_text}

Return your analysis in the following JSON format:
{{
    "contradictions": [
        {{
            "card_ids": ["id1", "id2"],
            "card_titles": ["title1", "title2"],
            "type": "contradiction",
            "description": "Clear description of the contradiction",
            "evidence": ["Quote from card 1", "Quote from card 2"],
            "confidence_score": 8,
            "recommendation": "Suggested resolution"
        }}
    ],
    "overlaps": [
        {{
            "card_ids": ["id1", "id2", "id3"],
            "card_titles": ["title1", "title2", "title3"],
            "type": "overlap",
            "description": "Description of the overlap",
            "evidence": ["Supporting evidence"],
            "confidence_score": 7,
            "recommendation": "Suggested consolidation approach"
        }}
    ],
    "duplications": [
        {{
            "card_ids": ["id1", "id2"],
            "card_titles": ["title1", "title2"],
            "type": "duplication",
            "description": "Description of the duplication",
            "evidence": ["Supporting evidence"],
            "confidence_score": 9,
            "recommendation": "Suggested deduplication approach"
        }}
    ],
    "summary": {{
        "total_cards_analyzed": {len(cards_chunk)},
        "contradictions_found": 0,
        "overlaps_found": 0,
        "duplications_found": 0,
        "high_confidence_issues": 0
    }}
}}
"""

        try:
            print(f"Analyzing batch of {len(cards_chunk)} cards...")
            response = await self.async_client.chat.completions.create(
                model="gpt-4o",  # Using GPT-4 for better analysis
                messages=[system_prompt, {"role": "user", "content": user_prompt}],
                response_format={"type": "json_object"},
                temperature=0.1  # Low temperature for consistent analysis
            )
            
            result = json.loads(response.choices[0].message.content)
            print(f"✓ Batch analysis complete: {result.get('summary', {}).get('contradictions_found', 0)} contradictions, "
                  f"{result.get('summary', {}).get('overlaps_found', 0)} overlaps, "
                  f"{result.get('summary', {}).get('duplications_found', 0)} duplications found")
            
            return result
            
        except Exception as e:
            print(f"Error in batch analysis: {e}")
            return {
                "contradictions": [],
                "overlaps": [],
                "duplications": [],
                "summary": {"error": str(e)},
                "cards_in_batch": [card['id'] for card in cards_chunk]
            }

    async def analyze_all_cards(self, batch_size: int = 20) -> Dict:
        """Analyze all cards in batches to identify issues."""
        if not self.cards_data:
            self.cards_data = self.load_all_cards()
        
        print(f"\nStarting comprehensive analysis of {len(self.cards_data)} cards...")
        print(f"Using batch size: {batch_size}")
        
        all_results = {
            "contradictions": [],
            "overlaps": [],
            "duplications": [],
            "analysis_metadata": {
                "total_cards": len(self.cards_data),
                "analysis_date": datetime.now().isoformat(),
                "batch_size": batch_size
            }
        }
        
        # Process cards in batches
        for i in range(0, len(self.cards_data), batch_size):
            batch = self.cards_data[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(self.cards_data) + batch_size - 1) // batch_size
            
            print(f"\n--- Processing Batch {batch_num}/{total_batches} ---")
            
            batch_result = await self.analyze_contradictions_batch(batch)
            
            # Merge results
            all_results["contradictions"].extend(batch_result.get("contradictions", []))
            all_results["overlaps"].extend(batch_result.get("overlaps", []))
            all_results["duplications"].extend(batch_result.get("duplications", []))
            
            # Add a small delay to be respectful to the API
            await asyncio.sleep(1)
        
        # Calculate final summary
        all_results["final_summary"] = {
            "total_contradictions": len(all_results["contradictions"]),
            "total_overlaps": len(all_results["overlaps"]),
            "total_duplications": len(all_results["duplications"]),
            "high_confidence_issues": len([
                issue for category in [all_results["contradictions"], all_results["overlaps"], all_results["duplications"]]
                for issue in category if issue.get("confidence_score", 0) >= 8
            ])
        }
        
        return all_results

    def save_results(self, results: Dict, output_file: str = "guru_analysis_results.json"):
        """Save analysis results to a JSON file."""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Results saved to: {output_file}")

    def print_summary(self, results: Dict):
        """Print a summary of the analysis results."""
        summary = results.get("final_summary", {})
        
        print("\n" + "="*60)
        print("GURU CARDS ANALYSIS SUMMARY")
        print("="*60)
        print(f"Total Cards Analyzed: {results['analysis_metadata']['total_cards']}")
        print(f"Analysis Date: {results['analysis_metadata']['analysis_date']}")
        print()
        print(f"🔴 Contradictions Found: {summary.get('total_contradictions', 0)}")
        print(f"🟡 Overlaps Found: {summary.get('total_overlaps', 0)}")
        print(f"🟠 Duplications Found: {summary.get('total_duplications', 0)}")
        print(f"⭐ High Confidence Issues: {summary.get('high_confidence_issues', 0)}")
        print()
        
        # Show top issues by confidence
        all_issues = (results.get("contradictions", []) + 
                     results.get("overlaps", []) + 
                     results.get("duplications", []))
        
        high_confidence_issues = [issue for issue in all_issues if issue.get("confidence_score", 0) >= 8]
        high_confidence_issues.sort(key=lambda x: x.get("confidence_score", 0), reverse=True)
        
        if high_confidence_issues:
            print("TOP HIGH-CONFIDENCE ISSUES:")
            print("-" * 40)
            for i, issue in enumerate(high_confidence_issues[:5], 1):
                print(f"{i}. {issue['type'].upper()} (Score: {issue['confidence_score']})")
                print(f"   Cards: {', '.join(issue['card_titles'])}")
                print(f"   Issue: {issue['description'][:100]}...")
                print()


async def main():
    parser = argparse.ArgumentParser(description="Analyze Guru cards for contradictions, overlaps, and duplications")
    parser.add_argument("--cards-dir", default="guru_cards_export/cards", 
                       help="Directory containing Guru card JSON files")
    parser.add_argument("--api-key", required=True, 
                       help="OpenAI API key")
    parser.add_argument("--batch-size", type=int, default=15, 
                       help="Number of cards to analyze per batch (default: 15)")
    parser.add_argument("--output", default="guru_analysis_results.json", 
                       help="Output file for results")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.cards_dir):
        print(f"Error: Cards directory '{args.cards_dir}' does not exist")
        return
    
    analyzer = GuruCardAnalyzer(args.cards_dir, args.api_key)
    
    try:
        results = await analyzer.analyze_all_cards(batch_size=args.batch_size)
        analyzer.save_results(results, args.output)
        analyzer.print_summary(results)
        
    except Exception as e:
        print(f"Error during analysis: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main()) 