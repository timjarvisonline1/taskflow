-- Remap F&C Partnership stages — consolidate 8 stages to 6 + Awaiting
-- Discovery Call → Meeting Complete
-- Audit/Report → Video Tracking
-- Proactive Pitch → Pitch Development
-- Negotiation → Awaiting (on-hold/waiting section, not in main pipeline)

UPDATE opportunities SET stage = 'Meeting Complete' WHERE type = 'fc_partnership' AND stage = 'Discovery Call';
UPDATE opportunities SET stage = 'Video Tracking'   WHERE type = 'fc_partnership' AND stage = 'Audit/Report';
UPDATE opportunities SET stage = 'Pitch Development' WHERE type = 'fc_partnership' AND stage = 'Proactive Pitch';
UPDATE opportunities SET stage = 'Awaiting'          WHERE type = 'fc_partnership' AND stage = 'Negotiation';
