import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { BankTransactionService } from './bankTransaction.service';

const createBankTransaction = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BankTransactionService.createBankTransactionToDB(
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Bank transaction created successfully',
      data: result,
    });
  },
);

const getAllBankTransactions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BankTransactionService.getAllBankTransactionsFromDB(
      req.query,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Bank transactions retrieved successfully',
      pagination: result.meta,
      data: result.data,
    });
  },
);

const updateBankTransaction = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await BankTransactionService.updateBankTransactionToDB(
      id,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Bank transaction updated successfully',
      data: result,
    });
  },
);

const deleteBankTransaction = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await BankTransactionService.deleteBankTransactionToDB(id);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Bank transaction deleted successfully',
    });
  },
);

export const BankTransactionController = {
  createBankTransaction,
  getAllBankTransactions,
  updateBankTransaction,
  deleteBankTransaction,
};
