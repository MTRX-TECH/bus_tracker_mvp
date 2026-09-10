const fs = require('fs');
const path = require('path');

const directory = './';

const replaceMap = [
  // 1. Text Replacements
  [/MTRX Bus Tracker/gi, 'RIT Bus Tracker'],
  [/MTRX BUS TRACKER/g, 'RIT BUS TRACKER'],
  [/MTRX TECH/g, 'RIT'],
  [/MTRX Campus Transit Engine/g, 'RIT Campus Transit Engine'],
  [/MTRX_Windshield_Card/g, 'RIT_Windshield_Card'],
  [/MTRX_Enterprise_Report/g, 'RIT_Enterprise_Report'],
  [/MTRX_SuperAdmin_Report/g, 'RIT_SuperAdmin_Report'],
  [/MTRX TECH Super Administration/g, 'RIT Super Administration'],
  [/MTRX ALERT CENTER/g, 'RIT ALERT CENTER'],
  
  // 2. Exact strings with Founder names (Remove completely)
  [/Developed by MTRX TECH/gi, 'Developed by RIT'],
  [/\| Founder & CEO – <span className="text-white">MARAPATHRAN V<\/span>/g, ''],
  [/\| Founder & CEO: MARAPATHRAN V/g, ''],
  [/\(CEO: MARAPATHRAN V\)/g, ''],
  [/Founder & CEO: MARAPATHRAN V/g, ''],
  [/MARAPATHRAN V/g, ''],

  // 3. File references
  [/mtrx-logo\.png/g, 'rit-logo.png'],
  [/mtrx_offline_gps_queue/g, 'rit_offline_gps_queue'],
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git', 'dist'].includes(file)) {
        processDirectory(fullPath);
      }
    } else {
      if (['.ts', '.tsx', '.html', '.md', '.json'].includes(path.extname(fullPath))) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;

        replaceMap.forEach(([regex, replacement]) => {
          if (regex.test(content)) {
            content = content.replace(regex, replacement);
            modified = true;
          }
        });

        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated: ${fullPath}`);
        }
      }
    }
  });
}

processDirectory(directory);
console.log('Branding replacement complete.');
