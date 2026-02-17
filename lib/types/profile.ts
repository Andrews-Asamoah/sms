// ============================================
// lib/types/profile.ts
// ============================================
import type { Gender } from "@/lib/generated/prisma/client";

export interface UserProfileData {
  // User data
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  // Profile data
  profile?: {
    id: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    phone?: string;
    alternatePhone?: string;
    gender: Gender;
    dateOfBirth: Date;
    nationality?: string;
    residentialAddress?: string;
    postalAddress?: string;
    city?: string;
    region?: string;
    country?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyRelationship?: string;
  };
}

export interface UpdateProfileInput {
  // Basic Info
  name?: string;
  image?: string;
  // Profile Info
  firstName?: string;
  lastName?: string;
  otherNames?: string;
  phone?: string;
  alternatePhone?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  nationality?: string;
  // Address
  residentialAddress?: string;
  postalAddress?: string;
  city?: string;
  region?: string;
  country?: string;
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyRelationship?: string;
}
