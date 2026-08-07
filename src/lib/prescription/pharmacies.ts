// Verified pharmacy directory used by the delivery step. A prescription is
// never sent to a free-text destination: the provider picks a verified
// pharmacy branch with a real address.
import type { RxCountry } from "./store";

export type VerifiedPharmacy = {
  id: string;
  name: string;
  branch: string;
  address: string;
  city: string;
  phone: string;
  country: RxCountry;
  /** When this branch's licence was last verified in the directory. */
  verifiedOn: string;
  /** Branch accepts controlled / S2 prescriptions electronically. */
  acceptsControlled?: boolean;
};

export const VERIFIED_PHARMACIES: VerifiedPharmacy[] = [
  {
    id: "ph-mercury-bgc",
    name: "Mercury Drug",
    branch: "BGC Stopover",
    address: "Stopover Pavilion, 31st St cor 2nd Ave, Bonifacio Global City",
    city: "Taguig, Metro Manila",
    phone: "+63 2 8888 1234",
    country: "PH",
    verifiedOn: "2026-06-02",
    acceptsControlled: true,
  },
  {
    id: "ph-mercury-makati",
    name: "Mercury Drug",
    branch: "Ayala Avenue",
    address: "G/F Tower One, Ayala Triangle, Ayala Ave",
    city: "Makati, Metro Manila",
    phone: "+63 2 8891 4455",
    country: "PH",
    verifiedOn: "2026-05-19",
  },
  {
    id: "ph-watsons-qc",
    name: "Watsons",
    branch: "Trinoma",
    address: "2/F Trinoma Mall, EDSA cor North Ave",
    city: "Quezon City, Metro Manila",
    phone: "+63 2 8916 7788",
    country: "PH",
    verifiedOn: "2026-04-28",
  },
  {
    id: "ph-southstar-cebu",
    name: "Southstar Drug",
    branch: "Ayala Center Cebu",
    address: "Level 1, Ayala Center Cebu, Cardinal Rosales Ave",
    city: "Cebu City, Cebu",
    phone: "+63 32 233 9011",
    country: "PH",
    verifiedOn: "2026-06-11",
    acceptsControlled: true,
  },
  {
    id: "ph-generika-davao",
    name: "Generika Drugstore",
    branch: "Matina",
    address: "MacArthur Highway, Matina",
    city: "Davao City, Davao del Sur",
    phone: "+63 82 297 4410",
    country: "PH",
    verifiedOn: "2026-03-30",
  },
  {
    id: "us-cvs-sf",
    name: "CVS Pharmacy",
    branch: "#1043 Market St",
    address: "731 Market St",
    city: "San Francisco, CA 94103",
    phone: "+1 415 552 1178",
    country: "US",
    verifiedOn: "2026-05-22",
  },
  {
    id: "us-walgreens-nyc",
    name: "Walgreens",
    branch: "#4472 Union Square",
    address: "145 4th Ave",
    city: "New York, NY 10003",
    phone: "+1 212 677 0054",
    country: "US",
    verifiedOn: "2026-06-04",
    acceptsControlled: true,
  },
];

export function pharmaciesFor(country: RxCountry, query = ""): VerifiedPharmacy[] {
  const q = query.trim().toLowerCase();
  return VERIFIED_PHARMACIES.filter((p) => p.country === country).filter((p) =>
    !q
      ? true
      : [p.name, p.branch, p.address, p.city].some((v) => v.toLowerCase().includes(q)),
  );
}

export function findPharmacy(id?: string): VerifiedPharmacy | undefined {
  return VERIFIED_PHARMACIES.find((p) => p.id === id);
}

export function pharmacyLine(p: VerifiedPharmacy): string {
  return `${p.name} — ${p.branch}, ${p.address}, ${p.city}`;
}
