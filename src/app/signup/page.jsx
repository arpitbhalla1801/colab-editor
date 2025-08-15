"use client";
import React from "react";
import { cn } from "../../lib/utils";
import { IconBrandGithub } from "@tabler/icons-react";
import { signIn } from "next-auth/react";

import { useSearchParams } from "next/navigation";


export default function SignupFormDemo() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200 to-slate-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 transition-colors">
      <div className="relative mx-auto w-full max-w-md rounded-2xl bg-white/90 dark:bg-zinc-900/90 p-8 shadow-xl flex flex-col items-center border border-slate-200 dark:border-zinc-800 transition-all duration-300 hover:shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-full p-3 mb-2 shadow-md">
            <IconBrandGithub className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">Welcome to Colab-Editor</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Sign in to continue</p>
        </div>
        {error === "signin_failed" && (
          <div className="mb-4 text-red-600 text-center w-full">Sign-in failed. Please try again.</div>
        )}
        <form className="w-full" onSubmit={e => e.preventDefault()}>
          <div className="flex flex-col items-center justify-center space-y-4">
            <button
              className="group/btn relative flex h-11 w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-br from-black to-neutral-700 font-medium text-white shadow-lg hover:scale-[1.02] transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
              type="button"
              onClick={() => signIn('github', { callbackUrl: '/new' })}
            >
              <IconBrandGithub className="h-5 w-5 text-white" />
              <span className="text-base text-white">Login with GitHub</span>
              <BottomGradient />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span
        className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span
        className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};
