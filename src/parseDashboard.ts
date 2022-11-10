// @ts-ignore
import ParseDashboard from 'parse-dashboard';
import config from './config';

export const parseDashboard = new ParseDashboard(
    {
        apps: [
            {
                appId: config.APPLICATION_ID,
                masterKey: config.MASTER_KEY,
                readOnlyMasterKey: config.MASTER_KEY,
                serverURL: config.SERVER_URL,
                appName: config.APP_NAME,
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
    config.ALLOW_INSECURE_HTTP,
);
