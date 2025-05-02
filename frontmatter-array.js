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

// Check if directory path is provided when not in interactive mode
if (!args.directory && !args.interactive && !args.sourceFrontmatterDir) {
  showHelp();
  process.exit(1);
}

// Function to parse command line arguments
function parseArguments() {
  const args = {
    directory: null,
    fields: ['aiKeywords'],
    delimiter: ',',
    dryRun: false,
    recursive: true,
    verbose: false,
    interactive: false,
    mode: 'to-array',
    extension: '.md,.markdown',
    addField: null,
    addValue: null,
    removeField: null,
    renameField: null,
    newFieldName: null,
    sortArrays: false,
    uniqueValues: false,
    pattern: null,
    outputFormat: 'yaml',
    stats: false,
    sourceFrontmatterDir: null,
    targetContentDir: null,
    frontmatterFields: null
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--fields' || arg === '-f') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.fields = process.argv[++i].split(',').map(field => field.trim());
      }
    } else if (arg === '--delimiter' || arg === '-d') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.delimiter = process.argv[++i];
      }
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--no-recursive') {
      args.recursive = false;
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg === '--interactive' || arg === '-i') {
      args.interactive = true;
    } else if (arg === '--mode' || arg === '-m') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.mode = process.argv[++i];
      }
    } else if (arg === '--extension' || arg === '-e') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.extension = process.argv[++i];
      }
    } else if (arg === '--add-field') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.addField = process.argv[++i];
        if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
          args.addValue = process.argv[++i];
        } else {
          args.addValue = '';
        }
      }
    } else if (arg === '--remove-field') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.removeField = process.argv[++i];
      }
    } else if (arg === '--rename-field') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.renameField = process.argv[++i];
        if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
          args.newFieldName = process.argv[++i];
        }
      }
    } else if (arg === '--sort-arrays') {
      args.sortArrays = true;
    } else if (arg === '--unique-values') {
      args.uniqueValues = true;
    } else if (arg === '--pattern' || arg === '-p') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.pattern = new RegExp(process.argv[++i]);
      }
    } else if (arg === '--output-format') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.outputFormat = process.argv[++i];
      }
    } else if (arg === '--stats') {
      args.stats = true;
    } else if (arg === '--copy-frontmatter') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.sourceFrontmatterDir = process.argv[++i];
        if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
          args.targetContentDir = process.argv[++i];
        }
      }
    } else if (arg === '--frontmatter-fields') {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('-')) {
        args.frontmatterFields = process.argv[++i].split(',').map(field => field.trim());
      }
    } else if (!arg.startsWith('-') && !args.directory) {
      args.directory = arg;
    }
  }

  return args;
}

// Function to display help information
function showHelp() {
  console.log(`
${chalk.bold('FRONTMATTER MANAGER')}

${chalk.yellow('Usage:')} frontmatter-array.js [directory] [options]

${chalk.yellow('Basic Options:')}
  -h, --help                 Show this help message
  -f, --fields <fields>      Comma-separated list of frontmatter fields to process (default: aiKeywords)
  -d, --delimiter <char>     Delimiter character for splitting strings (default: comma)
  --dry-run                  Preview changes without modifying files
  --no-recursive             Don't process subdirectories
  -v, --verbose              Show more detailed output
  -i, --interactive          Run in interactive mode (prompts for options)
  -e, --extension <exts>     File extensions to process (comma-separated, default: .md,.markdown)
  -p, --pattern <regex>      Only process files matching this regex pattern

${chalk.yellow('Operation Modes:')}
  -m, --mode <mode>          Operation mode (default: to-array)
                             Available modes:
                             - to-array: Convert string fields to arrays
                             - to-string: Convert array fields to strings
                             - analyze: Analyze frontmatter without changes
                             - validate: Check for required fields or formats

${chalk.yellow('Field Operations:')}
  --add-field <name> [value] Add a new field with optional value to all files
  --remove-field <name>      Remove a field from all files
  --rename-field <old> <new> Rename a field in all files
  --sort-arrays              Sort array values alphabetically
  --unique-values            Remove duplicate values from arrays

${chalk.yellow('Output Options:')}
  --output-format <format>   Format for frontmatter (yaml or json, default: yaml)
  --stats                    Show statistics about processed frontmatter

${chalk.yellow('Frontmatter Copy Options:')}
  --copy-frontmatter <src> <dst>  Copy frontmatter from files in source directory to files in target directory
  --frontmatter-fields <fields>   Comma-separated list of frontmatter fields to copy (default: all fields)

${chalk.yellow('Examples:')}
  frontmatter-array.js ./content
  frontmatter-array.js ./content --fields tags,categories --mode to-array
  frontmatter-array.js ./content --add-field "status" "draft"
  frontmatter-array.js ./content --remove-field "draft"
  frontmatter-array.js ./content --pattern "^post-.*\\.md$"
  frontmatter-array.js ./content --sort-arrays --unique-values
  frontmatter-array.js --copy-frontmatter ./source-content ./target-content
  frontmatter-array.js --copy-frontmatter ./source-content ./target-content --frontmatter-fields title,date,tags
  `);
}

