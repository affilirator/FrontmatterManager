#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Import chalk based on availability
let chalk;
try {
  chalk = require('chalk');
} catch (error) {
  // Create a simple chalk replacement if not available
  chalk = {
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
  };
}

// Parse command line arguments
const args = parseArguments();

// Main function
async function main() {
  // Show help if requested or no command provided
  if (args.help || !args.command) {
    showHelp();
    process.exit(args.help ? 0 : 1);
  }

  // Execute the appropriate command
  switch (args.command) {
    case 'get':
      getField();
      break;
    case 'set':
      setField();
      break;
    case 'remove':
      removeField();
      break;
    case 'list':
      listFields();
      break;
    default:
      console.error(chalk.red(`Unknown command: ${args.command}`));
      showHelp();
      process.exit(1);
  }
}

// Parse command line arguments
function parseArguments() {
  const args = {
    command: null,
    file: null,
    field: null,
    value: null,
    format: 'yaml',
    dryRun: false,
    help: false,
    recursive: false,
    verbose: false,
    directory: null,
    extension: '.md,.markdown',
    pattern: null
  };

  // Skip the first two arguments (node and script name)
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--file' || arg === '-f') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.file = process.argv[++i];
      }
    } else if (arg === '--directory' || arg === '-d') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.directory = process.argv[++i];
      }
    } else if (arg === '--field' || arg === '-k') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.field = process.argv[++i];
      }
    } else if (arg === '--value' || arg === '-v') {
      if (i + 1 < process.argv.length) {
        args.value = process.argv[++i];
      }
    } else if (arg === '--format') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.format = process.argv[++i];
      }
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--recursive' || arg === '-r') {
      args.recursive = true;
    } else if (arg === '--verbose') {
      args.verbose = true;
    } else if (arg === '--extension' || arg === '-e') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.extension = process.argv[++i];
      }
    } else if (arg === '--pattern' || arg === '-p') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.pattern = new RegExp(process.argv[++i]);
      }
    } else if (!arg.startsWith('-') && !args.command) {
      args.command = arg;
    }
  }

  return args;
}

// Show help information
function showHelp() {
  console.log(`
${chalk.bold('FRONTMATTER EDITOR')}

${chalk.yellow('Usage:')} frontmatter-editor.js <command> [options]

${chalk.yellow('Commands:')}
  get                     Get the value of a frontmatter field
  set                     Set the value of a frontmatter field
  remove                  Remove a frontmatter field
  list                    List all frontmatter fields in a file

${chalk.yellow('Options:')}
  -h, --help              Show this help message
  -f, --file <path>       Path to a specific file to process
  -d, --directory <path>  Path to a directory of files to process
  -k, --field <name>      Name of the frontmatter field
  -v, --value <value>     Value to set for the field
  --format <format>       Output format for frontmatter (yaml or json, default: yaml)
  --dry-run               Preview changes without modifying files
  -r, --recursive         Process subdirectories when using --directory
  --verbose               Show more detailed output
  -e, --extension <exts>  File extensions to process (comma-separated, default: .md,.markdown)
  -p, --pattern <regex>   Only process files matching this regex pattern

${chalk.yellow('Examples:')}
  # Get a field value from a file
  frontmatter-editor.js get --file post.md --field title

  # Set a field value in a file
  frontmatter-editor.js set --file post.md --field status --value published

  # Remove a field from a file
  frontmatter-editor.js remove --file post.md --field draft

  # List all frontmatter fields in a file
  frontmatter-editor.js list --file post.md

  # Set a field value in all markdown files in a directory
  frontmatter-editor.js set --directory ./content --field status --value published --recursive
  `);
}

// Get the value of a frontmatter field
function getField() {
  if (!args.file && !args.directory) {
    console.error(chalk.red('Error: No file or directory specified'));
    process.exit(1);
  }

  if (!args.field) {
    console.error(chalk.red('Error: No field specified'));
    process.exit(1);
  }

  if (args.file) {
    // Process a single file
    try {
      const fileContent = fs.readFileSync(args.file, 'utf8');
      const { data } = matter(fileContent);

      if (data[args.field] !== undefined) {
        console.log(`${chalk.cyan(args.field)}: ${formatValue(data[args.field])}`);
      } else {
        console.log(chalk.yellow(`Field '${args.field}' not found in ${args.file}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error reading file ${args.file}:`), error.message);
      process.exit(1);
    }
  } else {
    // Process a directory
    processDirectory(args.directory, (filePath) => {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);

        if (data[args.field] !== undefined) {
          console.log(`${chalk.cyan(filePath)}: ${args.field} = ${formatValue(data[args.field])}`);
        } else if (args.verbose) {
          console.log(chalk.yellow(`Field '${args.field}' not found in ${filePath}`));
        }
      } catch (error) {
        console.error(chalk.red(`Error reading file ${filePath}:`), error.message);
      }
    });
  }
}

