/**
 * build.js - PRAVAAH Standalone Bundler
 * Compiles modular CSS & JS into self-contained standalone HTML files:
 * 1. Root: index.html
 * 2. Frontend: frontend/index.html
 *
 * This ensures that when a user sends or opens ANY .html file on a phone
 * (e.g. via WhatsApp, email, Downloads), ALL styles, fonts, and logic are
 * 100% embedded and never fail to load.
 */
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const ROOT_INDEX = path.join(ROOT_DIR, 'index.html');
const FRONTEND_INDEX = path.join(FRONTEND_DIR, 'index.html');
const FRONTEND_CSS = path.join(FRONTEND_DIR, 'css', 'style.css');

console.log('Building PRAVAAH standalone distribution...');

const css = fs.readFileSync(FRONTEND_CSS, 'utf8');
const configJs = fs.readFileSync(path.join(FRONTEND_DIR, 'js', 'config.js'), 'utf8');
const trainApiJs = fs.readFileSync(path.join(FRONTEND_DIR, 'js', 'api', 'trainApi.js'), 'utf8');
const stationApiJs = fs.readFileSync(path.join(FRONTEND_DIR, 'js', 'api', 'stationApi.js'), 'utf8');
const weatherApiJs = fs.readFileSync(path.join(FRONTEND_DIR, 'js', 'api', 'weatherApi.js'), 'utf8');
const complaintApiJs = fs.readFileSync(path.join(FRONTEND_DIR, 'js', 'api', 'complaintApi.js'), 'utf8');
const appJs = fs.readFileSync(path.join(FRONTEND_DIR, 'js', 'app.js'), 'utf8');

// Read current template (using root index.html structure)
let template = fs.readFileSync(ROOT_INDEX, 'utf8');

// Replace stylesheet block with latest style.css
const styleRegex = /<style>[\s\S]*?<\/style>/;
if (styleRegex.test(template)) {
  template = template.replace(styleRegex, '<style>\n' + css + '\n  </style>');
}

// Replace modular scripts with latest source code
const configRegex = /<script>\s*\/\*\*[\s\S]*?config\.js[\s\S]*?<\/script>/;
if (configRegex.test(template)) {
  template = template.replace(configRegex, '<script>\n' + configJs + '\n</script>');
}

const trainApiRegex = /<script>\s*\/\*\*[\s\S]*?trainApi\.js[\s\S]*?<\/script>/;
if (trainApiRegex.test(template)) {
  template = template.replace(trainApiRegex, '<script>\n' + trainApiJs + '\n</script>');
}

const stationApiRegex = /<script>\s*\/\*\*[\s\S]*?stationApi\.js[\s\S]*?<\/script>/;
if (stationApiRegex.test(template)) {
  template = template.replace(stationApiRegex, '<script>\n' + stationApiJs + '\n</script>');
}

const weatherApiRegex = /<script>\s*\/\*\*[\s\S]*?weatherApi\.js[\s\S]*?<\/script>/;
if (weatherApiRegex.test(template)) {
  template = template.replace(weatherApiRegex, '<script>\n' + weatherApiJs + '\n</script>');
}

const complaintApiRegex = /<script>\s*\/\*\*[\s\S]*?complaintApi\.js[\s\S]*?<\/script>/;
if (complaintApiRegex.test(template)) {
  template = template.replace(complaintApiRegex, '<script>\n' + complaintApiJs + '\n</script>');
}

const appRegex = /<script>\s*\/\/\s*={10,}\s*\n\/\/\s*PRAVAAH — COMPLETE JAVASCRIPT ENGINE[\s\S]*?<\/script>/;
if (appRegex.test(template)) {
  template = template.replace(appRegex, '<script>\n' + appJs + '\n</script>');
}

// Write to root index.html
fs.writeFileSync(ROOT_INDEX, template, 'utf8');
console.log('✓ index.html updated: ' + template.length + ' bytes');

// Write to frontend/index.html as well for 100% standalone reliability
fs.writeFileSync(FRONTEND_INDEX, template, 'utf8');
console.log('✓ frontend/index.html updated: ' + template.length + ' bytes');

// Also sync to scratch
const scratchRoot = 'C:\\Users\\satya\\.gemini\\antigravity\\scratch\\pravaah-v5';
if (fs.existsSync(scratchRoot)) {
  fs.writeFileSync(path.join(scratchRoot, 'index.html'), template, 'utf8');
  if (fs.existsSync(path.join(scratchRoot, 'frontend'))) {
    fs.writeFileSync(path.join(scratchRoot, 'frontend', 'index.html'), template, 'utf8');
  }
  // Sync data and app.js as well
  const scratchTrains = path.join(scratchRoot, 'backend', 'data', 'trains.json');
  if (fs.existsSync(scratchTrains)) {
    fs.writeFileSync(scratchTrains, fs.readFileSync(path.join(ROOT_DIR, 'backend', 'data', 'trains.json'), 'utf8'), 'utf8');
  }
  const scratchApp = path.join(scratchRoot, 'frontend', 'js', 'app.js');
  if (fs.existsSync(scratchApp)) {
    fs.writeFileSync(scratchApp, appJs, 'utf8');
  }
  console.log('✓ Synced to scratch directory');
}

console.log('--- PRAVAAH Bundling Complete ---');
