// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Moralis = require('moralis/node');

const unwatchContractEvents = async () => {
    const MORALIS_SERVER_URL =
        process.env.NODE_ENV === 'development' ? process.env.DEV_MORALIS_SERVER_URL : process.env.MORALIS_SERVER_URL;
    const MORALIS_APP_ID =
        process.env.NODE_ENV === 'development' ? process.env.DEV_MORALIS_APP_ID : process.env.MORALIS_APP_ID;
    const MORALIS_MASTER_KEY =
        process.env.NODE_ENV === 'development' ? process.env.DEV_MORALIS_MASTER_KEY : process.env.MORALIS_MASTER_KEY;

    await Moralis.start({ serverUrl: MORALIS_SERVER_URL, appId: MORALIS_APP_ID, masterKey: MORALIS_MASTER_KEY });
    console.log('Connection established with Moralis server.\n\n');

    console.log('Unwatching TokenCreated...\n');
    let options = { tableName: 'TokenCreated' };
    await Moralis.Cloud.run('unwatchContractEvent', options, { useMasterKey: true });

    console.log('Unwatching TrackMinted...\n');
    options = { tableName: 'TrackMinted' };
    await Moralis.Cloud.run('unwatchContractEvent', options, { useMasterKey: true });

    console.log('Unwatching TokenPurchased...\n');
    options = { tableName: 'TokenPurchased' };
    await Moralis.Cloud.run('unwatchContractEvent', options, { useMasterKey: true });

    console.log('Unwatching TokenPriceUpdated...\n');
    options = { tableName: 'TokenPriceUpdated' };
    await Moralis.Cloud.run('unwatchContractEvent', options, { useMasterKey: true });

    console.log('Unwatching TokenOnSaleUpdated...\n');
    options = { tableName: 'TokenOnSaleUpdated' };
    await Moralis.Cloud.run('unwatchContractEvent', options, { useMasterKey: true });

    console.log('Unwatching TransferSingle...\n');
    options = { tableName: 'TransferSingle' };
    await Moralis.Cloud.run('unwatchContractEvent', options, { useMasterKey: true });

    console.log('Unwatching TokenCommentUpdated...\n');
    options = { tableName: 'TokenCommentUpdated' };
    await Moralis.Cloud.run('unwatchContractEvent', options, { useMasterKey: true });
};

unwatchContractEvents();
export {};
