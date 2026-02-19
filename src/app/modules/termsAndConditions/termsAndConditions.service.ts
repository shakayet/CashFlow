// import { StatusCodes } from 'http-status-codes';
// import ApiError from '../../../errors/ApiError';
import { ITermsAndConditions } from './termsAndConditions.interface';
import { TermsAndConditions } from './termsAndConditions.model';

const createTermsAndConditions = async (
  payload: ITermsAndConditions,
): Promise<ITermsAndConditions | null> => {
  const result = await TermsAndConditions.create(payload);
  return result;
};

const getAllTermsAndConditions = async (): Promise<ITermsAndConditions[]> => {
  const result = await TermsAndConditions.find({});
  return result;
};

const getSingleTermsAndConditions = async (
  id: string,
): Promise<ITermsAndConditions | null> => {
  const result = await TermsAndConditions.findById(id);
  return result;
};

const updateTermsAndConditions = async (
  id: string,
  payload: Partial<ITermsAndConditions>,
): Promise<ITermsAndConditions | null> => {
  const result = await TermsAndConditions.findOneAndUpdate(
    { _id: id },
    payload,
    {
      new: true,
    },
  );
  return result;
};

const deleteTermsAndConditions = async (
  id: string,
): Promise<ITermsAndConditions | null> => {
  const result = await TermsAndConditions.findByIdAndDelete(id);
  return result;
};

export const TermsAndConditionsService = {
  createTermsAndConditions,
  getAllTermsAndConditions,
  getSingleTermsAndConditions,
  updateTermsAndConditions,
  deleteTermsAndConditions,
};