// Function to prompt for interactive mode
async function runInteractiveMode() {
  try {
    // This is a placeholder for interactive mode
    // In a real implementation, you would use a package like 'inquirer'
    console.log(chalk.yellow('Interactive mode is not fully implemented in this version.'));
    console.log('Please install the "inquirer" package and update the script for full interactive support.');
    process.exit(1);
  } catch (error) {
    console.error(chalk.red('Error in interactive mode:'), error.message);
    process.exit(1);
  }
}

// Function to process a single markdown file
function processMarkdownFile(filePath) {
  try {
    // Check if file matches pattern if specified
    if (args.pattern && !args.pattern.test(path.basename(filePath))) {
      if (args.verbose) {
        console.log(`🔍 Skipped (pattern mismatch): ${path.basename(filePath)}`);
      }
      return;
    }

    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse frontmatter
    const { data, content } = matter(fileContent);
    
    let modified = false;
    const changes = [];
    const fileStats = { fields: 0, arrays: 0, strings: 0, other: 0 };

    // Collect stats if requested
    if (args.stats) {
      Object.keys(data).forEach(key => {
        fileStats.fields++;
        if (Array.isArray(data[key])) {
          fileStats.arrays++;
        } else if (typeof data[key] === 'string') {
          fileStats.strings++;
        } else {
          fileStats.other++;
        }
      });
    }

    // Handle different operation modes
    switch (args.mode) {
      case 'to-array':
        // Process each specified field to convert to array
        for (const field of args.fields) {
          if (data[field] && typeof data[field] === 'string') {
            // Convert string to array using the specified delimiter
            const valueArray = data[field]
              .split(args.delimiter)
              .map(value => value.trim())
              .filter(value => value.length > 0);
            
            // Apply unique values if requested
            const processedArray = args.uniqueValues ? 
              [...new Set(valueArray)] : valueArray;
            
            // Sort if requested
            if (args.sortArrays) {
              processedArray.sort();
            }
            
            // Update the frontmatter data
            data[field] = processedArray;
            modified = true;
            changes.push({
              type: 'convert-to-array',
              field,
              values: processedArray
            });
          } else if (Array.isArray(data[field]) && (args.sortArrays || args.uniqueValues)) {
            // Process existing arrays for sorting or uniqueness
            let processedArray = data[field];
            
            if (args.uniqueValues) {
              processedArray = [...new Set(processedArray)];
            }
            
            if (args.sortArrays) {
              processedArray.sort();
            }
            
            if (JSON.stringify(data[field]) !== JSON.stringify(processedArray)) {
              data[field] = processedArray;
              modified = true;
              changes.push({
                type: 'process-array',
                field,
                values: processedArray
              });
            }
          }
        }
        break;
        
      case 'to-string':
        // Convert arrays to strings
        for (const field of args.fields) {
          if (data[field] && Array.isArray(data[field])) {
            // Convert array to string using the specified delimiter
            const stringValue = data[field].join(args.delimiter);
            
            // Update the frontmatter data
            data[field] = stringValue;
            modified = true;
            changes.push({
              type: 'convert-to-string',
              field,
              value: stringValue
            });
          }
        }
        break;
        
      case 'analyze':
        // Just analyze without changes
        if (args.verbose) {
          console.log(`📊 Analyzing: ${path.basename(filePath)}`);
          console.log('   Fields:', Object.keys(data).join(', '));
        }
        return;
        
      case 'validate':
        // Validate required fields
        const missingFields = args.fields.filter(field => !data[field]);
        if (missingFields.length > 0) {
          console.log(`⚠️ Validation failed for ${path.basename(filePath)}: Missing fields: ${missingFields.join(', ')}`);
        } else if (args.verbose) {
          console.log(`✓ Validation passed for ${path.basename(filePath)}`);
        }
        return;
    }
    
    // Handle field operations
    
    // Add field
    if (args.addField && !data[args.addField]) {
      data[args.addField] = args.addValue;
      modified = true;
      changes.push({
        type: 'add-field',
        field: args.addField,
        value: args.addValue
      });
    }
    
    // Remove field
    if (args.removeField && data.hasOwnProperty(args.removeField)) {
      delete data[args.removeField];
      modified = true;
      changes.push({
        type: 'remove-field',
        field: args.removeField
      });
    }
    
    // Rename field
    if (args.renameField && args.newFieldName && data.hasOwnProperty(args.renameField)) {
      data[args.newFieldName] = data[args.renameField];
      delete data[args.renameField];
      modified = true;
      changes.push({
        type: 'rename-field',
        oldField: args.renameField,
        newField: args.newFieldName
      });
    }
    
    if (modified) {
      // Use the default stringify method without custom options
      // This avoids the "yaml.stringify" error
      let updatedFileContent;
      
      if (args.outputFormat === 'json') {
        // For JSON format, we can use a specific language option
        updatedFileContent = matter.stringify(content, data, { language: 'json' });
      } else {
        // For YAML format, use the default stringify method
        updatedFileContent = matter.stringify(content, data);
      }
      
      // Write the updated content back to the file (unless in dry-run mode)
      if (!args.dryRun) {
        fs.writeFileSync(filePath, updatedFileContent, 'utf8');
      }
      
      const actionPrefix = args.dryRun ? chalk.blue('🔍 Would update') : chalk.green('✅ Updated');
      console.log(`${actionPrefix}: ${path.basename(filePath)}`);
      
      changes.forEach(change => {
        switch (change.type) {
          case 'convert-to-array':
            console.log(`   ${chalk.yellow(change.field)} converted to array: [${change.values.map(v => `'${v}'`).join(', ')}]`);
            break;
          case 'convert-to-string':
            console.log(`   ${chalk.yellow(change.field)} converted to string: "${change.value}"`);
            break;
          case 'process-array':
            console.log(`   ${chalk.yellow(change.field)} array processed: [${change.values.map(v => `'${v}'`).join(', ')}]`);
            break;
          case 'add-field':
            console.log(`   Added field ${chalk.yellow(change.field)}: "${change.value}"`);
            break;
          case 'remove-field':
            console.log(`   Removed field ${chalk.yellow(change.field)}`);
            break;
          case 'rename-field':
            console.log(`   Renamed field ${chalk.yellow(change.oldField)} to ${chalk.yellow(change.newField)}`);
            break;
        }
      });
    } else if (args.verbose) {
      console.log(`ℹ️ Skipped: ${path.basename(filePath)} (no changes needed)`);
    }
    
    // Output stats if requested
    if (args.stats) {
      console.log(`📊 Stats for ${path.basename(filePath)}:`);
      console.log(`   Total fields: ${fileStats.fields}`);
      console.log(`   Arrays: ${fileStats.arrays}`);
      console.log(`   Strings: ${fileStats.strings}`);
      console.log(`   Other types: ${fileStats.other}`);
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error processing ${filePath}:`), error.message);
  }
}

// Function to recursively process all markdown files in a directory
function processDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    const extensions = args.extension.split(',').map(ext => ext.trim());
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && args.recursive) {
        // Recursively process subdirectories if recursive mode is enabled
        processDirectory(itemPath);
      } else if (stats.isFile() && extensions.some(ext => item.endsWith(ext))) {
        // Process files with matching extensions
        processMarkdownFile(itemPath);
      }
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error reading directory ${dirPath}:`), error.message);
  }
}

