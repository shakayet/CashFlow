import QueryBuilder from '../../../builder/QueryBuilder';
import { IBankTransaction } from './bankTransaction.interface';
import { BankTransaction } from './bankTransaction.model';

const createBankTransactionToDB = async (
  payload: IBankTransaction,
): Promise<IBankTransaction> => {
  const result = await BankTransaction.create(payload);
  return result;
};

const getAllBankTransactionsFromDB = async (query: Record<string, any>) => {
  const bankTransactionQuery = new QueryBuilder(BankTransaction.find({}), query)
    .search(['name', 'email', 'phone'])
    .filter()
    .sort()
    .paginate();

  const result = await bankTransactionQuery.modelQuery;
  const pagination = await bankTransactionQuery.pagination();

  return {
    pagination,
    result,
  };
};

const updateBankTransactionToDB = async (
  id: string,
  payload: Partial<IBankTransaction>,
): Promise<IBankTransaction | null> => {
  const result = await BankTransaction.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

const deleteBankTransactionToDB = async (id: string): Promise<void> => {
  await BankTransaction.findByIdAndDelete(id);
};

export const BankTransactionService = {
  createBankTransactionToDB,
  getAllBankTransactionsFromDB,
  updateBankTransactionToDB,
  deleteBankTransactionToDB,
};
