#!/bin/bash

echo "Guru Card Extractor Setup"
echo "========================"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found. Please install Python 3."
    exit 1
fi

echo "✅ Python 3 found"

# Install dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check for environment variables
echo ""
echo "🔧 Environment Variables Setup"
echo "=============================="

if [ -z "$GURU_TOKEN" ]; then
    echo "❌ GURU_TOKEN environment variable not set"
    echo ""
    echo "Please set your Guru API credentials:"
    echo "1. Get your API token from Guru:"
    echo "   - Go to Settings > API Access in your Guru account"
    echo "   - Generate a new token"
    echo ""
    echo "2. Set environment variables:"
    echo "   export GURU_TOKEN='your_token_here'"
    echo "   export GURU_USERNAME='your_email@company.com'"
    echo ""
    echo "   OR (if using collection token):"
    echo "   export GURU_TOKEN='your_collection_token_here'"
    echo "   export GURU_COLLECTION_ID='your_collection_id'"
    echo ""
    echo "3. Run the script:"
    echo "   python3 get.py"
    echo ""
else
    echo "✅ GURU_TOKEN is set"
    
    if [ -n "$GURU_USERNAME" ]; then
        echo "✅ GURU_USERNAME is set (using user token)"
        echo ""
        echo "Ready to run! Execute:"
        echo "  python3 get.py"
    elif [ -n "$GURU_COLLECTION_ID" ]; then
        echo "✅ GURU_COLLECTION_ID is set (using collection token)"
        echo ""
        echo "Ready to run! Execute:"
        echo "  python3 get.py"
    else
        echo "❌ Either GURU_USERNAME or GURU_COLLECTION_ID must be set"
        echo ""
        echo "Please set one of the following:"
        echo "  export GURU_USERNAME='your_email@company.com'"
        echo "  OR"
        echo "  export GURU_COLLECTION_ID='your_collection_id'"
    fi
fi

echo ""
echo "📚 For more information, see the Guru API documentation:"
echo "   https://developer.getguru.com/docs/getting-started" 