// Function to copy frontmatter from source directory to target directory
function copyFrontmatter(sourceDir, targetDir, frontmatterFields = null) {
  try {
    console.log(chalk.cyan(`🔄 Copying frontmatter from ${sourceDir} to ${targetDir}`));
    
    if (args.dryRun) {
      console.log(chalk.yellow('⚠️ DRY RUN MODE: No files will be modified'));
    }
    
    // Get all source files with frontmatter
    const sourceFiles = [];
    const extensions = args.extension.split(',').map(ext => ext.trim());
    
    function collectSourceFiles(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory() && args.recursive) {
          collectSourceFiles(itemPath);
        } else if (stats.isFile() && extensions.some(ext => item.endsWith(ext))) {
          sourceFiles.push({
            path: itemPath,
            name: item,
            relativePath: path.relative(sourceDir, itemPath)
          });
        }
      }
    }
    
    collectSourceFiles(sourceDir);
    console.log(chalk.blue(`📁 Found ${sourceFiles.length} source files with frontmatter`));
    
    // Process target files
    let matchedFiles = 0;
    let modifiedFiles = 0;
    
    function processTargetFiles(dir, relativePath = '') {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory() && args.recursive) {
          processTargetFiles(itemPath, path.join(relativePath, item));
        } else if (stats.isFile() && extensions.some(ext => item.endsWith(ext))) {
          // Find matching source file
          const targetRelativePath = path.join(relativePath, item);
          const matchingSourceFile = sourceFiles.find(sf => sf.name === item || sf.relativePath === targetRelativePath);
          
          if (matchingSourceFile) {
            matchedFiles++;
            
            // Read source frontmatter
            const sourceContent = fs.readFileSync(matchingSourceFile.path, 'utf8');
            const sourceData = matter(sourceContent);
            
            // Read target file
            const targetContent = fs.readFileSync(itemPath, 'utf8');
            const targetData = matter(targetContent);
            
            // Create new frontmatter by copying fields
            const newFrontmatter = { ...targetData.data };
            const fieldsToUpdate = frontmatterFields || Object.keys(sourceData.data);
            
            let modified = false;
            fieldsToUpdate.forEach(field => {
              if (sourceData.data[field] !== undefined) {
                newFrontmatter[field] = sourceData.data[field];
                modified = true;
              }
            });
            
            if (modified) {
              // Write updated frontmatter to target file
              if (!args.dryRun) {
                const updatedContent = matter.stringify(targetData.content, newFrontmatter, {
                  language: args.outputFormat === 'json' ? 'json' : 'yaml'
                });
                fs.writeFileSync(itemPath, updatedContent, 'utf8');
              }
              
              modifiedFiles++;
              const actionPrefix = args.dryRun ? chalk.blue('🔍 Would update') : chalk.green('✅ Updated');
              console.log(`${actionPrefix}: ${targetRelativePath}`);
              
              if (args.verbose) {
                fieldsToUpdate.forEach(field => {
                  if (sourceData.data[field] !== undefined) {
                    console.log(`   ${chalk.yellow(field)}: ${JSON.stringify(sourceData.data[field])}`);
                  }
                });
              }
            } else if (args.verbose) {
              console.log(`ℹ️ Skipped: ${targetRelativePath} (no changes needed)`);
            }
          } else if (args.verbose) {
            console.log(`⚠️ No matching source file for: ${targetRelativePath}`);
          }
        }
      }
    }
    
    processTargetFiles(targetDir);
    
    console.log(chalk.green(`✨ Frontmatter copy complete!`));
    console.log(`📊 Matched ${matchedFiles} files, modified ${modifiedFiles} files`);
    
  } catch (error) {
    console.error(chalk.red(`❌ Error copying frontmatter:`), error.message);
  }
}

// Main execution
async function main() {
  if (args.interactive) {
    await runInteractiveMode();
  } else if (args.sourceFrontmatterDir && args.targetContentDir) {
    // Run frontmatter copy mode
    copyFrontmatter(
      args.sourceFrontmatterDir, 
      args.targetContentDir, 
      args.frontmatterFields
    );
  } else {
    console.log(chalk.cyan(`🔍 Processing files in: ${args.directory}`));
    if (args.dryRun) {
      console.log(chalk.yellow('⚠️ DRY RUN MODE: No files will be modified'));
    }
    console.log(`📋 Mode: ${chalk.bold(args.mode)}`);
    console.log(`📋 Fields to process: ${chalk.bold(args.fields.join(', '))}`);
    
    if (args.mode === 'to-array' || args.mode === 'to-string') {
      console.log(`🔣 Using delimiter: "${chalk.bold(args.delimiter)}"`);
    }
    
    processDirectory(args.directory);
    console.log(chalk.green('✨ Processing complete!'));
  }
}

// Start the program
main().catch(error => {
  console.error(chalk.red('❌ Fatal error:'), error.message);
  process.exit(1);
});