export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  _id?: string;
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  classrooms?: string[];
  earnedBadges: Badge[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimplifiedCategory {
  _id?: string;
  name: string;
  color?: string;
}

export interface Badge {
  _id: string;
  name: string;
  description: string;
  criteria: string;
  difficulty: number;
  category: string;
  image?: string;
  creatorId: string;
  isPublic: boolean;
  parentBadgeId?: string;
  pathwayId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulatedBadge extends Omit<Badge, 'category' | 'creatorId'> {
  category: SimplifiedCategory;
  creatorId: {
    _id: string;
    name?: string;
    email: string;
  };
}

export interface Submission {
  _id: string;
  id?: string;
  badgeId: {
    _id: string;
    name: string;
  };
  studentId: {
    _id: string;
    email: string;
    name?: string;
  };
  teacherId: {
    _id: string;
    email: string;
    name?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  evidence: string;
  comments: {
    content: string;
    userId: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
  isVisible: boolean;
  showEvidence?: boolean;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  createdAt: Date;
}

export interface Pathway {
  id: string;
  name: string;
  description: string;
  badges: string[];
  creatorId: string;
  superBadgeId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  students: string[];
  badges: string[];
  googleClassroomId?: string;
  createdAt: Date;
  updatedAt: Date;
} 