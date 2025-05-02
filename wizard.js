#!/usr/bin/env node

const inquirer = require('inquirer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to import chalk for colorful output
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
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`
  };
}

// Check if inquirer is installed
try {
  require.resolve('inquirer');
} catch (error) {
  console.log(chalk.red('Error: The "inquirer" package is required for this wizard.'));
  console.log(chalk.yellow('Please install it by running: npm install inquirer'));
  process.exit(1);
}

// Welcome message
console.log(chalk.bold('\n🧙‍♂️ FRONTMATTER WIZARD 🧙‍♂️'));
console.log(chalk.cyan('This wizard will help you run the frontmatter-array.js script with the right options.\n'));

// Define the main operation modes
const OPERATION_MODES = {
  TO_ARRAY: 'to-array',
  TO_STRING: 'to-string',
  ANALYZE: 'analyze',
  VALIDATE: 'validate',
  COPY_FRONTMATTER: 'copy-frontmatter',
  FIELD_OPERATIONS: 'field-operations'
};

// Main wizard function
async function runWizard() {
  try {
    // Step 1: Choose the main operation
    const { operationType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'operationType',
        message: 'What would you like to do?',
        choices: [
          { name: 'Convert string fields to arrays', value: OPERATION_MODES.TO_ARRAY },
          { name: 'Convert array fields to strings', value: OPERATION_MODES.TO_STRING },
          { name: 'Manage frontmatter fields (add/edit/remove)', value: OPERATION_MODES.FIELD_OPERATIONS },
          { name: 'Analyze frontmatter without changes', value: OPERATION_MODES.ANALYZE },
          { name: 'Validate frontmatter fields', value: OPERATION_MODES.VALIDATE },
          { name: 'Copy frontmatter between directories', value: OPERATION_MODES.COPY_FRONTMATTER },
          { name: 'Exit wizard', value: 'exit' }
        ]
      }
    ]);

    if (operationType === 'exit') {
      console.log(chalk.yellow('Exiting wizard. Goodbye! 👋'));
      process.exit(0);
    }

    // Initialize command arguments
    const commandArgs = [];

    // Handle special operations separately
    if (operationType === OPERATION_MODES.COPY_FRONTMATTER) {
      return await handleCopyFrontmatter();
    }
    
    if (operationType === OPERATION_MODES.FIELD_OPERATIONS) {
      return await handleFieldOperations();
    }

    // Step 2: Get directory path
    const { directoryPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'directoryPath',
        message: 'Enter the directory path to process:',
        default: './content',
        validate: (input) => {
          if (!input) return 'Directory path is required';
          if (!fs.existsSync(input)) return 'Directory does not exist';
          return true;
        }
      }
    ]);

    commandArgs.push(directoryPath);

    // Step 3: Set operation mode
    commandArgs.push('--mode', operationType);

    // Step 4: Get fields to process
    const { fields } = await inquirer.prompt([
      {
        type: 'input',
        name: 'fields',
        message: 'Enter frontmatter fields to process (comma-separated):',
        default: 'aiKeywords',
        validate: (input) => input ? true : 'At least one field is required'
      }
    ]);

    commandArgs.push('--fields', fields);

    // Step 5: Additional options based on operation type
    if (operationType === OPERATION_MODES.TO_ARRAY || operationType === OPERATION_MODES.TO_STRING) {
      const { delimiter } = await inquirer.prompt([
        {
          type: 'input',
          name: 'delimiter',
          message: 'Enter delimiter character:',
          default: ',',
          validate: (input) => input ? true : 'Delimiter is required'
        }
      ]);

      commandArgs.push('--delimiter', delimiter);
    }

    // Step 6: Common options
    const { commonOptions } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'commonOptions',
        message: 'Select additional options:',
        choices: [
          { name: 'Dry run (preview changes without modifying files)', value: '--dry-run' },
          { name: 'Don\'t process subdirectories', value: '--no-recursive' },
          { name: 'Verbose output', value: '--verbose' },
          { name: 'Sort arrays alphabetically', value: '--sort-arrays' },
          { name: 'Remove duplicate values from arrays', value: '--unique-values' },
          { name: 'Show statistics about processed frontmatter', value: '--stats' }
        ]
      }
    ]);

    commandArgs.push(...commonOptions);

    // Step 7: File filtering options
    const { useFileFiltering } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useFileFiltering',
        message: 'Do you want to filter files by extension or pattern?',
        default: false
      }
    ]);

    if (useFileFiltering) {
      const fileFilteringAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'extensions',
          message: 'Enter file extensions to process (comma-separated):',
          default: '.md,.markdown'
        },
        {
          type: 'input',
          name: 'pattern',
          message: 'Enter regex pattern to match filenames (optional):',
          default: ''
        }
      ]);

      commandArgs.push('--extension', fileFilteringAnswers.extensions);
      
      if (fileFilteringAnswers.pattern) {
        commandArgs.push('--pattern', fileFilteringAnswers.pattern);
      }
    }

    // Step 8: Field operations
    const { useFieldOperations } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useFieldOperations',
        message: 'Do you want to perform field operations (add/remove/rename)?',
        default: false
      }
    ]);

    if (useFieldOperations) {
      const { fieldOperations } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'fieldOperations',
          message: 'Select field operations:',
          choices: [
            { name: 'Add a new field', value: 'add' },
            { name: 'Remove a field', value: 'remove' },
            { name: 'Rename a field', value: 'rename' }
          ]
        }
      ]);

      for (const operation of fieldOperations) {
        if (operation === 'add') {
          const { fieldName, fieldValue } = await inquirer.prompt([
            {
              type: 'input',
              name: 'fieldName',
              message: 'Enter the name of the field to add:',
              validate: (input) => input ? true : 'Field name is required'
            },
            {
              type: 'input',
              name: 'fieldValue',
              message: 'Enter the value for the field (leave empty for blank):',
              default: ''
            }
          ]);

          commandArgs.push('--add-field', fieldName, fieldValue);
        } else if (operation === 'remove') {
          const { fieldName } = await inquirer.prompt([
            {
              type: 'input',
              name: 'fieldName',
              message: 'Enter the name of the field to remove:',
              validate: (input) => input ? true : 'Field name is required'
            }
          ]);

          commandArgs.push('--remove-field', fieldName);
        } else if (operation === 'rename') {
          const { oldFieldName, newFieldName } = await inquirer.prompt([
            {
              type: 'input',
              name: 'oldFieldName',
              message: 'Enter the current name of the field:',
              validate: (input) => input ? true : 'Field name is required'
            },
            {
              type: 'input',
              name: 'newFieldName',
              message: 'Enter the new name for the field:',
              validate: (input) => input ? true : 'New field name is required'
            }
          ]);

          commandArgs.push('--rename-field', oldFieldName, newFieldName);
        }
      }
    }

    // Step 9: Output format
    const { outputFormat } = await inquirer.prompt([
      {
        type: 'list',
        name: 'outputFormat',
        message: 'Select output format for frontmatter:',
        choices: [
          { name: 'YAML (default)', value: 'yaml' },
          { name: 'JSON', value: 'json' }
        ],
        default: 'yaml'
      }
    ]);

    commandArgs.push('--output-format', outputFormat);

    // Step 10: Confirm and run
    console.log(chalk.cyan('\nCommand to run:'));
    console.log(chalk.yellow(`frontmatter-array.js ${commandArgs.join(' ')}`));

    const { confirmRun } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmRun',
        message: 'Do you want to run this command now?',
        default: true
      }
    ]);

    if (confirmRun) {
      runFrontmatterScript(commandArgs);
    } else {
      console.log(chalk.yellow('Command not executed. You can run it manually using the command above.'));
    }
  } catch (error) {
    console.error(chalk.red('Error in wizard:'), error.message);
    process.exit(1);
  }
}

// Handle field operations in a more direct and intuitive way
async function handleFieldOperations() {
  try {
    // Get directory path
    const { directoryPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'directoryPath',
        message: 'Enter the directory path to process:',
        default: './content',
        validate: (input) => {
          if (!input) return 'Directory path is required';
          if (!fs.existsSync(input)) return 'Directory does not exist';
          return true;
        }
      }
    ]);

    // Initialize command arguments
    const commandArgs = [directoryPath];

    // Choose the field operation
    const { operation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'operation',
        message: 'What field operation would you like to perform?',
        choices: [
          { name: 'Add a new field', value: 'add' },
          { name: 'Edit/rename an existing field', value: 'rename' },
          { name: 'Remove a field', value: 'remove' },
          { name: 'Back to main menu', value: 'back' }
        ]
      }
    ]);

    if (operation === 'back') {
      return await runWizard();
    }

    // Handle add field operation
    if (operation === 'add') {
      const { fieldName, fieldValue, fieldType } = await inquirer.prompt([
        {
          type: 'input',
          name: 'fieldName',
          message: 'Enter the name of the field to add:',
          validate: (input) => input ? true : 'Field name is required'
        },
        {
          type: 'list',
          name: 'fieldType',
          message: 'What type of value would you like to add?',
          choices: [
            { name: 'Text value', value: 'text' },
            { name: 'Array of values', value: 'array' },
            { name: 'Empty value', value: 'empty' }
          ]
        },
        {
          type: 'input',
          name: 'fieldValue',
          message: (answers) => answers.fieldType === 'array' ? 
            'Enter comma-separated values for the array:' : 
            'Enter the value for the field:',
          default: '',
          when: (answers) => answers.fieldType !== 'empty'
        }
      ]);

      commandArgs.push('--add-field', fieldName);
      
      if (fieldType === 'empty') {
        commandArgs.push('');
      } else if (fieldType === 'array') {
        // Set mode to ensure array conversion
        commandArgs.push(fieldValue);
        commandArgs.push('--mode', 'to-array');
        commandArgs.push('--fields', fieldName);
      } else {
        commandArgs.push(fieldValue);
      }
    }
    
    // Handle rename field operation
    else if (operation === 'rename') {
      const { oldFieldName, newFieldName, updateValue, newValue } = await inquirer.prompt([
        {
          type: 'input',
          name: 'oldFieldName',
          message: 'Enter the current name of the field:',
          validate: (input) => input ? true : 'Field name is required'
        },
        {
          type: 'input',
          name: 'newFieldName',
          message: 'Enter the new name for the field:',
          validate: (input) => input ? true : 'New field name is required'
        },
        {
          type: 'confirm',
          name: 'updateValue',
          message: 'Would you also like to update the field value?',
          default: false
        },
        {
          type: 'input',
          name: 'newValue',
          message: 'Enter the new value for the field:',
          when: (answers) => answers.updateValue
        }
      ]);

      commandArgs.push('--rename-field', oldFieldName, newFieldName);
      
      // If also updating the value, we need to add the field after renaming
      if (updateValue) {
        commandArgs.push('--add-field', newFieldName, newValue);
      }
    }
    
    // Handle remove field operation
    else if (operation === 'remove') {
      const { fieldName, confirmRemove } = await inquirer.prompt([
        {
          type: 'input',
          name: 'fieldName',
          message: 'Enter the name of the field to remove:',
          validate: (input) => input ? true : 'Field name is required'
        },
        {
          type: 'confirm',
          name: 'confirmRemove',
          message: (answers) => `Are you sure you want to remove the field "${answers.fieldName}"?`,
          default: false
        }
      ]);

      if (!confirmRemove) {
        console.log(chalk.yellow('Field removal cancelled.'));
        return await handleFieldOperations();
      }

      commandArgs.push('--remove-field', fieldName);
    }

    // Common options
    const { commonOptions } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'commonOptions',
        message: 'Select additional options:',
        choices: [
          { name: 'Dry run (preview changes without modifying files)', value: '--dry-run' },
          { name: 'Don\'t process subdirectories', value: '--no-recursive' },
          { name: 'Verbose output', value: '--verbose' }
        ]
      }
    ]);

    commandArgs.push(...commonOptions);

    // File filtering options
    const { useFileFiltering } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useFileFiltering',
        message: 'Do you want to filter files by extension or pattern?',
        default: false
      }
    ]);

    if (useFileFiltering) {
      const fileFilteringAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'extensions',
          message: 'Enter file extensions to process (comma-separated):',
          default: '.md,.markdown'
        },
        {
          type: 'input',
          name: 'pattern',
          message: 'Enter regex pattern to match filenames (optional):',
          default: ''
        }
      ]);

      commandArgs.push('--extension', fileFilteringAnswers.extensions);
      
      if (fileFilteringAnswers.pattern) {
        commandArgs.push('--pattern', fileFilteringAnswers.pattern);
      }
    }

    // Output format
    const { outputFormat } = await inquirer.prompt([
      {
        type: 'list',
        name: 'outputFormat',
        message: 'Select output format for frontmatter:',
        choices: [
          { name: 'YAML (default)', value: 'yaml' },
          { name: 'JSON', value: 'json' }
        ],
        default: 'yaml'
      }
    ]);

    commandArgs.push('--output-format', outputFormat);

    // Confirm and run
    console.log(chalk.cyan('\nCommand to run:'));
    console.log(chalk.yellow(`frontmatter-array.js ${commandArgs.join(' ')}`));

    const { confirmRun } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmRun',
        message: 'Do you want to run this command now?',
        default: true
      }
    ]);

    if (confirmRun) {
      runFrontmatterScript(commandArgs);
    } else {
      console.log(chalk.yellow('Command not executed. You can run it manually using the command above.'));
    }
    
    // Ask if user wants to perform another field operation
    const { performAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'performAnother',
        message: 'Would you like to perform another field operation?',
        default: false
      }
    ]);

    if (performAnother) {
      return await handleFieldOperations();
    }
    
  } catch (error) {
    console.error(chalk.red('Error in field operations:'), error.message);
    process.exit(1);
  }
}

// Handle copy frontmatter operation
async function handleCopyFrontmatter() {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'sourceDir',
        message: 'Enter the source directory (containing frontmatter to copy):',
        validate: (input) => {
          if (!input) return 'Source directory is required';
          if (!fs.existsSync(input)) return 'Source directory does not exist';
          return true;
        }
      },
      {
        type: 'input',
        name: 'targetDir',
        message: 'Enter the target directory (where frontmatter will be copied to):',
        validate: (input) => {
          if (!input) return 'Target directory is required';
          if (!fs.existsSync(input)) return 'Target directory does not exist';
          return true;
        }
      },
      {
        type: 'input',
        name: 'frontmatterFields',
        message: 'Enter frontmatter fields to copy (comma-separated, leave empty for all fields):',
        default: ''
      },
      {
        type: 'checkbox',
        name: 'options',
        message: 'Select additional options:',
        choices: [
          { name: 'Dry run (preview changes without modifying files)', value: '--dry-run' },
          { name: 'Don\'t process subdirectories', value: '--no-recursive' },
          { name: 'Verbose output', value: '--verbose' }
        ]
      },
      {
        type: 'input',
        name: 'extensions',
        message: 'Enter file extensions to process (comma-separated):',
        default: '.md,.markdown'
      },
      {
        type: 'list',
        name: 'outputFormat',
        message: 'Select output format for frontmatter:',
        choices: [
          { name: 'YAML (default)', value: 'yaml' },
          { name: 'JSON', value: 'json' }
        ],
        default: 'yaml'
      }
    ]);

    const commandArgs = [
      '--copy-frontmatter',
      answers.sourceDir,
      answers.targetDir
    ];

    if (answers.frontmatterFields) {
      commandArgs.push('--frontmatter-fields', answers.frontmatterFields);
    }

    commandArgs.push(...answers.options);
    commandArgs.push('--extension', answers.extensions);
    commandArgs.push('--output-format', answers.outputFormat);

    // Confirm and run
    console.log(chalk.cyan('\nCommand to run:'));
    console.log(chalk.yellow(`frontmatter-array.js ${commandArgs.join(' ')}`));

    const { confirmRun } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmRun',
        message: 'Do you want to run this command now?',
        default: true
      }
    ]);

    if (confirmRun) {
      runFrontmatterScript(commandArgs);
    } else {
      console.log(chalk.yellow('Command not executed. You can run it manually using the command above.'));
    }
  } catch (error) {
    console.error(chalk.red('Error in copy frontmatter wizard:'), error.message);
    process.exit(1);
  }
}

// Function to run the frontmatter-array.js script with the given arguments
function runFrontmatterScript(args) {
  console.log(chalk.cyan('\nRunning frontmatter-array.js...\n'));

  const scriptPath = path.join(__dirname, 'frontmatter-array.js');
  
  // Make sure the script is executable
  try {
    fs.accessSync(scriptPath, fs.constants.X_OK);
  } catch (error) {
    console.log(chalk.yellow('Making script executable...'));
    try {
      fs.chmodSync(scriptPath, '755');
    } catch (chmodError) {
      console.error(chalk.red('Could not make script executable:'), chmodError.message);
      console.log(chalk.yellow('Will try to run with node explicitly.'));
    }
  }

  // Spawn the process
  const child = spawn('node', [scriptPath, ...args], {
    stdio: 'inherit'
  });

  child.on('error', (error) => {
    console.error(chalk.red('Error executing script:'), error.message);
    process.exit(1);
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('\n✨ Script completed successfully!'));
    } else {
      console.error(chalk.red(`\n❌ Script exited with code ${code}`));
    }
  });
}

// Check for dependencies
function checkDependencies() {
  const dependencies = ['gray-matter'];
  const missing = [];

  for (const dep of dependencies) {
    try {
      require.resolve(dep);
    } catch (error) {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    console.log(chalk.yellow(`\nWarning: Some dependencies might be missing: ${missing.join(', ')}`));
    console.log(chalk.gray('You can install them with:'));
    console.log(chalk.gray(`npm install ${missing.join(' ')}`));
    console.log('');
  }
}

// Main execution
async function main() {
  checkDependencies();
  await runWizard();
}

// Start the wizard
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error.message);
  process.exit(1);
});