import Moralis from 'moralis';
import express from 'express';
import cors from 'cors';
import config from './src/config';
import { parseDashboard } from './src/parseDashboard';
import { parseServer } from './src/parseServer';
// @ts-ignore
import ParseServer from 'parse-server';
import http from 'http';
import { streamsSync } from '@moralisweb3/parse-server';

export const app = express();

Moralis.start({
  apiKey: config.MORALIS_API_KEY,
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Whitelis
app.use(cors());

app.use(
  streamsSync(parseServer, {
    apiKey: config.MORALIS_API_KEY,
    webhookUrl: '/streams',
  }),
);

app.use(`/server`, parseServer.app);
app.use('/dashboard', parseDashboard);

const httpServer = http.createServer(app);
httpServer.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Moralis Server is running on port ${config.PORT}.`);
});
// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
