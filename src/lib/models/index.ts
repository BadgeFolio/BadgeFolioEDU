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

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Invitation = mongoose.models.Invitation || mongoose.model('Invitation', InvitationSchema); 