/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BILLING_CYCLE,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_STATUS,
} from '../subscription/subscription.interface';
import { Subscription } from '../subscription/subscription.model';
import { User } from '../user/user.model';
import { IDashboardData } from './admin.interface';
import QueryBuilder from '../../../builder/QueryBuilder';

const PLAN_PRICES = {
  [SUBSCRIPTION_PLAN.BASIC_GROWTH]: { monthly: 29, yearly: 299 },
  [SUBSCRIPTION_PLAN.PRO_PROFESSIONAL]: { monthly: 59, yearly: 599 },
  [SUBSCRIPTION_PLAN.ELITE_POWER_USER]: { monthly: 99, yearly: 999 },
  [SUBSCRIPTION_PLAN.SHIELD_AUDIT_DEFENSE]: { monthly: 149, yearly: 1499 },
  [SUBSCRIPTION_PLAN.FREE]: { monthly: 0, yearly: 0 },
};

const getDashboardData = async (): Promise<IDashboardData> => {
  // 1. Total Revenue calculation using aggregation
  const revenueAggregation = await Subscription.aggregate([
    {
      $match: {
        status: SUBSCRIPTION_STATUS.ACTIVE,
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $switch: {
              branches: [
                // Basic Growth
                {
                  case: { $eq: ['$plan', SUBSCRIPTION_PLAN.BASIC_GROWTH] },
                  then: {
                    $cond: [
                      { $eq: ['$billingCycle', BILLING_CYCLE.MONTHLY] },
                      29,
                      299,
                    ],
                  },
                },
                // Pro Professional
                {
                  case: { $eq: ['$plan', SUBSCRIPTION_PLAN.PRO_PROFESSIONAL] },
                  then: {
                    $cond: [
                      { $eq: ['$billingCycle', BILLING_CYCLE.MONTHLY] },
                      59,
                      599,
                    ],
                  },
                },
                // Elite Power User
                {
                  case: { $eq: ['$plan', SUBSCRIPTION_PLAN.ELITE_POWER_USER] },
                  then: {
                    $cond: [
                      { $eq: ['$billingCycle', BILLING_CYCLE.MONTHLY] },
                      99,
                      999,
                    ],
                  },
                },
                // Shield Audit Defense
                {
                  case: {
                    $eq: ['$plan', SUBSCRIPTION_PLAN.SHIELD_AUDIT_DEFENSE],
                  },
                  then: {
                    $cond: [
                      { $eq: ['$billingCycle', BILLING_CYCLE.MONTHLY] },
                      149,
                      1499,
                    ],
                  },
                },
              ],
              default: 0,
            },
          },
        },
      },
    },
  ]);

  const totalRevenue =
    revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

  // 2. Total Active Users (status: 'active')
  const totalActiveUsers = await User.countDocuments({ status: 'active' });

  // 3. Total Subscribers (users with active subscription)
  const totalSubscribers = await User.countDocuments({
    plan: { $ne: SUBSCRIPTION_PLAN.FREE },
  });

  // 4. New Subscribers (Last 60 Days)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const newSubscribersLast60Days = await Subscription.countDocuments({
    createdAt: { $gte: sixtyDaysAgo },
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  // 5. Subscription Distribution (Percentage)
  const distributionAggregation = await User.aggregate([
    {
      $match: {
        plan: { $ne: SUBSCRIPTION_PLAN.FREE },
      },
    },
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
      },
    },
  ]);

  const subscriptionDistribution = distributionAggregation.map(item => ({
    plan: item._id,
    count: item.count,
    percentage:
      totalSubscribers > 0
        ? Number(((item.count / totalSubscribers) * 100).toFixed(2))
        : 0,
  }));

  return {
    totalRevenue,
    totalActiveUsers,
    totalSubscribers,
    newSubscribersLast60Days,
    subscriptionDistribution,
  };
};

const getAllSubscribers = async (query: Record<string, any>) => {
  const queryObj = { ...query };

  // Remove any user-provided plan filter to prevent override
  delete queryObj.plan;

  const subscriberQuery = new QueryBuilder(User.find(), queryObj)
    .search(['name', 'email'])
    .filter()
    .sort()
    .paginate();

  // Define all premium plans (excluding FREE)
  const premiumPlans = [
    SUBSCRIPTION_PLAN.BASIC_GROWTH,
    SUBSCRIPTION_PLAN.PRO_PROFESSIONAL,
    SUBSCRIPTION_PLAN.ELITE_POWER_USER,
    SUBSCRIPTION_PLAN.SHIELD_AUDIT_DEFENSE,
  ];

  // Force the filter to only include premium plans
  // This is applied AFTER .filter() to ensure it isn't overridden
  subscriberQuery.modelQuery = subscriberQuery.modelQuery.find({
    plan: { $in: premiumPlans },
  });

  const result = await subscriberQuery.modelQuery;
  const pagination = await subscriberQuery.pagination();

  return { result, pagination };
};

export const AdminService = {
  getDashboardData,
  getAllSubscribers,
};
