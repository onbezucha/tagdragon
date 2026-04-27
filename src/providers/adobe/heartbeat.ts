import type { Provider } from '../../types/provider';
import { getParams } from '../url-parser';

export const adobeHeartbeat: Provider = {
  name: 'Adobe Heartbeat',
  color: '#FF0000',
  pattern: /\.hb\.omtrdc\.net/,

  parseParams(url: string, postBody: unknown): Record<string, string | undefined> {
    const p = getParams(url, postBody);
    return {
      'Event Type': p['s:event:type'],
      'Stream Name': p['s:sp:nam'],
      Channel: p['s:sp:channel'],
      'Stream ID': p['s:sp:id'],
      Publisher: p['s:sp:pub'],
      'SDK Version': p['s:sp:sdk'],
      'Player Name': p['s:sp:pln'],
      'Video Length': p['s:sp:len'] ? `${p['s:sp:len']}s` : undefined,
      Bitrate: p['s:sp:brt'],
      FPS: p['s:sp:fps'],
    };
  },
} as const;
