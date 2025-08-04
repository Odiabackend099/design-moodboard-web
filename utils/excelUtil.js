import ExcelJS from 'exceljs';

export async function readExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  const rows = [];
  worksheet.eachRow((row) => {
    rows.push(row.values.slice(1));
  });
  return rows;
}

export async function writeExcel(data, filePath) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(Object.keys(data[0]));
  data.forEach(item => sheet.addRow(Object.values(item)));
  await workbook.xlsx.writeFile(filePath);
}