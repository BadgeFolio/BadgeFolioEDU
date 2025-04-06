import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['super_admin', 'admin', 'teacher', 'student'] },
  requirePasswordChange: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const InvitationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true, enum: ['super_admin', 'admin', 'teacher', 'student'] },
  token: { type: String, required: true, unique: true },
  defaultPassword: { type: String },
  status: { type: String, required: true, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  expiresAt: { type: Date, required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Define interfaces for the models
interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'student';
  requirePasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IInvitation extends mongoose.Document {
  email: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'student';
  token: string;
  defaultPassword?: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Create and export the models with proper typing
export const User = (mongoose.models.User || mongoose.model<IUser>('User', UserSchema)) as mongoose.Model<IUser>;
export const Invitation = (mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', InvitationSchema)) as mongoose.Model<IInvitation>; 