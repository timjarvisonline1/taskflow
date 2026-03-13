/**
 * Lightweight city → lat/lng geocoding for GA4 Realtime API.
 * Top ~300 world cities by web traffic + country centroids as fallback.
 * No external API calls needed.
 */

// Key format: "city|country" (lowercase). Values: [lat, lng]
const CITIES = {
  // United States
  'new york|united states':[40.71,-74.01],'los angeles|united states':[34.05,-118.24],'chicago|united states':[41.88,-87.63],
  'houston|united states':[29.76,-95.37],'phoenix|united states':[33.45,-112.07],'philadelphia|united states':[39.95,-75.17],
  'san antonio|united states':[29.42,-98.49],'san diego|united states':[32.72,-117.16],'dallas|united states':[32.78,-96.80],
  'san jose|united states':[37.34,-121.89],'austin|united states':[30.27,-97.74],'jacksonville|united states':[30.33,-81.66],
  'san francisco|united states':[37.77,-122.42],'columbus|united states':[39.96,-83.00],'indianapolis|united states':[39.77,-86.16],
  'fort worth|united states':[32.76,-97.33],'charlotte|united states':[35.23,-80.84],'seattle|united states':[47.61,-122.33],
  'denver|united states':[39.74,-104.99],'washington|united states':[38.91,-77.04],'nashville|united states':[36.16,-86.78],
  'oklahoma city|united states':[35.47,-97.52],'el paso|united states':[31.76,-106.44],'boston|united states':[42.36,-71.06],
  'portland|united states':[45.52,-122.68],'las vegas|united states':[36.17,-115.14],'memphis|united states':[35.15,-90.05],
  'louisville|united states':[38.25,-85.76],'baltimore|united states':[39.29,-76.61],'milwaukee|united states':[43.04,-87.91],
  'albuquerque|united states':[35.08,-106.65],'tucson|united states':[32.22,-110.93],'fresno|united states':[36.74,-119.77],
  'sacramento|united states':[38.58,-121.49],'mesa|united states':[33.42,-111.83],'kansas city|united states':[39.10,-94.58],
  'atlanta|united states':[33.75,-84.39],'omaha|united states':[41.26,-95.94],'raleigh|united states':[35.78,-78.64],
  'miami|united states':[25.76,-80.19],'minneapolis|united states':[44.98,-93.27],'tampa|united states':[27.95,-82.46],
  'new orleans|united states':[29.95,-90.07],'cleveland|united states':[41.50,-81.69],'pittsburgh|united states':[40.44,-79.99],
  'st. louis|united states':[38.63,-90.20],'cincinnati|united states':[39.10,-84.51],'orlando|united states':[28.54,-81.38],
  'salt lake city|united states':[40.76,-111.89],'honolulu|united states':[21.31,-157.86],'detroit|united states':[42.33,-83.05],
  'ashburn|united states':[39.04,-77.49],'boardman|united states':[45.84,-119.70],'council bluffs|united states':[41.26,-95.86],
  // United Kingdom
  'london|united kingdom':[51.51,-0.13],'manchester|united kingdom':[53.48,-2.24],'birmingham|united kingdom':[52.49,-1.89],
  'leeds|united kingdom':[53.80,-1.55],'glasgow|united kingdom':[55.86,-4.25],'liverpool|united kingdom':[53.41,-2.98],
  'edinburgh|united kingdom':[55.95,-3.19],'bristol|united kingdom':[51.45,-2.59],'sheffield|united kingdom':[53.38,-1.47],
  'cardiff|united kingdom':[51.48,-3.18],'belfast|united kingdom':[54.60,-5.93],'nottingham|united kingdom':[52.95,-1.15],
  'cambridge|united kingdom':[52.21,0.12],'oxford|united kingdom':[51.75,-1.26],
  // Canada
  'toronto|canada':[43.65,-79.38],'montreal|canada':[45.50,-73.57],'vancouver|canada':[49.28,-123.12],
  'calgary|canada':[51.05,-114.07],'ottawa|canada':[45.42,-75.70],'edmonton|canada':[53.55,-113.49],
  'winnipeg|canada':[49.90,-97.14],'quebec city|canada':[46.81,-71.21],'halifax|canada':[44.65,-63.57],
  // Australia
  'sydney|australia':[-33.87,151.21],'melbourne|australia':[-37.81,144.96],'brisbane|australia':[-27.47,153.03],
  'perth|australia':[-31.95,115.86],'adelaide|australia':[-34.93,138.60],'canberra|australia':[-35.28,149.13],
  'gold coast|australia':[-28.00,153.43],
  // India
  'mumbai|india':[19.08,72.88],'delhi|india':[28.61,77.21],'bangalore|india':[12.97,77.59],
  'hyderabad|india':[17.39,78.49],'chennai|india':[13.08,80.27],'kolkata|india':[22.57,88.36],
  'pune|india':[18.52,73.86],'ahmedabad|india':[23.02,72.57],'jaipur|india':[26.91,75.79],
  'lucknow|india':[26.85,80.95],'surat|india':[21.17,72.83],
  // Germany
  'berlin|germany':[52.52,13.41],'munich|germany':[48.14,11.58],'hamburg|germany':[53.55,9.99],
  'frankfurt|germany':[50.11,8.68],'cologne|germany':[50.94,6.96],'stuttgart|germany':[48.78,9.18],
  'dusseldorf|germany':[51.23,6.77],'leipzig|germany':[51.34,12.37],
  // France
  'paris|france':[48.86,2.35],'marseille|france':[43.30,5.37],'lyon|france':[45.76,4.84],
  'toulouse|france':[43.60,1.44],'nice|france':[43.71,7.26],'nantes|france':[47.22,-1.55],
  'strasbourg|france':[48.57,7.75],'bordeaux|france':[44.84,-0.58],
  // Brazil
  'sao paulo|brazil':[-23.55,-46.63],'rio de janeiro|brazil':[-22.91,-43.17],'brasilia|brazil':[-15.79,-47.88],
  'salvador|brazil':[-12.97,-38.51],'belo horizonte|brazil':[-19.92,-43.94],'fortaleza|brazil':[-3.72,-38.53],
  'curitiba|brazil':[-25.43,-49.27],'recife|brazil':[-8.05,-34.87],'porto alegre|brazil':[-30.03,-51.23],
  // Japan
  'tokyo|japan':[35.68,139.69],'osaka|japan':[34.69,135.50],'yokohama|japan':[35.44,139.64],
  'nagoya|japan':[35.18,136.91],'sapporo|japan':[43.06,141.35],'fukuoka|japan':[33.59,130.40],
  'kobe|japan':[34.69,135.20],'kyoto|japan':[35.01,135.77],
  // China
  'beijing|china':[39.90,116.40],'shanghai|china':[31.23,121.47],'guangzhou|china':[23.13,113.26],
  'shenzhen|china':[22.54,114.06],'chengdu|china':[30.57,104.07],'hangzhou|china':[30.27,120.15],
  'wuhan|china':[30.59,114.31],'xian|china':[34.26,108.94],'nanjing|china':[32.06,118.80],
  'hong kong|china':[22.32,114.17],
  // South Korea
  'seoul|south korea':[37.57,126.98],'busan|south korea':[35.18,129.08],'incheon|south korea':[37.46,126.71],
  // Mexico
  'mexico city|mexico':[19.43,-99.13],'guadalajara|mexico':[20.67,-103.35],'monterrey|mexico':[25.67,-100.31],
  'puebla|mexico':[19.04,-98.20],'tijuana|mexico':[32.51,-117.04],'cancun|mexico':[21.16,-86.85],
  // Southeast Asia
  'singapore|singapore':[1.35,103.82],'bangkok|thailand':[13.76,100.50],'jakarta|indonesia':[-6.21,106.85],
  'kuala lumpur|malaysia':[3.14,101.69],'manila|philippines':[14.60,120.98],'ho chi minh city|vietnam':[10.82,106.63],
  'hanoi|vietnam':[21.03,105.85],
  // Middle East
  'dubai|united arab emirates':[25.20,55.27],'abu dhabi|united arab emirates':[24.45,54.65],
  'riyadh|saudi arabia':[24.71,46.67],'jeddah|saudi arabia':[21.49,39.19],
  'tel aviv|israel':[32.09,34.78],'doha|qatar':[25.29,51.53],'manama|bahrain':[26.23,50.59],
  'istanbul|turkey':[41.01,28.98],'ankara|turkey':[39.93,32.85],'tehran|iran':[35.69,51.39],
  'cairo|egypt':[30.04,31.24],'amman|jordan':[31.95,35.93],'beirut|lebanon':[33.89,35.50],
  'kuwait city|kuwait':[29.38,47.99],'muscat|oman':[23.59,58.54],
  // Europe
  'amsterdam|netherlands':[52.37,4.90],'rotterdam|netherlands':[51.92,4.48],
  'madrid|spain':[40.42,-3.70],'barcelona|spain':[41.39,2.17],'valencia|spain':[39.47,-0.38],
  'rome|italy':[41.90,12.50],'milan|italy':[45.46,9.19],'naples|italy':[40.85,14.27],
  'lisbon|portugal':[38.72,-9.14],'porto|portugal':[41.15,-8.61],
  'vienna|austria':[48.21,16.37],'zurich|switzerland':[47.38,8.54],'geneva|switzerland':[46.20,6.14],
  'brussels|belgium':[50.85,4.35],'antwerp|belgium':[51.22,4.40],
  'dublin|ireland':[53.35,-6.26],'cork|ireland':[51.90,-8.47],
  'warsaw|poland':[52.23,21.01],'krakow|poland':[50.06,19.94],
  'prague|czechia':[50.08,14.44],'budapest|hungary':[47.50,19.04],
  'bucharest|romania':[44.43,26.10],'sofia|bulgaria':[42.70,23.32],
  'stockholm|sweden':[59.33,18.07],'gothenburg|sweden':[57.71,11.97],
  'oslo|norway':[59.91,10.75],'copenhagen|denmark':[55.68,12.57],
  'helsinki|finland':[60.17,24.94],'athens|greece':[37.98,23.73],
  'zagreb|croatia':[45.81,15.98],'belgrade|serbia':[44.79,20.45],
  'kyiv|ukraine':[50.45,30.52],'tallinn|estonia':[59.44,24.75],
  'riga|latvia':[56.95,24.11],'vilnius|lithuania':[54.69,25.28],
  'moscow|russia':[55.76,37.62],'saint petersburg|russia':[59.93,30.32],
  // Africa
  'lagos|nigeria':[6.52,3.38],'nairobi|kenya':[-1.29,36.82],'johannesburg|south africa':[-26.20,28.05],
  'cape town|south africa':[-33.93,18.42],'accra|ghana':[5.56,-0.19],'addis ababa|ethiopia':[9.02,38.75],
  'dar es salaam|tanzania':[-6.79,39.28],'casablanca|morocco':[33.57,-7.59],'tunis|tunisia':[36.81,10.18],
  'algiers|algeria':[36.75,3.04],'luanda|angola':[-8.84,13.23],'kigali|rwanda':[-1.94,29.87],
  // South America
  'buenos aires|argentina':[-34.60,-58.38],'santiago|chile':[-33.45,-70.67],'lima|peru':[-12.05,-77.04],
  'bogota|colombia':[4.71,-74.07],'medellin|colombia':[6.25,-75.56],'caracas|venezuela':[10.49,-66.88],
  'quito|ecuador':[-0.18,-78.47],'montevideo|uruguay':[-34.91,-56.19],
  // Other
  'auckland|new zealand':[-36.85,174.76],'wellington|new zealand':[-41.29,174.78],
  'taipei|taiwan':[25.03,121.57],'hong kong|hong kong':[22.32,114.17],
  'reykjavik|iceland':[64.15,-21.94],
};

