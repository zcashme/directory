#!/bin/bash

# Count lines of code in the application
# Excludes blank lines, comments, and generated files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Counting Lines of Code ===${NC}\n"

# Check if cloc is available (most accurate tool)
if command -v cloc &> /dev/null; then
    echo -e "${GREEN}Using cloc (Code Line Counter)${NC}\n"

    cloc . \
        --exclude-dir=node_modules,.next,dist,build,.git,.turbo,coverage,.vercel,out \
        --exclude-ext=json,md,lock,yaml,yml,txt,log \
        --not-match-f='(package-lock|yarn.lock|\.d\.ts$)' \
        --quiet

    echo -e "\n${YELLOW}Note: Excludes comments, blank lines, and generated files${NC}"

elif command -v tokei &> /dev/null; then
    echo -e "${GREEN}Using tokei${NC}\n"

    tokei . \
        --exclude node_modules .next dist build .git .turbo coverage .vercel out \
        --type TypeScript,JavaScript,TSX,CSS,SCSS

    echo -e "\n${YELLOW}Note: Excludes comments, blank lines, and generated files${NC}"

else
    echo -e "${YELLOW}Neither cloc nor tokei found. Using basic grep method.${NC}"
    echo -e "${YELLOW}Install cloc for more accurate counts: brew install cloc${NC}\n"

    # Fallback: count non-blank, non-comment lines in source files
    total=0

    # TypeScript/TSX files
    ts_count=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/.next/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/.git/*" \
        ! -name "*.d.ts" \
        -exec grep -v '^\s*$' {} \; 2>/dev/null | \
        grep -v '^\s*//' | \
        grep -v '^\s*/\*' | \
        wc -l | tr -d ' ')

    # JavaScript/JSX files
    js_count=$(find . -type f \( -name "*.js" -o -name "*.jsx" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/.next/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        ! -path "*/.git/*" \
        -exec grep -v '^\s*$' {} \; 2>/dev/null | \
        grep -v '^\s*//' | \
        grep -v '^\s*/\*' | \
        wc -l | tr -d ' ')

    # CSS/SCSS files
    css_count=$(find . -type f \( -name "*.css" -o -name "*.scss" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/.next/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        -exec grep -v '^\s*$' {} \; 2>/dev/null | \
        grep -v '^\s*/\*' | \
        wc -l | tr -d ' ')

    total=$((ts_count + js_count + css_count))

    echo -e "${GREEN}Approximate Line Counts:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "TypeScript/TSX:  ${BLUE}$ts_count${NC}"
    echo -e "JavaScript/JSX:  ${BLUE}$js_count${NC}"
    echo -e "CSS/SCSS:        ${BLUE}$css_count${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Total:           ${GREEN}$total${NC}"
    echo ""
    echo -e "${YELLOW}Note: Approximation - excludes most blank lines and comments${NC}"
    echo -e "${YELLOW}For accurate counts, install cloc: brew install cloc${NC}"
fi

echo ""

# Show file counts
echo -e "${BLUE}=== File Counts ===${NC}"
ts_files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*" ! -name "*.d.ts" | wc -l | tr -d ' ')
js_files=$(find . -type f \( -name "*.js" -o -name "*.jsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*" | wc -l | tr -d ' ')
css_files=$(find . -type f \( -name "*.css" -o -name "*.scss" \) ! -path "*/node_modules/*" ! -path "*/.next/*" | wc -l | tr -d ' ')

echo "TypeScript/TSX files: $ts_files"
echo "JavaScript/JSX files: $js_files"
echo "CSS/SCSS files: $css_files"
echo ""

# Show largest files
echo -e "${BLUE}=== Top 10 Largest Files (by lines) ===${NC}"
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    ! -path "*/dist/*" \
    ! -name "*.d.ts" \
    -exec wc -l {} + 2>/dev/null | \
    sort -rn | \
    head -10 | \
    awk '{
        file=$2;
        gsub(/^\.\//, "", file);
        printf "  %5d  %s\n", $1, file
    }'

echo ""
