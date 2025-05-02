# Frontmatter Manager

A tool to manage frontmatter in markdown files. This utility helps you convert between string and array formats in frontmatter, add/remove/rename fields, and copy frontmatter between files.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/frontmatter-manager.git
cd frontmatter-manager

# Install dependencies
npm install
```

## Usage

### Using the Wizard (Recommended)

The easiest way to use this tool is through the interactive wizard:

```bash
npm run wizard
# or
node wizard.js
```

The wizard will guide you through all available options and help you construct the right command.

### Direct Command Line Usage

You can also use the tool directly:

```bash
node frontmatter-array.js [directory] [options]
```

For example:

```bash
node frontmatter-array.js ./content --fields tags,categories --mode to-array
```

## Features

- **Field Management**:
  - Add new fields with text, array, or empty values
  - Edit/rename existing fields with option to update values
  - Remove fields with confirmation to prevent accidental deletion
- **Format Conversion**:
  - Convert string fields to arrays and vice versa
  - Sort arrays and remove duplicate values
- **Batch Operations**:
  - Process multiple files at once
  - Copy frontmatter between files
- **Analysis Tools**:
  - Analyze frontmatter without making changes
  - Validate required fields
  - Generate statistics about frontmatter usage

## Interactive Wizard

The interactive wizard provides a user-friendly interface for managing frontmatter:

1. **Main Operations**:
   - Convert string fields to arrays
   - Convert array fields to strings
   - Manage frontmatter fields (add/edit/remove)
   - Analyze frontmatter without changes
   - Validate frontmatter fields
   - Copy frontmatter between directories

2. **Field Operations**:
   - Add fields with different value types (text, array, empty)
   - Edit/rename fields with option to update values
   - Remove fields with confirmation
   - Perform multiple field operations in sequence

## Command Line Options

Run with `--help` to see all available options:

```bash
node frontmatter-array.js --help
```

### Basic Options

```
-h, --help                 Show this help message
-f, --fields <fields>      Comma-separated list of frontmatter fields to process
-d, --delimiter <char>     Delimiter character for splitting strings (default: comma)
--dry-run                  Preview changes without modifying files
--no-recursive             Don't process subdirectories
-v, --verbose              Show more detailed output
-e, --extension <exts>     File extensions to process (comma-separated, default: .md,.markdown)
-p, --pattern <regex>      Only process files matching this regex pattern
```

### Field Operations

```
--add-field <name> [value] Add a new field with optional value to all files
--remove-field <name>      Remove a field from all files
--rename-field <old> <new> Rename a field in all files
--sort-arrays              Sort array values alphabetically
--unique-values            Remove duplicate values from arrays
```

## Examples

### Convert comma-separated tags to arrays

```bash
node frontmatter-array.js ./content --fields tags,categories --mode to-array
```

### Add a status field to all files

```bash
node frontmatter-array.js ./content --add-field "status" "draft"
```

### Rename a field

```bash
node frontmatter-array.js ./content --rename-field "oldName" "newName"
```

### Copy frontmatter between directories

```bash
node frontmatter-array.js --copy-frontmatter ./source-content ./target-content
```

### Process only specific files

```bash
node frontmatter-array.js ./content --pattern "^post-.*\.md$" --fields tags --mode to-array
```

## License

MIT