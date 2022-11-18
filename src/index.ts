/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable etc/no-commented-out-code */
import Moralis from 'moralis';
import express from 'express';
import cors from 'cors';
// @ts-ignore
import ParseServer from 'parse-server';
import http from 'http';
import bodyParser from 'body-parser';
import multer from 'multer';
import config from './config';
import { parseDashboard } from './parseDashboard';
import { parseServer } from './parseServer';
import { verifySignature, parseUpdate, parseEventData } from './helpers/utils';
import axios from 'axios';

export const app = express();

// Whitelist
app.use(cors());

app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true, parameterLimit: 1000000000000000 }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.status(200).send(
        `<html><head><title>Musixverse Parse Server</title></head><body style="font-family: Poppins !important; background-color: black; padding: 0; margin:0;">` +
            `<div style="display: flex; flex:1; height: 100% ; justify-content: center; align-items: center; min-height: 100vh !important; font-size: 28px !important; color: #5AB510 !important;">` +
            `Musixverse ${config.NODE_ENV} Parse Server is running...</div></body></html>`,
    );
});
app.get('/favicon.ico', (req, res) => {
    res.status(200).sendFile(`/public/favicon.ico?v=${Math.trunc(Math.random() * 999)}`);
});

Moralis.start({
    apiKey: config.MORALIS_API_KEY,
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

app.post('/upload-base64-to-ipfs', async (req, res) => {
    try {
        if (req.body.file) {
            const options = {
                method: 'POST',
                url: 'https://deep-index.moralis.io/api/v2/ipfs/uploadFolder',
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'X-API-Key': config.MORALIS_API_KEY,
                },
                data: [
                    {
                        path: `${req.body.ethAddress}/${req.body.fileType}`,
                        content: req.body.file,
                    },
                ],
            };

            const result = await axios.request(options).then((response) => response.data);
            return res.status(200).json({ ipfsUrl: result[0].path });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No file found' });
    }
    return res.status(500).json({ error: 'No file found' });
});

const upload = multer();
app.post('/upload-file-to-ipfs', upload.single('file'), async (req, res) => {
    try {
        const { file } = req;
        if (file) {
            const base64Encoded = file.buffer.toString('base64');
            const options = {
                method: 'POST',
                url: 'https://deep-index.moralis.io/api/v2/ipfs/uploadFolder',
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'X-API-Key': config.MORALIS_API_KEY,
                },
                data: [
                    {
                        path: `${req.body.ethAddress}/${req.body.fileType}.${file.mimetype.split('/').reverse()[0]}`,
                        content: base64Encoded,
                    },
                ],
            };

            const result = await axios.request(options).then((response) => response.data);
            return res.status(200).json({ ipfsUrl: result[0].path });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'No file found' });
    }
    return res.status(500).json({ error: 'No file found' });
});

const httpServer = http.createServer(app);
httpServer.listen(config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Moralis Server is running on port ${config.PORT}.`);
});
// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
