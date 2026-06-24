import { mockApi } from './mockApi';
import { realApi } from './realApi';

export const usingRealApi = import.meta.env.VITE_USE_REAL_API === 'true';
export const appApi = usingRealApi ? realApi : mockApi;
