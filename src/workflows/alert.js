// A second, webhook-only workflow: post an alert to Slack. Demonstrates a
// non-form trigger and the multi-workflow registry. Call it with:
//
//   curl -X POST https://your-host/api/hooks/alert \
//     -H "X-Webhook-Token: $WEBHOOK_SECRET" -H "Content-Type: application/json" \
//     -d '{"title":"Deploy finished","message":"v1.2.3 is live"}'

export default {
  slug: "alert",
  name: "Webhook alert",
  trigger: {
    type: "webhook",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, maxLength: 200 },
      { name: "message", label: "Message", type: "text", required: true, maxLength: 3000 },
    ],
  },
  steps: [
    {
      id: "post",
      type: "slack.message",
      core: true, // the whole point is the Slack post, so failing it fails the call
      channel: "{{config.slackChannel}}",
      blocks: [
        { type: "header", text: { type: "plain_text", text: "🔔 {{title}}", emoji: true } },
        { type: "section", text: { type: "mrkdwn", text: "{{message | escape}}" } },
      ],
    },
  ],
};
