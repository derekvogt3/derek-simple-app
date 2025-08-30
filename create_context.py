import os

# --- Configuration ---
# The root directory of the repository (defaults to the current directory)
REPO_PATH = '.'

# The name of the output file
OUTPUT_FILENAME = 'repo_context.txt'

# File extensions to include in the context
TARGET_EXTENSIONS = ('.py', '.ts', '.tsx', '.css', '.md', '.json', '.html')

# Directories to ignore
IGNORE_DIRS = {'.git', 'node_modules', 'venv', 'dist', 'build', '__pycache__', '.vscode'}

# --- NEW: Specific filenames to ignore ---
IGNORE_FILES = {
    'package.json', 
    'package-lock.json', 
    'repo_context.txt', # Exclude the output file itself
    'create_context.py' # Exclude this script
}

def create_context_file():
    """
    Scans the repository, reads the content of specified file types,
    and writes it to a single text file with file paths as headers.
    """
    # Open the output file in write mode
    with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as outfile:
        print(f"Starting to scan directory: {os.path.abspath(REPO_PATH)}")
        
        # Walk through the directory tree
        for root, dirs, files in os.walk(REPO_PATH):
            # Modify dirs in-place to skip ignored directories
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for filename in files:
                # --- MODIFIED: Check against ignore lists for both extensions and specific filenames ---
                if filename.endswith(TARGET_EXTENSIONS) and filename not in IGNORE_FILES:
                    file_path = os.path.join(root, filename)
                    
                    try:
                        # Write the file path as a header
                        outfile.write(f"--- FILE: {file_path} ---\n\n")
                        
                        # Determine the language for the markdown code block
                        language = filename.split('.')[-1]
                        if language == 'py':
                            language = 'python'
                        elif language in ['ts', 'tsx']:
                            language = 'typescript'

                        outfile.write(f"```{language}\n")
                        
                        # Read the content of the file and write it
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                            content = infile.read()
                            outfile.write(content)
                        
                        # Close the markdown code block
                        outfile.write("\n```\n\n")
                        print(f"  Added: {file_path}")

                    except Exception as e:
                        print(f"  Error reading {file_path}: {e}")

    print(f"\n✅ Repository context has been successfully written to {OUTPUT_FILENAME}")

if __name__ == "__main__":
    create_context_file()