/**
 * TaskFlow — Contacts Import (Browser Console Script)
 *
 * Paste this entire script into the browser console while logged into TaskFlow.
 * It uses the global `_sb` (Supabase client) and `S` (state) objects.
 *
 * Source: Retain Client Database CSVs (Active + Non-Active)
 *
 * IMPORTANT: Run supabase/migrate-to-contacts.sql FIRST to create the contacts table.
 */
(async function () {
  console.log('=== TaskFlow Contacts Import ===\n');

  /* ─── Verify environment ─── */
  if (typeof _sb === 'undefined') { console.error('_sb (Supabase client) not found. Are you on the TaskFlow app?'); return; }
  var sess = await _sb.auth.getSession();
  if (!sess.data.session) { console.error('Not logged in.'); return; }
  var userId = sess.data.session.user.id;
  console.log('User ID:', userId);

  /* ─── Load existing clients for matching ─── */
  var clientRes = await _sb.from('clients').select('id,name').eq('user_id', userId);
  if (clientRes.error) { console.error('Failed to load clients:', clientRes.error); return; }
  var clients = clientRes.data || [];
  console.log('Found', clients.length, 'existing clients');

  function findClientId(companyName) {
    if (!companyName) return null;
    var lower = companyName.toLowerCase().trim();
    var match = clients.find(function(c) { return c.name.toLowerCase().trim() === lower; });
    return match ? match.id : null;
  }

  /* ─── Active Clients Data ─── */
  var activeClients = [
    {company:'Film&Content',website:'',uniqueKey:'tQMOIZMWov',contacts:[
      {firstName:'Tim',lastName:'Jarvis',email:'tim.jarvis@timjarvis.online'},
      {firstName:'Timothy',lastName:'Jarvis',email:'timjarvis86@gmail.com'},
      {firstName:'Lee',lastName:'Brack',email:'lee.brack@timjarvis.online'},
      {firstName:'Si',lastName:'Conroy',email:'si@scarletmonday.com'},
      {firstName:'Lacey',lastName:'Jarvis',email:'timjarvis86+lacey@gmail.com'}
    ]},
    {company:'Forerunner',website:'https://forerunner.tv/',uniqueKey:'X0vSPgdKvx',contacts:[
      {firstName:'Andrew',lastName:'Swanson',email:'andrew@forerunner.tv'}
    ]},
    {company:'Kepka House',website:'https://www.kepkahouse.com/',uniqueKey:'9HGSFtv2N8',contacts:[
      {firstName:'Mike',lastName:'Kepka',email:'mike@kepkahouse.com'},
      {firstName:'Ellie',lastName:'Jackson',email:'ellie@kepkahouse.com'}
    ]},
    {company:'Crew Pictures',website:'https://crewpictures.com/',uniqueKey:'HIul6ve4v3',contacts:[
      {firstName:'TJ',lastName:'Packer',email:'tj@crewpictures.com'},
      {firstName:'Connor',lastName:'Stanley',email:'connor@crewpictures.com'},
      {firstName:'Brett',lastName:'Scoresby',email:'brett@crewpictures.com'}
    ]},
    {company:'Epic Light Media',website:'https://epiclightmedia.com/',uniqueKey:'OQpbyGVSoT',contacts:[
      {firstName:'James',lastName:'Adams',email:'james@epiclightmedia.com'},
      {firstName:'Thomas',lastName:'Manning',email:'thomas@epiclightmedia.com'},
      {firstName:'Stephen',lastName:'Moyer',email:'stephen@epiclightmedia.com'},
      {firstName:'Andrew',lastName:'Schwab',email:'andrew@epiclightmedia.com'},
      {firstName:'Alex',lastName:'Smet',email:'alex@epiclightmedia.com'}
    ]},
    {company:'Flagship Visuals',website:'https://flagshipvisuals.com/',uniqueKey:'2hCDYurhT2',contacts:[
      {firstName:'Derrick',lastName:'Lorah',email:'derrick@flagshipvisuals.com'},
      {firstName:'Matt',lastName:'Trygar',email:'matt@flagshipvisuals.com'},
      {firstName:'Haskell',lastName:'',email:'haskell@flagshipvisuals.com'},
      {firstName:'Dave',lastName:'DiCicco',email:'dave@flagshipvisuals.com'},
      {firstName:'Makaila',lastName:'Howard',email:'makaila@flagshipvisuals.com'}
    ]},
    {company:'Freedom Digital Media',website:'https://www.freedomdigital.net/',uniqueKey:'a71pQi81Qa',contacts:[
      {firstName:'Nick',lastName:'Szpara',email:'nick@freedomdigital.net'}
    ]},
    {company:'KPG Creative',website:'https://kpgcreative.com/',uniqueKey:'HYRe7Hziqe',contacts:[
      {firstName:'Bob',lastName:'Kelly',email:'bobk@kpgcreative.com'}
    ]},
    {company:'Mother Wit',website:'https://www.mwit.studio/',uniqueKey:'wXEexCBAwU',contacts:[
      {firstName:'Brooks',lastName:'Patton',email:'brooks@motherwit.studio'}
    ]},
    {company:'Lucid Visuals',website:'https://lucidvisuals.ca/',uniqueKey:'WEcRTXEMWU',contacts:[
      {firstName:'Stefan',lastName:'van Mourik',email:'stefan@lucidvisuals.ca'}
    ]},
    {company:'Story Directive',website:'https://www.storydirective.com/',uniqueKey:'K6tzsn8J3w',contacts:[
      {firstName:'Brandon',lastName:'Flint',email:'brandon@storydirective.com'}
    ]},
    {company:'Beeldsterk',website:'https://www.beeldsterk.com/',uniqueKey:'hvtizC87Qr',contacts:[
      {firstName:'Maikel',lastName:'Stams',email:'info@beeldsterk.com'},
      {firstName:'Yama',lastName:'Waziri',email:'yama@beeldsterk.com'},
      {firstName:'Beeldsterk',lastName:'Account',email:'beeldsterk1@gmail.com'}
    ]},
    {company:'Moji Cinema',website:'https://www.mojicinema.com/',uniqueKey:'Lx1Tbmv5YA',contacts:[
      {firstName:'Paul',lastName:'Jew',email:'paul@mojistudios.com'},
      {firstName:'Arielle',lastName:'Kibbee',email:'arielle@mojistudios.com'},
      {firstName:'Samantha',lastName:'Hoffman',email:'sam@mojistudios.com'}
    ]},
    {company:'The Story Is',website:'https://www.thestoryis.com/',uniqueKey:'vb71sXCFFz',contacts:[
      {firstName:'Immanuel',lastName:'Mullen',email:'immanuel@thestoryis.com'},
      {firstName:'Paul',lastName:'Grodell',email:'paul@thestoryis.com'}
    ]},
    {company:'Braden Barty Media',website:'https://www.bradenbartymedia.com/',uniqueKey:'qs23tnSjJ2',contacts:[
      {firstName:'Braden',lastName:'Barty',email:'braden@bradenbartymedia.com'},
      {firstName:'Michelle',lastName:'Barty',email:'michellebarty@gmail.com'}
    ]},
    {company:'Hightower Video',website:'https://www.hightower.video',uniqueKey:'bzEdeSwf17',contacts:[
      {firstName:'Luke',lastName:'Cairns',email:'luke@hightower.video'}
    ]},
    {company:'Privcap',website:'https://www.privcap.com',uniqueKey:'BYsEC7u9cR',contacts:[
      {firstName:'Matthew',lastName:'Malone',email:'mmalone@privcap.com'},
      {firstName:'Gill',lastName:'Torren',email:'gtorren@privcap.com'},
      {firstName:'Mariah',lastName:'Honecker',email:'mhonecker@privcap.com'},
      {firstName:'Brianna',lastName:'Werder',email:'bwerder@privcap.com'},
      {firstName:'Jonathan',lastName:'Regan',email:'jregan@privcap.com'},
      {firstName:'Tim',lastName:'Jarvis',email:'tjarvis@privcap.com'}
    ]},
    {company:'Dragonfly Visions',website:'https://dragonflyvisions.com/',uniqueKey:'sUPEflSw4Y',contacts:[
      {firstName:'Ember',lastName:'Berg',email:'ember@dragonflyvisions.com'},
      {firstName:'Rose',lastName:'Hammontree',email:'hello@dragonflyvisions.com'},
      {firstName:'Vageesha',lastName:'',email:'vageesha@dragonflyvisions.com'}
    ]},
    {company:'Mainstream Video Production',website:'https://www.mainstreamvideoproduction.com',uniqueKey:'eHObXv2XPm',contacts:[
      {firstName:'Beth',lastName:'Klepper',email:'bethklepper@mainstreamvideoproduction.com'},
      {firstName:'Stephenie',lastName:'Ratke',email:'stephenieratke@mainstreamvideoproduction.com'},
      {firstName:'Seth Elizabeth',lastName:'Graye',email:'sethelizabethgraye@mainstreamvideoproduction.com'},
      {firstName:'Erica',lastName:'Jaffe',email:'erica@staccatoproductions.com'}
    ]},
    {company:'RUUT',website:'https://RUUT.co',uniqueKey:'Ev9C8W21Te',contacts:[
      {firstName:'Jonathan',lastName:'Bennett',email:'jonathan@ruut.co'}
    ]},
    {company:'Insight Picture Co',website:'https://www.insightpictureco.com',uniqueKey:'XCdVrAMXdZ',contacts:[
      {firstName:'Matt',lastName:'Fuller',email:'matt@insightpictureco.com'}
    ]},
    {company:'DVL Film House',website:'https://dvl.com.mx',uniqueKey:'7LHN81egrX',contacts:[
      {firstName:'Alejandro',lastName:'Mendivil',email:'a.mendivil@dvl.com.mx'},
      {firstName:'Celso',lastName:'Torrecillas',email:'customersuccess@dvl.com.mx'}
    ]},
    {company:'Covalent',website:'https://wearecovalent.com/',uniqueKey:'mZEtcZQaFP',contacts:[
      {firstName:'Jeff',lastName:'Hilty',email:'jeffrey@wearecovalent.com'},
      {firstName:'Alex',lastName:'Rodia',email:'alex@wearecovalent.com'},
      {firstName:'Nick',lastName:'Buchheit',email:'nicholas@wearecovalent.com'}
    ]},
    {company:'Blue Lotus Films',website:'http://www.bluelotusfilms.net',uniqueKey:'',contacts:[
      {firstName:'Sarah',lastName:'Fisher',email:'sarah@bluelotusfilms.net'}
    ]},
    {company:'Premio Media',website:'http://premio.media',uniqueKey:'',contacts:[
      {firstName:'Neil',lastName:'Gowan',email:'neil@premio.media'}
    ]},
    {company:'Immagina Media, Inc.',website:'www.immaginamedia.com',uniqueKey:'',contacts:[
      {firstName:'Luke',lastName:'Milano',email:'luke@immaginamedia.com'},
      {firstName:'Jordan',lastName:'Mitchell',email:'jordan@immaginamedia.com'}
    ]},
    {company:'Chris Love Productions',website:'chrisloveproductions.com',uniqueKey:'',contacts:[
      {firstName:'Chris',lastName:'Love',email:'chris.w.love@gmail.com'},
      {firstName:'Chris',lastName:'Love',email:'chris@chrisloveproductions.com'}
    ]},
    {company:'Maverick Marketing LLC',website:'www.fly-maverick.com',uniqueKey:'',contacts:[
      {firstName:'Jim',lastName:'England',email:'jim@fly-maverick.com'}
    ]},
    {company:'MRP Studios',website:'www.mrp.tv',uniqueKey:'',contacts:[
      {firstName:'Nick',lastName:'Mirka',email:'nick@mrp.tv'},
      {firstName:'Mark',lastName:'Rauwerda',email:'mark@mrp.tv'},
      {firstName:'Drew',lastName:'Williams',email:'drew@mrp.tv'}
    ]},
    {company:'Atlantic Pictures',website:'www.atlanticpictures.com',uniqueKey:'',contacts:[
      {firstName:'Alden',lastName:'McLellan',email:'alden@atlanticpictures.com'}
    ]},
    {company:'Aspire Studios',website:'www.aspire-studios.com',uniqueKey:'',contacts:[
      {firstName:'Stephen',lastName:'Webb',email:'steve@aspire-studios.com'},
      {firstName:'Darren',lastName:'Peterson',email:'darren@aspire-studios.com'}
    ]},
    {company:'Posh Mouse LLC',website:'www.theposhmouse.com',uniqueKey:'',contacts:[
      {firstName:'Dustin',lastName:'Harris',email:'dustin@theposhmouse.com'},
      {firstName:'Chad',lastName:'Engel',email:'chad@theposhmouse.com'},
      {firstName:'Charlie',lastName:'Pomykal',email:'charlie@theposhmouse.com'}
    ]},
    {company:'Vizionary',website:'Vizionary.co',uniqueKey:'',contacts:[
      {firstName:'Evan',lastName:'McGillivray',email:'evan@vizionary.co'},
      {firstName:'Jessi',lastName:'Leonard',email:'Jess@oddduckpaper.com'}
    ]},
    {company:'Rex Production & Post',website:'https://rexpost.com',uniqueKey:'',contacts:[
      {firstName:'Russ',lastName:'Gorsline',email:'russg@rexpost.com'}
    ]},
    {company:'TSB Studios',website:'https://tsbstudios.com/',uniqueKey:'',contacts:[
      {firstName:'Bernardo',lastName:'Pegas',email:'bernardo@tsbstudios.com'},
      {firstName:'Christian',lastName:'Storandt',email:'christian@tsbstudios.com'},
      {firstName:'Claudio',lastName:'Leiva',email:'claudio@tsbstudios.com'}
    ]},
    {company:'Kontakt Films',website:'www.kontaktfilms.com',uniqueKey:'',contacts:[
      {firstName:'Adam',lastName:'Bialo',email:'adam@kontaktfilms.com'}
    ]},
    {company:'Tough Draw',website:'www.toughdraw.com',uniqueKey:'',contacts:[
      {firstName:'Brad',lastName:'Hughes',email:'brad@toughdraw.com'},
      {firstName:'Kaycie',lastName:'Timm',email:'kaycie@toughdraw.com'},
      {firstName:'Lindsay',lastName:'Hughes',email:'lindsay@toughdraw.com'}
    ]},
    {company:'MOM Studio',website:'https://mom.studio',uniqueKey:'',contacts:[
      {firstName:'Richard',lastName:'Ostiguy',email:'ric@mom.studio'}
    ]},
    {company:'Storyfi',website:'',uniqueKey:'',contacts:[
      {firstName:'Nick',lastName:'Olexa',email:'nick@storyfi.com'},
      {firstName:'Aaron',lastName:'Kluck',email:'aaron@storyfi.com'},
      {firstName:'Nick',lastName:'Britsky',email:'nbritsky@storyfi.com'}
    ]},
    {company:'Bolo Brothers Creative',website:'',uniqueKey:'',contacts:[
      {firstName:'Jared',lastName:'Rauso',email:'Jared@bolobrotherscreative.com'},
      {firstName:'Grant',lastName:'Carpenter',email:'grant@bolobrotherscreative.com'},
      {firstName:'Alex',lastName:'Hoffman',email:'Alex@bolobrotherscreative.com'}
    ]}
  ];

  /* ─── Lapsed Clients Data ─── */
  var lapsedClients = [
    {company:'Countdown',website:'https://www.countdownfilm.com/',uniqueKey:'',contacts:[
      {firstName:'Nathan',lastName:'Breton',email:'nathan@countdownfilm.com'}
    ]},
    {company:'Real Talk Media',website:'https://www.realtalkmedia.com/',uniqueKey:'',contacts:[
      {firstName:'Brett',lastName:'Ward',email:'brett@brettward.net'},
      {firstName:'Kelsey',lastName:'Shumway',email:'kelsey@realtalkmedia.com'}
    ]},
    {company:'Folio Films',website:'https://foliofilms.com/',uniqueKey:'',contacts:[
      {firstName:'Mark',lastName:'Schutz',email:'mark@foliofilms.com'},
      {firstName:'Alex',lastName:'Zimmer',email:'alex@foliofilms.com'},
      {firstName:'Jeremy',lastName:'Handrup',email:'jeremy@foliofilms.com'}
    ]},
    {company:'Nick Owen Creative',website:'',uniqueKey:'',contacts:[
      {firstName:'Nick',lastName:'Owen',email:'nick@nickowencreative.com'}
    ]},
    {company:'Lotus Pictures',website:'',uniqueKey:'',contacts:[
      {firstName:'Mike',lastName:'Aspite',email:'mike@lotuspictures.tv'},
      {firstName:'Sofia',lastName:'Marmorstein',email:'sofia@lotuspictures.tv'},
      {firstName:'Jessi',lastName:'Clark',email:'coordinator@lotuspictures.tv'},
      {firstName:'Tom',lastName:'Fatsi',email:'tom@lotuspictures.tv'}
    ]},
    {company:'Chimaeric Motion Pictures',website:'',uniqueKey:'',contacts:[
      {firstName:'David',lastName:'Anderson',email:'david@chimaeric.com'},
      {firstName:'Jen',lastName:'Huemmer',email:'jen@chimaeric.com'}
    ]},
    {company:'Goodbrother',website:'',uniqueKey:'',contacts:[
      {firstName:'Jake',lastName:'Russell',email:'jake@goodbrother.tv'},
      {firstName:'Ethan',lastName:'Russell',email:'ethan@goodbrother.tv'}
    ]},
    {company:'Room 3',website:'https://www.room3nyc.com/',uniqueKey:'',contacts:[
      {firstName:'Ed',lastName:'Cuervo',email:'ed@room3nyc.com'},
      {firstName:'Ike',lastName:'Wilson',email:'ike@room3nyc.com'}
    ]},
    {company:'Jyra Films',website:'https://www.jyrafilms.com/',uniqueKey:'',contacts:[
      {firstName:'Kyle',lastName:'Rogers',email:'kyle@jyrafilms.com'},
      {firstName:'Vanessa',lastName:'Viehe-Beiter',email:'vanessa@jyrafilms.com'},
      {firstName:'Grant',lastName:'Sweeny',email:'grant@jyrafilms.com'}
    ]},
    {company:'Menajerie Studio',website:'https://www.menajeriestudio.com/',uniqueKey:'',contacts:[
      {firstName:'Nick',lastName:'Taylor',email:'nick@menajeriestudio.com'},
      {firstName:'Jessica',lastName:'Taylor',email:'jessica@menajeriestudio.com'}
    ]},
    {company:'Flicker Filmworks',website:'',uniqueKey:'',contacts:[
      {firstName:'Mustafa',lastName:'Bhagat',email:'mustafa@flickerfilmworks.com'},
      {firstName:'Laura',lastName:'deNey',email:'laura@flickerfilmworks.com'},
      {firstName:'Eric',lastName:'Jacobs',email:'eric@flickerfilmworks.com'}
    ]},
    {company:'Action Studios',website:'',uniqueKey:'',contacts:[
      {firstName:'Jace',lastName:'Hardwick',email:'jacehardwick@actionstudios.tv'},
      {firstName:'Nathan',lastName:'Ramli',email:'nathan.ramli@gmail.com'},
      {firstName:'Andrew',lastName:'Baer',email:'andrew.baer98@gmail.com'}
    ]},
    {company:'FLICKER',website:'https://flicker.media',uniqueKey:'',contacts:[
      {firstName:'Erin',lastName:'Galey',email:'erin@flicker.media'}
    ]},
    {company:'Bottle Rocket Media',website:'https://bottlerocketmedia.net/',uniqueKey:'',contacts:[
      {firstName:'Brett',lastName:'Singer',email:'brett@bottlerocketmedia.net'},
      {firstName:'Tamika',lastName:'Carlton',email:'tamika@bottlerocketmedia.net'},
      {firstName:'Dan',lastName:'Fisher',email:'dan@bottlerocketmedia.net'}
    ]},
    {company:'Funkhouse',website:'',uniqueKey:'',contacts:[
      {firstName:'Alex',lastName:'Arkeilpane',email:'alex@funk.house'},
      {firstName:'Katie',lastName:'Bilse',email:'support@funk.house'},
      {firstName:'Sela',lastName:'',email:'sela@funk.house'}
    ]},
    {company:'Team Bubbly',website:'https://teambubbly.com/',uniqueKey:'vzcSEnuwWT',contacts:[
      {firstName:'Andres',lastName:'Rojas',email:'andres@teambubbly.com'},
      {firstName:'Frank',lastName:'Siringo',email:'frank@teambubbly.com'},
      {firstName:'Malorie',lastName:'Gill',email:'malorie@teambubbly.com'}
    ]},
    {company:'Social Jump',website:'https://www.sj.agency/',uniqueKey:'AY3ZDloK9g',contacts:[
      {firstName:'Nathan',lastName:'Ramli',email:'nathan.ramli@gmail.com'},
      {firstName:'Jace',lastName:'Hardwick',email:'j.hardwick.film@gmail.com'},
      {firstName:'Andrew',lastName:'Baer',email:'andrew.baer98@gmail.com'}
    ]},
    {company:'Foxhole Creative',website:'https://www.thefoxhole.com/',uniqueKey:'szWiCJaLUe',contacts:[
      {firstName:'Andy',lastName:'Meholick',email:'andy@thefoxhole.com'},
      {firstName:'Tim',lastName:'Frank',email:'tim@thefoxhole.com'}
    ]},
    {company:'Outreach Studios',website:'https://www.outreachstudios.com',uniqueKey:'lKVUR931ON',contacts:[
      {firstName:'Rob',lastName:'Glessner',email:'rob@outreachstudios.com'},
      {firstName:'Thad',lastName:'Kemlage',email:'thad@outreachstudios.com'}
    ]},
    {company:'Piper Creative',website:'https://www.pipercreative.co/',uniqueKey:'YBDrBrbyfN',contacts:[
      {firstName:'Aaron',lastName:'Watson',email:'aaron@pipercreative.co'},
      {firstName:'Mida',lastName:'Minahan',email:'pm@pipercreative.co'},
      {firstName:'Tin',lastName:'Hernandez',email:'sales@pipercreative.co'}
    ]},
    {company:'Social Motion',website:'https://www.socialmotionfilms.com/',uniqueKey:'1O92vvc4ss',contacts:[
      {firstName:'Michael',lastName:'Arking',email:'michael@socialmotionfilms.com'},
      {firstName:'Daniel',lastName:'Cohen',email:'daniel@socialmotionfilms.com'}
    ]},
    {company:'Digital Fury',website:'https://www.digitalfurytv.com',uniqueKey:'o2vKBhYLrC',contacts:[
      {firstName:'Marc',lastName:'Rice',email:'marc@digitalfurytv.com'}
    ]},
    {company:'Tennis Club',website:'https://tennisclub.studio',uniqueKey:'8YoLhG9Uhc',contacts:[
      {firstName:'Adam',lastName:'Zvanovec',email:'adam@tennisclub.studio'}
    ]},
    {company:'Solstice Productions',website:'https://solsticeproductionsvideo.com/',uniqueKey:'bAzv00B8GL',contacts:[
      {firstName:'Amanda',lastName:'Aschinger',email:'amanda@solsticeproductionsvideo.com'},
      {firstName:'Oleg',lastName:'Passer',email:'oleg@solsticeproductionsvideo.com'},
      {firstName:'Alex',lastName:'Aschinger',email:'alex@solsticeproductionsvideo.com'},
      {firstName:'Paul',lastName:'Mutuura',email:'paulm@coreadvertisinggroup.com'},
      {firstName:'Paul',lastName:'Mutuura',email:'paul@solsticeproductionsvideo.com'}
    ]},
    {company:'RA IMAGING',website:'https://www.ra-imaging.com',uniqueKey:'ztYgwNNI67',contacts:[
      {firstName:'Remsy',lastName:'Atassi',email:'remsy@remsyatassi.com'},
      {firstName:'Rami',lastName:'Atassi',email:'rami@ramiatassi.com'}
    ]},
    {company:'Matchlight',website:'https://www.matchlight.co',uniqueKey:'2V28RXaNFi',contacts:[
      {firstName:'Noah',lastName:'Wallace',email:'noah@matchlight.co'},
      {firstName:'Trent',lastName:'Wallace',email:'trent@matchlight.co'}
    ]},
    {company:'Harvest Film Co.',website:'https://harvestfilmco.com',uniqueKey:'cKhrfnwgb7',contacts:[
      {firstName:'Jeremiah',lastName:'Schuster',email:'jay-j@harvestfilmco.com'},
      {firstName:'Alexander',lastName:'Martin',email:'alexander@harvestfilmco.com'}
    ]},
    {company:'KUAMP',website:'https://kuamp.com/',uniqueKey:'MMwUYzZG8g',contacts:[
      {firstName:'Antonio',lastName:'McDonald',email:'antonio.tronic@kuamp.com'},
      {firstName:'Torrence',lastName:'Lamb',email:'torrence@building3.com'}
    ]},
    {company:'Pathfinder Films',website:'https://www.pathfinderfilms.com/',uniqueKey:'MMUWEydX45',contacts:[
      {firstName:'Lucky',lastName:'Ramsey',email:'lucky@pathfinderfilms.com'},
      {firstName:'Derek',lastName:'Peters',email:'derek@pathfinderfilms.com'},
      {firstName:'Philippe',lastName:'M',email:'philem.marketing@gmail.com'}
    ]},
    {company:'Ventus',website:'https://animatedvideos.com',uniqueKey:'0y8QhzHEFc',contacts:[
      {firstName:'Luke',lastName:'Robinette',email:'lrobinette@animatedvideos.com'},
      {firstName:'Josh',lastName:'Mitchey',email:'jmitchey@animatedvideos.com'}
    ]},
    {company:'Reservoir Theory',website:'https://www.reservoirtheory.com/',uniqueKey:'JRy1Q7Q2lf',contacts:[
      {firstName:'Andrew',lastName:'Rankin',email:'andrew@reservoirtheory.com'},
      {firstName:'Andrew',lastName:'Rankin',email:'andrew@streetsevencreative.com'}
    ]},
    {company:'Drive Media House',website:'https://drivemediahouse.com',uniqueKey:'w3kqWhS8tB',contacts:[
      {firstName:'Dave',lastName:'McMurray',email:'dave@drivemediahouse.com'},
      {firstName:'Stephen',lastName:'Sargent',email:'stephen@drivemediahouse.com'}
    ]}
  ];

  /* ─── Build insert rows ─── */
  var rows = [];
  var seenEmails = {};

  function addCompanyContacts(companyData, status) {
    var clientId = findClientId(companyData.company);
    companyData.contacts.forEach(function(c) {
      if (!c.firstName && !c.email) return;
      /* Deduplicate by email within this import */
      var emailKey = (c.email || '').toLowerCase().trim();
      if (emailKey && seenEmails[emailKey]) {
        console.log('  Skipping duplicate email:', emailKey, '(already added for', seenEmails[emailKey], ')');
        return;
      }
      if (emailKey) seenEmails[emailKey] = companyData.company;
      rows.push({
        user_id: userId,
        client_id: clientId,
        first_name: c.firstName || '',
        last_name: c.lastName || '',
        email: c.email || '',
        phone: '',
        role: '',
        company: companyData.company || '',
        website: companyData.website || '',
        status: status,
        unique_key: companyData.uniqueKey || ''
      });
    });
  }

  console.log('\nProcessing active clients...');
  activeClients.forEach(function(c) { addCompanyContacts(c, 'active'); });
  console.log('Processing lapsed clients...');
  lapsedClients.forEach(function(c) { addCompanyContacts(c, 'lapsed'); });

  console.log('\nTotal contacts to import:', rows.length);
  console.log('Matched to existing clients:', rows.filter(function(r) { return r.client_id; }).length);
  console.log('Unmatched (no client):', rows.filter(function(r) { return !r.client_id; }).length);

  /* ─── Insert in batches of 50 ─── */
  var batchSize = 50;
  var inserted = 0;
  var errors = 0;

  for (var i = 0; i < rows.length; i += batchSize) {
    var batch = rows.slice(i, i + batchSize);
    var res = await _sb.from('contacts').insert(batch);
    if (res.error) {
      console.error('Batch error at row', i, ':', res.error.message);
      errors++;
    } else {
      inserted += batch.length;
      console.log('Inserted batch', Math.floor(i / batchSize) + 1, '(' + inserted + '/' + rows.length + ')');
    }
  }

  console.log('\n=== Import Complete ===');
  console.log('Successfully inserted:', inserted, 'contacts');
  if (errors > 0) console.warn('Batches with errors:', errors);
  console.log('\nReloading contacts...');

  /* Reload contacts into app state */
  if (typeof loadContacts === 'function') {
    await loadContacts();
    console.log('Contacts reloaded. S.contacts has', S.contacts.length, 'entries.');
  } else {
    console.log('Reload the page to see imported contacts.');
  }
})();
