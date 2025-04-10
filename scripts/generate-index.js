// scripts/generate-index.js
const fs = require('fs');
const path = require('path');

const PROMPT_RESULTS_DIR = path.join(__dirname, '../code-assist-webUI/code-assist-web/src/prompt-results');
const INDEX_FILE = path.join(PROMPT_RESULTS_DIR, 'index.json');

function generateIndex() {
    const index = {};
    
    // Get all model directories
    const modelDirs = fs.readdirSync(PROMPT_RESULTS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    modelDirs.forEach(modelDir => {
        const modelPath = path.join(PROMPT_RESULTS_DIR, modelDir);
        
        // Get all JSON files for this model (excluding index.json)
        const files = fs.readdirSync(modelPath)
            .filter(file => file.endsWith('.json') && file !== 'index.json');
        
        // Sort files by timestamp (newest first)
        index[modelDir] = files.sort((a, b) => 
            b.localeCompare(a) // Sorts descending by filename
        ).map(file => `${modelDir}/${file}`);
    });

    if (!fs.existsSync(PROMPT_RESULTS_DIR)) {
        fs.mkdirSync(PROMPT_RESULTS_DIR, { recursive: true });
    }

    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    console.log('Generated index.json with models:', Object.keys(index));
}

// Run generation
generateIndex();