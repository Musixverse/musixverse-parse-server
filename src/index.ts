import Moralis from 'moralis';
import express from 'express';
import cors from 'cors';
import config from './config';
import { parseDashboard } from './parseDashboard';
import { parseServer } from './parseServer';
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

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3000/', 'http://localhost:3001', 'http://localhost:3001/'],
  }),
);

app.use(
  streamsSync(parseServer, {
    apiKey: config.MORALIS_API_KEY,
    webhookUrl: '/streams',
  }),
);

app.use(`/server`, parseServer);
app.use('/dashboard', parseDashboard);

const httpServer = http.createServer(app);
httpServer.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Moralis Server is running on port ${config.PORT}.`);
});
// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
