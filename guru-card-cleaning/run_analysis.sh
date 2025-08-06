#!/bin/bash

# Guru Card Analysis Script
# Make sure to set your OpenAI API key before running

echo "🔍 Starting Guru Card Analysis..."
echo "================================================"

# Check if API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY environment variable is not set"
    echo "Please set it with: export OPENAI_API_KEY='your-api-key-here'"
    exit 1
fi

# Install dependencies if needed
if ! python3 -c "import openai, bs4" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip3 install -r requirements_analyzer.txt
fi

# Test the parser first
echo "🧪 Testing HTML parser..."
python3 test_parser.py

echo ""
echo "🚀 Starting full analysis..."

# Run the analysis
python3 guru_card_analyzer.py \
    --cards-dir "guru_cards_export/cards" \
    --api-key "$OPENAI_API_KEY" \
    --batch-size 15 \
    --output "guru_analysis_results.json"

echo ""
echo "✅ Analysis complete! Check guru_analysis_results.json for detailed results." 