#!/bin/bash

# Phase 1 Orchestrator Runner
# Automates the organizational discovery and planning phase

echo "🚀 Phase 1: Organizational Discovery & Planning"
echo "==============================================="

# Check if OpenAI API key is provided
if [ -z "$OPENAI_API_KEY" ] && [ -z "$1" ]; then
    echo "❌ Error: OpenAI API key required"
    echo "Usage: $0 <OPENAI_API_KEY>"
    echo "   or: export OPENAI_API_KEY=your_key && $0"
    exit 1
fi

# Use provided key or environment variable
API_KEY=${1:-$OPENAI_API_KEY}

# Set output directory
OUTPUT_DIR=${2:-"./phase1_output"}

echo "📁 Output directory: $OUTPUT_DIR"
echo "🔑 API key: ${API_KEY:0:8}..."

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Install required dependencies if they don't exist
if ! python3 -c "import openai" 2>/dev/null; then
    echo "📦 Installing OpenAI Python package..."
    pip3 install openai
fi

if ! python3 -c "import aiohttp" 2>/dev/null; then
    echo "📦 Installing aiohttp..."
    pip3 install aiohttp
fi

if ! python3 -c "import bs4" 2>/dev/null; then
    echo "📦 Installing BeautifulSoup4..."
    pip3 install beautifulsoup4
fi

# Run the Phase 1 orchestrator
echo "🏃 Running Phase 1 analysis..."
python3 phase_1_orchestrator.py --api-key="$API_KEY" --output-dir="$OUTPUT_DIR"

# Check if execution was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Phase 1 completed successfully!"
    echo "📊 Check the following files in $OUTPUT_DIR:"
    echo "   - data_sources_*.csv (discovered data sources)"
    echo "   - card_requirements_*.csv (identified card needs)"
    echo "   - analysis_log_*.csv (detailed analysis log)"
    echo "   - phase1_summary_*.md (executive summary)"
    echo ""
    echo "🔄 Next steps:"
    echo "1. Review the card requirements CSV file"
    echo "2. Add SME contacts and adjust priorities"
    echo "3. Begin Phase 2: Interactive Card Development"
else
    echo "❌ Phase 1 execution failed. Check the error messages above."
    exit 1
fi 