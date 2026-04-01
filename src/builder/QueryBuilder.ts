/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Query } from 'mongoose';

class QueryBuilder<T extends Document> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, any>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, any>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  search(searchableFields: string[]) {
    const searchTerm = this.query.searchTerm;
    if (searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(
          field =>
            ({
              [field]: { $regex: searchTerm, $options: 'i' },
            }) as Record<string, any>,
        ),
      });
    }
    return this;
  }

  filter() {
    const queryObj = { ...this.query };
    const excludeFields = [
      'searchTerm',
      'page',
      'limit',
      'sortBy',
      'sortOrder',
    ];
    excludeFields.forEach(el => delete queryObj[el]);

    this.modelQuery = this.modelQuery.find(queryObj);
    return this;
  }

  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    return this;
  }

  sort() {
    const sortBy = this.query.sortBy || 'createdAt';
    const sortOrder = this.query.sortOrder === 'desc' ? -1 : 1;

    this.modelQuery = this.modelQuery.sort({ [sortBy]: sortOrder });
    return this;
  }

  async pagination() {
    const total = await this.modelQuery.model.countDocuments(
      this.modelQuery.getFilter(),
    );
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;

    return {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    };
  }
}

export default QueryBuilder;
