---
description: Add a new form field end-to-end (UI → validation → sheet column).
---

Help the user add a new field to the conversation form, wiring it through every
layer. The field to add: **$ARGUMENTS** (if empty, ask what field they want — its
label, key, type, and whether it's required).

Read these first so your edits match existing patterns:
- `src/components/FormPage.astro` — the form markup and the client `<script>`
  (vanilla DOM; the `fieldIds` array drives submit + status handling).
- `src/pages/api/submit.js` — `validateRequestBody` schema, and `updateConvoLog`
  (which builds the row written to the `Conversations` tab).

Then make the changes:
1. **UI**: add a labeled `<input>`/`<textarea>` in `FormPage.astro` with an `id`
   and `name`, matching the existing Tailwind classes.
2. **Script**: add the field's `id` to the `fieldIds` array in the `<script>` so
   it's collected into the POST body (and reset/disabled with the others).
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
