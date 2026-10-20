import type { z } from "zod";

/** Field-level validation error with a message written for people. */
export class InputError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

/** Parses Server Action input; throws an InputError carrying the first problem. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new InputError(issue?.message ?? "Check the form and try again.", issue?.path[0]?.toString());
  }
  return result.data;
}

/** Like fail(), but keeps the field name from InputError so forms can highlight it. */
export function inputFailure(error: unknown, fallback: (e: unknown) => { ok: false; error: string }) {
  if (error instanceof InputError) return { ok: false as const, error: error.message, field: error.field };
  return fallback(error);
}
