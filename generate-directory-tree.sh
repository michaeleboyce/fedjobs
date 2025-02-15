#!/bin/bash

# Generate a directory tree and save it to directory_tree.txt
tree -I 'node_modules|dist|build|.git|*.log|*.md' -P 'package.json|tsconfig.json|turbo.json|next.config.js|*.js|*.ts|*.tsx' -L 8 > directory_tree.txt

echo "Directory tree has been saved to directory_tree.txt"
