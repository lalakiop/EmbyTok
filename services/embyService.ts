import { EmbyAuthResponse, EmbyItem, EmbyLibrary, FeedType } from '../types';

const CLIENT_NAME = "EmbyTok Web";
const CLIENT_VERSION = "1.0.0";
const DEVICE_NAME = "Web Browser";
const DEVICE_ID = "embytok-web-client-id-" + Math.random().toString(36).substring(7);

const getHeaders = (token?: string) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Emby-Authorization': `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${DEVICE_ID}", Version="${CLIENT_VERSION}"${token ? `, Token="${token}"` : ''}`,
  };
  return headers;
};

export const authenticate = async (serverUrl: string, username: string, password: string): Promise<EmbyAuthResponse> => {
  const cleanUrl = serverUrl.replace(/\/$/, "");
  const response = await fetch(`${cleanUrl}/Users/AuthenticateByName`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      Username: username,
      Pw: password,
    }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  return response.json();
};

export const getLibraries = async (serverUrl: string, userId: string, token: string): Promise<EmbyLibrary[]> => {
  const cleanUrl = serverUrl.replace(/\/$/, "");
  const response = await fetch(`${cleanUrl}/Users/${userId}/Views`, {
    headers: getHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch libraries');
  }

  const data = await response.json();
  return data.Items || [];
};

// --- Playlist Logic for "Tok" Favorites ---

const getTokPlaylistId = async (serverUrl: string, userId: string, token: string, libraryName: string): Promise<string> => {
    const cleanUrl = serverUrl.replace(/\/$/, "");
    const playlistName = `Tok-${libraryName}`;
    const headers = getHeaders(token);

    // 1. Find existing playlist
    const searchRes = await fetch(
        `${cleanUrl}/Users/${userId}/Items?IncludeItemTypes=Playlist&Recursive=true&Fields=Id,Name`, 
        { headers }
    );
    
    if (searchRes.ok) {
        const searchData = await searchRes.json();
        const existing = searchData.Items?.find((i: any) => i.Name === playlistName);
        if (existing) return existing.Id;
    }

    // 2. Create if not found
    const createRes = await fetch(`${cleanUrl}/Playlists?Name=${playlistName}&UserId=${userId}`, {
        method: 'POST',
        headers
    });
    
    if (!createRes.ok) {
        throw new Error("Failed to create Tok playlist");
    }

    const createData = await createRes.json();
    return createData.Id;
};

export const getTokPlaylistItems = async (serverUrl: string, userId: string, token: string, libraryName: string): Promise<EmbyItem[]> => {
    try {
        const pid = await getTokPlaylistId(serverUrl, userId, token, libraryName);
        const cleanUrl = serverUrl.replace(/\/$/, "");
        // Fetch items in the playlist
        const response = await fetch(`${cleanUrl}/Playlists/${pid}/Items?UserId=${userId}&Fields=MediaSources,Width,Height,Overview,UserData`, {
            headers: getHeaders(token)
        });
        
        if (!response.ok) return [];
        const data = await response.json();
        return data.Items || [];
    } catch (e) {
        console.error("Error fetching playlist items", e);
        return [];
    }
};

export const addToTokPlaylist = async (serverUrl: string, userId: string, token: string, libraryName: string, itemId: string) => {
    const pid = await getTokPlaylistId(serverUrl, userId, token, libraryName);
    const cleanUrl = serverUrl.replace(/\/$/, "");
    await fetch(`${cleanUrl}/Playlists/${pid}/Items?Ids=${itemId}&UserId=${userId}`, {
        method: 'POST',
        headers: getHeaders(token)
    });
};

export const removeFromTokPlaylist = async (serverUrl: string, userId: string, token: string, libraryName: string, itemId: string) => {
    const pid = await getTokPlaylistId(serverUrl, userId, token, libraryName);
    const cleanUrl = serverUrl.replace(/\/$/, "");
    
    const itemsRes = await fetch(`${cleanUrl}/Playlists/${pid}/Items?Fields=Id,PlaylistItemId&UserId=${userId}`, { headers: getHeaders(token) });
    if (!itemsRes.ok) return;
    
    const itemsData = await itemsRes.json();
    const entry = itemsData.Items.find((i: any) => i.Id === itemId);

    if (entry && entry.PlaylistItemId) {
         await fetch(`${cleanUrl}/Playlists/${pid}/Items?EntryIds=${entry.PlaylistItemId}`, {
            method: 'DELETE',
            headers: getHeaders(token)
        });
    }
};

// --- Main Feed Logic ---

export interface VideoResponse {
    items: EmbyItem[];
    nextStartIndex: number;
    totalCount: number;
}

export const getVerticalVideos = async (
  serverUrl: string, 
  userId: string, 
  token: string, 
  parentId: string | undefined,
  libraryName: string,
  feedType: FeedType = 'latest',
  skip: number = 0,
  limit: number = 20
): Promise<VideoResponse> => {
  
  // If requesting Favorites, we fetch from the Tok Playlist
  if (feedType === 'favorites') {
      const playlistItems = await getTokPlaylistItems(serverUrl, userId, token, libraryName);
      
      // Filter for vertical
      const filtered = playlistItems.filter(item => {
        const w = item.Width || 0;
        const h = item.Height || 0;
        return h >= w * 0.8 && w > 0; 
      });

      // Default playlist order is usually append-order.
      // Reversing gives us "newest added to playlist" first.
      const reversed = filtered.reverse();
      
      const paged = reversed.slice(skip, skip + limit);
      return {
          items: paged,
          nextStartIndex: skip + limit,
          totalCount: reversed.length
      };
  }

  const cleanUrl = serverUrl.replace(/\/$/, "");
  
  // We fetch a larger batch than the requested 'limit' because we filter out horizontal videos.
  // This ensures we hopefully get enough vertical videos to fill the UI request.
  const FETCH_BATCH_SIZE = 50; 

  const params = new URLSearchParams({
    IncludeItemTypes: 'Movie,Video,Episode',
    Recursive: 'true',
    Fields: 'MediaSources,Width,Height,Overview,UserData', 
    Limit: FETCH_BATCH_SIZE.toString(),
    StartIndex: skip.toString(),
    ImageTypeLimit: '1',
    EnableImageTypes: 'Primary,Backdrop,Banner,Thumb',
    _t: Date.now().toString()
  });

  if (feedType === 'random') {
    params.append('SortBy', 'Random');
  } else {
    // Force strict sorting for Latest
    params.append('SortBy', 'DateCreated');
    params.append('SortOrder', 'Descending');
  }

  if (parentId) {
    params.append('ParentId', parentId);
  }

  const response = await fetch(`${cleanUrl}/Users/${userId}/Items?${params.toString()}`, {
    headers: getHeaders(token),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch videos');
  }

  const data = await response.json();
  const rawItems: EmbyItem[] = data.Items || [];
  const totalCount = data.TotalRecordCount || 0;

  const filteredItems = rawItems.filter(item => {
    const w = item.Width || 0;
    const h = item.Height || 0;
    return h >= w * 0.8 && w > 0; 
  });

  return {
      items: filteredItems,
      // The cursor for the next call should be: current Skip + how many items we actually fetched from server (not how many remain after filter)
      nextStartIndex: skip + rawItems.length,
      totalCount: totalCount
  };
};

export const getVideoUrl = (serverUrl: string, itemId: string, token: string): string => {
  const cleanUrl = serverUrl.replace(/\/$/, "");
  return `${cleanUrl}/Videos/${itemId}/stream.mp4?Static=true&api_key=${token}`;
};

export const getImageUrl = (serverUrl: string, itemId: string, tag: string | undefined, type: 'Primary' | 'Backdrop' = 'Primary'): string => {
    if (!tag) return '';
    const cleanUrl = serverUrl.replace(/\/$/, "");
    return `${cleanUrl}/Items/${itemId}/Images/${type}?maxWidth=800&tag=${tag}&quality=90`;
};