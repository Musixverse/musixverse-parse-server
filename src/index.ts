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
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import config from './config';
import { parseDashboard } from './parseDashboard';
import { parseServer } from './parseServer';
import { verifySignature, parseUpdate, parseEventData } from './helpers/utils';

export const app = express();

// Whitelist
app.use(cors());

app.use(bodyParser.json({ limit: '1024mb' }));
app.use(bodyParser.urlencoded({ limit: '1024mb', extended: true, parameterLimit: 1000000000000000 }));
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
        console.error('Error:', e);
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

app.post('/upload-json-to-ipfs', async (req, res) => {
    try {
        const { file } = req.body;
        if (file) {
            const data = JSON.stringify({
                pinataOptions: {
                    cidVersion: 1,
                },
                pinataMetadata: {
                    name: req.body.ethAddress,
                    keyvalues: {
                        company: 'Musixverse',
                        version: '1',
                        ethAddress: req.body.ethAddress,
                        fileType: req.body.fileType,
                    },
                },
                pinataContent: req.body.file,
            });

            const options = {
                method: 'post',
                url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.PINATA_JWT_SECRET_ACCESS_TOKEN}`,
                },
                data: data,
            };

            const result = await axios(options).then((response) => response.data);
            return res.status(200).json({ ipfsHash: result.IpfsHash });
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
            const data = new FormData();
            data.append('file', Readable.from(file.buffer), {
                filename: `${req.body.ethAddress}/${req.body.fileType}/${file.originalname}`,
            });
            data.append('pinataOptions', '{"cidVersion": 1}');
            data.append(
                'pinataMetadata',
                `{"name": "${req.body.ethAddress}", "keyvalues": {"company": "Musixverse", "version": "1", "ethAddress": "${req.body.ethAddress}", "filename": "${file.originalname}", "mimetype": "${file.mimetype}", "size": "${file.size}", "encoding": "${file.encoding}", "fileType": "${req.body.fileType}" }}`,
            );

            const options = {
                method: 'POST',
                url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    Authorization: `Bearer ${process.env.PINATA_JWT_SECRET_ACCESS_TOKEN}`,
                    ...data.getHeaders(),
                },
                data: data,
            };

            const result = await axios(options).then((response) => response.data);
            return res.status(200).json({ ipfsHash: result.IpfsHash });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error });
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
