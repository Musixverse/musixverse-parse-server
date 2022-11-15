# Musixverse Parse Server

### Deploy on AWS Elastic Container Service

`docker build . -t musixverse-parse-server`

`docker run -p 8080:8080 musixverse-parse-server`


### Deploy on elastic beanstalk AWS instance

Run eb init with flags-
 `eb init --platform node.js --region ap-south-1`

Create the application environment (Deployment)
`eb create elasticbean`

Deploy ENV vars-
`eb create --envvars PORT=1337 , ...`
    or
`eb setenv ...`

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

Run `npm run dev` to start server and `npm run watch` in another terminal to auto generate cloud code on main.ts file save

Run `node moralis/streams/addStreams.ts` to add Moralis Streams for smart contract events


View the Parse Dashboard here-
`http://localhost:8080/parse-dashboard`