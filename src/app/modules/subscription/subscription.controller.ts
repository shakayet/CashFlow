import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SubscriptionService } from './subscription.service';
import { JwtPayload } from 'jsonwebtoken';

const createSubscription = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await SubscriptionService.createSubscriptionToDB(
    user.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Subscription purchased successfully',
    data: result,
  });
});

const getMySubscription = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await SubscriptionService.getMySubscriptionFromDB(user.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'My subscription retrieved successfully',
    data: result,
  });
});

const getSubscriptionHistory = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await SubscriptionService.getSubscriptionHistoryFromDB(
      user.id,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subscription history retrieved successfully',
      data: result,
    });
  },
);

const checkSubscriptionStatus = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await SubscriptionService.checkSubscriptionStatus(user.id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Subscription status retrieved successfully',
      data: result,
    });
  },
);

export const SubscriptionController = {
  createSubscription,
  getMySubscription,
  getSubscriptionHistory,
  checkSubscriptionStatus,
};
