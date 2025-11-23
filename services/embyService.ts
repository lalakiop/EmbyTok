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
    // We use a general item search because specifically searching playlists by name can be tricky across versions
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
    
    // To delete from a playlist, we often need the EntryId (PlaylistItemId), not just the ItemId.
    // Fetch playlist items to find the mapping.
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

export const getVerticalVideos = async (
  serverUrl: string, 
  userId: string, 
  token: string, 
  parentId: string | undefined,
  libraryName: string, // Needed for Favorites playlist resolution
  feedType: FeedType = 'latest'
): Promise<EmbyItem[]> => {
  
  // If requesting Favorites, we fetch from the Tok Playlist instead of standard query
  if (feedType === 'favorites') {
      const playlistItems = await getTokPlaylistItems(serverUrl, userId, token, libraryName);
      // Filter verticals from the playlist
      return playlistItems.filter(item => {
        const w = item.Width || 0;
        const h = item.Height || 0;
        return h >= w * 0.8 && w > 0; 
      }).reverse(); // Show newest additions first (usually at end of playlist)
  }

  const cleanUrl = serverUrl.replace(/\/$/, "");
  
  const params = new URLSearchParams({
    IncludeItemTypes: 'Movie,Video,Episode',
    Recursive: 'true',
    Fields: 'MediaSources,Width,Height,Overview,UserData', 
    Limit: '100', 
    ImageTypeLimit: '1',
    EnableImageTypes: 'Primary,Backdrop,Banner,Thumb',
    _t: Date.now().toString()
  });

  if (feedType === 'random') {
    params.append('SortBy', 'Random');
  } else {
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
  const items: EmbyItem[] = data.Items || [];

  return items.filter(item => {
    const w = item.Width || 0;
    const h = item.Height || 0;
    return h >= w * 0.8 && w > 0; 
  });
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