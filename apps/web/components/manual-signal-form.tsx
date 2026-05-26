"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { createRawInputAction } from "@/app/actions/raw-inputs";
import { createRawInputInitialState } from "@/lib/raw-input-form";

const INPUT_TYPE_OPTIONS = [
  "manual_note",
  "reddit_post",
  "job_listing",
  "linkedin_post",
  "support_thread",
  "forum_thread",
  "other",
] as const;

const fieldClassName =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition-all duration-200 placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/15";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:bg-indigo-500 dark:hover:bg-indigo-400"
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Saving...
        </>
      ) : (
        "Save signal"
      )}
    </button>
  );
}

export function ManualSignalForm() {
  const [state, formAction] = useActionState(
    createRawInputAction,
    createRawInputInitialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="animate-fade-up rounded-2xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950/80"
      style={{ animationDelay: "80ms" }}
    >
      <div className="mb-5 flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.501a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            New signal
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Capture raw pain points before AI extraction.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="rawText" className="block text-sm font-medium">
            Raw signal text
          </label>
          <textarea
            id="rawText"
            name="rawText"
            required
            rows={6}
            placeholder="Paste a pain point, post, or note..."
            className={`${fieldClassName} resize-y min-h-[140px]`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="inputType" className="block text-sm font-medium">
              Input type
            </label>
            <select
              id="inputType"
              name="inputType"
              defaultValue="manual_note"
              className={fieldClassName}
            >
              {INPUT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sourceName" className="block text-sm font-medium">
              Source name <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="sourceName"
              name="sourceName"
              type="text"
              placeholder="reddit, support inbox, etc."
              className={fieldClassName}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sourceUrl" className="block text-sm font-medium">
            Source URL <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            placeholder="https://..."
            className={fieldClassName}
          />
        </div>

        <div className="space-y-3 pt-1">
          <SubmitButton />
          {state.status === "error" ? (
            <p className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {state.message}
            </p>
          ) : null}
          {state.status === "success" ? (
            <p className="animate-fade-in rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              {state.message}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
