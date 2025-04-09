import mongoose from 'mongoose';
import { UserRole } from '@/types';

// Check if we are in the build phase
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

// Mock object that implements chainable methods
type ChainableMethod = (...args: any[]) => MockQuery;

interface MockQuery extends Promise<any> {
  lean: ChainableMethod;
  select: ChainableMethod;
  populate: ChainableMethod;
  sort: ChainableMethod;
  limit: ChainableMethod;
  skip: ChainableMethod;
  where: ChainableMethod;
  equals: ChainableMethod;
  gt: ChainableMethod;
  gte: ChainableMethod;
  lt: ChainableMethod;
  lte: ChainableMethod;
  in: ChainableMethod;
  exec: () => Promise<any>;
}

// Create a chainable mock query
function createMockQuery(returnValue: any = {}): MockQuery {
  const query = Promise.resolve(returnValue) as any;
  
  // Add chainable methods that return the query itself for proper chaining
  query.lean = () => query;
  query.select = () => query;
  query.populate = () => query;
  query.sort = () => query;
  query.limit = () => query;
  query.skip = () => query;
  query.where = () => query;
  query.equals = () => query;
  query.gt = () => query;
  query.gte = () => query;
  query.lt = () => query;
  query.lte = () => query;
  query.in = () => query;
  query.exec = () => Promise.resolve(returnValue);
  
  return query;
}

// Create mock model
export function createMockModel(modelName: string): any {
  return {
    modelName,
    findById: (id: string) => {
      if (modelName === 'Badge' && id === 'test123') {
        return createMockQuery(mockBadge);
      }
      if (modelName === 'Category' && id === 'category123') {
        return createMockQuery(mockCategory);
      }
      return createMockQuery(null);
    },
    findOne: (query: any) => {
      if (modelName === 'Badge' && query.name === 'Test Badge') {
        return createMockQuery(mockBadge);
      }
      if (modelName === 'Category' && query.name === 'Test Category') {
        return createMockQuery(mockCategory);
      }
      return createMockQuery(null);
    },
    find: (query: any = {}) => {
      if (modelName === 'Badge') {
        return createMockQuery([mockBadge]);
      }
      if (modelName === 'Category') {
        return createMockQuery([mockCategory]);
      }
      return createMockQuery([]);
    },
    findByIdAndUpdate: (id: string, data: any) => {
      if (modelName === 'Badge' && id === 'test123') {
        const updated = { ...mockBadge, ...data };
        return createMockQuery(updated);
      }
      return createMockQuery(null);
    },
    findByIdAndDelete: (id: string) => {
      return createMockQuery({ acknowledged: true });
    },
    countDocuments: () => createMockQuery(1),
    create: (data: any) => Promise.resolve({ ...data, _id: 'new123' }),
    updateOne: () => Promise.resolve({ acknowledged: true, modifiedCount: 1 }),
    deleteOne: () => Promise.resolve({ acknowledged: true, deletedCount: 1 })
  };
}

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    set: (v: string) => v.toLowerCase(), // Convert to lowercase when setting
    get: (v: string) => v  // Return as is when getting
  },
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

// Add pre-save hook to ensure email is lowercase
userSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
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
  }],
  approvalStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  approvalDate: Date,
  approvalComment: String
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
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

// Mock data for testing
const mockCategory = {
  _id: 'category123',
  name: 'Test Category',
  description: 'This is a test category',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockBadge = {
  _id: 'test123',
  name: 'Test Badge',
  description: 'This is a test badge',
  category: 'Test Category',
  criteria: ['Sample criteria'],
  difficulty: 1,
  isPublic: true,
  creatorId: { _id: 'user123', email: 'test@example.com', name: 'Test User' },
  createdAt: new Date(),
  updatedAt: new Date()
};

// Delete existing models if they exist (for development only)
if (process.env.NODE_ENV === 'development') {
  // Delete the Badge model if it exists
  delete mongoose.models.Badge;
}

// Conditionally export models based on build phase
export const User = isBuildPhase ? createMockModel('User') : (mongoose.models.User || mongoose.model('User', userSchema));
export const Badge = isBuildPhase ? createMockModel('Badge') : mongoose.model('Badge', badgeSchema);
export const Submission = isBuildPhase ? createMockModel('Submission') : (mongoose.models.Submission || mongoose.model('Submission', submissionSchema));
export const Pathway = isBuildPhase ? createMockModel('Pathway') : (mongoose.models.Pathway || mongoose.model('Pathway', pathwaySchema));
export const Classroom = isBuildPhase ? createMockModel('Classroom') : (mongoose.models.Classroom || mongoose.model('Classroom', classroomSchema));
export const EarnedBadge = isBuildPhase ? createMockModel('EarnedBadge') : (mongoose.models.EarnedBadge || mongoose.model('EarnedBadge', earnedBadgeSchema));
export const Category = isBuildPhase ? createMockModel('Category') : (mongoose.models.Category || mongoose.model('Category', categorySchema)); 