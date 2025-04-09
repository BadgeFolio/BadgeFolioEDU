import mongoose from 'mongoose';
import { UserRole } from '@/types';

// Check if we are in the build phase
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

// Mock Mongoose model that implements common methods used in the codebase
const createMockModel = () => {
  // Create a mock model with common Mongoose methods
  return {
    findById: () => ({
      select: () => ({
        lean: () => ({})
      }),
      lean: () => ({}),
      populate: () => ({
        lean: () => ({})
      })
    }),
    findOne: () => Promise.resolve({}),
    find: () => ({
      sort: () => ({
        limit: () => ({
          lean: () => Promise.resolve([])
        }),
        lean: () => Promise.resolve([])
      }),
      lean: () => Promise.resolve([]),
      exec: () => Promise.resolve([])
    }),
    create: () => Promise.resolve({}),
    updateOne: () => Promise.resolve({ modifiedCount: 1 }),
    updateMany: () => Promise.resolve({ modifiedCount: 1 }),
    deleteOne: () => Promise.resolve({ deletedCount: 1 }),
    deleteMany: () => Promise.resolve({ deletedCount: 1 }),
    countDocuments: () => Promise.resolve(0),
    aggregate: () => Promise.resolve([]),
    distinct: () => Promise.resolve([]),
    exists: () => Promise.resolve(false),
    populate: () => Promise.resolve({}),
    // Support plugin methods
    paginate: () => Promise.resolve({ docs: [], totalDocs: 0, limit: 10, page: 1, totalPages: 0 }),
    // Add support for static methods
    mapReduce: () => Promise.resolve([]),
    bulkWrite: () => Promise.resolve({})
  };
};

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: String, // Optional for OAuth users
  image: String,
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  requirePasswordChange: { type: Boolean, default: false },
  classrooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' }],
  earnedBadges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
}, { 
  timestamps: true,
  // Add this to ensure virtual fields are included in the response
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Badge Schema
const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  criteria: { type: String, required: true },
  difficulty: { type: Number, required: true, min: 1, max: 5 },
  category: { type: String, required: true }, // Simple string type without enum
  image: String,
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  parentBadgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge' },
  pathwayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pathway' },
  reactions: [{
    type: { type: String, enum: ['👏', '🎉', '🌟', '🏆', '💪'], required: true },
    users: [{ type: String }]
  }]
}, { timestamps: true });

// Add pre-save hook to validate category against database
badgeSchema.pre('save', async function(next) {
  try {
    const category = await mongoose.models.Category.findOne({ name: this.category });
    if (!category) {
      // If category doesn't exist, try to create it
      try {
        await mongoose.models.Category.create({
          name: this.category,
          description: `${this.category} category`,
          color: '#9333EA' // Changed from blue '#4A90E2' to purple
        });
        next();
      } catch (createError) {
        next(createError instanceof Error ? createError : new Error(`Failed to create category: ${this.category}`));
      }
    } else {
      next();
    }
  } catch (error) {
    next(error instanceof Error ? error : new Error('Unknown error during category validation'));
  }
});

// Submission Schema
const submissionSchema = new mongoose.Schema({
  badgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  evidence: { 
    type: String, 
    required: true,
    trim: true,
    set: (v: string) => v ? v.trim() : '',
    get: (v: string) => v ? v.trim() : ''
  },
  isVisible: { type: Boolean, default: true },
  showEvidence: { type: Boolean, default: false },
  comments: [{
    content: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Pathway Schema
const pathwaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  superBadgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge' },
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

// Classroom Schema
const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  googleClassroomId: String,
}, { timestamps: true });

const earnedBadgeSchema = new mongoose.Schema({
  badge: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reactions: [{
    type: { type: String, enum: ['👏', '🎉', '🌟', '🏆', '💪'] },
    users: [{ type: String }]
  }],
  isVisible: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  color: { type: String, default: 'purple' }, // Changed default from blue to purple
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Delete existing models if they exist (for development only)
if (process.env.NODE_ENV === 'development') {
  // Delete the Badge model if it exists
  delete mongoose.models.Badge;
}

// Conditionally export models based on build phase
export const User = isBuildPhase ? createMockModel() : (mongoose.models.User || mongoose.model('User', userSchema));
export const Badge = isBuildPhase ? createMockModel() : mongoose.model('Badge', badgeSchema);
export const Submission = isBuildPhase ? createMockModel() : (mongoose.models.Submission || mongoose.model('Submission', submissionSchema));
export const Pathway = isBuildPhase ? createMockModel() : (mongoose.models.Pathway || mongoose.model('Pathway', pathwaySchema));
export const Classroom = isBuildPhase ? createMockModel() : (mongoose.models.Classroom || mongoose.model('Classroom', classroomSchema));
export const EarnedBadge = isBuildPhase ? createMockModel() : (mongoose.models.EarnedBadge || mongoose.model('EarnedBadge', earnedBadgeSchema));
export const Category = isBuildPhase ? createMockModel() : (mongoose.models.Category || mongoose.model('Category', categorySchema)); 