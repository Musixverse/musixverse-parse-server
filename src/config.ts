import * as dotenv from 'dotenv';
import { cleanEnv, num, str, bool } from 'envalid';

dotenv.config();

export default cleanEnv(process.env, {
    PORT: num({
        desc: 'Default port wher parse-server will run on',
        default: 8080,
    }),
    NODE_ENV: str({
        desc: 'Node environment',
        default: 'development',
    }),

    APPLICATION_ID: str({
        desc: 'An id for your app, can be anything you want',
        default: 'APPLICATION_ID',
    }),
    SERVER_URL: str({
        desc: 'Referenece to your server URL. Replace this when your app is hosted',
        devDefault: 'http://localhost:8080/parse',
    }),
    MASTER_KEY: str({
        desc: 'A secret key of your choice (keep this secret)',
    }),
    READ_ONLY_MASTER_KEY: str({
        desc: 'A secret key of your choice (keep this secret)',
    }),
    CLOUD_PATH: str({
        desc: 'Path to your cloud code',
        default: './build/cloud/main.js',
    }),
    APP_NAME: str({
        desc: 'App name',
        default: 'Musixverse',
        devDefault: 'Musixverse Dev',
    }),
    ALLOW_INSECURE_HTTP: bool({ default: true }),

    MORALIS_API_KEY: str({
        desc: 'Moralis API Key, that can be found in the Moralis Dashboard (keep this secret)',
    }),
    DATABASE_URI: str({
        desc: 'URI to your MongoDB database',
        devDefault: 'mongodb://localhost:27017',
    }),
    REDIS_CONNECTION_URI: str({
        desc: 'Connection string for your redis instance in the format of redis://<host>:<port> or redis://<username>:<password>@<host>:<port>',
        devDefault: 'redis://127.0.0.1:6379',
    }),
    RATE_LIMIT_TTL: num({
        desc: 'Rate limit window in seconds',
        default: 30,
    }),
    RATE_LIMIT_AUTHENTICATED: num({
        desc: 'Rate limit requests per window for authenticated users',
        default: 50,
    }),
    RATE_LIMIT_ANONYMOUS: num({
        desc: 'Rate limit requests per window for anonymous users',
        default: 20,
    }),

    SENDGRID_API_KEY: str({
        desc: 'Sendgrid API key',
    }),
    SENDGRID_VERIFICATION_EMAIL_TEMPLATE_ID: str({
        desc: 'Sendgrid verification email template id',
    }),

    MUSIXVERSE_CLIENT_BASE_URL: str({
        desc: 'Musixverse client base url',
        default: 'http://localhost:3000',
    }),

    ADMIN_ACCESS_EMAIL: str({
        desc: 'Admin access email',
        default: 'admin@musixverse.com',
    }),
    ADMIN_ACCESS_PASSWORD: str({
        desc: 'Admin access password',
        default: 'admin8mxv8read',
    }),
});
