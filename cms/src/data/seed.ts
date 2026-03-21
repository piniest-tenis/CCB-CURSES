// src/data/seed.ts
// Reference seed data for initial CMS content.
// This file is NOT executed automatically — it is a reference for manually
// populating the CMS via the admin UI or a one-off script.
//
// To seed: copy each entry and POST to:
//   POST /cms/splash      for splash items
//   POST /cms/interstitial for interstitial items

export const splashSeed = [
  {
    type: "splash" as const,
    title: "Welcome to the 231st Andam",
    body: `It is the season of Eraldama in the only tamed part of The Waste. Across the Varjalune Republic, people are preparing for the upcoming season by turning out their linens, opening windows and letting the cool, dry Kuivatuul winds blow the damp from their homes. This is a time of celebration in the capital of Alipinn. However, it is also the time of the Andam.

The Andam occurs yearly, and is one of the only reasons that the Varjalune can exist. Each year, 150 adherents are drafted (as volunteers or compelled via force) to be sent to the Hygiane Order in Gatehouse. There, they will replenish the ranks tasked with containing the Creep and dealing with the various Etherotaxia that live within Forestdown.

At its inception, the Andam would cover all the losses of the Hygiane Order from the past year, and was restricted to only those coming of age in the Varjalune. Sometimes as many as 700 young people from the city would be sent westward to Gatehouse. Stories of The Spirit Ichida's wrath captured the imagination of all, and epics of the valiant Hygiane and its Hospitaler were found wherever people gathered.

The Creep was active then. Regular incursions into Tidwell would need to be fought back. At its worst, even various representations of the Etherotaxia would attempt to establish themselves outside the canopy of the expansive temperate rainforest, leading to vast eruptions of uncontrollable change where they settled. The town of Taliga was nearly consumed entirely during the Eraldama Incursion.

That was nearly two centuries ago, however, and as the Hygiane Order found more success, the people of the Varjalune found ways to relax the cost of the Andam. First, by trading Paarlid in exchange for tributes in place of the young adults of Varjalune. Then, by simply sending less.

The Hygiane attempted to enforce the Andam by marching on Alipinn, but in doing so they nearly lost Gatehouse to the Skelkandi that surfaced at the shore of the Ergantine Lake. They never reached the Varjalune before being called back.

Since, Alipinn and Taliga have negotiated from a position of power. Age restrictions have been removed, and the numbers sent every year have dipped well below replacement levels. Fortunately for all, activity in Forestdown has quieted similarly.

Today, these 150 volunteers are being notified, assembled, and shipped off for the 231st Andam. Your characters are amongst them.`,
    imageKey: null,
    active: true,
    order: 0,
  },
];

export const interstitialSeed = [
  {
    type: "interstitial" as const,
    title: "The Varjalune Republic",
    body: "The only major nation-state of The Wastes — though only by technicality are they located there. Situated on the border between Forestdown, Carnithia and The Wastes, the Republic's cities of Alipinn and Taliga thrive through trade with Kybon Isle. Land trade is only feasible during the Vihmarood season, making the Republic's maritime connections its true lifeline.",
    imageKey: null,
    active: true,
    order: 1,
  },
  {
    type: "interstitial" as const,
    title: "Gatehouse",
    body: "A bustling border town on the edge of the Ergantine Lake, home to the Hygiane Order. The Order occupies a massive fortress and monastery on an easily defensible outcropping into the lake — the last line between the tamed lands and the corrupted depths of Forestdown.",
    imageKey: null,
    active: true,
    order: 2,
  },
  {
    type: "interstitial" as const,
    title: "The Hygiane Order",
    body: "Tasked with tending and maintaining the corruption of Forestdown, the Hygiane Order is comprised of four internal orders: The Hospitallers, The Medicaments, The Etherements, and The Tenders. The Order now finds itself at a dangerous inflection point — the weakest it has been in living memory, as the populace of Tidwell turns its attention to the mysterious Order of the Sixth Form.",
    imageKey: null,
    active: true,
    order: 3,
  },
  {
    type: "interstitial" as const,
    title: "The Creep",
    body: "The colloquial name for the ever-present corrupting factor within Forestdown. The Creep describes both the rotted undergrowth that signifies ground claimed by Forestdown, and all the numerous and unique lifeforms that reside within it. Distinct from the Etherotaxia, which are the spirits and semi-corporeal beings that also inhabit the forest.",
    imageKey: null,
    active: true,
    order: 4,
  },
  {
    type: "interstitial" as const,
    title: "Etherotaxia",
    body: "Any number of reported spirits — either of the dead or semi-corporeal manifestations of concepts within the forest. Most are poorly understood. Some, like the Madanikuputukas (known informally as Tukas), have been studied enough to be named. They are one of the many reasons the Hygiane Order cannot simply abandon Forestdown to itself.",
    imageKey: null,
    active: true,
    order: 5,
  },
  {
    type: "interstitial" as const,
    title: "Forestdown",
    body: "A vast temperate rainforest, ancient beyond reckoning, and deeply corrupted. The Creep spreads beneath its canopy. Etherotaxia wander its depths. At its heart, rumor speaks of The Invisible City — ruled over by The Spirit Ichida — where wanderers are said to end up when they enter the forest in a daze and do not return.",
    imageKey: null,
    active: true,
    order: 6,
  },
  {
    type: "interstitial" as const,
    title: "The Spirit Ichida",
    body: "An ancient ghost, old even before the first age. The Spirit Ichida is the embodiment of change — managing change through death and rebirth. Few have seen The Spirit Ichida, and those that have rarely survive the experience with their sanity intact. Its Invisible City is said to sit at the very heart of Forestdown.",
    imageKey: null,
    active: true,
    order: 7,
  },
  {
    type: "interstitial" as const,
    title: "A Child's Song",
    body: "Itchy itchy eyes-o-white / set down low and out of sight / Ragged his body and hot his head / lay him down, he's better dead // Sloppy sloppy mouth-o-teeth / push from out his jaw beneath / Sopping his stink and raw his skin / let him loose, he'll come again // Wibbly wibbly arms-so-long / those that's left and those that's gone / Mind is juice and cares are few / soon he's dead, but so are you",
    imageKey: null,
    active: true,
    order: 8,
  },
];
