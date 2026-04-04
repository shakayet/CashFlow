export type IPrivacyPolicy = {
  create(payload: IPrivacyPolicy): unknown;
  find(arg0: {}): import("mongoose").Query<import("mongoose").Document<unknown, any, any, Record<string, any>>[], import("mongoose").Document<unknown, any, any, Record<string, any>>, {}, unknown, "find", Record<string, never>>;
  findById(id: string): unknown;
  findOneAndUpdate(arg0: { _id: string; }, payload: Partial<IPrivacyPolicy>, arg2: { new: boolean; }): unknown;
  findByIdAndDelete(id: string): unknown;
  title: string;
  description: string;
};
