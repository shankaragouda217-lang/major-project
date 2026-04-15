const fs = require('fs');
const content = fs.readFileSync('src/translations.ts', 'utf8');
const lines = content.split('\n');
const keyRegex = /^\s*([a-z0-9_]+):/i;

const languages = ['en', 'hi', 'kn', 'ta', 'te'];
let currentLang = '';
const duplicates = {};

lines.forEach((line, index) => {
  const langMatch = line.match(/^\s*([a-z]{2}):\s*{/);
  if (langMatch) {
    currentLang = langMatch[1];
    duplicates[currentLang] = {};
    return;
  }

  const keyMatch = line.match(keyRegex);
  if (keyMatch && currentLang) {
    const key = keyMatch[1];
    if (!duplicates[currentLang][key]) {
      duplicates[currentLang][key] = [];
    }
    duplicates[currentLang][key].push(index + 1);
  }
});

for (const lang in duplicates) {
  console.log(`--- Language: ${lang} ---`);
  let found = false;
  for (const key in duplicates[lang]) {
    if (duplicates[lang][key].length > 1) {
      console.log(`Duplicate key "${key}" found at lines: ${duplicates[lang][key].join(', ')}`);
      found = true;
    }
  }
  if (!found) console.log('No duplicates found.');
}
