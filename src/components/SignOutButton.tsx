"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/app/login/actions";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.push("/login");
        })
      }
      disabled={pending}
      className="text-sm text-neutral-400 transition hover:text-white disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
