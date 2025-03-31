import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  image: String,
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student',
  },
  earnedBadges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge',
  }],
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', userSchema); 