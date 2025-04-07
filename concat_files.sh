#!/bin/bash

# Usage: ./concat_files.sh [--no-tests] <search_path> <output_file>

# Check for optional --no-tests flag
no_tests=0
if [ "$1" == "--no-tests" ]; then
  no_tests=1
  shift
fi

# Validate arguments: now expecting exactly 2 arguments
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 [--no-tests] <search_path> <output_file>"
  exit 1
fi

SEARCH_PATH="$1"
OUTPUT_FILE="$2"

# Check if the provided search path is a directory
if [ ! -d "$SEARCH_PATH" ]; then
  echo "Error: Directory '$SEARCH_PATH' does not exist."
  exit 1
fi

# Remove the output file if it already exists to avoid appending to old content
if [ -f "$OUTPUT_FILE" ]; then
  rm "$OUTPUT_FILE"
fi

# Build extra find arguments if --no-tests is provided.
# It will exclude any files under directories that contain 'tests' or '__tests__'
# as well as files with names containing '.test' or '.spec' (case-insensitively).
if [ "$no_tests" -eq 1 ]; then
  extra_args=(-not '(' -path "*/tests/*" -o -path "*/__tests__/*" -o -iname "*test.*" -o -iname "*spec.*" ')')
else
  extra_args=()
fi

# Use find to locate files with the desired patterns,
# while excluding the unwanted directories (dist, node_modules, .turbo) and,
# if specified, test files/directories.
while IFS= read -r file; do
  echo "File: ${file}" >> "$OUTPUT_FILE"
  echo "----------------------------------------" >> "$OUTPUT_FILE"
  cat "$file" >> "$OUTPUT_FILE"
  echo -e "\n\n" >> "$OUTPUT_FILE"
done < <(
  find "$SEARCH_PATH" \
    \( -path "*/dist/*" -o -path "*/node_modules/*" -o -path "*/.turbo/*" \) -prune -o \
    -type f "${extra_args[@]}" -and \
    \( -name "*.ts" -o -name "*.tsx" -o -name "package.json" -o -name "tsconfig.json" \) -print
)

echo "Files have been concatenated into '$OUTPUT_FILE'"
