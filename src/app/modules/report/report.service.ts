/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { Income } from '../income/income.model';
import { Expense } from '../expense/expense.model';
import { User } from '../user/user.model';
import { IReportData, IReportFilter } from './report.interface';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import { Response } from 'express';

const getReportData = async (
  user: JwtPayload,
  filters: IReportFilter,
): Promise<IReportData> => {
  const userId = new Types.ObjectId(user.id);
  let startDate: Date;

  if (filters.startDate) {
    startDate = new Date(filters.startDate);
  } else {
    // Find the earliest transaction date (Income or Expense)
    const [earliestIncome, earliestExpense] = await Promise.all([
      Income.findOne({ user: userId }).sort({ date: 1 }).select('date'),
      Expense.findOne({ user: userId }).sort({ date: 1 }).select('date'),
    ]);

    const dates = [earliestIncome?.date, earliestExpense?.date].filter(
      Boolean,
    ) as Date[];

    startDate =
      dates.length > 0
        ? new Date(Math.min(...dates.map(d => d.getTime())))
        : new Date(0);
  }

  const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

  const userData = await User.findById(userId);
  if (!userData) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Fetch Income Data
  const incomeAggregation = await Income.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Fetch Expense Data
  const expenseAggregation = await Expense.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
      },
    },
  ]);

  const totalIncome = incomeAggregation.reduce(
    (acc, curr) => acc + curr.total,
    0,
  );
  const totalExpense = expenseAggregation.reduce(
    (acc, curr) => acc + curr.total,
    0,
  );

  const incomeBreakdown = incomeAggregation.map(item => ({
    category: item._id,
    total: Number(item.total.toFixed(2)),
    percentage:
      totalIncome > 0
        ? Number(((item.total / totalIncome) * 100).toFixed(2))
        : 0,
  }));

  const expenseBreakdown = expenseAggregation.map(item => ({
    category: item._id || 'Uncategorized',
    total: Number(item.total.toFixed(2)),
    percentage:
      totalExpense > 0
        ? Number(((item.total / totalExpense) * 100).toFixed(2))
        : 0,
  }));

  return {
    summary: {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      savings: Number((totalIncome - totalExpense).toFixed(2)),
    },
    incomeBreakdown,
    expenseBreakdown,
    user: {
      name: userData.name,
      email: userData.email,
    },
    dateRange: {
      startDate: startDate.toDateString(),
      endDate: endDate.toDateString(),
    },
    generatedDate: new Date().toDateString(),
  };
};

const generatePDF = async (res: Response, data: IReportData) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');

  doc.pipe(res);

  // --- Header ---
  doc.fontSize(24).fillColor('#1A202C').text('CashFlowIQ', { align: 'left' });
  doc
    .fontSize(10)
    .fillColor('#718096')
    .text('Income & Expense Report', { align: 'left' });

  doc.moveUp(2);
  doc
    .fontSize(10)
    .fillColor('#1A202C')
    .text(data.user.name, { align: 'right' });
  doc
    .fontSize(10)
    .fillColor('#718096')
    .text(`Generated: ${data.generatedDate}`, { align: 'right' });
  doc.moveDown(1.5);

  // Horizontal Line
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor('#E2E8F0')
    .lineWidth(1)
    .stroke();
  doc.moveDown(2);

  // --- Date Range Banner ---
  const dateRangeText = `Period: ${data.dateRange.startDate} - ${data.dateRange.endDate}`;
  doc
    .fontSize(10)
    .fillColor('#4A5568')
    .text(dateRangeText, { align: 'center' });
  doc.moveDown(2);

  // --- Summary Section (Modern Box Style) ---
  const startY = doc.y;
  const boxWidth = 150;
  const boxHeight = 60;
  const spacing = 15;

  // Total Income Box
  doc.roundedRect(50, startY, boxWidth, boxHeight, 8).fill('#F0FFF4');
  doc
    .fillColor('#22543D')
    .fontSize(10)
    .text('TOTAL INCOME', 65, startY + 15);
  doc.fontSize(14).text(`$${data.summary.totalIncome}`, 65, startY + 32);

  // Total Expense Box
  doc
    .roundedRect(50 + boxWidth + spacing, startY, boxWidth, boxHeight, 8)
    .fill('#FFF5F5');
  doc
    .fillColor('#742A2A')
    .fontSize(10)
    .text('TOTAL EXPENSE', 65 + boxWidth + spacing, startY + 15);
  doc
    .fontSize(14)
    .text(
      `$${data.summary.totalExpense}`,
      65 + boxWidth + spacing,
      startY + 32,
    );

  // Savings Box
  const savingsColor = data.summary.savings >= 0 ? '#EBF8FF' : '#FFF5F5';
  const savingsTextColor = data.summary.savings >= 0 ? '#2A4365' : '#742A2A';
  doc
    .roundedRect(50 + (boxWidth + spacing) * 2, startY, boxWidth, boxHeight, 8)
    .fill(savingsColor);
  doc
    .fillColor(savingsTextColor)
    .fontSize(10)
    .text('NET SAVINGS', 65 + (boxWidth + spacing) * 2, startY + 15);
  doc
    .fontSize(14)
    .text(
      `$${data.summary.savings}`,
      65 + (boxWidth + spacing) * 2,
      startY + 32,
    );

  doc.y = startY + boxHeight + 40;

  // --- Breakdown Sections ---
  const drawBreakdown = (title: string, items: any[], color: string) => {
    doc.fontSize(14).fillColor('#1A202C').text(title, { underline: false });
    doc.moveDown(0.5);
    doc
      .moveTo(doc.x, doc.y)
      .lineTo(doc.x + 150, doc.y)
      .strokeColor(color)
      .lineWidth(2)
      .stroke();
    doc.moveDown(1);

    if (items.length === 0) {
      doc
        .fontSize(10)
        .fillColor('#718096')
        .text('No data available for this period.');
    } else {
      items.forEach(item => {
        const currentY = doc.y;
        doc.fontSize(10).fillColor('#2D3748').text(item.category, 50, currentY);
        doc.text(`$${item.total}`, 300, currentY);
        doc.fillColor('#718096').text(`${item.percentage}%`, 450, currentY);
        doc.moveDown(0.5);
        doc
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .strokeColor('#EDF2F7')
          .lineWidth(0.5)
          .stroke();
        doc.moveDown(0.5);
      });
    }
    doc.moveDown(2);
  };

  drawBreakdown('Income Breakdown', data.incomeBreakdown, '#48BB78');
  drawBreakdown('Expense Breakdown', data.expenseBreakdown, '#F56565');

  doc.end();
};

