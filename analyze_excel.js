const XLSX = require('xlsx');
const fs = require('fs');

const filePath = process.argv[2];
console.log(`Reading file: ${filePath}`);

// Try different reading options
const options1 = {};
const options2 = { WTF: true };
const options3 = { WTF: true, defval: "" };

console.log('\n=== OPTION 1: Default ===');
let wb = XLSX.readFile(filePath, options1);
console.log(`Sheets object keys: ${Object.keys(wb.Sheets)}`);
console.log(`Sheets count: ${Object.keys(wb.Sheets).length}`);

console.log('\n=== OPTION 2: WTF Mode ===');
wb = XLSX.readFile(filePath, options2);
console.log(`Sheets object keys: ${Object.keys(wb.Sheets)}`);
console.log(`Sheets count: ${Object.keys(wb.Sheets).length}`);

console.log('\n=== OPTION 3: WTF + defval ===');
wb = XLSX.readFile(filePath, options3);
console.log(`Sheets object keys: ${Object.keys(wb.Sheets)}`);
console.log(`Sheets count: ${Object.keys(wb.Sheets).length}`);

// Check the raw workbook object structure
console.log('\n=== DEEP INSPECTION ===');
wb = XLSX.readFile(filePath);
console.log('Keys in wb:', Object.keys(wb));
console.log('wb.Sheets type:', typeof wb.Sheets);
console.log('wb.Sheets is array:', Array.isArray(wb.Sheets));
console.log('wb.Sheets length:', wb.Sheets ? Object.keys(wb.Sheets).length : 'N/A');

// Check if maybe it's stored differently
if (wb.Sheets) {
  for (let key in wb.Sheets) {
    console.log(`  Key: "${key}" => ${typeof wb.Sheets[key]}`);
  }
}

// Try to manually load
console.log('\n=== LOADING XML DIRECTLY ===');
const AdmZip = require('adm-zip');
try {
  const zip = new AdmZip(filePath);
  const sheetFile = zip.readAsText('xl/worksheets/sheet1.xml').substring(0, 1000);
  console.log('sheet1.xml exists and is readable');
  console.log(sheetFile.substring(0, 300));
} catch (e) {
  console.log('Cannot read with adm-zip:', e.message);
}
