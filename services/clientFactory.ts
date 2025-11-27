
import { ServerConfig, ServerType } from '../types';
import { MediaClient } from './MediaClient';
import { EmbyClient } from './EmbyClient';
import { PlexClient } from './PlexClient';

export class ClientFactory {
    static create(config: ServerConfig): MediaClient {
        if (config.serverType === 'plex') {
            return new PlexClient(config);
        }
        return new EmbyClient(config);
    }

    static async authenticate(type: ServerType, url: string, username: string, password: string): Promise<ServerConfig> {
        // Create a dummy config to instantiate the client for auth
        const dummyConfig: ServerConfig = { url, username: '', token: '', userId: '', serverType: type };
        const client = this.create(dummyConfig);
        return client.authenticate(username, password);
    }
}
