#!/usr/bin/env python3
"""
Guru Card Tag Generator - Creates standardized tags for all cards with corpus-wide context
"""

import json
import asyncio
import aiohttp
import csv
from pathlib import Path
from typing import List, Dict, Any, Set
from dataclasses import dataclass
from collections import Counter, defaultdict
import re
from datetime import datetime
from analyzer import GuruCardAnalyzer


@dataclass
class TagAssignment:
    """Represents a tag assignment with validation"""
    tag: str
    confidence: float
    evidence_snippets: List[str]  # Actual text snippets that support this tag
    card_id: str
    card_title: str


@dataclass
class StandardizedTag:
    """Represents a standardized tag in the corpus"""
    canonical_name: str
    aliases: Set[str]
    description: str
    category: str
    frequency: int
    evidence_examples: List[str]


@dataclass
class VocabularyIteration:
    """Represents one iteration of vocabulary building"""
    batch_number: int
    cards_processed: List[str]  # Card IDs in this batch
    vocabulary_before: Dict[str, Any]
    vocabulary_after: Dict[str, Any]
    new_tags_added: List[str]
    tags_modified: List[str]
    timestamp: str
    token_usage: Dict[str, int]


class GuruTagGenerator:
    """Generates and standardizes tags across the entire Guru card corpus"""
    
    def __init__(self, cards_directory: str, api_key: str):
        self.analyzer = GuruCardAnalyzer(cards_directory, api_key)
        self.api_key = api_key
        self.all_cards = []
        self.tag_vocabulary = {}  # canonical_tag -> StandardizedTag
        self.tag_assignments = []  # List of TagAssignment objects
        self.vocabulary_iterations = []  # Track each iteration
        self.batch_size = 25
        
        # Create CSV file for logging iterations
        self.csv_filename = f"vocabulary_iterations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        self.init_csv_log()
        
    def init_csv_log(self):
        """Initialize CSV file for logging vocabulary iterations"""
        with open(self.csv_filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'batch_number', 'timestamp', 'cards_in_batch', 'card_ids', 
                'vocabulary_size_before', 'vocabulary_size_after', 
                'new_tags_added', 'tags_modified', 'total_categories',
                'prompt_tokens', 'completion_tokens', 'total_tokens'
            ])
        
    async def load_cards(self):
        """Load all cards for processing"""
        print("Loading all Guru cards...")
        self.all_cards = self.analyzer.load_all_cards()
        print(f"Loaded {len(self.all_cards)} cards")
        
    async def generate_iterative_vocabulary(self) -> Dict[str, Any]:
        """
        Build vocabulary iteratively by processing cards in batches of 25
        """
        print(f"\n🏷️  Starting Iterative Vocabulary Generation...")
        print(f"Processing {len(self.all_cards)} cards in batches of {self.batch_size}")
        
        current_vocabulary = {}
        
        # Calculate number of batches
        num_batches = (len(self.all_cards) + self.batch_size - 1) // self.batch_size
        
        for batch_num in range(num_batches):
            start_idx = batch_num * self.batch_size
            end_idx = min(start_idx + self.batch_size, len(self.all_cards))
            batch_cards = self.all_cards[start_idx:end_idx]
            
            print(f"\n📦 Processing Batch {batch_num + 1}/{num_batches}")
            print(f"   Cards {start_idx + 1}-{end_idx} ({len(batch_cards)} cards)")
            
            # Store vocabulary state before this iteration
            vocabulary_before = current_vocabulary.copy()
            
            # Process this batch
            updated_vocabulary = await self._process_vocabulary_batch(
                batch_cards, current_vocabulary, batch_num + 1
            )
            
            if updated_vocabulary:
                # Track changes
                iteration = self._analyze_vocabulary_changes(
                    batch_num + 1, batch_cards, vocabulary_before, updated_vocabulary
                )
                self.vocabulary_iterations.append(iteration)
                
                # Log to CSV
                self._log_iteration_to_csv(iteration)
                
                # Update current vocabulary
                current_vocabulary = updated_vocabulary
                
                # Show progress
                new_tags = len(iteration.new_tags_added)
                modified_tags = len(iteration.tags_modified)
                total_tags = len(self._extract_all_tags(current_vocabulary))
                
                print(f"   ✅ Batch complete: {new_tags} new tags, {modified_tags} modified, {total_tags} total")
            else:
                print(f"   ❌ Batch {batch_num + 1} failed, keeping previous vocabulary")
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(1)
        
        # Process the final vocabulary into our internal format
        await self._process_vocabulary(current_vocabulary)
        
        print(f"\n🎉 Iterative vocabulary generation complete!")
        print(f"📊 Final vocabulary: {len(self.tag_vocabulary)} standardized tags")
        print(f"📝 Iteration log saved to: {self.csv_filename}")
        
        return current_vocabulary
    
    async def _process_vocabulary_batch(self, batch_cards: List[Dict], current_vocabulary: Dict[str, Any], batch_number: int) -> Dict[str, Any]:
        """Process a single batch of cards to update vocabulary"""
        
        # Prepare card content
        cards_content = []
        for idx, card in enumerate(batch_cards):
            cards_content.append(f"""
CARD {idx + 1}:
ID: {card.get('id', 'unknown')}
Title: {card['title']}
Content: {card['content']}
""")
        
        combined_content = "\n".join(cards_content)
        
        # Build prompt based on whether this is first batch or not
        if batch_number == 1:
            # First batch - create initial vocabulary
            prompt = f"""
You are creating an initial standardized tag vocabulary for a knowledge management system by analyzing the first batch of cards.

CARDS TO ANALYZE (Batch 1):
{combined_content}

Create a comprehensive tag vocabulary with the following structure:

1. **HIERARCHICAL CATEGORIES**: Organize tags into logical categories
2. **CANONICAL NAMES**: Use consistent, clear naming conventions  
3. **ALIASES**: Include common synonyms that should map to canonical tags
4. **DESCRIPTIONS**: Brief description of what each tag covers

Requirements:
- Tags should be factual/topical, not descriptive (e.g., "GitHub" not "helpful")
- Include technical terms, tools, processes, departments, products
- Create parent-child relationships where appropriate
- Each tag should be specific enough to be useful for deduplication
- Focus on the actual content you see in these cards

Return a JSON structure like this:
{{
  "categories": {{
    "Technology": {{
      "GitHub": {{
        "canonical_name": "GitHub",
        "aliases": ["Github", "git", "version control"],
        "description": "GitHub platform, repositories, and git workflows"
      }},
      "Machine Learning": {{
        "canonical_name": "Machine Learning",
        "aliases": ["ML", "artificial intelligence", "AI"],
        "description": "Machine learning algorithms, models, and processes"
      }}
    }},
    "HR": {{
      "Performance Reviews": {{
        "canonical_name": "Performance Reviews",
        "aliases": ["performance review", "reviews", "performance evaluation"],
        "description": "Employee performance review processes and templates"
      }}
    }}
  }}
}}
"""
        else:
            # Subsequent batches - extend existing vocabulary
            prompt = f"""
You are extending an existing standardized tag vocabulary for a knowledge management system.

EXISTING VOCABULARY:
{json.dumps(current_vocabulary, indent=2)}

NEW CARDS TO ANALYZE (Batch {batch_number}):
{combined_content}

Your task:
1. **REUSE EXISTING TAGS** whenever possible - check if content matches existing tags
2. **ADD NEW TAGS** only when the content covers topics not already covered
3. **REFINE EXISTING TAGS** - you may improve descriptions or add aliases if needed
4. **MAINTAIN CONSISTENCY** - follow the same naming and categorization patterns

Guidelines:
- Before creating a new tag, check if an existing tag already covers the topic
- If you add aliases to existing tags, preserve all previous aliases
- If you modify descriptions, make them more comprehensive, not completely different
- Keep the same JSON structure
- Only add new categories if absolutely necessary

Return the COMPLETE updated vocabulary JSON with all existing tags plus any new ones:
{{
  "categories": {{
    // All existing categories and tags, plus any new ones
  }}
}}
"""

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.2,
                        "max_tokens": 4000
                    }
                ) as response:
                    result = await response.json()
                    
                    if 'error' in result:
                        raise Exception(f"OpenAI API error: {result['error']}")
                    
                    content = result['choices'][0]['message']['content']
                    
                    # Extract JSON from the response
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        vocabulary_data = json.loads(json_match.group())
                        return vocabulary_data
                    else:
                        raise Exception("Could not extract JSON from vocabulary response")
                        
        except Exception as e:
            print(f"Error processing batch {batch_number}: {e}")
            return {}
    
    def _extract_all_tags(self, vocabulary: Dict[str, Any]) -> List[str]:
        """Extract all tag names from vocabulary structure"""
        tags = []
        for category_name, category_tags in vocabulary.get("categories", {}).items():
            for tag_name, tag_info in category_tags.items():
                tags.append(tag_info.get("canonical_name", tag_name))
        return tags
    
    def _analyze_vocabulary_changes(self, batch_number: int, batch_cards: List[Dict], 
                                   vocab_before: Dict[str, Any], vocab_after: Dict[str, Any]) -> VocabularyIteration:
        """Analyze what changed between vocabulary iterations"""
        
        tags_before = set(self._extract_all_tags(vocab_before))
        tags_after = set(self._extract_all_tags(vocab_after))
        
        new_tags = list(tags_after - tags_before)
        
        # Check for modified tags (same name but different content)
        modified_tags = []
        for tag in tags_before & tags_after:
            # Find tag in both vocabularies and compare
            before_tag = self._find_tag_in_vocab(vocab_before, tag)
            after_tag = self._find_tag_in_vocab(vocab_after, tag)
            
            if before_tag != after_tag:
                modified_tags.append(tag)
        
        return VocabularyIteration(
            batch_number=batch_number,
            cards_processed=[card.get('id', 'unknown') for card in batch_cards],
            vocabulary_before=vocab_before,
            vocabulary_after=vocab_after,
            new_tags_added=new_tags,
            tags_modified=modified_tags,
            timestamp=datetime.now().isoformat(),
            token_usage={"prompt": 0, "completion": 0, "total": 0}  # Would need API response to get actual usage
        )
    
    def _find_tag_in_vocab(self, vocabulary: Dict[str, Any], tag_name: str) -> Dict[str, Any]:
        """Find a specific tag in the vocabulary structure"""
        for category_name, category_tags in vocabulary.get("categories", {}).items():
            for tag_key, tag_info in category_tags.items():
                if tag_info.get("canonical_name") == tag_name:
                    return tag_info
        return {}
    
    def _log_iteration_to_csv(self, iteration: VocabularyIteration):
        """Log iteration details to CSV file"""
        with open(self.csv_filename, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                iteration.batch_number,
                iteration.timestamp,
                len(iteration.cards_processed),
                '|'.join(iteration.cards_processed),
                len(self._extract_all_tags(iteration.vocabulary_before)),
                len(self._extract_all_tags(iteration.vocabulary_after)),
                '|'.join(iteration.new_tags_added),
                '|'.join(iteration.tags_modified),
                len(iteration.vocabulary_after.get("categories", {})),
                iteration.token_usage.get("prompt", 0),
                iteration.token_usage.get("completion", 0),
                iteration.token_usage.get("total", 0)
            ])
    
    async def _process_vocabulary(self, vocabulary_data: Dict[str, Any]):
        """Process the final vocabulary data into standardized tags"""
        self.tag_vocabulary = {}
        
        for category_name, category_tags in vocabulary_data.get("categories", {}).items():
            for tag_name, tag_info in category_tags.items():
                canonical_name = tag_info["canonical_name"]
                self.tag_vocabulary[canonical_name] = StandardizedTag(
                    canonical_name=canonical_name,
                    aliases=set(tag_info.get("aliases", [])),
                    description=tag_info.get("description", ""),
                    category=category_name,
                    frequency=0,
                    evidence_examples=[]
                )
        
        print(f"Processed vocabulary with {len(self.tag_vocabulary)} standardized tags")
    
    async def assign_tags_to_cards(self) -> List[TagAssignment]:
        """
        Second pass: Assign tags to each card using the standardized vocabulary
        """
        print("\n🏷️  Phase 2: Assigning standardized tags to all cards...")
        
        # Create vocabulary reference for the LLM
        vocab_reference = {}
        for canonical_name, tag_obj in self.tag_vocabulary.items():
            vocab_reference[canonical_name] = {
                "description": tag_obj.description,
                "aliases": list(tag_obj.aliases),
                "category": tag_obj.category
            }
        
        # Process cards in batches
        batch_size = 5
        all_assignments = []
        
        for i in range(0, len(self.all_cards), batch_size):
            batch = self.all_cards[i:i + batch_size]
            print(f"Processing batch {i//batch_size + 1}/{(len(self.all_cards) + batch_size - 1)//batch_size}")
            
            batch_assignments = await self._assign_tags_batch(batch, vocab_reference)
            all_assignments.extend(batch_assignments)
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(1)
        
        self.tag_assignments = all_assignments
        return all_assignments
    
    async def _assign_tags_batch(self, card_batch: List[Dict], vocab_reference: Dict) -> List[TagAssignment]:
        """Assign tags to a batch of cards"""
        
        # Prepare card content for analysis
        cards_content = []
        for idx, card in enumerate(card_batch):
            cards_content.append(f"""
CARD {idx + 1}:
ID: {card.get('id', 'unknown')}
Title: {card['title']}
Content: {card['content'][:2000]}{'...' if len(card['content']) > 2000 else ''}
""")
        
        combined_cards = "\n".join(cards_content)
        
        prompt = f"""
You are tagging knowledge management cards using a standardized vocabulary.

STANDARDIZED TAG VOCABULARY:
{json.dumps(vocab_reference, indent=2)}

CARDS TO TAG:
{combined_cards}

For each card, assign relevant tags from the standardized vocabulary. You MUST:

1. **ONLY use tags from the provided vocabulary** (canonical names)
2. **Provide evidence snippets** - exact quotes from the card that justify each tag
3. **Assign confidence scores** (0.0-1.0) based on how clearly the evidence supports the tag
4. **Be conservative** - only assign tags with clear factual evidence

Return JSON in this exact format:
{{
  "card_assignments": [
    {{
      "card_id": "card_id_here",
      "card_title": "card_title_here",
      "tags": [
        {{
          "tag": "GitHub",
          "confidence": 0.9,
          "evidence_snippets": ["exact quote from card that supports this tag"]
        }}
      ]
    }}
  ]
}}

Requirements:
- Only assign tags with confidence >= 0.7
- Evidence snippets must be exact quotes (10-50 words)
- If no vocabulary tags apply, assign an empty tags array
- Focus on factual content, not general descriptions
"""

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "max_tokens": 2000
                    }
                ) as response:
                    result = await response.json()
                    
                    if 'error' in result:
                        print(f"API error in batch: {result['error']}")
                        return []
                    
                    content = result['choices'][0]['message']['content']
                    
                    # Extract and parse JSON
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        assignments_data = json.loads(json_match.group())
                        return self._parse_tag_assignments(assignments_data, card_batch)
                    else:
                        print("Could not extract JSON from tag assignment response")
                        return []
                        
        except Exception as e:
            print(f"Error in tag assignment batch: {e}")
            return []
    
    def _parse_tag_assignments(self, assignments_data: Dict, card_batch: List[Dict]) -> List[TagAssignment]:
        """Parse tag assignment results into TagAssignment objects"""
        assignments = []
        
        for assignment in assignments_data.get("card_assignments", []):
            card_id = assignment.get("card_id", "unknown")
            card_title = assignment.get("card_title", "unknown")
            
            for tag_data in assignment.get("tags", []):
                tag_assignment = TagAssignment(
                    tag=tag_data["tag"],
                    confidence=tag_data["confidence"],
                    evidence_snippets=tag_data["evidence_snippets"],
                    card_id=card_id,
                    card_title=card_title
                )
                assignments.append(tag_assignment)
                
                # Update tag frequency
                if tag_data["tag"] in self.tag_vocabulary:
                    self.tag_vocabulary[tag_data["tag"]].frequency += 1
                    self.tag_vocabulary[tag_data["tag"]].evidence_examples.extend(
                        tag_data["evidence_snippets"][:2]  # Keep first 2 examples
                    )
        
        return assignments
    
    def generate_tag_report(self) -> Dict[str, Any]:
        """Generate a comprehensive report of the tagging results"""
        
        # Group assignments by tag
        tags_to_cards = defaultdict(list)
        for assignment in self.tag_assignments:
            tags_to_cards[assignment.tag].append(assignment)
        
        # Calculate statistics
        total_cards = len(self.all_cards)
        tagged_cards = len(set(a.card_id for a in self.tag_assignments))
        total_tag_assignments = len(self.tag_assignments)
        
        # Tag frequency analysis
        tag_frequencies = Counter(a.tag for a in self.tag_assignments)
        
        report = {
            "summary": {
                "total_cards": total_cards,
                "tagged_cards": tagged_cards,
                "coverage_percentage": (tagged_cards / total_cards) * 100,
                "total_tag_assignments": total_tag_assignments,
                "average_tags_per_card": total_tag_assignments / tagged_cards if tagged_cards > 0 else 0,
                "unique_tags_used": len(tag_frequencies),
                "total_vocabulary_size": len(self.tag_vocabulary),
                "vocabulary_iterations": len(self.vocabulary_iterations)
            },
            "tag_frequency": dict(tag_frequencies.most_common()),
            "tags_to_cards": {
                tag: [
                    {
                        "card_id": a.card_id,
                        "card_title": a.card_title,
                        "confidence": a.confidence,
                        "evidence": a.evidence_snippets
                    }
                    for a in assignments
                ]
                for tag, assignments in tags_to_cards.items()
            },
            "vocabulary": {
                tag: {
                    "description": obj.description,
                    "category": obj.category,
                    "frequency": obj.frequency,
                    "aliases": list(obj.aliases),
                    "evidence_examples": obj.evidence_examples[:3]
                }
                for tag, obj in self.tag_vocabulary.items()
            },
            "iteration_summary": [
                {
                    "batch_number": iteration.batch_number,
                    "cards_processed": len(iteration.cards_processed),
                    "new_tags_added": len(iteration.new_tags_added),
                    "tags_modified": len(iteration.tags_modified),
                    "timestamp": iteration.timestamp
                }
                for iteration in self.vocabulary_iterations
            ]
        }
        
        return report
    
    async def run_full_tagging_process(self) -> str:
        """Run the complete tagging process and save results"""
        
        # Load cards
        await self.load_cards()
        
        # Generate vocabulary iteratively
        vocabulary = await self.generate_iterative_vocabulary()
        
        # Assign tags
        assignments = await self.assign_tags_to_cards()
        
        # Generate report
        report = self.generate_tag_report()
        
        # Save results
        output_file = "guru_cards_tagging_results.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Tagging complete! Results saved to {output_file}")
        print(f"📊 Tagged {report['summary']['tagged_cards']}/{report['summary']['total_cards']} cards")
        print(f"📊 {report['summary']['total_tag_assignments']} total tag assignments")
        print(f"📊 {report['summary']['unique_tags_used']} unique tags used")
        print(f"📊 {report['summary']['coverage_percentage']:.1f}% card coverage")
        print(f"📊 {report['summary']['vocabulary_iterations']} vocabulary iterations")
        
        # Show top tags
        print(f"\n🏆 Top 10 most frequent tags:")
        for tag, count in list(report['tag_frequency'].items())[:10]:
            print(f"   {tag}: {count} cards")
        
        # Show iteration summary
        print(f"\n📈 Vocabulary Evolution:")
        for iteration_summary in report['iteration_summary']:
            batch_num = iteration_summary['batch_number']
            new_tags = iteration_summary['new_tags_added']
            modified = iteration_summary['tags_modified']
            print(f"   Batch {batch_num}: +{new_tags} new tags, ~{modified} modified")
        
        return output_file


async def main():
    """Main function to run the tagging process"""
    
    # Get API key
    api_key = input("Enter your OpenAI API key: ").strip()
    if not api_key:
        print("API key is required!")
        return
    
    # Create tagger
    tagger = GuruTagGenerator("guru_cards_export/cards", api_key)
    
    # Run the process
    output_file = await tagger.run_full_tagging_process()
    
    print(f"\nFiles generated:")
    print(f"1. {output_file} - Complete tagging results")
    print(f"2. {tagger.csv_filename} - Vocabulary iteration log")
    print(f"\nNext steps:")
    print(f"1. Review the tagging results in {output_file}")
    print(f"2. Check vocabulary evolution in {tagger.csv_filename}")
    print(f"3. Validate tag assignments and evidence")
    print(f"4. Run deduplication analysis grouped by tags")


if __name__ == "__main__":
    asyncio.run(main()) 