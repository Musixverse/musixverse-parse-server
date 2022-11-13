/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable etc/no-commented-out-code */
import Moralis from 'moralis';
import express from 'express';
import cors from 'cors';
import config from './config';
import { parseDashboard } from './parseDashboard';
import { parseServer } from './parseServer';
// @ts-ignore
import ParseServer from 'parse-server';
import http from 'http';
import bodyParser from 'body-parser';
import { verifySignature, parseUpdate, parseEventData } from './helpers/utils';

export const app = express();

Moralis.start({
    apiKey: config.MORALIS_API_KEY,
});

app.use(express.urlencoded({ limit: '200mb', extended: true, parameterLimit: 1000000 }));
app.use(bodyParser.json({ limit: '200mb' }));

// Whitelist
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.status(200).send(
        '<html><head><title>Musixverse Parse Server</title></head><body style="font-family: Poppins !important; background-color: black; padding: 0; margin:0;">' +
            '<div style="display: flex; flex:1; height: 100% ; justify-content: center; align-items: center; min-height: 100vh !important; font-size: 28px !important; color: #5AB510 !important;">' +
            'Musixverse Parse Server is running...</div></body></html>',
    );
});
app.get('/favicon.ico', (req, res) => {
    res.status(200).sendFile(`/public/favicon.ico?v=${Math.trunc(Math.random() * 999)}`);
});

const save_stream_data = async (req: any, res: any) => {
    try {
        verifySignature(req, config.MORALIS_API_KEY);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { eventName, data }: any = parseEventData(req);
        if (eventName && data) {
            await parseUpdate(`${eventName}`, data);
        }
        return res.status(200).end();
    } catch (e) {
        console.log('Error:', e);
    }
    return res.status(502).end();
};

app.post('/moralis-streams/token-created', async (req, res) => {
    return save_stream_data(req, res);
});
app.post('/moralis-streams/track-minted', async (req, res) => {
    return save_stream_data(req, res);
});
app.post('/moralis-streams/token-purchased', async (req, res) => {
    return save_stream_data(req, res);
});
app.post('/moralis-streams/token-onsale-updated', async (req, res) => {
    return save_stream_data(req, res);
});
app.post('/moralis-streams/token-price-updated', async (req, res) => {
    return save_stream_data(req, res);
});
app.post('/moralis-streams/token-comment-updated', async (req, res) => {
    return save_stream_data(req, res);
});

app.use(`/parse`, parseServer.app);
app.use('/parse-dashboard', parseDashboard);

const httpServer = http.createServer(app);
httpServer.listen(config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Moralis Server is running on port ${config.PORT}.`);
});
// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
