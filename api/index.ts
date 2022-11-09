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

app.get('/', (req, res) => {
  res.send(
    '<html><head><title>Musixverse Parse Server</title></head><body style="font-family: Poppins !important; background-color: black; padding: 0; margin:0;">' +
      '<div style="display: flex; flex:1; height: 100% ; justify-content: center; align-items: center; min-height: 100vh !important; font-size: 28px !important; color: #5AB510 !important;">' +
      'Musixverse Parse Server is running...</div></body></html>',
  );
});

const httpServer = http.createServer(app);
httpServer.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Moralis Server is running on port ${config.PORT}.`);
});
// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);