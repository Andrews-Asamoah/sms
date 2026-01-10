// ============================================
// 2. SERVER ACTIONS
// app/actions/profile.ts
// ============================================

"use server";

import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { UserProfileData, UpdateProfileInput } from "@/lib/types/profile";

export async function getCurrentUserProfile(): Promise<UserProfileData | null> {
  const session = await getAuthSession();

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? undefined,
    role: user.role,
    profile: user.profile
      ? {
          id: user.profile.id,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          otherNames: user.profile.otherNames ?? undefined,
          phone: user.profile.phone ?? undefined,
          alternatePhone: user.profile.alternatePhone ?? undefined,
          gender: user.profile.gender,
          dateOfBirth: user.profile.dateOfBirth,
          nationality: user.profile.nationality ?? undefined,
          residentialAddress: user.profile.residentialAddress ?? undefined,
          postalAddress: user.profile.postalAddress ?? undefined,
          city: user.profile.city ?? undefined,
          region: user.profile.region ?? undefined,
          country: user.profile.country ?? undefined,
          emergencyContactName: user.profile.emergencyContactName ?? undefined,
          emergencyContactPhone:
            user.profile.emergencyContactPhone ?? undefined,
          emergencyRelationship:
            user.profile.emergencyRelationship ?? undefined,
        }
      : undefined,
  };
}

export async function updateUserProfile(data: UpdateProfileInput) {
  const session = await getAuthSession();

  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Update User table
    const userUpdateData: {
      name?: string;
      image?: string | null;
    } = {};

    if (data.name) userUpdateData.name = data.name;
    if (data.image !== undefined) userUpdateData.image = data.image;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: userUpdateData,
      });
    }

    // Check if profile exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    // Prepare profile data with proper typing
    const profileData: {
      firstName?: string;
      lastName?: string;
      otherNames?: string | null;
      phone?: string | null;
      alternatePhone?: string | null;
      gender?: "MALE" | "FEMALE" | "OTHER";
      dateOfBirth?: Date;
      nationality?: string | null;
      residentialAddress?: string | null;
      postalAddress?: string | null;
      city?: string | null;
      region?: string | null;
      country?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      emergencyRelationship?: string | null;
    } = {};

    if (data.firstName) profileData.firstName = data.firstName;
    if (data.lastName) profileData.lastName = data.lastName;
    if (data.otherNames !== undefined)
      profileData.otherNames = data.otherNames || null;
    if (data.phone !== undefined) profileData.phone = data.phone || null;
    if (data.alternatePhone !== undefined)
      profileData.alternatePhone = data.alternatePhone || null;
    if (data.gender) profileData.gender = data.gender;
    if (data.dateOfBirth) profileData.dateOfBirth = data.dateOfBirth;
    if (data.nationality !== undefined)
      profileData.nationality = data.nationality || null;
    if (data.residentialAddress !== undefined)
      profileData.residentialAddress = data.residentialAddress || null;
    if (data.postalAddress !== undefined)
      profileData.postalAddress = data.postalAddress || null;
    if (data.city !== undefined) profileData.city = data.city || null;
    if (data.region !== undefined) profileData.region = data.region || null;
    if (data.country !== undefined) profileData.country = data.country || null;
    if (data.emergencyContactName !== undefined)
      profileData.emergencyContactName = data.emergencyContactName || null;
    if (data.emergencyContactPhone !== undefined)
      profileData.emergencyContactPhone = data.emergencyContactPhone || null;
    if (data.emergencyRelationship !== undefined)
      profileData.emergencyRelationship = data.emergencyRelationship || null;

    if (Object.keys(profileData).length > 0) {
      if (existingProfile) {
        // Update existing profile
        await prisma.userProfile.update({
          where: { userId: session.user.id },
          data: profileData,
        });
      } else {
        // Create new profile (ensure required fields are present)
        if (
          !data.firstName ||
          !data.lastName ||
          !data.gender ||
          !data.dateOfBirth
        ) {
          return {
            success: false,
            error:
              "First name, last name, gender, and date of birth are required to create a profile",
          };
        }

        await prisma.userProfile.create({
          data: {
            userId: session.user.id,
            firstName: data.firstName,
            lastName: data.lastName,
            otherNames: data.otherNames || null,
            gender: data.gender,
            dateOfBirth: data.dateOfBirth,
            phone: data.phone || null,
            alternatePhone: data.alternatePhone || null,
            nationality: data.nationality ?? "Ghanaian",
            residentialAddress: data.residentialAddress || null,
            postalAddress: data.postalAddress || null,
            city: data.city || null,
            region: data.region || null,
            country: data.country ?? "Ghana",
            emergencyContactName: data.emergencyContactName || null,
            emergencyContactPhone: data.emergencyContactPhone || null,
            emergencyRelationship: data.emergencyRelationship || null,
          },
        });
      }
    }

    revalidatePath("/account");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}
