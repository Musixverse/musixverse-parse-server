# Musixverse Parse Server

Deploy on elastic beanstalk AWS instance

Run eb init with flags-
 `eb init --platform node.js --region ap-south-1`

Create the application environment (Deployment)
`eb create elasticbean`

Deploy ENV vars
`eb create --envvars MORALIS_API_KEY=6yrxlAsSrpZ0QU9d3uxazV0G44aYq5MqhQJYcc3oGrLXDkyKZ93aYsA7wpzlhA5V , PORT=1337 , MASTER_KEY=qpwo , APPLICATION_ID=001 , SERVER_URL=http://elasticbean.eba-pvz2w3tp.ap-south-1.elasticbeanstalk.com/server , CLOUD_PATH=./build/cloud/main.js , DATABASE_URI=mongodb+srv://musixverse:Mus!xVerse007NFT@cluster0.zdujeeq.mongodb.net/moralis?retryWrites=true&w=majority , REDIS_CONNECTION_URI=redis://musixverse:Mus!xVerse007NFT@redis-15380.c301.ap-south-1-1.ec2.cloud.redislabs.com:15380 , RATE_LIMIT_TTL=30 , RATE_LIMIT_AUTHENTICATED=50 , RATE_LIMIT_ANONYMOUS=20 , APP_NAME=Musixverse , ALLOW_INSECURE_HTTP=true `
`eb setenv`

Deploy your application
`eb deploy`

To open your eb app
`eb open`

More commands
`eb logs`
`eb --help`
`eb setenv [VAR_NAME=VALUE]` note: do not include the square brackets

To terminate the environment and all of the resources that it contains
`eb terminate`


DON'T CREATE A TABLE DIRECTLY IN THE MONGODB DATABSE. TABLES SHOULD ONLY BE CREATED VIA THE PARSE DASHBOARD OR VIA CLOUD CODE.

Run `node moralis/migrateDBTable.ts` to migrate the database table specified in the file

Run `npm start` to start server and `npm run watch` in another terminal to auto generate cloud code on main.ts file save

Run `node moralis/streams/addStreams.ts` to add Moralis Streams for smart contract events