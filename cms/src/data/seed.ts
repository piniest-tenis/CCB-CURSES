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
    body: "The only major nation-state of The Wastes, though only by technicality are they located there. Situated on the border between Forestdown, Carnithia and The Wastes, the Republic's cities of Alipinn and Taliga thrive through trade with Kybon Isle. Land trade is only feasible during the Vihmarood season, making the Republic's maritime connections its true lifeline.",
    imageKey: null,
    active: true,
    order: 1,
  },
  {
    type: "interstitial" as const,
    title: "Gatehouse",
    body: "A bustling border town on the edge of the Ergantine Lake, home to the Hygiane Order. The Order occupies a massive fortress and monastery on an easily defensible outcropping into the lake, the last line between the tamed lands and the corrupted depths of Forestdown.",
    imageKey: null,
    active: true,
    order: 2,
  },
  {
    type: "interstitial" as const,
    title: "The Hygiane Order",
    body: "Tasked with tending and maintaining the corruption of Forestdown, the Hygiane Order is comprised of four internal orders: The Hospitallers, The Medicaments, The Etherements, and The Tenders. The Order now finds itself at a dangerous inflection point. It is the weakest it has been in living memory, as the populace of Tidwell turns its attention to the mysterious Order of the Sixth Form.",
    imageKey: null,
    active: true,
    order: 3,
  },
  {
    type: "interstitial" as const,
    title: "The Creep",
    body: "The colloquial name for the ever-present corrupting factor within Forestdown. The Creep describes both the rotted undergrowth that signifies ground claimed by Forestdown, and all the numerous and unique lifeforms that reside within it. The Creep is distinct from the Etherotaxia, which are the spirits and semi-corporeal beings that also inhabit the forest.",
    imageKey: null,
    active: true,
    order: 4,
  },
  {
    type: "interstitial" as const,
    title: "Etherotaxia",
    body: "Any number of reported spirits, either of the dead or semi-corporeal manifestations of concepts within the forest. Most are poorly understood. Some, like the Madanikuputukas (known informally as Tukas), have been studied enough to be named. They are one of the many reasons the Hygiane Order cannot simply abandon Forestdown to itself.",
    imageKey: null,
    active: true,
    order: 5,
  },
  {
    type: "interstitial" as const,
    title: "Forestdown",
    body: "A vast temperate rainforest, ancient beyond reckoning, and deeply corrupted. The Creep spreads beneath its canopy. Etherotaxia wander its depths. At its heart, rumor speaks of The Invisible City, ruled over by The Spirit Ichida, where wanderers are said to end up when they enter the forest in a daze and do not return.",
    imageKey: null,
    active: true,
    order: 6,
  },
  {
    type: "interstitial" as const,
    title: "The Spirit Ichida",
    body: "An ancient ghost, old even before the first age. The Spirit Ichida is the embodiment of change, managing change through death and rebirth. Few have seen The Spirit Ichida, and those that have rarely survive the experience with their sanity intact. Its Invisible City is said to sit at the very heart of Forestdown.",
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

  // ── Where to Find the Show ──────────────────────────────────────────────────

  {
    type: "interstitial" as const,
    title: "Chronicles of Tidwell — Live from the Table",
    body: "The stories of Tidwell unfold live each week on Twitch at [twitch.tv/man_in_jumpsuit](https://twitch.tv/man_in_jumpsuit). *Curses! A Daggerheart Adventure* is an actual-play tabletop RPG show set in the land you're exploring right now. Pull up a chair — the 231st Andam has only just begun.",
    imageKey: null,
    active: true,
    order: 9,
  },
  {
    type: "interstitial" as const,
    title: "Watch Curses! Live",
    body: "Every Wednesday night at 8:30 PM ET, the cast of Curses! sits down to play live on [Twitch](https://twitch.tv/man_in_jumpsuit). It's the kind of session you wish you could pull up a chair to — tense, funny, and full of moments that only happen when the dice are real and the stakes are personal. Grab a seat. The table has room.",
    imageKey: null,
    active: true,
    order: 10,
  },
  {
    type: "interstitial" as const,
    title: "Dispatches from the Varjalune",
    body: "News from Tidwell travels faster than the Kuivatuul winds — if you know where to listen. Follow the show on [Bluesky](https://bsky.app/maninjumpsuit.com), [Instagram](https://instagram.com/CursesAP), or [TikTok](https://tiktok.com/@maninjumpsuit) for session recaps, behind-the-scenes lore, and announcements from the cast. Every age brings new arrivals to Tidwell. Yours might be next.",
    imageKey: null,
    active: true,
    order: 11,
  },
  {
    type: "interstitial" as const,
    title: "Stay in the Loop",
    body: "Curses! streams live on [Twitch](https://twitch.tv/man_in_jumpsuit) every Wednesday at 8:30 PM ET, and full episodes are coming to the Fable & Folly podcast network and [YouTube](https://youtube.com/@maninjumpsuit) in August 2026. Until then, the best way to keep up is to follow along on [Bluesky](https://bsky.app/maninjumpsuit.com), [Instagram](https://instagram.com/CursesAP), or [TikTok](https://tiktok.com/@maninjumpsuit) — where you'll find session recaps, behind-the-scenes glimpses, and the occasional unhinged lore drop from the GM.",
    imageKey: null,
    active: true,
    order: 12,
  },
  {
    type: "interstitial" as const,
    title: "The Cast of Curses!",
    body: "You might know their voices from Dungeons and Drimbus, Quest Friends, Tales of the Ever After, REDACTED, or Heartglass. The cast of Curses! brings together some of the most compelling creators in indie audio fiction — performers who know how to find the heartbreak in a dice roll and the comedy in a catastrophe. Catch them live on [Twitch](https://twitch.tv/man_in_jumpsuit) every Wednesday at 8:30 PM ET, or follow along on [Bluesky](https://bsky.app/maninjumpsuit.com), [Instagram](https://instagram.com/CursesAP), and [TikTok](https://tiktok.com/@maninjumpsuit).",
    imageKey: null,
    active: true,
    order: 13,
  },

  // ── Additional World Lore ───────────────────────────────────────────────────

  {
    type: "interstitial" as const,
    title: "The Two World Trees",
    body: "The peoples of Tidwell believe their world is pinned to the sky by two great trees. The Tree of Life is a small, twisted oak in the Mnojest-Gora mountains that carries blooms through every season, defying all natural law. The Tree of Strength is a solitary sequoia, tall and unbowed, growing alone in the barren expanse of The Waste. The Golden Canopy in Reveille bears sculpted likenesses of both.",
    imageKey: null,
    active: true,
    order: 14,
  },
  {
    type: "interstitial" as const,
    title: "The Storied Altar",
    body: "At the heart of Reveille's abandoned central monastery sits a massive stone altar carved to resemble the open pages of a book. Its surface bears markings in a vibrant gold that reflects more light than it receives, as though lit from within. The script has never been deciphered. Each age of Tidwell has brought a new people into the world through this altar — though no one living has witnessed it happen.",
    imageKey: null,
    active: true,
    order: 15,
  },
  {
    type: "interstitial" as const,
    title: "The Nature of Curses",
    body: "In Tidwell, magic is the sharp edge of a wish turned back on the wisher. Every curse is a bargain struck in flesh and fate — for every benefit, an equal price. A luck curse might appear as a strange coin sewn into a monk's purse, or it might replace the eye of a compulsive gambler entirely. Those who seek power this way learn quickly that the cost is always personal.",
    imageKey: null,
    active: true,
    order: 16,
  },
  {
    type: "interstitial" as const,
    title: "The Wishing Turtle",
    body: "One of Tidwell's three forerunners — ancient beings who existed before the first age — the Wishing Turtle is no larger than a dinner plate, with a broad flat face and deep pitted lips. It grants wishes to anyone who can trick it into speaking. Exiled to the Southern Mesa in Gyhrra and bitter about it, the Turtle hides not from danger but from the endless procession of desperate people who come looking for it.",
    imageKey: null,
    active: true,
    order: 17,
  },
  {
    type: "interstitial" as const,
    title: "The Revenant God",
    body: "Followers of the Church of the Revenant God worship a deity they describe as a seven-year-old human boy named Dave. The Davites believe he drew the peoples of Tidwell in his sketchpad and breathed life into them through his dreams. When the world is in turmoil, Dave slumbers fitfully and risks awakening. The Davites teach that when he wakes, an age ends — and when he dreams again, new wonders arrive on the continent.",
    imageKey: null,
    active: true,
    order: 18,
  },
  {
    type: "interstitial" as const,
    title: "The Masked Host",
    body: "Before any people arrived through the Storied Altar, the Masked Host were already here — the first people raised from Tidwell's own soil. Now rare enough to be almost mythical, their gaunt spindly forms with hollow eyes and unmoving too-wide smiles are the stuff of children's nightmares. Parents across the continent still warn their children with the same words: don't stray out after dark.",
    imageKey: null,
    active: true,
    order: 19,
  },
];
