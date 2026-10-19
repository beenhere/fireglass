// Real titles with real TMDB artwork paths (checked), offers mapped to the mock TV's apps.
const P = (p) => `https://image.tmdb.org/t/p/w342/${p}.jpg`;
const B = (p) => `https://image.tmdb.org/t/p/w780/${p}.jpg`;

const NF = 'com.netflix.ninja', PV = 'com.amazon.avod.thirdpartyclient', HS = 'in.startv.hotstar',
  AT = 'com.apple.atve.amazon.appletv', CR = 'com.crunchyroll.crunchyroid', Z5 = 'com.graymatrix.did';

export const TITLES = [
  { id: 'tv:66732', title: 'Stranger Things', year: 2016, kind: 'tv', rating: 8.6, genres: ['Sci-Fi', 'Mystery', 'Drama'],
    overview: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    poster: P('uOOtwVbSr4QDjAGIifLDwpb2Pdl'), backdrop: B('2MaumbgBlW1NoPo3ZJO38A6v7OS'), offers: [[NF, 'https://www.netflix.com/title/80057281']] },
  { id: 'tv:70523', title: 'Dark', year: 2017, kind: 'tv', rating: 8.4, genres: ['Sci-Fi', 'Mystery', 'Thriller'],
    overview: 'A missing child sets four families on a frantic hunt for answers as they unearth a mind-bending mystery that spans three generations.',
    poster: P('apbrbWs8M9lyOpJYU5WXrpFbk1Z'), backdrop: B('3lBDg3i6nn5R2NKFCJ6oKyUo2j5'), offers: [[NF, 'https://www.netflix.com/title/80100172']] },
  { id: 'tv:93405', title: 'Squid Game', year: 2021, kind: 'tv', rating: 7.9, genres: ['Thriller', 'Drama'],
    overview: 'Hundreds of cash-strapped players accept a strange invitation to compete in children’s games. Inside, a tempting prize awaits, with deadly high stakes.',
    poster: P('dDlEmu3EZ0Pgg93K2SVNLCjCSvE'), backdrop: B('2meX1nMdScFOoV4370rqHWKmXhY'), offers: [[NF, 'https://www.netflix.com/title/81040344']] },
  { id: 'tv:119051', title: 'Wednesday', year: 2022, kind: 'tv', rating: 8.4, genres: ['Mystery', 'Comedy'],
    overview: 'Wednesday Addams sets out to investigate a murder spree while making new friends and foes at Nevermore Academy.',
    poster: P('9PFonBhy4cQy7Jz20NpMygczOkv'), backdrop: B('iHSwvRVsRyxpX7FE7GbviaDvgGZ'), offers: [[NF, 'https://www.netflix.com/title/81231974']] },
  { id: 'tv:76479', title: 'The Boys', year: 2019, kind: 'tv', rating: 8.5, genres: ['Action', 'Sci-Fi', 'Comedy'],
    overview: 'A group of vigilantes known informally as The Boys set out to take down corrupt superheroes with no more than blue-collar grit.',
    poster: P('stTEycfG9928HYGEISBFaG1ngjM'), backdrop: B('mGVrXeIjyecj6TKmwPVpHlscEmw'), offers: [[PV, 'https://app.primevideo.com/detail?gti=amzn1.dv.gti.the-boys']] },
  { id: 'tv:94997', title: 'House of the Dragon', year: 2022, kind: 'tv', rating: 8.4, genres: ['Fantasy', 'Drama'],
    overview: 'The Targaryen dynasty is at the absolute apex of its power, two hundred years before the events of Game of Thrones.',
    poster: P('z2yahl2uefxDCl0nogcRBstwruJ'), backdrop: B('etj8E2o0Bud0HkONVQPjyCkIvpv'), offers: [[HS, null]] },
  { id: 'tv:100088', title: 'The Last of Us', year: 2023, kind: 'tv', rating: 8.6, genres: ['Drama', 'Sci-Fi'],
    overview: 'Twenty years after modern civilisation has been destroyed, Joel is hired to smuggle Ellie out of an oppressive quarantine zone.',
    poster: P('uKvVjHNqB5VmOrdxqAt2F7J78ED'), backdrop: B('uDgy6hyPd82kOHh6I95FLtLnj6p'), offers: [[HS, null]] },
  { id: 'tv:95396', title: 'Severance', year: 2022, kind: 'tv', rating: 8.4, genres: ['Mystery', 'Thriller', 'Drama'],
    overview: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.',
    poster: P('lFf6LLrQjYldcZItzOkGmMMigP7'), backdrop: B('npD65vPa4vvn1ZHpp3o05A5vdKT'), offers: [[AT, 'https://tv.apple.com/show/severance/umc.cmc.1srk2goyh2q2zdxcx605w8vtx']] },
  { id: 'tv:1396', title: 'Breaking Bad', year: 2008, kind: 'tv', rating: 8.9, genres: ['Crime', 'Drama', 'Thriller'],
    overview: 'A chemistry teacher diagnosed with terminal cancer teams up with a former student to secure his family’s future by making methamphetamine.',
    poster: P('ggFHVNu6YYI5L9pCfOacjizRGt'), backdrop: B('tsRy63Mu5cu8etL1X7ZLyf7UP1M'), offers: [[NF, 'https://www.netflix.com/title/70143836']] },
  { id: 'tv:1399', title: 'Game of Thrones', year: 2011, kind: 'tv', rating: 8.5, genres: ['Fantasy', 'Drama'],
    overview: 'Seven noble families fight for control of the mythical land of Westeros while an ancient enemy returns after thousands of years.',
    poster: P('1XS1oqL89opfnbLl8WnZY1O1uJx'), backdrop: B('suopoADq0k8YZr4dQXcU6pToj6s'), offers: [[HS, null]] },
  { id: 'tv:60574', title: 'Peaky Blinders', year: 2013, kind: 'tv', rating: 8.5, genres: ['Crime', 'Drama'],
    overview: 'A gangster family epic set in 1900s England, centring on a gang who sew razor blades in the peaks of their caps, and their fierce boss Tommy Shelby.',
    poster: P('vUUqzWa2LnHIVqkaKVlVGkVcZIW'), backdrop: B('wiE9doxiLwq3WCGamDIOb2PqBqc'), offers: [[NF, 'https://www.netflix.com/title/80002479']] },
  { id: 'tv:94605', title: 'Arcane', year: 2021, kind: 'tv', rating: 8.7, genres: ['Animation', 'Action', 'Sci-Fi'],
    overview: 'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and clashing convictions.',
    poster: P('fqldf2t8ztc9aiwn3k6mlX3tvRT'), backdrop: B('rkB4LyZHo1NHXFEDHl9vSD9r1lI'), offers: [[NF, 'https://www.netflix.com/title/81435684']] },
  { id: 'tv:1668', title: 'Friends', year: 1994, kind: 'tv', rating: 8.4, genres: ['Comedy'],
    overview: 'Six young people from New York City, on their own and struggling to survive in the real world, find the companionship and comfort of friends.',
    poster: P('f496cm9enuEsZkSPzCwnTESEK5s'), backdrop: B('l0qVZIpXtIo7km9u5Yqh0nKPOr5'), offers: [[HS, null]] },
  { id: 'tv:2316', title: 'The Office', year: 2005, kind: 'tv', rating: 8.6, genres: ['Comedy'],
    overview: 'The everyday lives of office employees in the Scranton, Pennsylvania branch of the fictional Dunder Mifflin Paper Company.',
    poster: P('7DJKHzAi83BmQrWLrYYOqcoKfhR'), backdrop: B('vNpuAxGTl9HsUbHqam3E9CzqCvX'), offers: [[PV, null]] },
  { id: 'tv:1429', title: 'Attack on Titan', year: 2013, kind: 'tv', rating: 8.7, genres: ['Animation', 'Action'],
    overview: 'Humanity lives behind enormous walls to escape the Titans, until the day a colossal Titan breaks through.',
    poster: P('rqbCbjB19amtOtFQbb3K2lgm2zv'), backdrop: B('yvKrycViRMQcIgdnjsM5JGNWU4Q'), offers: [[CR, null], [NF, 'https://www.netflix.com/title/70299043']] },
  { id: 'tv:126308', title: 'Shōgun', year: 2024, kind: 'tv', rating: 8.6, genres: ['Drama', 'War'],
    overview: 'In Japan in the year 1600, Lord Yoshii Toranaga fights for his life as his enemies on the Council of Regents unite against him.',
    poster: P('7O4iVfOMQmdCSxhOg1WnzG1AgYT'), offers: [[HS, null]] },
  { id: 'movie:27205', title: 'Inception', year: 2010, kind: 'movie', rating: 8.4, genres: ['Sci-Fi', 'Action', 'Thriller'],
    overview: 'Cobb, a skilled thief who steals secrets from deep within the subconscious, is offered a chance to have his past wiped clean.',
    poster: P('9gk7adHYeDvHkCSEqAvQNLV5Uge'), backdrop: B('s3TBrRGB1iav7gFOCNx3H31MoES'), offers: [[NF, 'https://www.netflix.com/title/70131314']] },
  { id: 'movie:157336', title: 'Interstellar', year: 2014, kind: 'movie', rating: 8.5, genres: ['Sci-Fi', 'Drama'],
    overview: 'A team of explorers travels through a wormhole in space in an attempt to ensure humanity’s survival.',
    poster: P('gEU2QniE6E77NI6lCU6MxlNBvIx'), backdrop: B('xJHokMbljvjADYdit5fK5VQsXEG'), offers: [[PV, null]] },
  { id: 'movie:872585', title: 'Oppenheimer', year: 2023, kind: 'movie', rating: 8.1, genres: ['Drama', 'History'],
    overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II.',
    poster: P('8Gxv8gSFCU0XGDykEGv7zR1n2ua'), backdrop: B('rLb2cwF3Pazuxaj0sRXQ037tGI1'), offers: [[PV, null], [HS, null]] },
  { id: 'movie:693134', title: 'Dune: Part Two', year: 2024, kind: 'movie', rating: 8.1, genres: ['Sci-Fi', 'Adventure'],
    overview: 'Paul Atreides unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.',
    poster: P('1pdfLvkbY9ohJlCjQH2CZjjYVvJ'), backdrop: B('xOMo8BRK7PfcJv9JCnx7s5hj0PX'), offers: [[PV, null]] },
  { id: 'movie:361743', title: 'Top Gun: Maverick', year: 2022, kind: 'movie', rating: 8.2, genres: ['Action', 'Drama'],
    overview: 'After more than thirty years of service as one of the Navy’s top aviators, Pete Mitchell is where he belongs, pushing the envelope.',
    poster: P('62HCnUTziyWcpDaBO2i1DX17ljH'), backdrop: B('AaV1YIdWKnjAIAOe8UUKBFm327v'), offers: [[PV, null], [AT, null]] },
  { id: 'movie:579974', title: 'RRR', year: 2022, kind: 'movie', rating: 7.8, genres: ['Action', 'Drama'],
    overview: 'A fictional history of two legendary revolutionaries’ journey away from home before they began fighting for their country in the 1920s.',
    poster: P('nEufeZlyAOLqO2brrs0yeF1lgXO'), offers: [[NF, 'https://www.netflix.com/title/81476453'], [Z5, null]] },
  { id: 'movie:76600', title: 'Avatar: The Way of Water', year: 2022, kind: 'movie', rating: 7.6, genres: ['Sci-Fi', 'Adventure'],
    overview: 'Jake Sully lives with his newfound family on Pandora. When a familiar threat returns, Jake must work with Neytiri to protect their home.',
    poster: P('t6HIqrRAclMCA60NsSmeqe9RmNV'), backdrop: B('s16H6tpK2utvwDtzZ8Qy4qm5Emw'), offers: [[HS, null]] },
  { id: 'movie:299536', title: 'Avengers: Infinity War', year: 2018, kind: 'movie', rating: 8.2, genres: ['Action', 'Sci-Fi'],
    overview: 'The Avengers and their allies must be willing to sacrifice all in an attempt to defeat the powerful Thanos.',
    poster: P('7WsyChQLEftFiDOVTGkv3hFpyyt'), backdrop: B('mDfJG3LC3Dqb67AZ52x3Z0jU0uB'), offers: [[HS, null]] },
  { id: 'movie:129', title: 'Spirited Away', year: 2001, kind: 'movie', rating: 8.5, genres: ['Animation', 'Fantasy'],
    overview: 'A young girl, Chihiro, becomes trapped in a strange new world of spirits and must find a way to free her parents and return home.',
    poster: P('39wmItIWsg5sZMyRUHLkWBcuVCM'), backdrop: B('Ab8mkHmkYADjU7wQiOkia9BzGvS'), offers: [[NF, 'https://www.netflix.com/title/60023642']] },
  { id: 'movie:313369', title: 'La La Land', year: 2016, kind: 'movie', rating: 7.9, genres: ['Romance', 'Drama', 'Music'],
    overview: 'Mia, an aspiring actress, and Sebastian, a dedicated jazz musician, fall in love while chasing their dreams in Los Angeles.',
    poster: P('qJeU7KM4nT2C1WpOrwPcSDGFUWE'), offers: [[PV, null]] },
];

/** Shape a stored title for the API, listing only offers for apps on this TV. */
export function shape(t, apps) {
  const offers = t.offers
    .map(([pkg, url]) => {
      const app = apps.find((a) => a.pkg === pkg);
      return app ? { pkg, label: app.label, ...(url ? { url } : {}) } : null;
    })
    .filter(Boolean);
  const { offers: _o, ...rest } = t;
  return { ...rest, offers };
}

// What the TV home shows as trending.
export const REC_IDS = ['tv:66732', 'movie:693134', 'tv:95396', 'tv:94997', 'tv:93405', 'movie:872585', 'tv:76479', 'tv:94605'];
