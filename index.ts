import express from 'express';
import cors from 'cors';
import http from 'http';

export const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Whitelis
app.use(cors());

app.get('/', (req, res) => {
  res.send(
    '<html><head><title>Musixverse Parse Server</title></head><body style="font-family: Poppins !important; background-color: black; padding: 0; margin:0;">' +
      '<div style="display: flex; flex:1; height: 100% ; justify-content: center; align-items: center; min-height: 100vh !important; font-size: 28px !important; color: #5AB510 !important;">' +
      'Musixverse Parse Server is running...</div></body></html>',
  );
});

const PORT = process.env.PORT || 1337;

const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Moralis Server is running on port ${PORT}.`);
});
