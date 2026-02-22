/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-undef */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import unlinkFile from '../../../shared/unlinkFile';
import generateOTP from '../../../util/generateOTP';
import { IUser } from './user.interface';
import { User } from './user.model';
import { s3Uploader } from '../../../helpers/s3Uploader';
import { compressImage } from '../../../helpers/fileProcessor';
// import { compressImage } from '../../../helpers/fileProcessor';

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  //set role
  payload.role = USER_ROLES.USER;
  const createUser = await User.create(payload);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  //send email
  const otp = generateOTP();
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!,
  };
  const createAccountTemplate = emailTemplate.createAccountModern(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } },
  );

  return createUser;
};

const getUserProfileFromDB = async (
  user: JwtPayload,
): Promise<Partial<IUser>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  return isExistUser;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser> & { file?: Express.Multer.File },
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (payload.file) {
    const { buffer, originalname, mimetype } = payload.file;

    try {
      // Process and resize image
      const processedImageBuffer = await compressImage(buffer, 80, 200, 200); // Resize to 200x200

      // Upload to S3
      const uploadResult = await s3Uploader.uploadBufferToS3(
        processedImageBuffer,
        originalname,
        mimetype,
        'profile-pictures', // Custom key prefix for profile pictures
      );
      payload.image = uploadResult.url; // Store S3 URL

      // Delete old image from S3 if it exists
      if (isExistUser.image && isExistUser.image.includes('s3.amazonaws.com')) {
        try {
          const oldKey = isExistUser.image.split('/').pop(); // Extract key from URL
          if (oldKey) {
            await s3Uploader.deleteByKey(`profile-pictures/${oldKey}`);
          }
        } catch (error) {
          console.error('Error deleting old profile picture from S3:', error);
          // Continue with the update even if old image deletion fails
        }
      }
    } catch (error) {
      console.error(
        'Error processing or uploading profile picture to S3:',
        error,
      );
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to process or upload profile picture.',
      );
    }
  }

  // Remove the file object from payload before updating the database
  delete payload.file;

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  return updateDoc;
};

const deleteAccountFromDB = async (user: JwtPayload): Promise<IUser | null> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }
  if (isExistUser.image && isExistUser.image.includes('s3.amazonaws.com')) {
    try {
      const oldKey = isExistUser.image.split('/').pop(); // Extract key from URL
      if (oldKey) {
        await s3Uploader.deleteByKey(`profile-pictures/${oldKey}`);
      }
    } catch (error) {
      console.error('Error deleting old profile picture from S3:', error);
      // Optionally, re-throw or handle the error more gracefully
    }
  }
  const deleted = await User.findByIdAndDelete(id);
  return deleted;
};

const getAllUsers = async (): Promise<IUser[]> => {
  const result = await User.find({});
  return result;
};

export const UserService = {
  createUserToDB,
  getUserProfileFromDB,
  updateProfileToDB,
  deleteAccountFromDB,
  getAllUsers,
};
