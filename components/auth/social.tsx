"use client";

import { Button } from "../ui/button";
import { FcGoogle } from "react-icons/fc";

const Social = () => {
  return (
    <div className="flex items-center w-full gap-x-2">
      <Button size="lg" className="w-full" variant="outline" onClick={() => {}}>
        <FcGoogle className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default Social;
