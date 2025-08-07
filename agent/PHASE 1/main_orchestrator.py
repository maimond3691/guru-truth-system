#!/usr/bin/env python3
"""
Main Orchestrator: Complete Guru Card Generation Pipeline
Implements the user's vision: Change Detection -> Consolidated Source of Truth -> Intelligent Card Generation
"""

import asyncio
import argparse
import json
from pathlib import Path
from datetime import datetime
from typing import Optional

from incremental_change_detector import IncrementalChangeDetector, ConsolidatedSourceOfTruthGenerator
from intelligent_card_generator import IntelligentCardGenerator

class MainOrchestrator:
    """Orchestrates the complete pipeline from change detection to card generation"""
    
    def __init__(self, api_key: str, output_dir: str = "./pipeline_output"):
        self.api_key = api_key
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Initialize components
        self.change_detector = IncrementalChangeDetector()
        self.source_generator = ConsolidatedSourceOfTruthGenerator(str(self.output_dir / "consolidated"))
        self.card_generator = IntelligentCardGenerator(api_key, str(self.output_dir / "generated_cards"))
        
        # Pipeline state
        self.execution_log = []
    
    async def run_complete_pipeline(self, force_full_analysis: bool = False) -> dict:
        """Execute the complete pipeline: detect changes -> consolidate -> generate cards"""
        
        pipeline_start = datetime.now()
        self.log_step("🚀 Starting complete Guru card generation pipeline")
        
        try:
            # Step 1: Detect changes from all data sources
            self.log_step("📊 Step 1: Detecting changes from data sources")
            changes = await self.change_detector.detect_all_changes()
            
            if not changes and not force_full_analysis:
                self.log_step("📭 No new changes detected. Pipeline complete.")
                return self._create_pipeline_summary([], None, [], 0)
            
            if force_full_analysis:
                self.log_step("🔄 Force mode: Processing all data sources regardless of changes")
            
            # Step 2: Generate consolidated source of truth
            self.log_step("📝 Step 2: Creating consolidated source of truth")
            consolidated_file = self.source_generator.generate_consolidated_file(changes)
            
            # Step 3: Generate Guru cards from consolidated file
            self.log_step("🤖 Step 3: Generating Guru cards using AI analysis")
            cards = await self.card_generator.process_consolidated_file(consolidated_file)
            
            # Step 4: Generate implementation plan
            self.log_step("📋 Step 4: Creating implementation plan for Phase 2")
            plan = self.card_generator.generate_implementation_plan(cards)
            
            # Step 5: Save state and create summary
            self.change_detector.save_current_state()
            
            pipeline_duration = (datetime.now() - pipeline_start).total_seconds()
            summary = self._create_pipeline_summary(changes, consolidated_file, cards, pipeline_duration)
            
            # Save pipeline summary
            summary_file = self.output_dir / f"pipeline_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, default=str)
            
            self.log_step(f"✅ Pipeline complete! Summary saved: {summary_file}")
            
            # Print executive summary
            self._print_executive_summary(summary)
            
            return summary
            
        except Exception as e:
            self.log_step(f"❌ Pipeline failed: {e}")
            raise
    
    async def run_webhook_triggered_pipeline(self, webhook_data: dict) -> dict:
        """Execute pipeline triggered by webhook (GitHub, Google Docs, etc.)"""
        
        self.log_step(f"🔗 Webhook triggered pipeline: {webhook_data.get('source', 'unknown')}")
        
        # Add webhook data to change detector context
        if hasattr(self.change_detector, 'add_webhook_context'):
            self.change_detector.add_webhook_context(webhook_data)
        
        # Run standard pipeline
        return await self.run_complete_pipeline()
    
    async def run_scheduled_pipeline(self) -> dict:
        """Execute pipeline on scheduled basis (daily, weekly, etc.)"""
        
        self.log_step("⏰ Scheduled pipeline execution")
        return await self.run_complete_pipeline()
    
    def log_step(self, message: str):
        """Log pipeline execution step"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        self.execution_log.append(log_entry)
    
    def _create_pipeline_summary(self, changes, consolidated_file, cards, duration) -> dict:
        """Create comprehensive pipeline summary"""
        
        return {
            "pipeline_execution": {
                "timestamp": datetime.now().isoformat(),
                "duration_seconds": duration,
                "status": "completed" if cards else "no_changes"
            },
            "change_detection": {
                "total_changes": len(changes),
                "changes_by_source": self._group_changes_by_source(changes),
                "changes_by_type": self._group_changes_by_type(changes)
            },
            "consolidated_file": {
                "path": str(consolidated_file) if consolidated_file else None,
                "size_bytes": consolidated_file.stat().st_size if consolidated_file and consolidated_file.exists() else 0
            },
            "card_generation": {
                "total_cards": len(cards),
                "cards_by_priority": self._group_cards_by_priority(cards),
                "cards_by_collection": self._group_cards_by_collection(cards),
                "estimated_implementation_hours": sum(
                    2 if card.priority_level == "critical" else 1.5 if card.priority_level == "important" else 1
                    for card in cards
                )
            },
            "next_steps": {
                "recommended_action": self._get_recommended_action(cards),
                "priority_cards": [card.title for card in cards if card.priority_level == "critical"][:5],
                "phase_2_ready": len(cards) > 0
            },
            "execution_log": self.execution_log
        }
    
    def _group_changes_by_source(self, changes) -> dict:
        """Group changes by data source"""
        groups = {}
        for change in changes:
            groups[change.source_name] = groups.get(change.source_name, 0) + 1
        return groups
    
    def _group_changes_by_type(self, changes) -> dict:
        """Group changes by type"""
        groups = {}
        for change in changes:
            groups[change.change_type] = groups.get(change.change_type, 0) + 1
        return groups
    
    def _group_cards_by_priority(self, cards) -> dict:
        """Group cards by priority level"""
        groups = {"critical": 0, "important": 0, "nice-to-have": 0}
        for card in cards:
            groups[card.priority_level] = groups.get(card.priority_level, 0) + 1
        return groups
    
    def _group_cards_by_collection(self, cards) -> dict:
        """Group cards by suggested collection"""
        groups = {}
        for card in cards:
            groups[card.suggested_collection] = groups.get(card.suggested_collection, 0) + 1
        return groups
    
    def _get_recommended_action(self, cards) -> str:
        """Get recommended next action based on pipeline results"""
        if not cards:
            return "No cards generated. Check if changes contain actionable content."
        
        critical_cards = [c for c in cards if c.priority_level == "critical"]
        if critical_cards:
            return f"Begin Phase 2 development with {len(critical_cards)} critical cards"
        
        important_cards = [c for c in cards if c.priority_level == "important"]
        if important_cards:
            return f"Begin Phase 2 development with {len(important_cards)} important cards"
        
        return "Review generated cards and adjust priorities before Phase 2"
    
    def _print_executive_summary(self, summary: dict):
        """Print executive summary to console"""
        print("\n" + "="*60)
        print("📊 PIPELINE EXECUTION SUMMARY")
        print("="*60)
        
        # Basic stats
        print(f"⏱️  Duration: {summary['pipeline_execution']['duration_seconds']:.1f} seconds")
        print(f"🔄 Changes Detected: {summary['change_detection']['total_changes']}")
        print(f"📋 Cards Generated: {summary['card_generation']['total_cards']}")
        
        # Changes breakdown
        if summary['change_detection']['total_changes'] > 0:
            print("\n📊 Changes by Source:")
            for source, count in summary['change_detection']['changes_by_source'].items():
                print(f"   • {source}: {count}")
        
        # Cards breakdown
        if summary['card_generation']['total_cards'] > 0:
            print("\n📋 Cards by Priority:")
            for priority, count in summary['card_generation']['cards_by_priority'].items():
                if count > 0:
                    print(f"   • {priority.title()}: {count}")
            
            print(f"\n⏳ Estimated Implementation: {summary['card_generation']['estimated_implementation_hours']:.1f} hours")
        
        # Next steps
        print(f"\n🎯 Recommended Action: {summary['next_steps']['recommended_action']}")
        
        if summary['next_steps']['priority_cards']:
            print("\n🚨 Priority Cards to Create:")
            for i, card_title in enumerate(summary['next_steps']['priority_cards'], 1):
                print(f"   {i}. {card_title}")
        
        print("\n" + "="*60)

async def main():
    """Main execution function with CLI interface"""
    parser = argparse.ArgumentParser(description="Guru Card Generation Pipeline")
    parser.add_argument("--api-key", required=True, help="OpenAI API key")
    parser.add_argument("--output-dir", default="./pipeline_output", help="Output directory")
    parser.add_argument("--mode", choices=["normal", "force", "webhook", "scheduled"], 
                       default="normal", help="Execution mode")
    parser.add_argument("--webhook-data", help="JSON string with webhook data (for webhook mode)")
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    orchestrator = MainOrchestrator(args.api_key, args.output_dir)
    
    try:
        if args.mode == "force":
            summary = await orchestrator.run_complete_pipeline(force_full_analysis=True)
        elif args.mode == "webhook":
            webhook_data = json.loads(args.webhook_data) if args.webhook_data else {}
            summary = await orchestrator.run_webhook_triggered_pipeline(webhook_data)
        elif args.mode == "scheduled":
            summary = await orchestrator.run_scheduled_pipeline()
        else:
            summary = await orchestrator.run_complete_pipeline()
        
        # Exit with appropriate code
        if summary['card_generation']['total_cards'] > 0:
            print("\n✅ Pipeline completed successfully with generated cards")
            exit(0)
        else:
            print("\n📭 Pipeline completed but no cards were generated")
            exit(1)
            
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        exit(2)

if __name__ == "__main__":
    asyncio.run(main()) 