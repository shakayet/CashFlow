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
  const startDate = filters.startDate
    ? new Date(filters.startDate)
    : new Date(0);
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
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');

  doc.pipe(res);

  // Header
  doc.fontSize(20).text('JBAY - Income & Expense Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`User: ${data.user.name} (${data.user.email})`);
  doc.text(
    `Date Range: ${data.dateRange.startDate} - ${data.dateRange.endDate}`,
  );
  doc.text(`Generated On: ${data.generatedDate}`);
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Summary Section
  doc.fontSize(16).text('Summary', { underline: true });
  doc.fontSize(12).text(`Total Income: $${data.summary.totalIncome}`);
  doc.text(`Total Expense: $${data.summary.totalExpense}`);
  doc
    .fillColor(data.summary.savings >= 0 ? 'green' : 'red')
    .text(`Total Savings: $${data.summary.savings}`)
    .fillColor('black');
  doc.moveDown();

  // Income Breakdown
  doc.fontSize(16).text('Income Breakdown', { underline: true });
  if (data.incomeBreakdown.length === 0) {
    doc.fontSize(12).text('No income data available.');
  } else {
    data.incomeBreakdown.forEach(item => {
      doc
        .fontSize(12)
        .text(`${item.category}: $${item.total} (${item.percentage}%)`);
    });
  }
  doc.moveDown();

  // Expense Breakdown
  doc.fontSize(16).text('Expense Breakdown', { underline: true });
  if (data.expenseBreakdown.length === 0) {
    doc.fontSize(12).text('No expense data available.');
  } else {
    data.expenseBreakdown.forEach(item => {
      doc
        .fontSize(12)
        .text(`${item.category}: $${item.total} (${item.percentage}%)`);
    });
  }

  doc.end();
};

const generateExcel = async (res: Response, data: IReportData) => {
  const workbook = new ExcelJS.Workbook();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  summarySheet.addRows([
    { field: 'User Name', value: data.user.name },
    { field: 'User Email', value: data.user.email },
    { field: 'Start Date', value: data.dateRange.startDate },
    { field: 'End Date', value: data.dateRange.endDate },
    { field: 'Generated Date', value: data.generatedDate },
    {},
    { field: 'Total Income', value: data.summary.totalIncome },
    { field: 'Total Expense', value: data.summary.totalExpense },
    { field: 'Total Savings', value: data.summary.savings },
  ]);

  // Income Sheet
  const incomeSheet = workbook.addWorksheet('Income Breakdown');
  incomeSheet.columns = [
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
  ];
  incomeSheet.addRows(data.incomeBreakdown);

  // Expense Sheet
  const expenseSheet = workbook.addWorksheet('Expense Breakdown');
  expenseSheet.columns = [
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 },
  ];
  expenseSheet.addRows(data.expenseBreakdown);

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
  csvData.push({ type: 'HEADER', category: 'User', amount: data.user.name });
  csvData.push({ type: 'HEADER', category: 'Email', amount: data.user.email });
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
    amount: 'Total',
    percentage: 'Percentage',
  });
  data.incomeBreakdown.forEach(item => {
    csvData.push({
      type: 'INCOME',
      category: item.category,
      amount: item.total,
      percentage: `${item.percentage}%`,
    });
  });
  csvData.push({});

  // Add Expense Rows
  csvData.push({
    type: 'EXPENSE_SECTION',
    category: 'Category',
    amount: 'Total',
    percentage: 'Percentage',
  });
  data.expenseBreakdown.forEach(item => {
    csvData.push({
      type: 'EXPENSE',
      category: item.category,
      amount: item.total,
      percentage: `${item.percentage}%`,
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
