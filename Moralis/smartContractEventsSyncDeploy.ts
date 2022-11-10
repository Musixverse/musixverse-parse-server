// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Moralis = require('moralis/node');

const watchContractEvents = async () => {
    const MORALIS_SERVER_URL =
        process.env.NODE_ENV === 'development' ? process.env.DEV_MORALIS_SERVER_URL : process.env.MORALIS_SERVER_URL;
    const MORALIS_APP_ID =
        process.env.NODE_ENV === 'development' ? process.env.DEV_MORALIS_APP_ID : process.env.MORALIS_APP_ID;
    const MORALIS_MASTER_KEY =
        process.env.NODE_ENV === 'development' ? process.env.DEV_MORALIS_MASTER_KEY : process.env.MORALIS_MASTER_KEY;

    await Moralis.start({ serverUrl: MORALIS_SERVER_URL, appId: MORALIS_APP_ID, masterKey: MORALIS_MASTER_KEY });
    console.log('Connection established with Moralis server.\n\n');

    console.log('Running syncTokenCreated...\n');
    await Moralis.Cloud.run('syncTokenCreated', { useMasterKey: true });

    console.log('Running syncTrackMinted...\n');
    await Moralis.Cloud.run('syncTrackMinted', { useMasterKey: true });

    console.log('Running syncTokenPurchased...\n');
    await Moralis.Cloud.run('syncTokenPurchased', { useMasterKey: true });

    console.log('Running syncTokenPriceUpdated...\n');
    await Moralis.Cloud.run('syncTokenPriceUpdated', { useMasterKey: true });

    console.log('Running syncTokenOnSaleUpdated...\n');
    await Moralis.Cloud.run('syncTokenOnSaleUpdated', { useMasterKey: true });

    console.log('Running syncTransferSingle...\n');
    await Moralis.Cloud.run('syncTransferSingle', { useMasterKey: true });

    console.log('Running syncTokenCommentUpdated...\n');
    await Moralis.Cloud.run('syncTokenCommentUpdated', { useMasterKey: true });
};

watchContractEvents();

export {};
