/**
 * Forwards genuine replies from contact@buildittoday.ai into BuildItToday.
 *
 * Gmail cannot call a webhook, so this polls instead. Paste it into
 * script.google.com, then add a time-driven trigger for every 5 minutes.
 *
 * It deliberately ignores everything that is not a person: DMARC reports, the
 * rehearsal emails the sequence sends to this same inbox, and anything from
 * the sending domain itself. Only mail from an address that matches a lead is
 * recorded — the app checks that, not this script.
 *
 * Processed mail is labelled so nothing is ever forwarded twice.
 */

var ENDPOINT = 'https://www.buildittoday.ai/api/webhooks/email-reply';
var SECRET   = '80d5005da28d08854f0845509d2c9fc8477af6dc4dc90167';
var LABEL    = 'forwarded-to-buildittoday';

function forwardReplies() {
  var label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);

  // Unlabelled mail to contact@, excluding machine senders and our own sends.
  var query = [
    'to:contact@buildittoday.ai',
    'newer_than:7d',
    '-label:' + LABEL,
    '-from:contact@buildittoday.ai',
    '-from:dmarc',
    '-from:noreply',
    '-from:no-reply',
    '-from:mailer-daemon',
    '-in:sent'
  ].join(' ');

  var threads = GmailApp.search(query, 0, 25);

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var m = messages[j];
      try {
        UrlFetchApp.fetch(ENDPOINT, {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-reply-secret': SECRET },
          muteHttpExceptions: true,
          payload: JSON.stringify({
            from:       m.getFrom(),
            subject:    m.getSubject(),
            snippet:    m.getPlainBody().slice(0, 800),
            receivedAt: m.getDate().toISOString(),
            messageId:  m.getId()
          })
        });
      } catch (e) {
        // Leave the thread unlabelled so the next run tries it again.
        continue;
      }
    }
    threads[i].addLabel(label);
  }
}
