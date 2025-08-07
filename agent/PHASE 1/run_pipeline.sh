#!/bin/bash
"""
Guru Card Generation Pipeline - Execution Script
Implements the user's vision: Change Detection -> Consolidated Source of Truth -> Card Generation
"""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
API_KEY=""
OUTPUT_DIR="./pipeline_output"
MODE="normal"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show usage
show_usage() {
    echo "Guru Card Generation Pipeline"
    echo "============================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --api-key KEY        OpenAI API key (required)"
    echo "  --output-dir DIR     Output directory (default: ./pipeline_output)"
    echo "  --mode MODE          Execution mode: normal|force|webhook|scheduled (default: normal)"
    echo "  --webhook-data JSON  Webhook data for webhook mode"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --api-key sk-... --mode normal"
    echo "  $0 --api-key sk-... --mode force"
    echo "  $0 --api-key sk-... --mode webhook --webhook-data '{\"source\":\"github\"}'"
    echo ""
    echo "Environment Variables:"
    echo "  OPENAI_API_KEY      Can be used instead of --api-key"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-key)
            API_KEY="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --mode)
            MODE="$2"
            shift 2
            ;;
        --webhook-data)
            WEBHOOK_DATA="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_color $RED "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check for API key
if [ -z "$API_KEY" ]; then
    if [ -n "$OPENAI_API_KEY" ]; then
        API_KEY="$OPENAI_API_KEY"
    else
        print_color $RED "Error: OpenAI API key is required"
        print_color $YELLOW "Use --api-key or set OPENAI_API_KEY environment variable"
        exit 1
    fi
fi

# Validate mode
if [[ ! "$MODE" =~ ^(normal|force|webhook|scheduled)$ ]]; then
    print_color $RED "Error: Invalid mode '$MODE'"
    print_color $YELLOW "Valid modes: normal, force, webhook, scheduled"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

print_color $BLUE "🚀 Starting Guru Card Generation Pipeline"
print_color $BLUE "=========================================="
print_color $BLUE "Mode: $MODE"
print_color $BLUE "Output: $OUTPUT_DIR"
print_color $BLUE "Time: $(date)"
echo ""

# Check Python environment
print_color $YELLOW "🔍 Checking Python environment..."
if ! command -v python3 &> /dev/null; then
    print_color $RED "Error: python3 not found"
    exit 1
fi

# Install required dependencies if needed
print_color $YELLOW "📦 Checking dependencies..."
REQUIRED_PACKAGES=("openai" "gitpython" "aiohttp" "aiofiles")

for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! python3 -c "import $package" &> /dev/null; then
        print_color $YELLOW "Installing $package..."
        pip3 install $package
    fi
done

# Build Python command
PYTHON_CMD="python3 main_orchestrator.py --api-key '$API_KEY' --output-dir '$OUTPUT_DIR' --mode '$MODE'"

if [ -n "$WEBHOOK_DATA" ]; then
    PYTHON_CMD="$PYTHON_CMD --webhook-data '$WEBHOOK_DATA'"
fi

print_color $YELLOW "🏃 Executing pipeline..."
echo "Command: $PYTHON_CMD"
echo ""

# Execute the pipeline
eval $PYTHON_CMD
EXIT_CODE=$?

echo ""
print_color $BLUE "=========================================="

# Handle exit codes
case $EXIT_CODE in
    0)
        print_color $GREEN "✅ Pipeline completed successfully!"
        print_color $GREEN "📋 Guru cards have been generated"
        print_color $YELLOW "📁 Check output directory: $OUTPUT_DIR"
        ;;
    1)
        print_color $YELLOW "📭 Pipeline completed but no cards were generated"
        print_color $YELLOW "This usually means no new changes were detected"
        print_color $YELLOW "Try running with --mode force to process all sources"
        ;;
    2)
        print_color $RED "❌ Pipeline failed with errors"
        print_color $YELLOW "Check the logs above for details"
        ;;
    *)
        print_color $RED "❌ Pipeline exited with unexpected code: $EXIT_CODE"
        ;;
esac

exit $EXIT_CODE 