// Set the value of a frontmatter field
function setField() {
  if (!args.file && !args.directory) {
    console.error(chalk.red('Error: No file or directory specified'));
    process.exit(1);
  }

  if (!args.field) {
    console.error(chalk.red('Error: No field specified'));
    process.exit(1);
  }

  if (args.value === null) {
    console.error(chalk.red('Error: No value specified'));
    process.exit(1);
  }

  // Parse the value if it looks like JSON
  let parsedValue = args.value;
  if (args.value.startsWith('[') || args.value.startsWith('{')) {
    try {
      parsedValue = JSON.parse(args.value);
    } catch (error) {
      // Keep as string if not valid JSON
    }
  } else if (args.value === 'true' || args.value === 'false') {
    parsedValue = args.value === 'true';
  } else if (!isNaN(args.value) && args.value.trim() !== '') {
    // Convert to number if it's numeric
    parsedValue = Number(args.value);
  }

  if (args.file) {
    // Process a single file
    updateFile(args.file, (data) => {
      const oldValue = data[args.field];
      data[args.field] = parsedValue;
      
      return {
        modified: true,
        message: `Set ${chalk.cyan(args.field)} = ${formatValue(parsedValue)}` + 
                 (oldValue !== undefined ? ` (was: ${formatValue(oldValue)})` : '')
      };
    });
  } else {
    // Process a directory
    processDirectory(args.directory, (filePath) => {
      updateFile(filePath, (data) => {
        const oldValue = data[args.field];
        data[args.field] = parsedValue;
        
        return {
          modified: true,
          message: `Set ${chalk.cyan(args.field)} = ${formatValue(parsedValue)}` + 
                   (oldValue !== undefined ? ` (was: ${formatValue(oldValue)})` : '')
        };
      });
    });
  }
}

// Remove a frontmatter field
function removeField() {
  if (!args.file && !args.directory) {
    console.error(chalk.red('Error: No file or directory specified'));
    process.exit(1);
  }

  if (!args.field) {
    console.error(chalk.red('Error: No field specified'));
    process.exit(1);
  }

  if (args.file) {
    // Process a single file
    updateFile(args.file, (data) => {
      if (data[args.field] !== undefined) {
        const oldValue = data[args.field];
        delete data[args.field];
        
        return {
          modified: true,
          message: `Removed ${chalk.cyan(args.field)} (was: ${formatValue(oldValue)})`
        };
      }
      
      return {
        modified: false,
        message: `Field ${chalk.cyan(args.field)} not found`
      };
    });
  } else {
    // Process a directory
    processDirectory(args.directory, (filePath) => {
      updateFile(filePath, (data) => {
        if (data[args.field] !== undefined) {
          const oldValue = data[args.field];
          delete data[args.field];
          
          return {
            modified: true,
            message: `Removed ${chalk.cyan(args.field)} (was: ${formatValue(oldValue)})`
          };
        }
        
        return {
          modified: false,
          message: `Field ${chalk.cyan(args.field)} not found`
        };
      });
    });
  }
}

// List all frontmatter fields in a file
function listFields() {
  if (!args.file && !args.directory) {
    console.error(chalk.red('Error: No file or directory specified'));
    process.exit(1);
  }

  if (args.file) {
    // Process a single file
    try {
      const fileContent = fs.readFileSync(args.file, 'utf8');
      const { data } = matter(fileContent);
      
      console.log(chalk.cyan(`Frontmatter fields in ${args.file}:`));
      
      const fields = Object.keys(data);
      if (fields.length === 0) {
        console.log(chalk.yellow('  No frontmatter fields found'));
      } else {
        fields.forEach(field => {
          console.log(`  ${chalk.bold(field)}: ${formatValue(data[field])}`);
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error reading file ${args.file}:`), error.message);
      process.exit(1);
    }
  } else {
    // Process a directory
    processDirectory(args.directory, (filePath) => {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);
        
        console.log(chalk.cyan(`\nFrontmatter fields in ${filePath}:`));
        
        const fields = Object.keys(data);
        if (fields.length === 0) {
          console.log(chalk.yellow('  No frontmatter fields found'));
        } else {
          fields.forEach(field => {
            console.log(`  ${chalk.bold(field)}: ${formatValue(data[field])}`);
          });
        }
      } catch (error) {
        console.error(chalk.red(`Error reading file ${filePath}:`), error.message);
      }
    });
  }
}

// Helper function to update a file
function updateFile(filePath, updateFn) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // Apply the update function
    const result = updateFn(data);
    
    if (result.modified) {
      // Write the updated content back to the file (unless in dry-run mode)
      if (!args.dryRun) {
        let updatedFileContent;
        
        if (args.format === 'json') {
          updatedFileContent = matter.stringify(content, data, { language: 'json' });
        } else {
          updatedFileContent = matter.stringify(content, data);
        }
        
        fs.writeFileSync(filePath, updatedFileContent, 'utf8');
      }
      
      const actionPrefix = args.dryRun ? chalk.blue('[DRY RUN]') : chalk.green('[UPDATED]');
      console.log(`${actionPrefix} ${filePath}: ${result.message}`);
    } else if (args.verbose) {
      console.log(`${chalk.yellow('[SKIPPED]')} ${filePath}: ${result.message}`);
    }
  } catch (error) {
    console.error(chalk.red(`Error processing file ${filePath}:`), error.message);
  }
}

// Helper function to process a directory
function processDirectory(dirPath, processFn) {
  try {
    const items = fs.readdirSync(dirPath);
    const extensions = args.extension.split(',').map(ext => ext.trim());
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && args.recursive) {
        // Recursively process subdirectories if recursive mode is enabled
        processDirectory(itemPath, processFn);
      } else if (stats.isFile() && extensions.some(ext => item.endsWith(ext))) {
        // Check if file matches pattern if specified
        if (args.pattern && !args.pattern.test(item)) {
          if (args.verbose) {
            console.log(`${chalk.yellow('[SKIPPED]')} ${itemPath} (pattern mismatch)`);
          }
          continue;
        }
        
        // Process files with matching extensions
        processFn(itemPath);
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error reading directory ${dirPath}:`), error.message);
  }
}

// Helper function to format values for display
function formatValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`;
  } else if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  } else if (typeof value === 'string') {
    return `"${value}"`;
  } else {
    return value;
  }
}

// Start the program
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error.message);
  process.exit(1);
});