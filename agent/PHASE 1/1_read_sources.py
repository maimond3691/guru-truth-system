#!/usr/bin/env python3
"""
Incremental Change Detector & Consolidated Source of Truth Generator
Detects new changes from all data sources and creates a single markdown file for LLM processing.
"""

import json
import asyncio
import hashlib
import os
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import aiohttp
import aiofiles
from gitpython import Repo

@dataclass
class ChangeDetection:
    """Represents a detected change in a data source"""
    source_name: str
    source_type: str  # "github_commit", "google_doc_edit", "file_modification", etc.
    change_type: str  # "added", "modified", "deleted"
    timestamp: datetime
    content: str
    metadata: Dict[str, Any]
    evidence_id: str  # Unique identifier for this piece of evidence

@dataclass
class DataSourceConfig:
    """Configuration for a data source"""
    name: str
    type: str  # "github", "google_docs", "local_files", "slack", etc.
    config: Dict[str, Any]  # API keys, paths, webhooks, etc.
    last_check_timestamp: Optional[datetime] = None
    enabled: bool = True

class IncrementalChangeDetector:
    """Detects new changes across all configured data sources"""
    
    def __init__(self, config_file: str = "./data_sources_config.json", 
                 state_file: str = "./change_detector_state.json"):
        self.config_file = Path(config_file)
        self.state_file = Path(state_file)
        self.data_sources: List[DataSourceConfig] = []
        self.last_run_state: Dict[str, Any] = {}
        self.detected_changes: List[ChangeDetection] = []
        
        self.load_configuration()
        self.load_last_run_state()
    
    def load_configuration(self):
        """Load data source configurations"""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                config_data = json.load(f)
                self.data_sources = [
                    DataSourceConfig(**source) for source in config_data.get("data_sources", [])
                ]
        else:
            # Create default configuration
            self.create_default_configuration()
    
    def create_default_configuration(self):
        """Create default data source configuration"""
        default_config = {
            "data_sources": [
                {
                    "name": "Current Repository",
                    "type": "github",
                    "config": {
                        "path": ".",
                        "branches": ["main", "develop"],
                        "file_patterns": ["*.py", "*.md", "*.json", "*.yml", "*.yaml"]
                    }
                },
                {
                    "name": "Documentation Files",
                    "type": "local_files",
                    "config": {
                        "paths": ["docs/", "README.md", "*.md"],
                        "recursive": True
                    }
                },
                {
                    "name": "Configuration Files",
                    "type": "local_files", 
                    "config": {
                        "paths": ["package.json", "requirements.txt", "docker-compose.yml", "*.env*"],
                        "recursive": False
                    }
                }
            ]
        }
        
        with open(self.config_file, 'w') as f:
            json.dump(default_config, f, indent=2)
        
        self.data_sources = [DataSourceConfig(**source) for source in default_config["data_sources"]]
    
    def load_last_run_state(self):
        """Load state from last run to determine what's new"""
        if self.state_file.exists():
            with open(self.state_file, 'r') as f:
                self.last_run_state = json.load(f)
        else:
            self.last_run_state = {
                "last_run_timestamp": None,
                "file_checksums": {},
                "git_commit_hashes": {},
                "processed_changes": []
            }
    
    def save_current_state(self):
        """Save current state for next run"""
        current_state = {
            "last_run_timestamp": datetime.now().isoformat(),
            "file_checksums": self._calculate_current_file_checksums(),
            "git_commit_hashes": self._get_current_git_commits(),
            "processed_changes": [change.evidence_id for change in self.detected_changes]
        }
        
        with open(self.state_file, 'w') as f:
            json.dump(current_state, f, indent=2)
    
    async def detect_all_changes(self) -> List[ChangeDetection]:
        """Detect changes across all configured data sources"""
        print("🔍 Detecting changes across all data sources...")
        
        self.detected_changes = []
        
        for source in self.data_sources:
            if not source.enabled:
                continue
                
            print(f"📊 Checking {source.name} ({source.type})")
            
            try:
                if source.type == "github":
                    changes = await self._detect_git_changes(source)
                elif source.type == "local_files":
                    changes = await self._detect_file_changes(source)
                elif source.type == "google_docs":
                    changes = await self._detect_google_docs_changes(source)
                elif source.type == "slack":
                    changes = await self._detect_slack_changes(source)
                else:
                    print(f"⚠️ Unknown source type: {source.type}")
                    continue
                
                self.detected_changes.extend(changes)
                print(f"✅ Found {len(changes)} changes in {source.name}")
                
            except Exception as e:
                print(f"❌ Error detecting changes in {source.name}: {e}")
        
        print(f"🎯 Total changes detected: {len(self.detected_changes)}")
        return self.detected_changes
    
    async def _detect_git_changes(self, source: DataSourceConfig) -> List[ChangeDetection]:
        """Detect changes in Git repository"""
        changes = []
        repo_path = source.config.get("path", ".")
        
        try:
            repo = Repo(repo_path)
            last_commit_hash = self.last_run_state.get("git_commit_hashes", {}).get(source.name)
            
            if last_commit_hash:
                # Get commits since last check
                commits = list(repo.iter_commits(f"{last_commit_hash}..HEAD"))
            else:
                # First run - get recent commits (last 24 hours)
                since_date = datetime.now() - timedelta(days=1)
                commits = list(repo.iter_commits(since=since_date))
            
            for commit in commits:
                # Process each file in the commit
                for file_path in commit.stats.files.keys():
                    if self._should_process_file(file_path, source.config.get("file_patterns", [])):
                        try:
                            file_content = (repo.git.show(f"{commit.hexsha}:{file_path}"))
                            
                            change = ChangeDetection(
                                source_name=source.name,
                                source_type="github_commit",
                                change_type="modified",  # Could be refined to detect add/delete
                                timestamp=commit.committed_datetime,
                                content=file_content[:5000],  # Limit content size
                                metadata={
                                    "commit_hash": commit.hexsha,
                                    "commit_message": commit.message.strip(),
                                    "author": str(commit.author),
                                    "file_path": file_path
                                },
                                evidence_id=f"git_{source.name}_{commit.hexsha}_{file_path}"
                            )
                            changes.append(change)
                        except Exception as e:
                            print(f"⚠️ Could not read file {file_path} from commit {commit.hexsha}: {e}")
                            
        except Exception as e:
            print(f"❌ Error reading Git repository {repo_path}: {e}")
        
        return changes
    
    async def _detect_file_changes(self, source: DataSourceConfig) -> List[ChangeDetection]:
        """Detect changes in local files"""
        changes = []
        file_patterns = source.config.get("paths", [])
        
        current_checksums = {}
        last_checksums = self.last_run_state.get("file_checksums", {})
        
        for pattern in file_patterns:
            for file_path in Path(".").glob(pattern):
                if file_path.is_file():
                    try:
                        content = file_path.read_text(encoding='utf-8', errors='ignore')
                        checksum = hashlib.md5(content.encode()).hexdigest()
                        current_checksums[str(file_path)] = checksum
                        
                        # Check if file is new or modified
                        if str(file_path) not in last_checksums or last_checksums[str(file_path)] != checksum:
                            change = ChangeDetection(
                                source_name=source.name,
                                source_type="file_modification",
                                change_type="modified" if str(file_path) in last_checksums else "added",
                                timestamp=datetime.fromtimestamp(file_path.stat().st_mtime),
                                content=content[:5000],  # Limit content size
                                metadata={
                                    "file_path": str(file_path),
                                    "file_size": file_path.stat().st_size,
                                    "checksum": checksum
                                },
                                evidence_id=f"file_{source.name}_{checksum}_{file_path.name}"
                            )
                            changes.append(change)
                    except Exception as e:
                        print(f"⚠️ Could not read file {file_path}: {e}")
        
        # Update checksums for this source
        source_key = f"file_checksums_{source.name}"
        if source_key not in self.last_run_state:
            self.last_run_state[source_key] = {}
        self.last_run_state[source_key].update(current_checksums)
        
        return changes
    
    async def _detect_google_docs_changes(self, source: DataSourceConfig) -> List[ChangeDetection]:
        """Detect changes in Google Docs (placeholder for API integration)"""
        # TODO: Implement Google Docs API integration
        print("📄 Google Docs change detection not yet implemented")
        return []
    
    async def _detect_slack_changes(self, source: DataSourceConfig) -> List[ChangeDetection]:
        """Detect changes in Slack (placeholder for API integration)"""
        # TODO: Implement Slack API integration  
        print("💬 Slack change detection not yet implemented")
        return []
    
    def _should_process_file(self, file_path: str, patterns: List[str]) -> bool:
        """Check if file matches any of the patterns"""
        if not patterns:
            return True
            
        for pattern in patterns:
            if file_path.endswith(pattern.replace("*", "")):
                return True
        return False
    
    def _calculate_current_file_checksums(self) -> Dict[str, str]:
        """Calculate checksums for all tracked files"""
        checksums = {}
        for source in self.data_sources:
            if source.type == "local_files":
                for pattern in source.config.get("paths", []):
                    for file_path in Path(".").glob(pattern):
                        if file_path.is_file():
                            try:
                                content = file_path.read_text(encoding='utf-8', errors='ignore')
                                checksums[str(file_path)] = hashlib.md5(content.encode()).hexdigest()
                            except:
                                pass
        return checksums
    
    def _get_current_git_commits(self) -> Dict[str, str]:
        """Get current HEAD commit for all Git sources"""
        commits = {}
        for source in self.data_sources:
            if source.type == "github":
                try:
                    repo = Repo(source.config.get("path", "."))
                    commits[source.name] = repo.head.commit.hexsha
                except:
                    pass
        return commits

