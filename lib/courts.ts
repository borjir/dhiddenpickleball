/**
 * The club's two bookable courts. Only club-confirmed facts are recorded here:
 * the supplied names, photographs, operating hours, and hourly rates. The
 * facilities list is still unconfirmed, so no facility claim is attached.
 */
export type Court = {
  slug: string;
  name: string;
  image: string;
  alt: string;
  summary: string;
};

export const COURTS: readonly Court[] = [
  {
    slug: "court-1",
    name: "Court 1",
    image: "/courts/pickleball1.jpg",
    alt: "Players rallying on a blue pickleball court behind the net",
    summary:
      "One of the club's two bookable courts, available every day from 7:00 AM to 12:00 AM.",
  },
  {
    slug: "court-2",
    name: "Court 2",
    image: "/courts/pickleball2-960.webp",
    alt: "Doubles play on a pickleball court with hills and sea in the background",
    summary:
      "The second of the club's two bookable courts, available every day from 7:00 AM to 12:00 AM.",
  },
];

export function getCourt(slug: string): Court | undefined {
  return COURTS.find((court) => court.slug === slug);
}
