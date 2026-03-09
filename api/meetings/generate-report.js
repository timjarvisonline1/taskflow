const { getServiceClient, verifyUserToken, getCredentials, cors } = require('../_lib/supabase');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await verifyUserToken(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { meetingId } = req.body || {};
  if (!meetingId) return res.status(400).json({ error: 'meetingId required' });

  const credRow = await getCredentials(userId, 'anthropic');
  if (!credRow || !credRow.credentials || !credRow.credentials.api_key) {
    return res.status(400).json({ error: 'Anthropic API key not configured. Add it in Settings > Integrations.' });
  }

  const model = (credRow.config && credRow.config.model) || 'claude-sonnet-4-6';
  const anthropic = new Anthropic({ apiKey: credRow.credentials.api_key });
  const client = getServiceClient();

  try {
    // Load meeting with transcript
    const { data: meeting, error: meetErr } = await client
      .from('meetings')
      .select('id,title,start_time,end_time,duration_minutes,participants,summary,transcript,action_items,key_questions,topics,chapter_summaries,group_call_type')
      .eq('id', meetingId)
      .eq('user_id', userId)
      .single();

    if (meetErr || !meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (!meeting.transcript) return res.status(400).json({ error: 'No transcript available for this meeting' });
    if (!meeting.group_call_type) return res.status(400).json({ error: 'Group call type not set' });

    // Build the date string
    const dt = meeting.start_time ? new Date(meeting.start_time) : null;
    const dateStr = dt ? dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown Date';

    // Build participant names list
    const participants = (meeting.participants || []).map(p => p.name || p.email || 'Unknown').join(', ');

    // Get type-specific prompt — full transcript, no truncation
    const prompt = buildPrompt(meeting.group_call_type, dateStr, participants, meeting.title, meeting.transcript, meeting.summary || '', meeting.chapter_summaries || []);

    console.log('[generate-report] Transcript length:', meeting.transcript.length, 'Prompt length:', prompt.length, 'Model:', model);

    // Stream the response via SSE to keep the connection alive
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullHtml = '';
    let chunkCount = 0;

    const stream = anthropic.messages.stream({
      model: model,
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }]
    });

    // Send each text chunk to the client so it can accumulate the HTML
    stream.on('text', (text) => {
      fullHtml += text;
      chunkCount++;
      if (chunkCount <= 3) console.log('[generate-report] Streaming chunk #' + chunkCount + ' (' + text.length + ' chars)');
      res.write('data: ' + JSON.stringify({ t: 'c', h: text }) + '\n\n');
    });

    console.log('[generate-report] Waiting for stream to complete...');
    const finalMessage = await stream.finalMessage();
    console.log('[generate-report] Stream complete. Chunks:', chunkCount, 'stop_reason:', finalMessage.stop_reason, 'fullHtml length:', fullHtml.length);

    // Cache the result in DB
    const dbResult = await client.from('meetings').update({
      kajabi_report_html: fullHtml,
      updated_at: new Date().toISOString()
    }).eq('id', meetingId).eq('user_id', userId);
    console.log('[generate-report] DB save result:', dbResult.error ? 'ERROR: ' + dbResult.error.message : 'OK');

    // Send small done signal (HTML already sent in chunks)
    res.write('data: ' + JSON.stringify({ t: 'd' }) + '\n\n');
    console.log('[generate-report] Sent done event, ending response');
    res.end();
  } catch (e) {
    console.error('generate-report error:', e);
    // If headers already sent (streaming started), send error as SSE
    if (res.headersSent) {
      res.write('data: ' + JSON.stringify({ t: 'e', error: e.message || 'Unknown error' }) + '\n\n');
      res.end();
    } else {
      return res.status(500).json({ error: 'Report generation failed: ' + (e.message || 'Unknown error') });
    }
  }
};

function buildPrompt(type, dateStr, participants, title, transcript, summary, chapters) {
  const chapterText = (chapters || []).map(ch => {
    return (ch.title || '') + ': ' + (ch.description || '');
  }).join('\n');

  const sharedContext = `
Meeting title: ${title}
Date: ${dateStr}
Participants: ${participants}
${summary ? 'AI Summary: ' + summary : ''}
${chapterText ? 'Chapter Summaries:\n' + chapterText : ''}

FULL TRANSCRIPT:
${transcript}
`;

  if (type === 'office_hours') return buildOfficeHoursPrompt(dateStr, sharedContext);
  if (type === 'group_accountability') return buildGroupAccountabilityPrompt(dateStr, sharedContext);
  if (type === 'olympic_mindset') return buildOlympicMindsetPrompt(dateStr, sharedContext);
  return buildOfficeHoursPrompt(dateStr, sharedContext); // fallback
}

