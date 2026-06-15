// The built-in "log a conversation" workflow, expressed declaratively.
//
// Trigger fields drive both the form UI and server-side validation. Steps run in
// order; `{{ }}` templates resolve against the trigger data, `config` (from
// getConfig()), `now`, and prior steps (`steps.<id>`). See src/lib/workflow.js.

export default {
  slug: "conversation",
  name: "Conversation log",
  trigger: {
    type: "form",
    title: "Record a conversation",
    fields: [
      { name: "contact", label: "Who was the conversation with?", type: "text", required: true, maxLength: 100 },
      { name: "organizer", label: "Who led the conversation?", type: "text", required: true, maxLength: 100 },
      { name: "date", label: "When did this conversation take place?", type: "date", required: true },
      { name: "message", label: "How did the conversation go?", type: "textarea", required: true, maxLength: 5000, rows: 10 },
    ],
  },
  steps: [
    {
      id: "log",
      type: "sheets.append",
      core: true, // failure here = the submission failed (HTTP 502)
      tab: "{{config.tabs.conversations}}",
      row: ["{{now}}", "{{organizer}}", "{{contact}}", "{{date | date}}", "{{message}}"],
    },
    {
      id: "notify",
      type: "slack.message",
      channel: "{{config.slackChannel}}",
      blocks: [
        { type: "header", text: { type: "plain_text", text: "🎉 New Conversation Logged 🎉", emoji: true } },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: "*Organizer:*\n👤 {{organizer | escape}}" },
            { type: "mrkdwn", text: "*Contact:*\n📞 {{contact | escape}}" },
            { type: "mrkdwn", text: "*Date:*\n📅 {{date | date}}" },
          ],
        },
        { type: "section", text: { type: "mrkdwn", text: "*Message:*\n>>> {{message | escape}}" } },
      ],
    },
    {
      id: "crm",
      type: "sheets.matchUpdate",
      tab: "{{config.tabs.eligible}}",
      match: "{{contact}}",
      set: [
        { column: "{{config.columns.engagement}}", value: "{{organizer}} - {{date | date}}" },
        { column: "{{config.columns.notes}}", value: "{{message}}" },
      ],
    },
    {
      id: "crm_ok",
      type: "slack.message",
      when: "{{steps.crm.matched}}",
      channel: "{{config.slackChannel}}",
      threadTs: "{{steps.notify.ts}}",
      blocks: [{ type: "section", text: { type: "mrkdwn", text: "✅ *Eligible Sheet Updated* ✅" } }],
    },
    {
      id: "crm_missing",
      type: "slack.message",
      unless: "{{steps.crm.matched}}",
      channel: "{{config.slackChannel}}",
      threadTs: "{{steps.notify.ts}}",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: '❌ *Contact Not Found* ❌\nThe contact "{{contact | escape}}" was not found in the Eligible sheet.',
          },
        },
      ],
    },
  ],
};
