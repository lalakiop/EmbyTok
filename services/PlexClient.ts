
import { MediaClient } from './MediaClient';
import { EmbyItem, EmbyLibrary, FeedType, ServerConfig, VideoResponse } from '../types';

export class PlexClient extends MediaClient {
    
    private getCleanUrl() {
        return this.config.url.replace(/\/$/, "");
    }

    private getHeaders() {
        return {
            'Accept': 'application/json',
            'X-Plex-Token': this.config.token
        };
    }

    async authenticate(username: string, password: string): Promise<ServerConfig> {
        // NOTE: Plex auth usually requires hitting plex.tv. 
        // For this local client, we will try to use the 'password' field as the Token if 'username' is empty,
        // OR try to sign in via the server's local auth endpoint if available.
        // Simplifying for MVP: We assume the user enters the Plex Token in the password field if using direct connection.
        
        // However, let's try a basic check.
        const token = password; // Assuming password is token for manual direct connection
        
        const response = await fetch(`${this.getCleanUrl()}/identity`, {
            headers: { 'Accept': 'application/json', 'X-Plex-Token': token }
        });

        if (!response.ok) {
            throw new Error('Plex Connection Failed. Please ensure you are using a valid X-Plex-Token as the password.');
        }

        const data = await response.json();
        
        return {
            url: this.config.url,
            username: username || 'Plex User',
            userId: '1', // Plex local admin is usually 1, or we parse from /accounts
            token: token,
            serverType: 'plex'
        };
    }

    async getLibraries(): Promise<EmbyLibrary[]> {
        const response = await fetch(`${this.getCleanUrl()}/library/sections`, { headers: this.getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch Plex libraries');
        const data = await response.json();
        
        // Map Plex Sections to EmbyLibrary
        return data.MediaContainer.Directory.map((d: any) => ({
            Id: d.key,
            Name: d.title,
            CollectionType: d.type
        }));
    }

    async getVerticalVideos(parentId: string | undefined, libraryName: string, feedType: FeedType, skip: number, limit: number): Promise<VideoResponse> {
        if (!parentId) {
            // If no library selected, we can't really query "all" easily in Plex without iterating sections.
            // Return empty for safety.
            return { items: [], nextStartIndex: 0, totalCount: 0 };
        }

        // Plex Pagination
        const start = skip;
        const size = 50; // Batch size
        
        let sort = 'addedAt:desc';
        if (feedType === 'random') sort = 'random';
        
        // Construct URL: /library/sections/{id}/all?type=1 (Movie) ...
        const params = new URLSearchParams({
            type: '1', // 1=Movie, 8=Episode? Simplified to Movie/Video type 1 for now
            sort: sort,
            'X-Plex-Container-Start': start.toString(),
            'X-Plex-Container-Size': size.toString()
        });

        const response = await fetch(`${this.getCleanUrl()}/library/sections/${parentId}/all?${params.toString()}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error('Failed to fetch Plex videos');
        const data = await response.json();
        const items = data.MediaContainer.Metadata || [];
        const totalSize = data.MediaContainer.totalSize || 0;

        // Map Plex Item to EmbyItem
        const mappedItems: EmbyItem[] = items.map((p: any) => {
             const media = p.Media?.[0];
             return {
                 Id: p.ratingKey,
                 Name: p.title,
                 Type: p.type,
                 MediaType: 'Video',
                 Overview: p.summary,
                 ProductionYear: p.year,
                 Width: media?.width,
                 Height: media?.height,
                 RunTimeTicks: p.duration ? p.duration * 10000 : undefined, // Plex ms -> Emby Ticks (10000)
                 ImageTags: {
                     Primary: p.thumb ? 'true' : undefined // We use the existence as a flag, URL logic handles the rest
                 },
                 // Store raw path for URL generation if needed
                 _PlexThumb: p.thumb,
                 _PlexKey: media?.Part?.[0]?.key
             };
        });

        // Filter Vertical
        const filtered = mappedItems.filter(item => {
            const w = item.Width || 0;
            const h = item.Height || 0;
            return h >= w * 0.8 && w > 0;
        });

        return {
            items: filtered,
            nextStartIndex: start + items.length, // Plex cursor moves by count fetched
            totalCount: totalSize
        };
    }

    getVideoUrl(itemId: string): string {
        // Using Transcode universal endpoint for compatibility
        // But for simplicity, we can try Direct Play via the part key if we had it, or the universal generic.
        // Let's use the generic "video/:/transcode/universal/start" logic
        return `${this.getCleanUrl()}/video/:/transcode/universal/start?path=${encodeURIComponent('/library/metadata/' + itemId)}&mediaIndex=0&partIndex=0&protocol=hls&offset=0&fastSeek=1&directPlay=0&directStream=1&subtitleSize=100&audioBoost=100&X-Plex-Token=${this.config.token}`;
    }

    getImageUrl(itemId: string, tag?: string, type?: 'Primary' | 'Backdrop'): string {
        // Plex Image Transcoder
        // We need to fetch the item metadata to get the actual thumb path usually, 
        // but let's assume standard structure: /library/metadata/{id}/thumb/{timestamp}
        // Or cleaner: /photo/:/transcode?url=...
        const cleanUrl = this.getCleanUrl();
        const urlParam = `/library/metadata/${itemId}/thumb`; // Approximate
        return `${cleanUrl}/photo/:/transcode?url=${encodeURIComponent(urlParam)}&width=800&height=1200&X-Plex-Token=${this.config.token}`;
    }

    async getFavorites(libraryName: string): Promise<Set<string>> {
        // Not implemented for Plex in this version
        return new Set();
    }

    async toggleFavorite(itemId: string, isFavorite: boolean, libraryName: string): Promise<void> {
        // Not implemented for Plex in this version
        console.warn("Favorites not yet supported for Plex");
    }
}