function buildOfficeHoursPrompt(dateStr, context) {
  return `You are generating an HTML report for a Retain Live "Office Hours" group call. This is a Q&A session where members ask Tim questions about their marketing campaigns, landing pages, ad performance, and business strategy.

Your job is to read the transcript carefully and produce a beautifully formatted HTML document that can be pasted directly into Kajabi. The HTML must use ONLY inline styles (no <style> blocks, no classes). Every style property must end with !important.

STRUCTURE REQUIREMENTS:
1. **Gradient header** — purple gradient background with:
   - H1 title: "Office Hours — ${dateStr}"
   - Subtitle paragraph listing all questions/topics covered (comma-separated)

2. **"Questions Covered" section** — light grey box with left border, noting timestamps are provided

3. **One card per question** — each question gets its own bordered card with:
   - **Colored header** — alternate between these colors in order:
     - Blue: background #cce5ff, border #b8daff, text color #004085
     - Green: background #d4edda, border #c3e6cb, text color #155724
     - Yellow: background #fff3cd, border #ffeeba, text color #856404
     - Red: background #f8d7da, border #f5c6cb, text color #721c24
   - Header text: timestamp emoji (use 📍) + timestamp + em dash + Person's name + colon + Topic title
   - **Body content** including:
     - "The Question:" in bold
     - Problem/context box (grey background #f8f9fa)
     - Tim's Answer box (green background #d4edda with checkmark)
     - Detailed advice with bullet points
     - "The Principle:" box (purple background #e2d5f1) where applicable
     - Warning boxes (yellow #fff3cd) for issues identified

4. **Quick Notes section** — card with red header (#f8d7da) for brief asides, lighter topics, or quick mentions that don't warrant a full question card

5. **Key Takeaways** — gradient grey box with bullet points summarizing the main lessons from the session

6. **Closing line** — centered text noting how many questions were covered

CRITICAL STYLING RULES:
- Outer wrapper: font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif !important; line-height: 1.7 !important; color: #333 !important; max-width: 800px !important; margin: 0 auto !important;
- Gradient header: background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; color: white !important; padding: 30px !important; border-radius: 12px !important; margin-bottom: 30px !important;
- Question cards: margin-bottom: 30px !important; border: 1px solid #e0e0e0 !important; border-radius: 8px !important; overflow: hidden !important;
- Card headers: padding: 15px 20px !important; with the colored background and a 1px bottom border
- Card bodies: padding: 20px !important;
- Info boxes: padding: 15px !important; border-radius: 6px !important; margin-bottom: 15px !important;
- All bullet lists: padding-left: 20px !important; list-style-type: disc !important;
- All list items: margin-bottom: 8px !important; (last item: margin-bottom: 0 !important;)
- Key takeaways: background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important; border-radius: 8px !important; padding: 25px !important;

OUTPUT: Return ONLY the raw HTML. No markdown code fences. No explanation. Just the HTML starting with <div style="font-family:...

${context}`;
}

function buildGroupAccountabilityPrompt(dateStr, context) {
  return `You are generating an HTML report for a Retain Live "Group Accountability" session. This is a weekly check-in where members report on their commitments from last week, share progress updates, and make new commitments for the coming week. Dom (the mindset coach) facilitates.

Your job is to read the transcript carefully and produce a beautifully formatted HTML document that can be pasted directly into Kajabi. The HTML must use ONLY inline styles (no <style> blocks, no classes). Every style property must end with !important.

STRUCTURE REQUIREMENTS:
1. **Gradient header** — purple gradient background with:
   - H1 title: "Group Accountability — ${dateStr}"
   - Subtitle paragraph: a one-line theme/summary of the session's energy

2. **"This Week's Focus" section** — light grey box with left border, summarizing the overall vibe and key themes

3. **Action Items card** — green header (#d4edda), with a numbered list of actionable takeaways for the week

4. **Themed discussion sections** — if there are notable mantras, motivational moments, or discussion topics (e.g., "Focus on the Snow", "Would Future You Thank You?"), give each its own card with an appropriate colored header and emoji

5. **"Updates from the Group" card** — green header (#d4edda), containing individual member updates. Each member gets a sub-card:
   - Light grey background (#f8f9fa) with a 3px solid green (#28a745) left border
   - Bold green name header
   - Description of: what they achieved last week (bold key achievements), what they're committing to next week (bold the commitment)
   - Include relevant quotes in italics where impactful

6. **Discussion topic sections** — if there are specific topics discussed at length (dealing with rejection, big opportunities, etc.), give each its own card with appropriate header color

7. **Key Takeaways** — gradient grey box with bullet points

8. **Upcoming Sessions** — light blue box (#e7f3ff) listing next sessions and reminders

9. **Closing line** — centered text

CRITICAL STYLING RULES:
- Outer wrapper: font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif !important; line-height: 1.7 !important; color: #333 !important; max-width: 800px !important; margin: 0 auto !important;
- Gradient header: background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; color: white !important; padding: 30px !important; border-radius: 12px !important; margin-bottom: 30px !important;
- Member update cards: background: #f8f9fa !important; padding: 12px 15px !important; border-radius: 6px !important; border-left: 3px solid #28a745 !important;
- Member name: font-weight: 600 !important; color: #155724 !important;
- Section cards: margin-bottom: 30px !important; border: 1px solid #e0e0e0 !important; border-radius: 8px !important; overflow: hidden !important;
- Card headers: padding: 15px 20px !important; with colored background and 1px bottom border
- Card bodies: padding: 20px !important;
- Use display: grid !important; gap: 12px !important; for the member updates grid
- Info boxes: padding: 15px !important; border-radius: 6px !important; margin-bottom: 15px !important;
- Purple principle boxes: background: #e2d5f1 !important; color: #563d7c !important;
- Header colors to use for different sections:
  - Green (#d4edda / #155724) for action items and updates
  - Yellow (#fff3cd / #856404) for themed discussions and challenges
  - Blue (#cce5ff / #004085) for specific topic deep-dives
  - Red (#f8d7da / #721c24) for quick notes or warnings
- Key takeaways: background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important; border-radius: 8px !important; padding: 25px !important;
- Upcoming sessions: background: #e7f3ff !important; border-radius: 8px !important; padding: 20px !important;

OUTPUT: Return ONLY the raw HTML. No markdown code fences. No explanation. Just the HTML starting with <div style="font-family:...

${context}`;
}

