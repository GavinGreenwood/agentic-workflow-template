import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// jsdom does not provide these Web APIs that Next's server modules touch on import.
const g = globalThis as unknown as {
  TextEncoder?: typeof TextEncoder;
  TextDecoder?: typeof TextDecoder;
};
g.TextEncoder ??= TextEncoder;
g.TextDecoder ??= TextDecoder;

// Server-action helpers are never invoked in unit tests; stub them so importing
// a page component does not drag in the full Next server runtime.
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  notFound: jest.fn(),
}));
