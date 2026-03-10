/**
 * Shared email rule condition matcher.
 * Used by both server-side (sync-gmail.js) and referenced by client-side (core.js:applyEmailRules).
 *
 * IMPORTANT: If you change condition types or matching logic here,
 * you MUST also update the client-side copy in js/core.js applyEmailRules().
 *
 * Supported condition types:
 *   from_domain_equals, from_email_contains, subject_contains,
 *   to_or_cc_contains, any_participant_domain
 *
 * @param {Array} rules - Active rules sorted by priority descending
 * @param {Object} thread - { from_email, subject, to, cc }
 * @returns {Array|null} - Matching rule's actions array, or null
 */
function matchEmailRules(rules, thread) {
  if (!rules || !rules.length) return null;
  var from = (thread.from_email || '').toLowerCase();
  var fromDomain = from.indexOf('@') !== -1 ? from.split('@')[1] : '';
  var subj = (thread.subject || '').toLowerCase();
  var toCc = ((thread.to || '') + ' ' + (thread.cc || '')).toLowerCase();
  var allP = (from + ' ' + toCc).toLowerCase();

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    var conds = rule.conditions || [];
    if (!conds.length) continue;
    var allMatch = true;
    for (var j = 0; j < conds.length; j++) {
      var cond = conds[j];
      var val = (cond.value || '').toLowerCase();
      if (!val) { allMatch = false; break; }
      if (cond.type === 'from_domain_equals' && fromDomain !== val) { allMatch = false; break; }
      else if (cond.type === 'from_email_contains' && from.indexOf(val) === -1) { allMatch = false; break; }
      else if (cond.type === 'subject_contains' && subj.indexOf(val) === -1) { allMatch = false; break; }
      else if (cond.type === 'to_or_cc_contains' && toCc.indexOf(val) === -1) { allMatch = false; break; }
      else if (cond.type === 'any_participant_domain' && allP.indexOf('@' + val) === -1) { allMatch = false; break; }
    }
    if (allMatch) return rule.actions || [];
  }
  return null;
}

module.exports = { matchEmailRules };
