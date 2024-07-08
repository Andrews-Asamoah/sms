"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const route = useRouter();
  return (
    <div className="h-full flex flex-col justify-center items-center">
      <h2 className="text-7xl mb-8">404</h2>
      <h2>Oops! Page Not Found</h2>
      <p>
        It looks like you’re lost in the school corridors! Let’s get you back on
        track.
      </p>
      <div className="mt-10 flex gap-5">
        <Button size="lg" onClick={() => route.push("/")}>
          Go to Homepage
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => route.push("/contact")}>
          Contact Support
        </Button>
      </div>
    </div>
  );
}
