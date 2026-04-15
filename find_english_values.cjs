import fs from 'fs';

const content = fs.readFileSync('src/translations.ts', 'utf8');

// Basic parser to extract language sections
const sections: Record<string, Record<string, string>> = {};
let currentLang = '';

const lines = content.split('\n');
for (let line of lines) {
    const langMatch = line.match(/^\s*(\w+):\s*\{/);
    if (langMatch && ['en', 'kn', 'hi', 'ta', 'te'].includes(langMatch[1])) {
        currentLang = langMatch[1];
        sections[currentLang] = {};
        continue;
    }
    if (line.includes('},') || line.includes('}')) {
        // Simple end of section detection
        if (line.trim() === '},' || line.trim() === '}') {
            // currentLang = ''; // Don't reset yet, might be nested
        }
    }
    if (currentLang) {
        const keyValMatch = line.match(/^\s*"?([\w\s-]+)"?:\s*"(.*)",?\s*$/);
        if (keyValMatch) {
            sections[currentLang][keyValMatch[1]] = keyValMatch[2];
        }
    }
}

console.log('--- English strings in non-English sections ---');
for (const [lang, translations] of Object.entries(sections)) {
    if (lang === 'en') continue;
    for (const [key, val] of Object.entries(translations)) {
        // Check if value is mostly English (ASCII)
        // We exclude placeholders like {value}, {days}, etc.
        const cleanVal = val.replace(/\{[\w]+\}/g, '').trim();
        if (cleanVal.length > 0 && /^[A-Za-z0-9\s.,!?:;'"()/-]+$/.test(cleanVal)) {
            // Some English is expected (like "N/A", "GPS", "AI")
            const commonEnglish = ['N/A', 'GPS', 'AI', 'INR', 'API', 'Google', 'Gemini', 'ID', 'Log', 'm', 'h', 'd', 'C'];
            if (!commonEnglish.some(e => cleanVal.includes(e)) && cleanVal.length > 3) {
                console.log(`[${lang}] ${key}: "${val}"`);
            }
        }
    }
}
