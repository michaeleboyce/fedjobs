#!/bin/bash

# This script exports a directory tree structure and the contents of specific key files
# into a single file named "key-contents.txt". Then it updates your project's package.json
# to add a new script called "export-key-contents".
#
# Below are the files that are likely most critical to refactor
# (configuration, main entry points, or representative routes/services).
# Adjust this list if needed.

############################################
# 1) CONFIGURE WHICH FILES TO EXPORT       #
############################################
KEY_FILES=(
    # Root config and scripts
    "package.json"
    "turbo.json"
    "tsconfig.json"
    "vitest.config.ts"

    # Apps/api essential
    "apps/api/package.json"
    "apps/api/tsconfig.json"
    "apps/api/src/config.ts"
    "apps/api/src/index.ts"
    "apps/api/src/routes/documentParse.ts"
    "apps/api/src/routes/generate.ts"
    "apps/api/src/routes/parse.ts"
    "apps/api/src/routes/parsingStatus.ts"
    "apps/api/src/services/parsingService.ts"

    # Additional apps/api
    "apps/api/src/backend-utils/DocumentParsers.ts"
    "apps/api/src/backend-utils/pdf-parse.d.ts"
    "apps/api/src/middleware/error.ts"
    "apps/api/tests/services/parsingService.test.ts"
    "apps/api/src/types/index.ts"
    # Apps/web essential
    "apps/web/package.json"
    "apps/web/tsconfig.json"
    "apps/web/next.config.js"
    "apps/web/tailwind.config.ts"
    "apps/web/app/layout.tsx"
    "apps/web/app/page.tsx"
    # ADDITIONS FOR APPS/WEB
    "apps/web/app/(routes)/api/ai/generate/(utils)/callApi.ts"
    "apps/web/app/(routes)/api/ai/generate/(utils)/callAndStream.ts"
    "apps/web/app/(routes)/api/ai/generate/(utils)/OpenAIStream.ts"
    "apps/web/app/(routes)/api/ai/generate/(utils)/ClaudeStream.ts"
    "apps/web/app/(routes)/api/ai/generate/(utils)/streamHandler.ts"
    "apps/web/app/(routes)/api/ai/generate/(utils)/interfaces.ts"
    "apps/web/app/(routes)/api/ai/generate/(utils)/types.ts"
    "apps/web/app/documents/_Components/DocumentCard.tsx"
    "apps/web/app/documents/_Components/FileUploadBox.tsx"
    "apps/web/app/_components/TopBar.tsx"
    "apps/web/app/_components/Breadcrumbs.tsx"
    "apps/web/_utils/resumeProcessor.ts"

    # Database config and connection
    "packages/database/package.json"
    "packages/database/tsconfig.json"
    "packages/database/drizzle.config.ts"
    "packages/database/src/db-connection.ts"

    # ADDITIONS FOR PACKAGES/DATABASE
    "packages/database/src/queries/documentQueries.ts"
    "packages/database/src/queries/parsingQueries.ts"
    "packages/database/src/queries/positionQueries.ts"
    "packages/database/src/schema/documents.ts"
    "packages/database/src/schema/generations.ts"
    "packages/database/src/schema/parsings.ts"
    "packages/database/src/schema/positions.ts"

    # Shared types
    "packages/types/package.json"
    "packages/types/tsconfig.json"
    "packages/types/src/index.ts"

    # Utils
    "packages/utils/package.json"
    "packages/utils/tsconfig.json"
    "packages/utils/vitest.config.ts"
    "packages/utils/src/index.ts"

    # ADDITIONS FOR PACKAGES/UTILS
    "packages/utils/src/Parsers/ResumeParsers.ts"
    "packages/utils/src/Services/S3Service/index.ts"

)

############################################
# 2) EXPORT FILE CONTENTS + DIRECTORY TREE #
############################################
export_key_contents() {
    # Clear (or create) key-contents.txt
    echo "===== KEY FILES CONTENTS =====" > key-contents.txt

    # Loop through each important file and append contents
    for file in "${KEY_FILES[@]}"; do
        if [ -f "$file" ]; then
            echo -e "\n\n===== $file =====" >> key-contents.txt
            cat "$file" >> key-contents.txt
        else
            echo -e "\n\n===== $file NOT FOUND =====" >> key-contents.txt
        fi
    done

    echo -e "\n\n===== DIRECTORY TREE STRUCTURE =====" >> key-contents.txt
    # Use 'tree' to generate the directory structure, ignoring common build or version-control directories
    tree -I 'node_modules|dist|build|.git|*.log|*.md' -P 'package.json|tsconfig.json|turbo.json|next.config.js|*.js|*.ts|*.tsx' -a -F >> key-contents.txt

    echo -e "\nDone! Exported file contents and directory tree to key-contents.txt\n"
}


############################################
# 4) MAIN SCRIPT EXECUTION                 #
############################################
export_key_contents

echo -e "\nUsage:\n  chmod +x projectRefactor.sh\n  ./projectRefactor.sh\nThen you can run:\n  npm run export-key-contents\n  pnpm run export-key-contents\n  yarn export-key-contents\n"
