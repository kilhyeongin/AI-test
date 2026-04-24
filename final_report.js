const XLSX = require('xlsx');

const filePath = "./public/xlsx/하와이.xlsx";
console.log('='.repeat(80));
console.log('EXCEL FILE ANALYSIS REPORT: 하와이.xlsx');
console.log('='.repeat(80));

const wb = XLSX.readFile(filePath);

console.log('\n[1] SHEET INFORMATION');
console.log('-'.repeat(80));
console.log(`Total sheet count: ${wb.SheetNames.length}`);
wb.SheetNames.forEach((name, idx) => {
  console.log(`  Sheet ${idx + 1}: "${name}"`);
});

console.log('\n[2] FILE STRUCTURE');
console.log('-'.repeat(80));
console.log(`Workbook Properties:`);
console.log(`  - Created: ${wb.Props.CreatedDate}`);
console.log(`  - Modified: ${wb.Props.ModifiedDate}`);
console.log(`  - Author: ${wb.Props.Author}`);
console.log(`  - Application: ${wb.Props.Application} v${wb.Props.AppVersion}`);
console.log(`  - File Version: ${wb.Props.Version}`);

console.log('\n[3] DATA ACCESSIBILITY');
console.log('-'.repeat(80));
console.log(`Sheets object keys: ${Object.keys(wb.Sheets).length}`);
if (Object.keys(wb.Sheets).length === 0) {
  console.log('ERROR: Sheets object is EMPTY!');
  console.log('This is the root cause of the upload failure.');
}

console.log('\n[4] ERROR ANALYSIS');
console.log('-'.repeat(80));
console.log('When attempting to parse with WTF mode enabled:');
console.log('ERROR: Unrecognized rich format <hs:size');
console.log('\nThis error occurs in the sharedStrings.xml parser.');
console.log('The file contains Haansoft-specific formatting extensions:');
console.log('  - hs:extension');
console.log('  - hs:size');
console.log('  - hs:ratio');
console.log('  - hs:spacing');
console.log('  - hs:offset');
console.log('\nThese are proprietary extensions from HCell/Haansoft that');
console.log('the standard xlsx library does not support.');
