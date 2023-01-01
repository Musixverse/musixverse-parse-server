# Musixverse Parse Server

## Deploy on AWS Elastic Container Service

`docker build . -t musixverse-parse-server`

`docker run -p 8080:8080 musixverse-parse-server`


DON'T CREATE A TABLE DIRECTLY IN THE MONGODB DATABSE. TABLES SHOULD ONLY BE CREATED VIA THE PARSE DASHBOARD OR VIA CLOUD CODE.

Run `node moralis/migrateDBTable.ts` to migrate the database table specified in the file

Run `npm run dev` to start server and `npm run watch` in another terminal to auto generate cloud code on main.ts file save

Run `node moralis/streams/addStreams.ts` to add Moralis Streams for smart contract events


View the Parse Dashboard here-
`http://localhost:8080/parse-dashboard`