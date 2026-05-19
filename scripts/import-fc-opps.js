const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tnkmxmlgdhlgehlrbxuf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = '78bd1255-f05a-436b-abbd-f8c281d30210';

if (!SUPABASE_KEY) { console.error('SUPABASE_SERVICE_KEY not set'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Production partner name → exact clients table name
const PARTNER_MAP = {
  'Chris Love Productions': 'Chris Love Productions',
  'Premio Media': 'Premio Media',
  'TSB Studios': 'TSB Studios',
  'Aspire Studios': 'Aspire Studios',
  'Epic Light Media': 'Epic Light Media',
  'Story Directive': 'Story Directive',
  'KPG Creative': 'KPG Creative',
  'Fly Maverick': 'Fly Maverick',
  'Kepka House': 'Kepka House',
  'The Posh Mouse': 'Posh Mouse LLC',
  'MRP': 'MRP Studios',
  'Bolo Brothers': 'Bolo Brothers Creative',
  'The Story Is': 'The Story Is',
  'Blue Lotus Films': 'Blue Lotus Films',
  'Immagina Media': 'Immagina Media, Inc.',
  'Mainstream Video': 'Mainstream Video Production',
  'Mainstream Video Production': 'Mainstream Video Production',
  'Kontakt Films': 'Kontakt Films',
  'Privcap (Internal)': 'Privcap',
  'Insight Picture Co': 'Insight Picture Co',
  'DVL Filmhouse': 'DVL Film House',
  'Tough Draw': 'Tough Draw',
  'Atlantic Pictures': 'Atlantic Pictures',
  'Forerunner TV': 'Forerunner',
  'MOM Studio': 'MOM Studio',
  'Crew Pictures': 'Crew Pictures',
  'Moji Studios': 'Moji Cinema',
  'Flagship Visuals': 'Flagship Visuals',
  'StoryFi': 'Storyfi',
  'Vizionary': 'Vizionary',
  'Odd Duck Paper': 'Odd Duck Paper',
  'RexPost': 'Rex Production & Post',
};

// End client name from spreadsheet → exact end_clients table name
const EC_MAP = {
  'New York Yacht Club (NYYC)': 'New York Yacht Club',
  'Crest Pontoon Boats': 'Crest Pontoon Boats',
  'City of Lake Geneva': 'City Of Lake Geneva',
  'Dash Dolphin': 'Dash Dolphin',
  'Nexus Solutions': 'Nexus Solutions',
  'Darkness to Light (D2L)': 'Darkness to Light',
  'Pelaez Law Firm': 'Pelaez Law',
  'Taco Cabana': 'Taco Cabana',
  'San Antonio Water Utility': 'SAWS',
  'Benepass': 'Benepass',
  'Plans4Care': 'Plans4Care',
  'Wexler Packaging': 'Wexler Packaging',
  'Lasley Braheney': 'Lasley Brahaney',
  'HonorHealth (Orthopedics)': 'HonorHealth',
  'HonorHealth (Marketing Leadership)': 'HonorHealth',
  'O2 Health Lab': 'O2 Health Lab',
  'Barricaid': 'Barricaid',
  'E&J Commercial Diesel': 'E&J Diesel',
  'InvestorPlace / MarketWise': 'Investor Place',
  'Northwood University': 'Northwood University',
  'Beyond The Box Nutrition': 'Beyond the Box Nutrition',
  'AUSA (LinkedIn Campaign)': 'Association of the United States Army',
  'Privcap / Fortress (FIG)': 'Fortress Investment Group',
  'Fortress Investment Group (FIG/PWS)': 'Fortress Investment Group',
  'Privcap AGM Campaign': 'Privcap',
  'Flinders Restaurant (+ 2 others)': 'Flinders Lane Kitchen & Bar',
  'Mole Street / Cincinnati Zoo': 'Mole Street',
  'risingT / Bermuda Race': 'Rising T Media',
};

const OPPS = [
  { num:1, endClient:'Firecrown', partner:'Chris Love Productions', contactName:'Andrew Parkinson, Lydia Mullan', contactEmail:'andrew.parkinson@firecrown.com, lydia.mullan@firecrown.com', stage:'Pitch Development', notes:'Strategy doc built. Pitch happening today May 19.' },
  { num:2, endClient:'Transpac Yacht Club (TPYC)', partner:'Chris Love Productions', contactName:'Meredith Laitos, Amanda + committee', contactEmail:'meredith@jamiesonmae.com, Amanda@jamiesonmae.com', stage:'Meeting Complete', notes:'Strategy presented. Committee meeting held May 13. Enthused.' },
  { num:3, endClient:'New York Yacht Club (NYYC)', partner:'Chris Love Productions', contactName:'Stuart Streuli', contactEmail:'streulis@nyyc.org', stage:'Proposal Delivered', notes:'Strategy delivered Jan 29. Stuart circulating with committee. Tim needs more time.' },
  { num:4, endClient:'Crest Pontoon Boats', partner:'Chris Love Productions', contactName:'Rob Nye', contactEmail:'rob.nye@crestpontoonboats.com', stage:'Video Tracking', notes:'GA4/GTM access granted. AUDIT NOT YET DONE. Chris asked Apr 24.' },
  { num:5, endClient:'Polaris MEP / BlueTIDE', partner:'Chris Love Productions', contactName:'Sarah Reggio, Taylor Greene, Linda Willis, Linda Larsen', contactEmail:'sreggio@polarismep.org, tgreene@polarismep.org, lwillis@polarismep.org', stage:'Meeting Complete', notes:'Meeting held Mar 24. Ongoing engagement.' },
  { num:6, endClient:'Cabrinha', partner:'Chris Love Productions', contactName:'Brendan Healy', contactEmail:'brendan@cabrinha.com', stage:'Meeting Complete', notes:'Meetings held Mar 24 + Apr 14.' },
  { num:7, endClient:'risingT / Bermuda Race', partner:'Chris Love Productions', contactName:'Kate', contactEmail:'kate@risingt.com', stage:'Video Tracking', notes:'GA4/GTM added Jan 28. Tracking setup in progress.' },
  { num:8, endClient:'Three Pillars', partner:'Premio Media', contactName:'Former client', contactEmail:'', stage:'Brief Received', notes:'Inbound quote (Feb 4). Tim advised free tracking approach. No update.' },
  { num:9, endClient:'City of Lake Geneva', partner:'Premio Media', contactName:'Barb, Todd (City Admin)', contactEmail:'', stage:'Pitch Development', notes:'Strategy doc built. Meeting with new admin being scheduled.' },
  { num:10, endClient:'Dash Dolphin', partner:'Premio Media', contactName:'Todd', contactEmail:'todd@caboodle.media', stage:'Meeting Booked', notes:'Discovery call Feb 25. Soft launch go-to-market discussed.' },
  { num:11, endClient:'Nexus Solutions', partner:'Premio Media', contactName:'Deb Smith', contactEmail:'', stage:'Video Tracking', notes:'Tracking setup stalled. Neil discussed further Apr 6.' },
  { num:12, endClient:'School Referendum Niche', partner:'Premio Media', contactName:'Various schools', contactEmail:'', stage:'Brief Received', notes:'Neil planning 15-20 calls. Strategic niche initiative.' },
  { num:13, endClient:'GTB / Ford', partner:'TSB Studios', contactName:'Pedro Montemayor, Brett Peters, Claire Thomas', contactEmail:'pedro.montemayor@gtb.com, brett.peters@gtb.com, claire.thomas@gtb.com', stage:'Proposal Delivered', notes:'Audit presented. SOW sent May 5. Awaiting response.' },
  { num:14, endClient:'Darkness to Light (D2L)', partner:'TSB Studios', contactName:'Rhonda Newton (CEO), Jessie Watford', contactEmail:'rnewton@d2l.org, jwatford@d2l.org', stage:'Meeting Complete', notes:'Audit presented May 13. Follow-up meeting TOMORROW May 20.' },
  { num:15, endClient:'Pelaez Law Firm', partner:'TSB Studios', contactName:'Sasha Pelaez, Juanita Pelaez', contactEmail:'sasha@pelaezlawfirm.com, juanita@pelaezlawfirm.com', stage:'Meeting Complete', notes:'Call held Mar 16. Bernardo followed up Mar 31. No response.' },
  { num:16, endClient:'Taco Cabana', partner:'TSB Studios', contactName:'Frank Solis', contactEmail:'fsolis@tacocabana.com', stage:'Video Tracking', notes:'Multiple reschedules. Status needs updating.' },
  { num:17, endClient:'San Antonio Water Utility', partner:'TSB Studios', contactName:'', contactEmail:'', stage:'Meeting Booked', notes:'$300k budget. Tim to join intro call. Status unclear.' },
  { num:18, endClient:'Strategar / A&M Kingsville', partner:'TSB Studios', contactName:'Lu Diaz, Yanely', contactEmail:'ludiaz@strategar.com, yanely@strategar.com', stage:'Meeting Complete', notes:'Audit call Apr 28. Follow-up scheduled May 26.' },
  { num:19, endClient:'Knox Grove', partner:'Aspire Studios', contactName:'', contactEmail:'', stage:'Meeting Booked', notes:'Pitch booked June 2 at 11:30am EST. Big group.' },
  { num:20, endClient:'Belport Health', partner:'Aspire Studios', contactName:'Susie', contactEmail:'', stage:'Pitch Development', notes:'Brand doc received May 4. Tim working on pitch.' },
  { num:21, endClient:'Assisted Living Locators', partner:'Aspire Studios', contactName:'Jim Barringer, Katherine Laheen, Sal, Steve Jesus', contactEmail:'jbarringer@assistedlivinglocators.com, katherine@aspire-studios.com, sal@slbizsolutions.com', stage:'Closed Won', notes:'First closed deal. Video tracking call with client May 20.' },
  { num:22, endClient:'Benepass', partner:'Aspire Studios', contactName:'Alaya Salley', contactEmail:'', stage:'Meeting Booked', notes:'Discovery call Feb 4. No response since.' },
  { num:23, endClient:'Plans4Care', partner:'Aspire Studios', contactName:'Eric', contactEmail:'', stage:'Proposal Delivered', notes:'Pitch call Jan 28. Steve check-in Mar 17. Status unclear.' },
  { num:24, endClient:'Wexler Packaging', partner:'Aspire Studios', contactName:'', contactEmail:'', stage:'Closed Lost', notes:'Not willing to spend right now. Mar 17.' },
  { num:25, endClient:'Lasley Braheney', partner:'Aspire Studios', contactName:'', contactEmail:'', stage:'Closed Lost', notes:'Declined strategy. Just want base content. Mar 17.' },
  { num:26, endClient:'HonorHealth (Orthopedics)', partner:'Epic Light Media', contactName:'Jason Plummer, Torin Dinh', contactEmail:'jplummer@honorhealth.com, tdinh@honorhealth.com', stage:'Closed Won', notes:'Major active campaign. 6-month review (Feb 24). Ortho presentations built for C-suite AND marketing leadership. Jason wants to present to CEO. Next phase payment confirmed. Video review meeting Apr 22. Very active and expanding.' },
  { num:27, endClient:'HonorHealth (Marketing Leadership)', partner:'Epic Light Media', contactName:'Jason Plummer, Torin Dinh + C-Suite', contactEmail:'jplummer@honorhealth.com, tdinh@honorhealth.com, kgreene@honorhealth.com', stage:'Pitch Development', notes:'Separate presentation for marketing leadership to expand video to other service lines. Jason pushing to CEO level. Huge growth opportunity.' },
  { num:28, endClient:'O2 Health Lab', partner:'Story Directive', contactName:'John Parks', contactEmail:'john@o2healthlab.com', stage:'Closed Won', notes:'Awareness + Consideration running. Decision stage launching. Review 3 done May 6. Regular monthly reviews. Customer list received for targeting.' },
  { num:29, endClient:'Barricaid', partner:'Story Directive', contactName:'Didi Vukatana, Dylan Horn', contactEmail:'dvukatana@barricaid.com, dhorn@barricaid.com', stage:'Closed Won', notes:'Campaign running. Month 1 review done Mar 23. Decision stage ads live. Ad copy compliance review done. Next review meeting being scheduled this week.' },
  { num:30, endClient:'E&J Commercial Diesel', partner:'KPG Creative', contactName:'Lydia Hart, Cory', contactEmail:'lydia@ejtrailer.com, cory@ejtrailer.com', stage:'Closed Won', notes:'YouTube/Google Ads campaign. Review 3 done May 6. Campaign continuation agreement sent ($1250/mo). Bob presenting Tim\'s $2k/mo mgmt fee. Landing page redesign moving forward.' },
  { num:31, endClient:'InvestorPlace / MarketWise', partner:'Fly Maverick', contactName:'Sean Carroll, Ashley Bishop, Nahal Mehrazar, Stephen Cockey', contactEmail:'scarroll@stansberryresearch.com, abishop@stansberryresearch.com, nmehrazar@altapub.com, scockey@marketwise.com', stage:'Closed Won', notes:'Audit + strategy presented. GA/GTM access granted. Jim starting video cuts May 15. Very active.' },
  { num:32, endClient:"Aimee's Stories", partner:'Fly Maverick', contactName:'Aimee', contactEmail:'aimee@aimeesstories.com', stage:'Video Tracking', notes:'Tracking call Apr 14. Examined Aimee\'s video workflow.' },
  { num:33, endClient:'Hargrove Inc', partner:'Kepka House', contactName:'Ariane Schirmer', contactEmail:'Ariane.Schirmer@hargroveinc.com', stage:'Meeting Booked', notes:'Call scheduled Apr 17. Outcome needs confirming.' },
  { num:34, endClient:'Letter Carriers', partner:'Kepka House', contactName:'', contactEmail:'', stage:'Closed Won', notes:'Mike\'s existing retainer. Cold-plunge franchise also explored.' },
  { num:35, endClient:'Unknown Client', partner:'The Posh Mouse', contactName:'', contactEmail:'', stage:'Meeting Booked', notes:'Client interested in analytics. Proposal being prepared.' },
  { num:36, endClient:"MRP's Client", partner:'MRP', contactName:'', contactEmail:'', stage:'Meeting Complete', notes:'Transcripts received Apr 23. Nick followed up twice. Review NOT done.' },
  { num:37, endClient:'South College', partner:'Bolo Brothers', contactName:'Kathleen Stockham', contactEmail:'kstockham@south.edu', stage:'Meeting Booked', notes:'Meeting Apr 14. Kathleen punted to June. Audit scheduled Jun 11.' },
  { num:38, endClient:'Kellogg (Northwestern)', partner:'Bolo Brothers', contactName:'Vidya Narasimhan, Wenner Exius, Katherine Onsager', contactEmail:'vidya.narasimhan@kellogg.northwestern.edu, wenner.exius@kellogg.northwestern.edu, katherine.onsager@kellogg.northwestern.edu', stage:'Video Tracking', notes:'Video tracking call May 12. Reviewing digital org and measurement gaps.' },
  { num:39, endClient:'Northwood University', partner:'The Story Is', contactName:'Rachel, Nicole', contactEmail:'', stage:'Closed Won', notes:'Full ACDC campaign running. 3-month review Apr 14/16. Retainer pricing discussed ($49.5k/3mo, $90k/6mo).' },
  { num:40, endClient:'Beyond The Box Nutrition', partner:'Blue Lotus Films', contactName:'Gwen Holtan, Sheena', contactEmail:'gwen@beyondtheboxnutrition.com, sheena@beyondtheboxnutrition.com', stage:'Closed Won', notes:'Strategy doc built. Call with Gwen/Sheena held. Tracking set up. Sarah running campaigns. Approaching 90-day milestone May 25.' },
  { num:41, endClient:'AUSA (LinkedIn Campaign)', partner:'Immagina Media', contactName:'', contactEmail:'', stage:'Closed Won', notes:'LinkedIn awareness campaign launched Mar 17. Luke added Tim as campaign manager. Campaign data shared Apr 14. Ad review transcripts sent Apr 23.' },
  { num:42, endClient:"Mainstream's Clients", partner:'Mainstream Video', contactName:'Beth Klepper, Seth', contactEmail:'bethklepper@mainstreamvideoproduction.com, sethelizabethgraye@mainstreamvideoproduction.com', stage:'Meeting Complete', notes:'Ad set review meeting held. Beth and Seth reviewing campaigns. Active engagement.' },
  { num:43, endClient:"Adam's Outreach Targets", partner:'Kontakt Films', contactName:'Adam', contactEmail:'adam@kontaktfilms.com', stage:'Brief Received', notes:'Adam working through outreach list. Tim advised on approach. GTM being set up.' },
  { num:44, endClient:'HMH', partner:'Crew Pictures', contactName:'Tyler', contactEmail:'', stage:'Meeting Booked', notes:'Tim asked about Tyler Feb 9. TJ following up. Strategy not yet started.' },
  { num:45, endClient:'Eric Lofholm', partner:'RexPost', contactName:'Eric Lofholm', contactEmail:'', stage:'Brief Received', notes:'Russ had Zoom call with Eric (Apr 24). Interest in F&C program.' },
  { num:46, endClient:'Privcap / Fortress (FIG)', partner:'Privcap (Internal)', contactName:'Matt Malone, Mariah Honecker', contactEmail:'mmalone@privcap.com, mhonecker@privcap.com', stage:'Closed Won', notes:'Active LinkedIn campaign. Pardot reports discussed. Video tracking on Fortress website fixed (Wistia player updated). Regular review meetings.' },
  { num:47, endClient:'Impact 88', partner:'Insight Picture Co', contactName:'Matt Fuller', contactEmail:'matt@insightpictureco.com', stage:'Video Tracking', notes:'Matt needs support on Impact 88 LinkedIn campaign AND ACDC campaign buildout (Dec 11). Review meeting rescheduled. Tim asked for transcripts. Needs status update.' },
  { num:48, endClient:'DVL Client (Google Ads)', partner:'DVL Filmhouse', contactName:'Celso, A. Mendivil', contactEmail:'customersuccess@dvlfilmhouse.com, a.mendivil@dvl.com.mx', stage:'Video Tracking', notes:'DVL running Google Ads test. Asked about YouTube retargeting. Tim helped with audience threshold issue. Asked about audience persona/pitch generator. Active partner running campaigns.' },
  { num:49, endClient:'Tough Draw Business Evolution', partner:'Tough Draw', contactName:'Brad Hughes, Kaycie', contactEmail:'brad@toughdraw.com, kaycie@toughdraw.com', stage:'Meeting Complete', notes:'Brad sent follow-up about business structure evolving (Apr 30 + May 12). Has NOT received a response from Tim. Business structure changing and they need to discuss options. UNANSWERED.' },
  { num:50, endClient:'Atlantic Pictures Clients', partner:'Atlantic Pictures', contactName:'Alden', contactEmail:'alden@atlanticpictures.com', stage:'Brief Received', notes:'Tim set up GTM and video tracking (Dec 5-9). Alden mentioned needing to go through at least one pitch to sell into the partnership. Early stage outreach happening.' },
  { num:51, endClient:'Forerunner TV Clients', partner:'Forerunner TV', contactName:'Andrew Swanson', contactEmail:'andrew@forerunner.tv', stage:'Closed Won', notes:'Andrew landed a retainer and sent thank-you (Jan 25). Mentioned more retainer opportunities on the horizon.' },
  { num:52, endClient:'MOM Studio Clients', partner:'MOM Studio', contactName:'Ric Ostiguy', contactEmail:'ric@mom.studio', stage:'Brief Received', notes:'Ric set up Vimeo tracking (Feb 25). Tim confirmed working correctly. Ric working on outreach copy and website materials. Active Retain Live participant building pipeline.' },
  { num:53, endClient:'Flinders Restaurant (+ 2 others)', partner:'Immagina Media', contactName:'Luke Milano', contactEmail:'luke@immaginamedia.com', stage:'Brief Received', notes:'Luke mentioned Flinders as a client (Mar 3). Also has two organizations he\'s trying to get meetings with. Running ACDC content in podcast format. LinkedIn awareness campaign live.' },
  { num:54, endClient:'Kontakt Films Outreach', partner:'Kontakt Films', contactName:'Adam Bialo', contactEmail:'adam@kontaktfilms.com', stage:'Brief Received', notes:'Adam working through outreach list (Mar 12). Tim advised on approach using F&C framing. GTM being set up. Adam has been frustrated with slow onboarding. Paid for Retain program Jan 1.' },
  { num:55, endClient:'Flagship Visuals Clients', partner:'Flagship Visuals', contactName:'Derrick Lorah, Matt Trygar, Haskell, Dave DiCicco', contactEmail:'derrick@flagshipvisuals.com, matt@flagshipvisuals.com, haskell@flagshipvisuals.com, dave@flagshipvisuals.com', stage:'Brief Received', notes:'Derrick mentioned retainer opportunities on the horizon closing in coming weeks (Nov 2025). Flagship requested W-9 for payment (Feb 2026). Active Retain Live participants but have been heads down.' },
  { num:56, endClient:'Mainstream Video Clients', partner:'Mainstream Video Production', contactName:'Beth Klepper, Seth', contactEmail:'bethklepper@mainstreamvideoproduction.com, sethelizabethgraye@mainstreamvideoproduction.com', stage:'Meeting Complete', notes:'Beth and Seth booked time to review ad sets (Mar 20). Meeting confirmed (Mar 23). Active Retain Live partners running their own campaigns.' },
  { num:57, endClient:'StoryFi Clients', partner:'StoryFi', contactName:'Nick Olexa, Aaron Kluck, Nick Britsky', contactEmail:'nick@storyfi.com, aaron@storyfi.com, nbritsky@storyfi.com', stage:'Brief Received', notes:'StoryFi joined Retain Live (Jan 2026). Came out of the gate strong. Got buried in client work and studio build. Confident they can execute the approach (Mar 31). Monday board set up.' },
  { num:58, endClient:'Vizionary Clients', partner:'Vizionary', contactName:'Evan McGillivray', contactEmail:'evan@vizionary.co', stage:'Brief Received', notes:'Evan had client cancellation issues Tim advised on (Feb 11-13). Tim reached out multiple times about Retain Live progress (Mar 26, Apr 23). No response to follow-ups.' },
  { num:59, endClient:'Odd Duck Paper Clients', partner:'Odd Duck Paper', contactName:'Jess', contactEmail:'jess@oddduckpaper.com', stage:'Brief Received', notes:'Jess joined Retain Live alongside Vizionary (Nov 2025). Onboarded Dec 1. Active partner. No specific end-client opportunities visible in email.' },
  { num:60, endClient:'HMH', partner:'Crew Pictures', contactName:'Tyler, TJ Packer, Connor, Brett', contactEmail:'tj@crewpictures.com, connor@crewpictures.com, brett@crewpictures.com', stage:'Meeting Booked', notes:'Tim asked about Tyler at HMH (Feb 9). TJ following up but Tyler hadn\'t responded yet. TJ working on script/animation but wants to get strategy going. Active Retain Live participant.' },
  { num:61, endClient:'Moji Discovery Client', partner:'Moji Studios', contactName:'Paul Jew, Arielle', contactEmail:'paul@mojistudios.com, arielle@mojistudios.com', stage:'Pitch Development', notes:'Paul had a discovery meeting (May 18) and wants to use Proactive Pitch Generator. Arielle also tried generator (Apr 27). Active client pitching happening.' },
  { num:62, endClient:'DVL Filmhouse Clients', partner:'DVL Filmhouse', contactName:'Celso, A. Mendivil', contactEmail:'customersuccess@dvlfilmhouse.com, a.mendivil@dvl.com.mx', stage:'Video Tracking', notes:'Running Google Ads test. Asked about YouTube retargeting (Mar 19). Audience data threshold issue. Running another test (Apr 29). Inquiry about persona/pitch generator.' },
  { num:63, endClient:'Mole Street / Cincinnati Zoo', partner:'KPG Creative', contactName:'Brendan (Mole Street)', contactEmail:'brendan@molestreet.com', stage:'Brief Received', notes:'Bob connected Tim with Privcap/Fortress re: Cincinnati Zoo video production opportunity (Dec 10). Brendan at Mole Street is the key contact. Bob already worked with them on 1 video.' },
  { num:64, endClient:'Atlantic Pictures Clients', partner:'Atlantic Pictures', contactName:'Alden', contactEmail:'alden@atlanticpictures.com', stage:'Brief Received', notes:'GTM set up (Dec 2025). Alden said he needs to go through at least one pitch before fully selling into partnership (Mar 27). Working toward first pitch. Needs follow-up.' },
  { num:65, endClient:'Kay Elle / 8.5NINE', partner:'The Posh Mouse', contactName:'Kay Elle, Michelle', contactEmail:'kay@kayling.io, michelle@kayling.io', stage:'Meeting Complete', notes:'Discovery call Jan 8. Chad briefed Tim ahead of call. Kay launching fashion brand 8.5NINE. Chad reported (Jan 27) things moving forward with small projects. Separate from the Apr 30 unknown client.' },
  { num:66, endClient:'Fortress Investment Group (FIG/PWS)', partner:'Privcap (Internal)', contactName:'Matt Malone, Mariah Honecker, Gill Torren', contactEmail:'mmalone@privcap.com, mhonecker@privcap.com, gtorren@privcap.com', stage:'Closed Won', notes:'Separate campaign from Privcap own ads. Month 1 review completed (May 7). Wistia video tracking fixed. Active delivery.' },
  { num:67, endClient:'Privcap AGM Campaign', partner:'Privcap (Internal)', contactName:'Matt Malone, Mariah Honecker, Gill Torren', contactEmail:'mmalone@privcap.com, mhonecker@privcap.com, gtorren@privcap.com', stage:'Pitch Development', notes:'AGM campaign landing page shared (May 2). Mariah followed up (May 7) asking when it will be up and running. Tim needs to launch this.' },
];

// New end clients to create (not already in the end_clients table)
const NEW_END_CLIENTS = [
  'Firecrown',
  'Transpac Yacht Club',
  'Polaris MEP',
  'Cabrinha',
  'Three Pillars',
  'GTB',
  'Strategar',
  'Knox Grove',
  'Belport Health',
  'Assisted Living Locators',
  'South College',
  'Kellogg',
  "Aimee's Stories",
  'Hargrove Inc',
  'Letter Carriers',
  'Impact 88',
  'HMH',
  'Eric Lofholm',
  'Kay Elle',
];

async function main() {
  // 1. Load existing end_clients for ID lookup
  const { data: ecRows } = await sb.from('end_clients').select('id,name');
  const ecByName = {};
  (ecRows || []).forEach(e => { ecByName[e.name.toLowerCase()] = e.id; });

  // 2. Create missing end clients
  console.log('--- Creating new end clients ---');
  for (const name of NEW_END_CLIENTS) {
    if (ecByName[name.toLowerCase()]) {
      console.log('  SKIP (exists): ' + name);
      continue;
    }
    const { data, error } = await sb.from('end_clients').insert({ name, user_id: USER_ID }).select('id').single();
    if (error) { console.error('  FAIL: ' + name, error.message); continue; }
    ecByName[name.toLowerCase()] = data.id;
    console.log('  CREATED: ' + name + ' → ' + data.id);
  }

  // 3. Delete existing fc_partnership opportunities
  const { data: existing } = await sb.from('opportunities').select('id').eq('type', 'fc_partnership').eq('user_id', USER_ID);
  console.log('\n--- Deleting ' + (existing || []).length + ' existing fc_partnership opps ---');
  const { error: delErr } = await sb.from('opportunities').delete().eq('type', 'fc_partnership').eq('user_id', USER_ID);
  if (delErr) { console.error('DELETE FAILED:', delErr.message); process.exit(1); }
  console.log('  Deleted OK');

  // 4. Insert new opportunities
  console.log('\n--- Inserting ' + OPPS.length + ' new opportunities ---');
  let ok = 0, fail = 0;

  for (const opp of OPPS) {
    const partnerName = PARTNER_MAP[opp.partner] || opp.partner;
    const ecLookupName = EC_MAP[opp.endClient] || opp.endClient;
    const ecId = ecByName[ecLookupName.toLowerCase()] || null;

    const oppName = partnerName + ' — ' + opp.endClient;

    const row = {
      user_id: USER_ID,
      name: oppName,
      client: partnerName,
      end_client: opp.endClient,
      end_client_id: ecId,
      stage: opp.stage,
      type: 'fc_partnership',
      contact_name: opp.contactName || '',
      contact_email: opp.contactEmail || '',
      notes: opp.notes || '',
      description: '',
      source: 'Manual Import (May 2026)',
      probability: opp.stage === 'Closed Won' ? 100 : opp.stage === 'Closed Lost' ? 0 : 50,
    };

    const { error } = await sb.from('opportunities').insert(row);
    if (error) {
      console.error('  FAIL #' + opp.num + ' ' + oppName + ': ' + error.message);
      fail++;
    } else {
      console.log('  OK #' + opp.num + ' ' + oppName + (ecId ? '' : ' (no end_client_id)'));
      ok++;
    }
  }

  console.log('\n--- DONE: ' + ok + ' inserted, ' + fail + ' failed ---');
}

main().catch(e => { console.error(e); process.exit(1); });