// Country centroids (ISO name as returned by GA4 → [lat, lng])
const COUNTRIES = {
  'united states':[39.83,-98.58],'united kingdom':[55.38,-3.44],'canada':[56.13,-106.35],
  'australia':[-25.27,133.78],'india':[20.59,78.96],'germany':[51.17,10.45],'france':[46.23,2.21],
  'brazil':[-14.24,-51.93],'japan':[36.20,138.25],'china':[35.86,104.20],'south korea':[35.91,127.77],
  'mexico':[23.63,-102.55],'singapore':[1.35,103.82],'thailand':[15.87,100.99],'indonesia':[-0.79,113.92],
  'malaysia':[4.21,101.98],'philippines':[12.88,121.77],'vietnam':[14.06,108.28],
  'united arab emirates':[23.42,53.85],'saudi arabia':[23.89,45.08],'israel':[31.05,34.85],
  'qatar':[25.35,51.18],'turkey':[38.96,35.24],'iran':[32.43,53.69],'egypt':[26.82,30.80],
  'jordan':[30.59,36.24],'lebanon':[33.85,35.86],'kuwait':[29.31,47.48],'bahrain':[26.07,50.55],
  'oman':[21.47,55.98],'netherlands':[52.13,5.29],'spain':[40.46,-3.75],'italy':[41.87,12.57],
  'portugal':[39.40,-8.22],'austria':[47.52,14.55],'switzerland':[46.82,8.23],'belgium':[50.50,4.47],
  'ireland':[53.14,-7.69],'poland':[51.92,19.15],'czechia':[49.82,15.47],'hungary':[47.16,19.50],
  'romania':[45.94,24.97],'bulgaria':[42.73,25.49],'sweden':[60.13,18.64],'norway':[60.47,8.47],
  'denmark':[56.26,9.50],'finland':[61.92,25.75],'greece':[39.07,21.82],'croatia':[45.10,15.20],
  'serbia':[44.02,21.01],'ukraine':[48.38,31.17],'estonia':[58.60,25.01],'latvia':[56.88,24.60],
  'lithuania':[55.17,23.88],'russia':[61.52,105.32],'nigeria':[9.08,8.68],'kenya':[-0.02,37.91],
  'south africa':[-30.56,22.94],'ghana':[7.95,-1.02],'ethiopia':[9.15,40.49],'tanzania':[-6.37,34.89],
  'morocco':[31.79,-7.09],'tunisia':[33.89,9.54],'algeria':[28.03,1.66],'angola':[-11.20,17.87],
  'rwanda':[-1.94,29.87],'argentina':[-38.42,-63.62],'chile':[-35.68,-71.54],'peru':[-9.19,-75.02],
  'colombia':[4.57,-74.30],'venezuela':[6.42,-66.59],'ecuador':[-1.83,-78.18],'uruguay':[-32.52,-55.77],
  'new zealand':[-40.90,174.89],'taiwan':[23.70,120.96],'hong kong':[22.32,114.17],
  'iceland':[64.96,-19.02],'pakistan':[30.38,69.35],'bangladesh':[23.68,90.36],'sri lanka':[7.87,80.77],
  'nepal':[28.39,84.12],'myanmar':[21.91,95.96],'cambodia':[12.57,104.99],'iraq':[33.22,43.68],
  'afghanistan':[33.94,67.71],'uzbekistan':[41.38,64.59],'kazakhstan':[48.02,66.92],
  'georgia':[42.32,43.36],'armenia':[40.07,45.04],'azerbaijan':[40.14,47.58],
  'costa rica':[9.75,-83.75],'panama':[8.54,-80.78],'guatemala':[15.78,-90.23],
  'dominican republic':[18.74,-70.16],'puerto rico':[18.22,-66.59],'jamaica':[18.11,-77.30],
  'trinidad and tobago':[10.69,-61.22],'cuba':[21.52,-77.78],'honduras':[15.20,-86.24],
  'el salvador':[13.79,-88.90],'nicaragua':[12.87,-85.21],'paraguay':[-23.44,-58.44],
  'bolivia':[-16.29,-63.59],'luxembourg':[49.82,6.13],'malta':[35.94,14.38],
  'cyprus':[35.13,33.43],'slovenia':[46.15,14.99],'slovakia':[48.67,19.70],
  'north macedonia':[41.51,21.75],'albania':[41.15,20.17],'bosnia and herzegovina':[43.92,17.68],
  'montenegro':[42.71,19.37],'moldova':[47.41,28.37],'belarus':[53.71,27.95],
  'morocco':[31.79,-7.09],'senegal':[14.50,-14.45],'ivory coast':[7.54,-5.55],
  'cameroon':[7.37,12.35],'congo':[0.23,15.83],'zambia':[-13.13,27.85],
  'zimbabwe':[-19.02,29.15],'botswana':[-22.33,24.68],'namibia':[-22.96,18.49],
  'mozambique':[-18.67,35.53],'madagascar':[-18.77,46.87],'mauritius':[-20.35,57.55],
  'reunion':[-21.12,55.54],
};

/**
 * Get coordinates for a city+country pair.
 * Falls back to country centroid if city not found.
 * Returns null if neither found.
 */
function getCityCoords(city, country) {
  if (!city && !country) return null;

  const c = (city || '').toLowerCase().trim();
  const co = (country || '').toLowerCase().trim();

  // Try exact city|country match
  if (c && co) {
    const key = c + '|' + co;
    if (CITIES[key]) return { lat: CITIES[key][0], lng: CITIES[key][1], exact: true };
  }

  // Try city with any country (for cases where GA4 country name differs slightly)
  if (c) {
    for (const key in CITIES) {
      if (key.startsWith(c + '|')) {
        return { lat: CITIES[key][0], lng: CITIES[key][1], exact: true };
      }
    }
  }

  // Fallback to country centroid
  if (co && COUNTRIES[co]) {
    return { lat: COUNTRIES[co][0], lng: COUNTRIES[co][1], exact: false };
  }

  return null;
}

module.exports = { getCityCoords };
