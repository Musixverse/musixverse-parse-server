// @ts-ignore
import ParseDashboard from 'parse-dashboard';
import config from './config';

export const parseDashboard = new ParseDashboard(
    {
        apps: [
            {
                appId: config.APPLICATION_ID,
                appName: config.APP_NAME,
                masterKey: config.MASTER_KEY,
                readOnlyMasterKey: config.READ_ONLY_MASTER_KEY,
                serverURL: config.SERVER_URL,
            },
        ],
        users: [
            {
                user: 'admin@musixverse.com',
                pass: 'admin',
                readOnly: true,
            },
        ],
        useEncryptedPasswords: false,
        trustProxy: 1,
    },
    { allowInsecureHTTP: config.ALLOW_INSECURE_HTTP },
);
