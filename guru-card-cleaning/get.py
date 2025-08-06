#!/usr/bin/env python3
"""
Guru Card Extractor

This script retrieves all Guru cards and their detailed content using the Guru API.
It first gets all card IDs using the search endpoint, then fetches detailed content
for each card using the extended card endpoint.

Usage:
    python get.py

Environment Variables Required:
    GURU_USERNAME: Your Guru username or email
    GURU_TOKEN: Your Guru API token
    
Optional Environment Variables:
    GURU_COLLECTION_ID: If using collection token instead of user token
"""

import os
import sys
import json
import requests
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode, urlparse, parse_qs
import base64

class GuruCardExtractor:
    def __init__(self):
        self.base_url = "https://api.getguru.com/api/v1"
        self.session = requests.Session()
        self.setup_authentication()
        self.output_dir = Path("guru_cards_export")
        self.output_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        (self.output_dir / "cards").mkdir(exist_ok=True)
        (self.output_dir / "metadata").mkdir(exist_ok=True)
        
    def setup_authentication(self):
        """Setup authentication for Guru API"""
        username = os.getenv('GURU_USERNAME')
        token = os.getenv('GURU_TOKEN')
        collection_id = os.getenv('GURU_COLLECTION_ID')
        
        if not token:
            print("Error: GURU_TOKEN environment variable is required")
            sys.exit(1)
            
        if collection_id:
            # Using collection token
            auth_string = f"{collection_id}:{token}"
            print(f"Using collection token for collection: {collection_id}")
        elif username:
            # Using user token
            auth_string = f"{username}:{token}"
            print(f"Using user token for user: {username}")
        else:
            print("Error: Either GURU_USERNAME or GURU_COLLECTION_ID is required")
            sys.exit(1)
            
        # Set up basic auth
        auth_bytes = auth_string.encode('ascii')
        auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
        self.session.headers.update({
            'Authorization': f'Basic {auth_b64}',
            'Content-Type': 'application/json'
        })
        
    def test_connection(self):
        """Test the API connection"""
        try:
            response = self.session.get(f"{self.base_url}/teams")
            response.raise_for_status()
            teams = response.json()
            print(f"✅ Successfully connected to Guru API")
            print(f"Found {len(teams)} team(s)")
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to connect to Guru API: {e}")
            return False
            
    def get_all_card_ids(self):
        """Get all card IDs using the search endpoint with Link header pagination"""
        print("🔍 Fetching all card IDs...")
        all_cards = []
        page = 1
        max_results = 50  # Maximum allowed by API
        next_url = None
        max_pages = 100  # Safety limit to prevent infinite loops
        
        while page <= max_pages:
            print(f"  📄 Fetching page {page}...")
            
            if next_url:
                # Use the next URL from Link header
                url = next_url
                params = {}
            else:
                # First request - use search endpoint with parameters
                url = f"{self.base_url}/search/query"
                params = {
                    'maxResults': max_results,
                    'sortField': 'lastModified',
                    'sortOrder': 'desc'
                }
            
            try:
                if next_url:
                    # For subsequent requests, use the full URL from Link header
                    response = self.session.get(url)
                else:
                    # For first request, use base URL with params
                    response = self.session.get(url, params=params)
                    
                response.raise_for_status()
                
                cards_data = response.json()
                
                if not cards_data:
                    print(f"  ✅ No more cards found. Total pages processed: {page}")
                    break
                    
                print(f"  📋 Found {len(cards_data)} cards on page {page}")
                all_cards.extend(cards_data)
                
                # Check for Link header to get next page URL
                link_header = response.headers.get('Link')
                next_url = None
                
                if link_header:
                    print(f"  🔍 Link header: {link_header}")
                    # Parse Link header to find next page URL
                    # Format: < https://api.getguru.com/api/v1/search/query?token=... >; rel="next-page"
                    import re
                    next_match = re.search(r'<([^>]+)>;\s*rel="next-page"', link_header)
                    if next_match:
                        next_url = next_match.group(1)
                        print(f"  🔗 Found next page URL: {next_url[:100]}...")
                    else:
                        print(f"  ✅ No more pages found in Link header")
                        break
                else:
                    print(f"  ✅ No Link header found - reached last page")
                    break
                    
                page += 1
                
                # Rate limiting - be nice to the API
                time.sleep(0.5)
                
            except requests.exceptions.RequestException as e:
                print(f"  ❌ Error fetching page {page}: {e}")
                break
        
        if page > max_pages:
            print(f"  ⚠️  Reached maximum page limit ({max_pages}) - stopping to prevent infinite loop")
                
        print(f"🎉 Total cards found: {len(all_cards)}")
        return all_cards
        
    def get_card_details(self, card_id):
        """Get detailed card information using the extended endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/cards/{card_id}/extended")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Error fetching card {card_id}: {e}")
            return None
            
    def sanitize_filename(self, filename):
        """Sanitize filename for safe file system usage"""
        import re
        # Remove or replace invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Limit length
        if len(filename) > 200:
            filename = filename[:200]
        return filename.strip()
        
    def save_card_content(self, card_data, card_summary):
        """Save card content to files"""
        card_id = card_data.get('id', 'unknown')
        title = card_data.get('preferredPhrase', 'Untitled')
        
        # Sanitize title for filename
        safe_title = self.sanitize_filename(title)
        filename_base = f"{card_id}_{safe_title}"
        
        # Save full card data as JSON
        json_file = self.output_dir / "cards" / f"{filename_base}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(card_data, f, indent=2, ensure_ascii=False)
            
        # Save card content as markdown if available
        content = card_data.get('content', '')
        if content:
            md_file = self.output_dir / "cards" / f"{filename_base}.md"
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(f"# {title}\n\n")
                f.write(f"**Card ID:** {card_id}\n")
                f.write(f"**Created:** {card_data.get('dateCreated', 'Unknown')}\n")
                f.write(f"**Last Modified:** {card_data.get('lastModified', 'Unknown')}\n")
                f.write(f"**Verification State:** {card_data.get('verificationState', 'Unknown')}\n")
                f.write(f"**Share Status:** {card_data.get('shareStatus', 'Unknown')}\n\n")
                f.write("---\n\n")
                f.write(content)
                
        return {
            'card_id': card_id,
            'title': title,
            'json_file': str(json_file),
            'md_file': str(md_file) if content else None,
            'has_content': bool(content),
            'verification_state': card_data.get('verificationState', 'Unknown'),
            'last_modified': card_data.get('lastModified', 'Unknown')
        }
        
    def create_summary_report(self, processed_cards):
        """Create a summary report of all processed cards"""
        summary = {
            'export_date': datetime.now().isoformat(),
            'total_cards': len(processed_cards),
            'cards_with_content': sum(1 for card in processed_cards if card['has_content']),
            'verification_states': {},
            'cards': processed_cards
        }
        
        # Count verification states
        for card in processed_cards:
            state = card['verification_state']
            summary['verification_states'][state] = summary['verification_states'].get(state, 0) + 1
            
        # Save summary
        summary_file = self.output_dir / "export_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
            
        # Create readable summary
        readme_file = self.output_dir / "README.md"
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write("# Guru Cards Export\n\n")
            f.write(f"**Export Date:** {summary['export_date']}\n")
            f.write(f"**Total Cards:** {summary['total_cards']}\n")
            f.write(f"**Cards with Content:** {summary['cards_with_content']}\n\n")
            
            f.write("## Verification States\n\n")
            for state, count in summary['verification_states'].items():
                f.write(f"- **{state}:** {count} cards\n")
                
            f.write("\n## Directory Structure\n\n")
            f.write("```\n")
            f.write("guru_cards_export/\n")
            f.write("├── cards/              # Individual card files\n")
            f.write("│   ├── *.json         # Full card data\n")
            f.write("│   └── *.md           # Card content in markdown\n")
            f.write("├── metadata/          # Additional metadata\n")
            f.write("├── export_summary.json # Export summary\n")
            f.write("└── README.md          # This file\n")
            f.write("```\n\n")
            
            f.write("## Card List\n\n")
            for card in processed_cards:
                f.write(f"- **{card['title']}** (`{card['card_id']}`)\n")
                f.write(f"  - Verification: {card['verification_state']}\n")
                f.write(f"  - Last Modified: {card['last_modified']}\n")
                f.write(f"  - Has Content: {'Yes' if card['has_content'] else 'No'}\n\n")
                
        print(f"📋 Summary report saved to: {readme_file}")
        
    def run(self):
        """Main execution method"""
        print("🚀 Starting Guru Card Export...")
        
        # Test connection
        if not self.test_connection():
            return False
            
        # Get all card IDs
        card_summaries = self.get_all_card_ids()
        if not card_summaries:
            print("❌ No cards found or error occurred")
            return False
            
        # Process each card
        print(f"\n📥 Fetching detailed content for {len(card_summaries)} cards...")
        processed_cards = []
        
        for i, card_summary in enumerate(card_summaries, 1):
            card_id = card_summary.get('id')
            title = card_summary.get('preferredPhrase', 'Untitled')
            
            print(f"  🔄 [{i}/{len(card_summaries)}] Processing: {title}")
            
            # Get detailed card data
            card_data = self.get_card_details(card_id)
            if card_data:
                # Save card content
                processed_card = self.save_card_content(card_data, card_summary)
                processed_cards.append(processed_card)
                print(f"    ✅ Saved: {processed_card['json_file']}")
            else:
                print(f"    ❌ Failed to fetch details for card: {card_id}")
                
            # Rate limiting
            time.sleep(0.5)
            
        # Create summary report
        print(f"\n📊 Creating summary report...")
        self.create_summary_report(processed_cards)
        
        print(f"\n🎉 Export completed successfully!")
        print(f"📁 Output directory: {self.output_dir.absolute()}")
        print(f"📈 Processed: {len(processed_cards)} cards")
        
        return True

def main():
    """Main function"""
    print("Guru Card Extractor")
    print("==================")
    
    # Check for required environment variables
    if not os.getenv('GURU_TOKEN'):
        print("\n❌ Missing required environment variables!")
        print("\nPlease set the following environment variables:")
        print("  GURU_TOKEN=your_api_token")
        print("  GURU_USERNAME=your_username  (or GURU_COLLECTION_ID=collection_id)")
        print("\nExample:")
        print("  export GURU_TOKEN='your_token_here'")
        print("  export GURU_USERNAME='your_email@company.com'")
        print("  python get.py")
        sys.exit(1)
        
    # Create and run extractor
    extractor = GuruCardExtractor()
    success = extractor.run()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
