#!/bin/bash
set -e

echo "Running Python linting..."

# Check Python code with flake8
cd apps/api
echo "  Checking with flake8..."
python -m flake8 app

# Format Python code with black (check only)
echo "  Checking formatting with black..."
python -m black --check app

# Sort imports with isort (check only)
echo "  Checking import sorting with isort..."
python -m isort --check-only app

echo "Python linting completed successfully!"

echo "Running TypeScript/JavaScript linting..."

# Check web app
cd ../web
echo "  Checking TypeScript compilation..."
if command -v tsc &> /dev/null; then
    npx tsc --noEmit
else
    echo "  TypeScript compiler not available, skipping type check"
fi

echo "Linting completed successfully!"