class ConsolidatedSourceOfTruthGenerator:
    """Generates consolidated markdown file from detected changes"""
    
    def __init__(self, output_dir: str = "./consolidated_changes"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def generate_consolidated_file(self, changes: List[ChangeDetection]) -> Path:
        """Generate consolidated markdown file with all changes"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = self.output_dir / f"consolidated_changes_{timestamp}.md"
        
        print(f"📝 Generating consolidated source of truth: {output_file}")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            self._write_header(f, changes)
            self._write_change_summary(f, changes)
            self._write_changes_by_source(f, changes)
            self._write_changes_by_type(f, changes)
            self._write_detailed_evidence(f, changes)
        
        print(f"✅ Consolidated file generated with {len(changes)} changes")
        return output_file
    
    def _write_header(self, f, changes: List[ChangeDetection]):
        """Write file header with metadata"""
        f.write("# Consolidated Source of Truth - New Changes\n\n")
        f.write(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Total Changes**: {len(changes)}\n")
        f.write(f"**Change Period**: {self._get_change_period(changes)}\n\n")
        f.write("---\n\n")
    
    def _write_change_summary(self, f, changes: List[ChangeDetection]):
        """Write executive summary of changes"""
        f.write("## 📊 Change Summary\n\n")
        
        # Count by source
        source_counts = {}
        for change in changes:
            source_counts[change.source_name] = source_counts.get(change.source_name, 0) + 1
        
        f.write("### By Data Source\n")
        for source, count in sorted(source_counts.items()):
            f.write(f"- **{source}**: {count} changes\n")
        
        # Count by type
        type_counts = {}
        for change in changes:
            type_counts[change.change_type] = type_counts.get(change.change_type, 0) + 1
        
        f.write("\n### By Change Type\n")
        for change_type, count in sorted(type_counts.items()):
            f.write(f"- **{change_type.title()}**: {count} changes\n")
        
        f.write("\n---\n\n")
    
    def _write_changes_by_source(self, f, changes: List[ChangeDetection]):
        """Write changes organized by data source"""
        f.write("## 🗂️ Changes by Data Source\n\n")
        
        # Group changes by source
        changes_by_source = {}
        for change in changes:
            if change.source_name not in changes_by_source:
                changes_by_source[change.source_name] = []
            changes_by_source[change.source_name].append(change)
        
        for source_name, source_changes in sorted(changes_by_source.items()):
            f.write(f"### {source_name}\n")
            f.write(f"*{len(source_changes)} changes detected*\n\n")
            
            for change in sorted(source_changes, key=lambda x: x.timestamp, reverse=True):
                f.write(f"#### [{change.evidence_id}]\n")
                f.write(f"- **Type**: {change.change_type}\n")
                f.write(f"- **Timestamp**: {change.timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n")
                if change.metadata.get('file_path'):
                    f.write(f"- **File**: `{change.metadata['file_path']}`\n")
                if change.metadata.get('commit_message'):
                    f.write(f"- **Commit**: {change.metadata['commit_message']}\n")
                f.write(f"- **Content Preview**: {change.content[:200]}...\n\n")
        
        f.write("---\n\n")
    
    def _write_changes_by_type(self, f, changes: List[ChangeDetection]):
        """Write changes organized by type (technical, documentation, configuration)"""
        f.write("## 🏷️ Changes by Category\n\n")
        
        # Categorize changes
        categories = {
            "Technical Code": [],
            "Documentation": [],
            "Configuration": [],
            "Other": []
        }
        
        for change in changes:
            file_path = change.metadata.get('file_path', '')
            if any(ext in file_path for ext in ['.py', '.js', '.ts', '.jsx', '.tsx']):
                categories["Technical Code"].append(change)
            elif any(ext in file_path for ext in ['.md', '.rst', '.txt']):
                categories["Documentation"].append(change)
            elif any(ext in file_path for ext in ['.json', '.yml', '.yaml', '.env']):
                categories["Configuration"].append(change)
            else:
                categories["Other"].append(change)
        
        for category, category_changes in categories.items():
            if category_changes:
                f.write(f"### {category} ({len(category_changes)} changes)\n")
                for change in category_changes:
                    f.write(f"- **{change.source_name}**: {change.metadata.get('file_path', 'Unknown file')}\n")
                f.write("\n")
        
        f.write("---\n\n")
    
    def _write_detailed_evidence(self, f, changes: List[ChangeDetection]):
        """Write detailed evidence for each change"""
        f.write("## 📋 Detailed Evidence\n\n")
        f.write("*Complete content of all detected changes for LLM analysis*\n\n")
        
        for i, change in enumerate(sorted(changes, key=lambda x: x.timestamp, reverse=True), 1):
            f.write(f"### Evidence {i}: {change.evidence_id}\n\n")
            f.write(f"**Source**: {change.source_name}\n")
            f.write(f"**Type**: {change.source_type}\n")
            f.write(f"**Change**: {change.change_type}\n")
            f.write(f"**Timestamp**: {change.timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n")
            
            # Write metadata
            f.write(f"**Metadata**:\n")
            for key, value in change.metadata.items():
                f.write(f"- {key}: {value}\n")
            
            f.write(f"\n**Content**:\n")
            f.write("```\n")
            f.write(change.content)
            f.write("\n```\n\n")
            f.write("---\n\n")
    
    def _get_change_period(self, changes: List[ChangeDetection]) -> str:
        """Get the time period covered by changes"""
        if not changes:
            return "No changes"
        
        timestamps = [change.timestamp for change in changes]
        earliest = min(timestamps)
        latest = max(timestamps)
        
        if earliest.date() == latest.date():
            return f"{earliest.strftime('%Y-%m-%d')}"
        else:
            return f"{earliest.strftime('%Y-%m-%d')} to {latest.strftime('%Y-%m-%d')}"

# Main execution function
async def main():
    """Main function to detect changes and generate consolidated source of truth"""
    
    # Initialize components
    detector = IncrementalChangeDetector()
    generator = ConsolidatedSourceOfTruthGenerator()
    
    print("🚀 Starting incremental change detection...")
    
    # Detect all changes
    changes = await detector.detect_all_changes()
    
    if not changes:
        print("📭 No new changes detected since last run")
        return None
    
    # Generate consolidated source of truth
    consolidated_file = generator.generate_consolidated_file(changes)
    
    # Save state for next run
    detector.save_current_state()
    
    print(f"✅ Process complete! Consolidated file: {consolidated_file}")
    return consolidated_file

if __name__ == "__main__":
    asyncio.run(main()) 