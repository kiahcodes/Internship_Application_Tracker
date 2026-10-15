// Offline city lookup so scraped listings get coordinates for distance sorting
// without hitting a geocoding API. Unknown / remote places get null coords.
const CITIES = {
  bengaluru: [12.9716, 77.5946], bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867], pune: [18.5204, 73.8567],
  mumbai: [19.076, 72.8777], delhi: [28.6139, 77.209],
  "new delhi": [28.6139, 77.209], gurugram: [28.4595, 77.0266],
  gurgaon: [28.4595, 77.0266], noida: [28.5355, 77.391],
  chennai: [13.0827, 80.2707], kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714], jaipur: [26.9124, 75.7873],
  kochi: [9.9312, 76.2673], chandigarh: [30.7333, 76.7794],
  indore: [22.7196, 75.8577], coimbatore: [11.0168, 76.9558],
};

export const isRemote = (loc) => /remote|anywhere|work from home|wfh/i.test(loc);
export const isIndia = (loc) =>
  /\bindia\b/i.test(loc) || Object.keys(CITIES).some((c) => new RegExp(`\\b${c}\\b`, "i").test(loc));

export function coordsFor(loc) {
  const l = loc.toLowerCase();
  const city = Object.keys(CITIES).find((c) => new RegExp(`\\b${c}\\b`).test(l));
  return city ? CITIES[city] : [null, null];
}
