# CLAUDE.md

Operating instructions for working in this codebase. Read this before writing or editing code.

## The Definition of Done

Code is not finished when it compiles or when the feature works. Code is finished when `npx lint-staged` exits with code `0`.

This is the only signal that matters. If lint-staged fails:

1. Read the output. Decide whether you're looking at an ESLint violation, a Prettier formatting issue, or a TypeScript error.
2. Apply the smallest change that resolves it. Don't disable rules. Don't suppress warnings. Don't cast to `any` to silence the compiler.
3. Run it again.
4. Keep going until it passes.

Never hand back code with a failing gate and never describe a task as "done" before verifying.

## File Type Is Not Negotiable

This codebase is mid-migration: some files are TypeScript, some are JavaScript. Both are valid. The rule is simple:

-   A `.ts` or `.tsx` file stays TypeScript. Add types to anything you add.
-   New files default to `.tsx`. When facing a `.jsx` convert the file to typescript `.tsx`.
-   Shared utilities go in `.ts` with explicit return types.

## TypeScript Specifics

-   `any` is banned. There is always a better answer — `unknown`, a proper type, or a question to the user about what the shape actually is.
-   Default to `type`. Reach for `interface` only when you specifically need declaration merging.
-   Don't introduce new enums if we already have existing ones; new code uses union types or `as const` objects.

## Where Things Live

The architecture has clear seams. Respect them:

-   **Network calls** are wrapper functions in `services/`. Components and sagas call those wrappers — they never call `fetch` or an HTTP client directly.
-   **Side effects** belong in sagas. That includes anything async, anything that touches the network, anything that reads or writes outside React's render cycle.
-   **Reducers** are pure. `createReducer` lets you mutate the immer draft, which is fine — but a reducer must never trigger a side effect.
-   **Selectors** are pure. They shape store data for the UI. Keep the raw store close to the API response so debugging stays straightforward.
-   **Containers** are being removed. Don't add new ones. Use `useSelector` and `useDispatch` directly inside components.
-   **Thunks** are being removed. Don't add new ones. Write a saga.

If your instinct is to add a thunk, a container, an inline API call, or a side effect inside a reducer — pause. The pattern you want already exists somewhere else in the codebase.

## Component Design

-   Extract logic from components into helper functions and unit test the helpers. A component that is mostly JSX is easier to read and easier to test.
-   Don't prop-drill boolean context flags. If a child needs to know "am I in the summary view," that usually means the parent should be passing the relevant action (or `null`), and the child should render based on whether it has the action.
-   Any event listener you add inside a component must be removed on unmount. Return a cleanup function from `useEffect`.
-   Never assume external scripts will load. Ad blockers exist. Code that depends on Optimizely, analytics, or any third-party global must handle the case where the global is missing.

## Styling

-   `rem` for sizing, spacing, and typography. `px` is only acceptable for hairline borders or tiny border-radius values.
-   Test layouts with strings 30–40% longer than the English copy. Many European languages expand that much or more in translation — a layout that barely fits English will break in production.

## Strings

User-facing strings are localized through the process documented in the README. There are no exceptions for "temporary" copy, debug labels that ship to production, or strings inside conditionals. If a user can read it, it goes through localization.

## Hygiene Before Handing Code Back

Before you present code, walk through this list:

-   Every import is used. Every variable is used. Every exported function has a caller.
-   Every `useEffect`, `useCallback`, and `useMemo` has a complete dependency array.
-   No `console.log` left over from debugging.
-   No commented-out code "just in case."
-   Function and variable names describe what they are, in the same style as the surrounding code.
-   The diff contains only what the task required. If you fixed something unrelated along the way, call it out separately rather than burying it.

## Tests

For tests related things, always use the skills we have in .claude/skills/test-generation.md.

## Stay Within Scope

Do what was asked. Nothing more.

Every line in your diff should trace back to the request. If a line doesn't, it shouldn't be there — even if the change feels obviously correct, even if it's a one-character fix, even if the surrounding code is "wrong" by your standards.

In particular:

-   Don't refactor code you happened to read while implementing the task.
-   Don't rename things, reorder imports, tighten types, or fix lint warnings in code you weren't asked to touch.
-   Don't add abstractions, configuration, or extension points "for later." The next person can add them when later arrives.
-   Don't expand a small request into a larger cleanup because the larger cleanup feels worthwhile. Surface it as a separate suggestion instead.
-   Don't modify tests, comments, or formatting in files outside the change unless the request specifically requires it.
    If you genuinely believe an out-of-scope change is necessary to complete the task, stop and ask before making it. If you spot something worth doing that's outside the task, mention it as a follow-up — don't bundle it into the diff.

The two questions to run before you commit to any line of code:

1. Did the user ask for this?
2. Is this required to make what the user asked for actually work?
   If the answer to both is no, delete the line.

## When You're Not Sure

Ask. Specifically:

-   If the request has two reasonable interpretations, name both and ask which one.
-   If the existing code contradicts these conventions, point it out — don't silently pick a side.
-   If a "simple" change is about to grow past what feels proportional, stop and surface it before continuing.
    A clarifying question costs far less than a PR that has to be redone.
