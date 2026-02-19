import { IPrivacyPolicy } from './privacyPolicy.interface';
import { PrivacyPolicy } from './privacyPolicy.model';

const createPrivacyPolicy = async (
  payload: IPrivacyPolicy,
): Promise<IPrivacyPolicy | null> => {
  const result = await PrivacyPolicy.create(payload);
  return result;
};

const getAllPrivacyPolicies = async (): Promise<IPrivacyPolicy[]> => {
  const result = await PrivacyPolicy.find({});
  return result;
};

const getSinglePrivacyPolicy = async (
  id: string,
): Promise<IPrivacyPolicy | null> => {
  const result = await PrivacyPolicy.findById(id);
  return result;
};

const updatePrivacyPolicy = async (
  id: string,
  payload: Partial<IPrivacyPolicy>,
): Promise<IPrivacyPolicy | null> => {
  const result = await PrivacyPolicy.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return result;
};

const deletePrivacyPolicy = async (
  id: string,
): Promise<IPrivacyPolicy | null> => {
  const result = await PrivacyPolicy.findByIdAndDelete(id);
  return result;
};

export const PrivacyPolicyService = {
  createPrivacyPolicy,
  getAllPrivacyPolicies,
  getSinglePrivacyPolicy,
  updatePrivacyPolicy,
  deletePrivacyPolicy,
};
