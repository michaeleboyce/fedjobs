// add-file-path-comments.js

const fs = require('fs');
const path = require('path');

// Define the project root. Adjust if your script is located elsewhere.
const projectRoot = path.resolve(__dirname);

// Define the comment format. Adjust for TypeScript/JavaScript as needed.
const commentFormat = (relativePath) => `// File path: ${relativePath}\n`;

// Function to add or update the file path comment
function addOrUpdateComment(filePath) {
  const relativePath = path.relative(projectRoot, filePath);
  const comment = commentFormat(relativePath);
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if the first line is already a file path comment
  if (content.startsWith('// File path:')) {
    // Replace the existing comment
    content = content.replace(/^\/\/ File path:.*\n/, comment);
  } else {
    // Insert the comment at the top
    content = comment + content;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated: ${relativePath}`);
}

// Recursive function to walk through directories
function walkDirectory(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip node_modules and other unwanted directories
      if (file !== 'node_modules' && file !== '.git') {
        walkDirectory(fullPath);
      }
    } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
      addOrUpdateComment(fullPath);
    }
  });
}

// Execute the script
walkDirectory(projectRoot);
