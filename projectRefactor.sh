#!/bin/bash

# Script to export contents of critical files into a single file
# Excludes node_modules, dist, build, .git, logs, etc.

OUTPUT_FILE="key-contents.txt"

# Clear the output file if it exists
> "$OUTPUT_FILE"

# Function to append file content with a header
append_file() {
  local file="$1"
  
  # Check if file exists and is not a binary file
  if [[ -f "$file" && ! $(file --mime "$file" | grep -i "binary") ]]; then
    echo -e "\n\n# ===============================================" >> "$OUTPUT_FILE"
    echo -e "# FILE: $file" >> "$OUTPUT_FILE"
    echo -e "# ===============================================\n" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
  fi
}

# Find and export TypeScript/React files
echo "Exporting TypeScript and React files..."
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.git/*" \
  -not -path "*/tests/*" \
  -not -path "*/__tests__/*" \
  | while read -r file; do
    append_file "$file"
  done

# Export important config files
echo "Exporting configuration files..."
find . -type f \( -name "package.json" -o -name "tsconfig.json" -o -name "next.config.js" -o -name "turbo.json" -o -name "drizzle.config.ts" -o -name "tailwind.config.ts" -o -name "postcss.config.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.git/*" \
  | while read -r file; do
    append_file "$file"
  done

# Count files and get file size
FILE_COUNT=$(grep -c "# FILE:" "$OUTPUT_FILE")
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo "Export complete!"
echo "Exported $FILE_COUNT files to $OUTPUT_FILE (Size: $FILE_SIZE)"