function buildOlympicMindsetPrompt(dateStr, context) {
  return `You are generating an HTML report for a Retain Live "Olympic Mindset Coaching" session. This is a teaching-focused session led by Dom (the mindset coach), covering mental performance, productivity, sales psychology, and personal development frameworks. It includes homework, frameworks, case studies, and group discussion.

Your job is to read the transcript carefully and produce a beautifully formatted HTML document that can be pasted directly into Kajabi. The HTML must use ONLY inline styles (no <style> blocks, no classes). Every style property must end with !important.

STRUCTURE REQUIREMENTS:
1. **Gradient header** — purple gradient background with:
   - H1 title: "Olympic Mindset Coaching — ${dateStr}"
   - Subtitle paragraph: "Week [N]: [Theme Name] — [one-line description]" (extract the week number and theme from the content)

2. **"Session Theme" section** — light grey box with left border, with a quote from Dom capturing the session's core message

3. **Homework card** — green header (#d4edda), with a numbered list of specific homework items. Each item should be detailed (not just a title — include the "what" and "why")

4. **Teaching content sections** — the bulk of the report. Each major concept/framework/topic gets its own card:
   - Use varied header colors to distinguish topics:
     - Blue (#cce5ff / #004085) for frameworks and models
     - Purple (#e2d5f1 / #563d7c) for stories, case studies, athlete examples
     - Green (#d4edda / #155724) for practical techniques and tools
     - Yellow (#fff3cd / #856404) for warnings, challenges, and mindset traps
     - Red (#f8d7da / #721c24) for hard truths and confronting messages
   - Within each section, use:
     - Pillar/step boxes with colored left borders (3px solid) for frameworks with multiple components
     - Grey info boxes (#f8f9fa) for statistics, research findings, and detailed examples
     - Green boxes (#d4edda) for positive takeaways and techniques
     - Purple boxes (#e2d5f1) for key principles and insights
     - Red boxes (#f8d7da) for hard truths

5. **"From the Group" card** — green header, with individual member takeaways. Each person gets a sub-box with a colored left border and their key insight from the session

6. **"Tools & Resources Referenced" card** — purple header (#e2d5f1), with a bullet list of all books, podcasts, TED talks, frameworks, and tools mentioned

7. **Key Takeaways** — gradient grey box with bullet points

8. **Closing line** — centered text noting next session date/topic if mentioned

CRITICAL STYLING RULES:
- Outer wrapper: font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif !important; line-height: 1.7 !important; color: #333 !important; max-width: 800px !important; margin: 0 auto !important;
- Gradient header: background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; color: white !important; padding: 30px !important; border-radius: 12px !important; margin-bottom: 30px !important;
- Pillar/step boxes: margin-bottom: 12px !important; padding: 15px !important; background: #f8f9fa !important; border-radius: 6px !important; border-left: 3px solid [color] !important;
- Pillar name: font-weight: 600 !important; color: [matching color] !important;
- "From the Group" individual boxes: background: #f8f9fa !important; padding: 12px 15px !important; border-radius: 6px !important; border-left: 3px solid [varied colors] !important;
- Use these left-border colors for group members: #667eea, #fd7e14, #20c997, #e83e8c, #6f42c1 (cycle through)
- Section cards: margin-bottom: 30px !important; border: 1px solid #e0e0e0 !important; border-radius: 8px !important; overflow: hidden !important;
- Card headers: padding: 15px 20px !important; with colored background and 1px bottom border
- Card bodies: padding: 20px !important;
- Info boxes: padding: 15px !important; border-radius: 6px !important; margin-bottom: 15px !important;
- Key takeaways: background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important; border-radius: 8px !important; padding: 25px !important;

OUTPUT: Return ONLY the raw HTML. No markdown code fences. No explanation. Just the HTML starting with <div style="font-family:...

${context}`;
}
