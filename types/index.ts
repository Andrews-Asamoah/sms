import { User as PrismaUser } from "@prisma/client";

export interface ExtendedUser extends PrismaUser {
  Student?: {
    classId: string | null;
    fathersName: string | null;
    fathersPhone: string | null;
    mothersName: string | null;
    mothersPhone: string | null;
    guardiansName: string | null;
    guardiansPhone: string | null;
  } | null;
}
