const fs = require('fs');
const path = require('path');

const directory = './frontend/src';

const classReplacements = [
  // Dark mode backgrounds -> Light mode
  [/bg-black(\/[0-9]+)?/g, 'bg-white'],
  [/bg-zinc-900(\/[0-9]+)?/g, 'bg-gray-50'],
  [/bg-zinc-800(\/[0-9]+)?/g, 'bg-gray-100'],
  [/bg-\[\#141414\]/g, 'bg-gray-50'],
  [/bg-\[\#0a0a0a\]/g, 'bg-white'],
  [/from-zinc-900/g, 'from-white'],
  [/via-zinc-900/g, 'via-gray-50'],
  [/to-amber-950/g, 'to-gray-100'],
  [/from-black/g, 'from-white'],
  [/to-zinc-900/g, 'to-gray-50'],

  // Text colors
  [/text-white/g, 'text-gray-900'],
  [/text-gray-200/g, 'text-gray-800'],
  [/text-gray-300/g, 'text-gray-700'],
  [/text-gray-400/g, 'text-gray-600'],
  [/text-silver-300/g, 'text-gray-600'],
  [/text-silver-400/g, 'text-gray-500'],
  [/text-gold-400/g, 'text-blue-600'],
  [/text-gold-500/g, 'text-blue-700'],
  [/gold-gradient-text/g, 'text-blue-700 font-bold'],

  // Borders
  [/border-gold-500(\/[0-9]+)?/g, 'border-gray-200'],
  [/border-zinc-800/g, 'border-gray-200'],
  [/border-zinc-700/g, 'border-gray-300'],
  [/border-white\/10/g, 'border-gray-200'],
  
  // Shadows & Glows
  [/shadow-gold-500(\/[0-9]+)?/g, 'shadow-sm'],
  [/shadow-gold/g, 'shadow-sm'],
  [/shadow-2xl/g, 'shadow-md'],
  [/shadow-xl/g, 'shadow-sm'],
  
  // Buttons
  [/bg-gold-500(\/[0-9]+)?/g, 'bg-blue-600'],
  [/hover:bg-gold-400/g, 'hover:bg-blue-700'],
  [/from-gold-400 to-gold-600/g, 'bg-blue-600'],
  [/from-gold-400 to-gold-700/g, 'bg-blue-600'],

  // Custom class overrides
  [/glass-panel/g, 'bg-white border border-gray-200 shadow-sm rounded-xl'],
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else {
      if (['.tsx', '.ts', '.css'].includes(path.extname(fullPath))) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let originalContent = content;

        // Strip logos entirely
        content = content.replace(/<img[^>]*src="\/mtrx-logo\.png"[^>]*>/g, '');
        content = content.replace(/<img[^>]*src="\/rit-logo\.png"[^>]*>/g, '');
        content = content.replace(/<img[^>]*alt="[^"]*Logo"[^>]*>/gi, '');
        content = content.replace(/<img[^>]*alt="[^"]*Emblem"[^>]*>/gi, '');

        // Apply class replacements
        classReplacements.forEach(([regex, replacement]) => {
          content = content.replace(regex, replacement);
        });

        if (content !== originalContent) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Simplified UI in: ${fullPath}`);
        }
      }
    }
  });
}

processDirectory(directory);
console.log('UI simplification complete.');
