const fs = require('fs');
const content = fs.readFileSync('src/translations.ts', 'utf8');

function getKeys(lang) {
    const regex = new RegExp(`${lang}: \\{([\\s\\S]*?)\\n  \\},`);
    const match = content.match(regex);
    if (match) {
        const sectionContent = match[1];
        const lines = sectionContent.split('\n');
        const keys = new Set();
        lines.forEach(line => {
            const keyMatch = line.match(/^\s*([a-z0-9_]+):/);
            if (keyMatch) keys.add(keyMatch[1]);
        });
        return keys;
    }
    return new Set();
}

const enKeys = getKeys('en');
const knKeys = getKeys('kn');

console.log('Keys in en but not in kn:');
enKeys.forEach(key => {
    if (!knKeys.has(key)) {
        console.log(key);
    }
});
