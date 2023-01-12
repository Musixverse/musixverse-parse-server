// @ts-ignore
import ParseServer from 'parse-server';
// @ts-ignore
import sendGridAdapter from 'parse-server-sendgrid-email-adapter';
import config from './config';
import MoralisEthAdapter from './auth/MoralisEthAdapter';

export const parseServer = new ParseServer({
    appName: config.APP_NAME,
    publicServerURL: config.SERVER_URL,
    cloud: config.CLOUD_PATH,
    appId: config.APPLICATION_ID,
    serverURL: config.SERVER_URL,
    masterKey: config.MASTER_KEY,
    readOnlyMasterKey: config.READ_ONLY_MASTER_KEY,
    databaseURI: config.DATABASE_URI,
    maxUploadSize: '1024mb',
    auth: {
        moralisEth: {
            module: MoralisEthAdapter,
        },
    },
    verifyUserEmails: true,
    emailAdapter: sendGridAdapter({
        apiKey: config.SENDGRID_API_KEY,
        from: 'Musixverse <no-reply@musixverse.com>',
        verificationEmailTemplate: config.SENDGRID_VERIFICATION_EMAIL_TEMPLATE_ID,
        passwordResetEmailTemplate: config.SENDGRID_VERIFICATION_EMAIL_TEMPLATE_ID,
    }),
    customPages: {
        verifyEmailSuccess: `${config.MUSIXVERSE_CLIENT_BASE_URL}/profile/verify-email-success`,
    },
});
