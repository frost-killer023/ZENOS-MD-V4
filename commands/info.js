const axios = require('axios');

const commands = {
    news: async ({ sock, msg }) => {
        try {
            const res = await axios.get('https://api.currentsapi.services/v1/latest-news?language=fr&apiKey=free', { timeout: 10000 });
            const articles = res.data?.news?.slice(0, 5);
            if (!articles?.length) throw new Error('No news');
            const text = `📰 *Dernières actualités:*\n\n` + articles.map((a, i) => `${i + 1}. *${a.title}*\n   🔗 ${a.url}`).join('\n\n');
            await sock.sendMessage(msg.key.remoteJid, { text });
        } catch {
            try {
                const res2 = await axios.get('https://www.reddit.com/r/worldnews/top.json?limit=5', { timeout: 10000, headers: { 'User-Agent': 'ZenosMD/1.0' } });
                const posts = res2.data?.data?.children?.map(p => p.data);
                const text = `📰 *Actualités mondiales:*\n\n` + posts.map((p, i) => `${i + 1}. *${p.title}*`).join('\n\n');
                await sock.sendMessage(msg.key.remoteJid, { text });
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de récupérer les actualités.' });
            }
        }
    },

    wiki: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !wiki <sujet>' });
        try {
            const res = await axios.get(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(body)}`, { timeout: 10000 });
            const d = res.data;
            await sock.sendMessage(msg.key.remoteJid, { text: `📚 *Wikipedia: ${d.title}*\n\n${d.extract}\n\n🔗 ${d.content_urls?.desktop?.page || ''}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Article non trouvé pour "${body}"` });
        }
    },

    crypto: async ({ sock, msg, body }) => {
        const coin = body?.toLowerCase() || 'bitcoin';
        const ids = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', usdt: 'tether', sol: 'solana', xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', avax: 'avalanche-2', dot: 'polkadot' };
        const coinId = ids[coin] || coin;
        try {
            const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,eur&include_24hr_change=true`, { timeout: 10000 });
            const data = res.data[coinId];
            if (!data) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Cryptomonnaie non trouvée' });
            const change = data.usd_24h_change?.toFixed(2);
            const trend = change >= 0 ? '📈' : '📉';
            await sock.sendMessage(msg.key.remoteJid, { text: `💰 *${coinId.toUpperCase()}*\n\n💵 USD: $${data.usd?.toLocaleString()}\n💶 EUR: €${data.eur?.toLocaleString()}\n${trend} 24h: ${change}%` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur récupération prix crypto' });
        }
    },

    stock: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !stock <TICKER>\nEx: !stock AAPL' });
        try {
            const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${body.toUpperCase()}?interval=1d&range=1d`, { timeout: 10000 });
            const quote = res.data?.chart?.result?.[0]?.meta;
            if (!quote) throw new Error('Not found');
            await sock.sendMessage(msg.key.remoteJid, { text: `📊 *${quote.symbol} - ${quote.longName || body}*\n\n💵 Prix: $${quote.regularMarketPrice}\n📈 Ouverture: $${quote.chartPreviousClose}\n💰 Volume: ${quote.regularMarketVolume?.toLocaleString()}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Ticker "${body}" non trouvé` });
        }
    },

    movie: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !movie <titre>' });
        try {
            const res = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(body)}&apikey=trilogy&type=movie`, { timeout: 10000 });
            if (res.data.Response === 'False') return sock.sendMessage(msg.key.remoteJid, { text: '❌ Film non trouvé' });
            const m = res.data;
            await sock.sendMessage(msg.key.remoteJid, { text: `🎬 *${m.Title} (${m.Year})*\n\n📖 Synopsis: ${m.Plot}\n⭐ Note: ${m.imdbRating}/10\n🎭 Genre: ${m.Genre}\n🎬 Réalisateur: ${m.Director}\n👥 Acteurs: ${m.Actors}\n⏱️ Durée: ${m.Runtime}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur recherche film' });
        }
    },

    anime: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !anime <titre>' });
        try {
            const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(body)}&limit=1`, { timeout: 10000 });
            const anime = res.data.data?.[0];
            if (!anime) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Anime non trouvé' });
            const text = `🎌 *${anime.title}*\n\n📖 ${anime.synopsis?.substring(0, 300)}...\n\n⭐ Score: ${anime.score}\n📺 Épisodes: ${anime.episodes || '?'}\n🗓️ Diffusion: ${anime.aired?.string}\n📊 Statut: ${anime.status}`;
            if (anime.images?.jpg?.image_url) {
                const imgRes = await axios.get(anime.images.jpg.image_url, { responseType: 'arraybuffer', timeout: 10000 });
                await sock.sendMessage(msg.key.remoteJid, { image: Buffer.from(imgRes.data), caption: text });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text });
            }
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur recherche anime' });
        }
    },

    country: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !country <pays>' });
        try {
            const res = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(body)}`, { timeout: 10000 });
            const c = res.data[0];
            const capital = c.capital?.[0] || 'N/A';
            const langs = Object.values(c.languages || {}).join(', ');
            const currencies = Object.values(c.currencies || {}).map(c => `${c.name} (${c.symbol})`).join(', ');
            await sock.sendMessage(msg.key.remoteJid, { text: `🌍 *${c.name.common}*\n\n🏛️ Capitale: ${capital}\n🌐 Région: ${c.region} / ${c.subregion}\n👥 Population: ${c.population?.toLocaleString()}\n🗣️ Langues: ${langs}\n💰 Monnaie: ${currencies}\n📐 Surface: ${c.area?.toLocaleString()} km²\n🔣 Code ISO: ${c.cca2}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Pays "${body}" non trouvé` });
        }
    },

    covid: async ({ sock, msg, body }) => {
        const country = body || 'world';
        try {
            const url = country === 'world' ? 'https://disease.sh/v3/covid-19/all' : `https://disease.sh/v3/covid-19/countries/${encodeURIComponent(country)}`;
            const res = await axios.get(url, { timeout: 10000 });
            const d = res.data;
            await sock.sendMessage(msg.key.remoteJid, { text: `🦠 *COVID-19 - ${d.country || 'Monde'}*\n\n😷 Cas totaux: ${d.cases?.toLocaleString()}\n💀 Décès: ${d.deaths?.toLocaleString()}\n✅ Guérisons: ${d.recovered?.toLocaleString()}\n📊 Actifs: ${d.active?.toLocaleString()}\n📅 Mis à jour: ${new Date(d.updated).toLocaleString('fr-FR')}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Données COVID non disponibles' });
        }
    },

    lyrics: async ({ sock, msg, args }) => {
        if (args.length < 1) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !lyrics <titre> [artiste]' });
        const title = args[0];
        const artist = args[1] || '';
        try {
            const query = artist ? `${title} ${artist}` : title;
            const res = await axios.get(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`, { timeout: 10000 });
            const lyrics = res.data.lyrics?.substring(0, 3000) + (res.data.lyrics?.length > 3000 ? '...' : '');
            await sock.sendMessage(msg.key.remoteJid, { text: `🎵 *${res.data.title}* - ${res.data.author}\n\n${lyrics}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Paroles non trouvées' });
        }
    }
};

const aliases = {
    'actualites': 'news',
    'wikipedia': 'wiki',
    'film': 'movie',
    'crypto2': 'crypto'
};

module.exports = { commands, aliases };
