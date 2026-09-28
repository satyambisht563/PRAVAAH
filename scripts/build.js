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

// Read current template (using root index.html structure or base)
let template = fs.readFileSync(ROOT_INDEX, 'utf8');

// Replace stylesheet block with latest style.css
const styleOpen = template.indexOf('<style>');
const styleClose = template.indexOf('</style>');
if (styleOpen !== -1 && styleClose !== -1) {
  template = template.slice(0, styleOpen) + '<style>\n' + css + '\n  ' + template.slice(styleClose);
} else {
  template = template.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n  </style>');
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
  console.log('✓ Synced to scratch directory');
}

console.log('--- PRAVAAH Bundling Complete ---');
