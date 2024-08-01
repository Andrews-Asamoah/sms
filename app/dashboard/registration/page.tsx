"use client";

import { RegisterCard } from "./card";
import { useRouter } from "next/navigation";

const Registration = () => {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <RegisterCard
        title="Create Class"
        onClick={() => router.push("/dashboard/registration/class")}
      />
      <RegisterCard
        title="Create Subject"
        onClick={() => router.push("/dashboard/registration/subject")}
      />
      <RegisterCard
        title="Create Academic Year"
        onClick={() => router.push("/dashboard/registration/academicYear")}
      />
      <RegisterCard
        title="Create Term"
        onClick={() => router.push("/dashboard/registration/term")}
      />
    </div>
  );
};

export default Registration;
