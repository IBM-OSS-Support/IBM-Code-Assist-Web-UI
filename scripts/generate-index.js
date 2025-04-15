// scripts/generate-index.js
const fs = require('fs');
const path = require('path');

const PROMPT_RESULTS_DIR = path.join(__dirname, '../code-assist-webUI/code-assist-web/src/prompt-results');
const INDEX_FILE = path.join(PROMPT_RESULTS_DIR, 'index.json');

function generateIndex() {
    const index = {};

    const modelDirs = fs.readdirSync(PROMPT_RESULTS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    modelDirs.forEach(modelDir => {
        const modelPath = path.join(PROMPT_RESULTS_DIR, modelDir);

        const files = fs.readdirSync(modelPath)
            .filter(file => file.endsWith('.json') && file !== 'index.json');

        if (files.length > 0) {
            index[modelDir] = files
                .sort((a, b) => b.localeCompare(a))
                .map(file => `${modelDir}/${file}`);
        } else {
            console.warn(`⚠️ No valid JSON files found in ${modelDir}`);
        }
    });

    if (!fs.existsSync(PROMPT_RESULTS_DIR)) {
        fs.mkdirSync(PROMPT_RESULTS_DIR, { recursive: true });
    }

    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    console.log('✅ Generated index.json with models:', Object.keys(index));
}

// Run if called directly
if (require.main === module) {
    generateIndex();
}
