/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable etc/no-commented-out-code */
const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

const dbName = 'parse';
// const collectionName = "_User";
// const collectionName = "Band";
// const collectionName = "ArtistVerification";
// const collectionName = "BandFollowers";
// const collectionName = "BandReports";
// const collectionName = "Favourites";
// const collectionName = "Followers";
// const collectionName = "InvitedArtworkArtist";
// const collectionName = "InvitedUsers";
// const collectionName = "NFTDrafts";
// const collectionName = "NFTReports";
// const collectionName = "TokenCommentUpdated";
// const collectionName = "TokenCreated";
const collectionName = 'TokenOnSaleUpdated';
// const collectionName = "TokenPriceUpdated";
// const collectionName = "TokenPurchased";
// const collectionName = "TrackMinted";
// const collectionName = "UserInfo";
// const collectionName = 'TransferSingle';
// const collectionName = 'UserPreferences';

const newDBName = 'musixverse';

const client = new MongoClient(`mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`, {
    useUnifiedTopology: true,
});
const newClient = new MongoClient(process.env.DATABASE_URI, { useUnifiedTopology: true });

client.connect(() => {
    console.log('Connected successfully to database');
    const db = client.db(dbName);

    getDocuments(db, (docs) => {
        console.log('Documents loaded.');
        console.log('Closing connection.');
        client.close();

        // Write to file
        try {
            console.log('Writing to file...');
            fs.writeFileSync('out_file.json', JSON.stringify(docs));
            console.log('Done writing to file.');
        } catch (err) {
            console.log('Error writing to file', err);
        }
    });
});

const getDocuments = function (db, callback) {
    const query = {};
    db.collection(collectionName)
        .find(query)
        .toArray((err, result) => {
            if (err) {
                throw err;
            }
            callback(result);
        });
};

newClient.connect(() => {
    console.log('Connected successfully to new database');
    const db = newClient.db(newDBName);

    const data = fs.readFileSync('out_file.json');
    console.log('Documents loaded.');

    const docs = JSON.parse(data.toString());
    console.log('Inserting into new database...');

    db.collection(collectionName).insertMany(docs, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Inserted docs:', result.insertedCount);
        newClient.close();
        console.log('Connection closed.');
    });
});