const generateExcel = async (res: Response, data: IReportData) => {
  const workbook = new ExcelJS.Workbook();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 25 },
  ];
  summarySheet.addRows([
    { field: 'Project', value: 'CashFlowIQ' },
    { field: 'Name', value: data.user.name },
    { field: 'Start Date', value: data.dateRange.startDate },
    { field: 'End Date', value: data.dateRange.endDate },
    { field: 'Generated Date', value: data.generatedDate },
    {},
    { field: 'Total Income', value: data.summary.totalIncome },
    { field: 'Total Expense', value: data.summary.totalExpense },
    { field: 'Total Savings', value: data.summary.savings },
  ]);

  // Styling Summary Header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getColumn(1).font = { bold: true };

  // Income Sheet
  const incomeSheet = workbook.addWorksheet('Income Breakdown');
  incomeSheet.columns = [
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Total ($)', key: 'total', width: 15 },
    { header: 'Percentage (%)', key: 'percentage', width: 15 },
  ];
  incomeSheet.addRows(data.incomeBreakdown);
  incomeSheet.getRow(1).font = { bold: true };

  // Expense Sheet
  const expenseSheet = workbook.addWorksheet('Expense Breakdown');
  expenseSheet.columns = [
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Total ($)', key: 'total', width: 15 },
    { header: 'Percentage (%)', key: 'percentage', width: 15 },
  ];
  expenseSheet.addRows(data.expenseBreakdown);
  expenseSheet.getRow(1).font = { bold: true };

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};

const generateCSV = async (res: Response, data: IReportData) => {
  const fields = ['type', 'category', 'amount', 'percentage'];
  const csvData: Record<string, string | number | undefined>[] = [];

  // Add Summary Rows
  csvData.push({ type: 'HEADER', category: 'Project', amount: 'CashFlowIQ' });
  csvData.push({ type: 'HEADER', category: 'Name', amount: data.user.name });
  csvData.push({
    type: 'HEADER',
    category: 'Date Range',
    amount: `${data.dateRange.startDate} - ${data.dateRange.endDate}`,
  });
  csvData.push({
    type: 'HEADER',
    category: 'Generated At',
    amount: data.generatedDate,
  });
  csvData.push({});
  csvData.push({
    type: 'SUMMARY',
    category: 'Total Income',
    amount: data.summary.totalIncome,
  });
  csvData.push({
    type: 'SUMMARY',
    category: 'Total Expense',
    amount: data.summary.totalExpense,
  });
  csvData.push({
    type: 'SUMMARY',
    category: 'Total Savings',
    amount: data.summary.savings,
  });
  csvData.push({});

  // Add Income Rows
  csvData.push({
    type: 'INCOME_SECTION',
    category: 'Category',
    amount: 'Total ($)',
    percentage: 'Percentage (%)',
  });
  data.incomeBreakdown.forEach(item => {
    csvData.push({
      type: 'INCOME',
      category: item.category,
      amount: item.total,
      percentage: item.percentage,
    });
  });
  csvData.push({});

  // Add Expense Rows
  csvData.push({
    type: 'EXPENSE_SECTION',
    category: 'Category',
    amount: 'Total ($)',
    percentage: 'Percentage (%)',
  });
  data.expenseBreakdown.forEach(item => {
    csvData.push({
      type: 'EXPENSE',
      category: item.category,
      amount: item.total,
      percentage: item.percentage,
    });
  });

  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(csvData);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
  res.status(StatusCodes.OK).send(csv);
};

export const ReportService = {
  getReportData,
  generatePDF,
  generateExcel,
  generateCSV,
};
