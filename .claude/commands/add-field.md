---
description: Add a new form field end-to-end (UI → validation → sheet column).
---

Help the user add a new field to the conversation form, wiring it through every
layer. The field to add: **$ARGUMENTS** (if empty, ask what field they want — its
label, key, type, and whether it's required).

Read these first so your edits match existing patterns:
- `src/components/FormPage.tsx` — the React form + reducer + initial state.
- `src/pages/api/submit.js` — `validateRequestBody` schema, and `updateConvoLog`
  (which builds the row written to the `Conversations` tab).
- `src/types/form.ts` — the `FormData` shape.

Then make the changes:
1. **Type**: add the field to `FormData` in `src/types/form.ts`.
2. **UI**: add a labeled input in `FormPage.tsx`, wired to `state.formData.<key>`
   and `handleChange`, with `disabled` during submit. Add it to the initial state
   (both production and dev branches).
3. **Validation**: add the field to the `schema` in `validateRequestBody`
   (type, required, maxLength, sanitize as appropriate). The validator rejects
   unexpected fields, so this step is mandatory or submissions will fail.
4. **Storage**: include the new value in the row array built by `updateConvoLog`
   (and update the `Conversations` column order documented in
   `src/pages/docs/configuration.md`). Consider whether the Slack message blocks
   should show it too.
5. Run `npm run build` and report results. Update the docs if the sheet layout
   changed.

Keep the field optional unless the user says it's required, and preserve the
existing visual style.
