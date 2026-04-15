
import fs from 'fs';

const content = fs.readFileSync('src/translations.ts', 'utf8');

const languages = ['en', 'kn', 'hi', 'ta', 'te'];
const scriptRanges = {
  kn: /[\u0C80-\u0CFF]/,
  hi: /[\u0900-\u097F]/,
  ta: /[\u0B80-\u0BFF]/,
  te: /[\u0C00-\u0C7F]/,
};

const lines = content.split('\n');
let currentLang = '';

lines.forEach((line, index) => {
  const langMatch = line.match(/^  (\w+): \{/);
  if (langMatch) {
    currentLang = langMatch[1];
  }

  if (currentLang && currentLang !== 'en') {
    // Check for other scripts in the current language section
    Object.entries(scriptRanges).forEach(([lang, range]) => {
      if (lang !== currentLang && range.test(line)) {
        // Exception: Kannada and Telugu scripts are similar but distinct.
        // However, "स" (Hindi) in Kannada is definitely wrong.
        console.log(`Potential mixing at line ${index + 1} (${currentLang}): ${line.trim()}`);
      }
    });
  }
});
