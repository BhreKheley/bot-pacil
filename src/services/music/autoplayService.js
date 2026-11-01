// Autoplay: saat antrean habis, cari lagu relevan dari lagu terakhir lalu putar.

import { logger } from '../../utils/logger.js';
import { getGuildMusicData } from './playerStore.js';
import {
    buildSearchQueries, isYoutubeSource, pickRecommendation, pushHistory, youtubeMixUrl,
} from './autoplayLogic.js';

const isListType = (loadType) =>
    ['search', 'playlist', 'SEARCH_RESULT', 'PLAYLIST_LOADED'].includes(loadType);

async function safeResolve(client, query, requester) {
    try {
        const result = await client.riffy.resolve({ query, requester });
        return isListType(result?.loadType) || ['track', 'TRACK_LOADED'].includes(result?.loadType)
            ? (result.tracks ?? [])
            : [];
    } catch (error) {
        logger.debug(`Autoplay resolve gagal untuk "${query}": ${error?.message || error}`);
        return [];
    }
}

/** Catat lagu yang mulai diputar sebagai benih dan riwayat autoplay. */
export function recordTrackForAutoplay(guildId, track) {
    const guildData = getGuildMusicData(guildId);
    guildData.lastTrack = track;
    guildData.autoplayHistory = pushHistory(guildData.autoplayHistory, track);
}

/**
 * Cari dan putar rekomendasi. Mengembalikan track yang dipilih, atau null bila tidak ada.
 * Urutan sumber: YouTube Mix (bila lagu asal dari YouTube) lalu pencarian artis/judul.
 */
export async function playAutoplayRecommendation(client, player) {
    const guildData = getGuildMusicData(player.guildId);
    const seed = guildData.lastTrack || player.previous || player.current;
    if (!seed) return null;

    const requester = client.user;
    const history = guildData.autoplayHistory ?? [];
    const queued = [...(player.queue ?? [])];

    let pick = null;
    if (isYoutubeSource(seed)) {
        pick = pickRecommendation(await safeResolve(client, youtubeMixUrl(seed.info.identifier), requester), seed, history, queued);
    }
    if (!pick) {
        for (const query of buildSearchQueries(seed)) {
            pick = pickRecommendation(await safeResolve(client, query, requester), seed, history, queued);
            if (pick) break;
        }
    }
    if (!pick) return null;

    pick.info.requester = client.user;
    pick.info.autoplay = true;
    player.queue.add(pick);
    await player.play();
    return pick;
}
