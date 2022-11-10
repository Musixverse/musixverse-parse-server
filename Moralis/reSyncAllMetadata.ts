// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Moralis = require('moralis/node');

const reSyncAllMetadata = async () => {
    const MORALIS_SERVER_URL =
        process.env.NODE_ENV === 'development' ? process.env.DEV_MORALIS_SERVER_URL : process.env.MORALIS_SERVER_URL;
    const MORALIS_APP_ID =
        process.env.NODE_ENV === 'development' ? process.env.DEV_MORALIS_APP_ID : process.env.MORALIS_APP_ID;
    const MORALIS_MASTER_KEY =
        process.env.NODE_ENV === 'development' ? process.env.DEV_MORALIS_MASTER_KEY : process.env.MORALIS_MASTER_KEY;

    await Moralis.start({ serverUrl: MORALIS_SERVER_URL, appId: MORALIS_APP_ID, masterKey: MORALIS_MASTER_KEY });
    console.log('Connection established with Moralis server.\n\n');

    console.log('reSyncing metadata for all tokens...\n');
    await Moralis.Cloud.run('reSyncAllMetadata', { useMasterKey: true });

    const tokenId = 5;
    console.log(`reSyncing metadata for token ${tokenId} ...\n`);
    await Moralis.Cloud.run('reSyncMetadataForToken', { tokenId: tokenId }, { useMasterKey: true });
};

reSyncAllMetadata();
export {};
