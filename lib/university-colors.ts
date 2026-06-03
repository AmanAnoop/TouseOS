export interface UniversityPreset {
  id: string;
  name: string;
  shortName: string;
  primary: string;
  secondary: string;
}

/** Major U.S. universities — brand-inspired colors for chapter theme blending. */
export const UNIVERSITY_PRESETS: UniversityPreset[] = [
  { id: "alabama", name: "University of Alabama", shortName: "Alabama", primary: "#9E1B32", secondary: "#828A8F" },
  { id: "arizona", name: "University of Arizona", shortName: "Arizona", primary: "#AB0520", secondary: "#0C234B" },
  { id: "arizona-state", name: "Arizona State University", shortName: "ASU", primary: "#8C1D40", secondary: "#FFC627" },
  { id: "auburn", name: "Auburn University", shortName: "Auburn", primary: "#0C2340", secondary: "#E87722" },
  { id: "berkeley", name: "UC Berkeley", shortName: "Cal", primary: "#003262", secondary: "#FDB515" },
  { id: "boston-college", name: "Boston College", shortName: "BC", primary: "#8B0000", secondary: "#B8860B" },
  { id: "boston-u", name: "Boston University", shortName: "BU", primary: "#CC0000", secondary: "#FFFFFF" },
  { id: "byu", name: "Brigham Young University", shortName: "BYU", primary: "#002E5D", secondary: "#FFFFFF" },
  { id: "clemson", name: "Clemson University", shortName: "Clemson", primary: "#F56600", secondary: "#522D80" },
  { id: "colorado", name: "University of Colorado Boulder", shortName: "Colorado", primary: "#CFB87C", secondary: "#000000" },
  { id: "columbia", name: "Columbia University", shortName: "Columbia", primary: "#003DA5", secondary: "#FFFFFF" },
  { id: "cornell", name: "Cornell University", shortName: "Cornell", primary: "#B31B1B", secondary: "#FFFFFF" },
  { id: "dartmouth", name: "Dartmouth College", shortName: "Dartmouth", primary: "#00693E", secondary: "#FFFFFF" },
  { id: "duke", name: "Duke University", shortName: "Duke", primary: "#003087", secondary: "#FFFFFF" },
  { id: "florida", name: "University of Florida", shortName: "Florida", primary: "#0021A5", secondary: "#FA4616" },
  { id: "florida-state", name: "Florida State University", shortName: "FSU", primary: "#782F40", secondary: "#CEB888" },
  { id: "georgetown", name: "Georgetown University", shortName: "Georgetown", primary: "#041E42", secondary: "#8D817B" },
  { id: "georgia", name: "University of Georgia", shortName: "UGA", primary: "#BA0C2F", secondary: "#000000" },
  { id: "georgia-tech", name: "Georgia Institute of Technology", shortName: "Georgia Tech", primary: "#B3A369", secondary: "#003057" },
  { id: "harvard", name: "Harvard University", shortName: "Harvard", primary: "#A51C30", secondary: "#1E1E1E" },
  { id: "illinois", name: "University of Illinois Urbana-Champaign", shortName: "Illinois", primary: "#13294B", secondary: "#E84A27" },
  { id: "indiana", name: "Indiana University Bloomington", shortName: "Indiana", primary: "#990000", secondary: "#FFFFFF" },
  { id: "iowa", name: "University of Iowa", shortName: "Iowa", primary: "#FFCD00", secondary: "#000000" },
  { id: "kansas", name: "University of Kansas", shortName: "Kansas", primary: "#0051BA", secondary: "#E8000D" },
  { id: "kentucky", name: "University of Kentucky", shortName: "Kentucky", primary: "#0033A0", secondary: "#FFFFFF" },
  { id: "lsu", name: "Louisiana State University", shortName: "LSU", primary: "#461D7C", secondary: "#FDD023" },
  { id: "maryland", name: "University of Maryland", shortName: "Maryland", primary: "#E03A3E", secondary: "#FFD520" },
  { id: "miami", name: "University of Miami", shortName: "Miami", primary: "#F47321", secondary: "#005030" },
  { id: "michigan", name: "University of Michigan", shortName: "Michigan", primary: "#00274C", secondary: "#FFCB05" },
  { id: "michigan-state", name: "Michigan State University", shortName: "MSU", primary: "#18453B", secondary: "#FFFFFF" },
  { id: "minnesota", name: "University of Minnesota", shortName: "Minnesota", primary: "#7A0019", secondary: "#FFCC33" },
  { id: "missouri", name: "University of Missouri", shortName: "Mizzou", primary: "#F1B82D", secondary: "#000000" },
  { id: "north-carolina", name: "UNC Chapel Hill", shortName: "UNC", primary: "#7BAFD4", secondary: "#13294B" },
  { id: "northwestern", name: "Northwestern University", shortName: "Northwestern", primary: "#4E2A84", secondary: "#FFFFFF" },
  { id: "notre-dame", name: "University of Notre Dame", shortName: "Notre Dame", primary: "#0C2340", secondary: "#C99700" },
  { id: "ohio-state", name: "The Ohio State University", shortName: "Ohio State", primary: "#BB0000", secondary: "#666666" },
  { id: "oklahoma", name: "University of Oklahoma", shortName: "Oklahoma", primary: "#841617", secondary: "#FDF9D8" },
  { id: "oregon", name: "University of Oregon", shortName: "Oregon", primary: "#154733", secondary: "#FEE123" },
  { id: "penn", name: "University of Pennsylvania", shortName: "Penn", primary: "#011F5B", secondary: "#990000" },
  { id: "penn-state", name: "Penn State University", shortName: "Penn State", primary: "#041E42", secondary: "#FFFFFF" },
  { id: "pitt", name: "University of Pittsburgh", shortName: "Pitt", primary: "#003594", secondary: "#FFB81C" },
  { id: "princeton", name: "Princeton University", shortName: "Princeton", primary: "#E77500", secondary: "#000000" },
  { id: "purdue", name: "Purdue University", shortName: "Purdue", primary: "#CEB888", secondary: "#000000" },
  { id: "rutgers", name: "Rutgers University", shortName: "Rutgers", primary: "#CC0033", secondary: "#5F6A72" },
  { id: "south-carolina", name: "University of South Carolina", shortName: "South Carolina", primary: "#73000A", secondary: "#000000" },
  { id: "stanford", name: "Stanford University", shortName: "Stanford", primary: "#8C1515", secondary: "#2E2D29" },
  { id: "syracuse", name: "Syracuse University", shortName: "Syracuse", primary: "#F76900", secondary: "#002D72" },
  { id: "tennessee", name: "University of Tennessee", shortName: "Tennessee", primary: "#FF8200", secondary: "#FFFFFF" },
  { id: "texas", name: "University of Texas at Austin", shortName: "Texas", primary: "#BF5700", secondary: "#FFFFFF" },
  { id: "texas-am", name: "Texas A&M University", shortName: "Texas A&M", primary: "#500000", secondary: "#FFFFFF" },
  { id: "ucla", name: "UCLA", shortName: "UCLA", primary: "#2774AE", secondary: "#FFD100" },
  { id: "usc", name: "University of Southern California", shortName: "USC", primary: "#990000", secondary: "#FFCC00" },
  { id: "virginia", name: "University of Virginia", shortName: "UVA", primary: "#232D4B", secondary: "#F84C1E" },
  { id: "virginia-tech", name: "Virginia Tech", shortName: "Virginia Tech", primary: "#861F41", secondary: "#E87722" },
  { id: "washington", name: "University of Washington", shortName: "Washington", primary: "#4B2E83", secondary: "#B7A57A" },
  { id: "wisconsin", name: "University of Wisconsin-Madison", shortName: "Wisconsin", primary: "#C5050C", secondary: "#FFFFFF" },
  { id: "yale", name: "Yale University", shortName: "Yale", primary: "#00356B", secondary: "#FFFFFF" },
  { id: "vanderbilt", name: "Vanderbilt University", shortName: "Vanderbilt", primary: "#866D4B", secondary: "#000000" },
  { id: "wake-forest", name: "Wake Forest University", shortName: "Wake Forest", primary: "#9E7B0D", secondary: "#000000" },
  { id: "texas-tech", name: "Texas Tech University", shortName: "Texas Tech", primary: "#CC0000", secondary: "#000000" },
  { id: "west-virginia", name: "West Virginia University", shortName: "WVU", primary: "#002855", secondary: "#EAAA00" },
  { id: "custom-campus", name: "Other / custom campus", shortName: "Other", primary: "#0B1F3A", secondary: "#004225" },
];

export function getUniversityById(id: string | null | undefined): UniversityPreset | undefined {
  if (!id) return undefined;
  return UNIVERSITY_PRESETS.find((u) => u.id === id);
}
