import { BrowserTTSCoachClient } from './BrowserTTSCoachClient'

export class MockRealtimeCoachClient extends BrowserTTSCoachClient {
  speak = async (_message: string) => {}
}
