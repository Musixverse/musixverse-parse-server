/* eslint-disable etc/no-commented-out-code */
/* eslint-disable @typescript-eslint/no-var-requires */
const Moralis = require('moralis').default;
const { EvmChain } = require('@moralisweb3/evm-utils');
require('dotenv').config();
// const MusixverseFacet = require('../utils/smart-contract/contracts/Musixverse/facets/MusixverseFacet.sol/MusixverseFacet.json');

const addStreams = async () => {
    await TokenCreatedStream();
    await TrackMintedStream();
    await TokenPurchasedStream();
    await TokenOnSaleUpdatedStream();
    await TokenPriceUpdatedStream();
    await TokenCommentUpdatedStream();
};
addStreams();

async function TokenCreatedStream() {
    console.log('Connecting to Moralis...');
    await Moralis.start({
        apiKey: process.env.MORALIS_API_KEY,
    });
    console.log('Connection established.');

    const options = {
        chains: [
            process.env.BLOCKCHAIN_NETWORK_ID === '80001'
                ? EvmChain.MUMBAI
                : process.env.BLOCKCHAIN_NETWORK_ID === '137'
                ? EvmChain.POLYGON
                : null,
        ],
        description: 'TokenCreated',
        tag: 'TokenCreated',
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'creator',
                        type: 'address',
                    },
                    {
                        indexed: true,
                        internalType: 'uint256',
                        name: 'trackId',
                        type: 'uint256',
                    },
                    {
                        indexed: true,
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'price',
                        type: 'uint256',
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'localTokenId',
                        type: 'uint256',
                    },
                ],
                name: 'TokenCreated',
                type: 'event',
            },
        ],
        topic0: ['TokenCreated(address,uint256,uint256,uint256,uint256)'],
        webhookUrl: `${process.env.MORALIS_STREAMS_WEBHOOK_BASE_URL}/token-created`,
        includeContractLogs: true,
        // includeInternalTxs: true,
        // includeNativeTxs: true,
    };

    console.log('Adding stream...');
    const stream = await Moralis.Streams.add(options);
    // { id: 'YOUR_STREAM_ID', ...stream }
    const { id } = stream.toJSON();
    // Now we attach the address to the stream
    const address = process.env.MXV_DIAMOND_ADDRESS;

    if (address) {
        await Moralis.Streams.addAddress({ address, id });
    }
    console.log('TokenCreated Stream added successfully.\n');
}

async function TrackMintedStream() {
    console.log('Connecting to Moralis...');
    await Moralis.start({
        apiKey: process.env.MORALIS_API_KEY,
    });
    console.log('Connection established.');

    const options = {
        chains: [
            process.env.BLOCKCHAIN_NETWORK_ID === '80001'
                ? EvmChain.MUMBAI
                : process.env.BLOCKCHAIN_NETWORK_ID === '137'
                ? EvmChain.POLYGON
                : null,
        ],
        description: 'TrackMinted',
        tag: 'TrackMinted',
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'creator',
                        type: 'address',
                    },
                    {
                        indexed: true,
                        internalType: 'uint256',
                        name: 'trackId',
                        type: 'uint256',
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'maxTokenId',
                        type: 'uint256',
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'price',
                        type: 'uint256',
                    },
                    {
                        indexed: true,
                        internalType: 'string',
                        name: 'URIHash',
                        type: 'string',
                    },
                ],
                name: 'TrackMinted',
                type: 'event',
            },
        ],
        topic0: ['TrackMinted(address,uint256,uint256,uint256,string)'],
        webhookUrl: `${process.env.MORALIS_STREAMS_WEBHOOK_BASE_URL}/track-minted`,
        includeContractLogs: true,
        // includeInternalTxs: true,
        // includeNativeTxs: true,
    };

    console.log('Adding stream...');
    const stream = await Moralis.Streams.add(options);
    // { id: 'YOUR_STREAM_ID', ...stream }
    const { id } = stream.toJSON();
    // Now we attach the address to the stream
    const address = process.env.MXV_DIAMOND_ADDRESS;

    if (address) {
        await Moralis.Streams.addAddress({ address, id });
    }
    console.log('TrackMinted Stream added successfully.\n');
}

async function TokenPurchasedStream() {
    console.log('Connecting to Moralis...');
    await Moralis.start({
        apiKey: process.env.MORALIS_API_KEY,
    });
    console.log('Connection established.');

    const options = {
        chains: [
            process.env.BLOCKCHAIN_NETWORK_ID === '80001'
                ? EvmChain.MUMBAI
                : process.env.BLOCKCHAIN_NETWORK_ID === '137'
                ? EvmChain.POLYGON
                : null,
        ],
        description: 'TokenPurchased',
        tag: 'TokenPurchased',
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                    },
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'referrer',
                        type: 'address',
                    },
                    {
                        indexed: false,
                        internalType: 'address',
                        name: 'previousOwner',
                        type: 'address',
                    },
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'newOwner',
                        type: 'address',
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'price',
                        type: 'uint256',
                    },
                ],
                name: 'TokenPurchased',
                type: 'event',
            },
        ],
        topic0: ['TokenPurchased(uint256,address,address,address,uint256)'],
        webhookUrl: `${process.env.MORALIS_STREAMS_WEBHOOK_BASE_URL}/token-purchased`,
        includeContractLogs: true,
        // includeInternalTxs: true,
        // includeNativeTxs: true,
    };

    console.log('Adding stream...');
    const stream = await Moralis.Streams.add(options);
    // { id: 'YOUR_STREAM_ID', ...stream }
    const { id } = stream.toJSON();
    // Now we attach the address to the stream
    const address = process.env.MXV_DIAMOND_ADDRESS;

    if (address) {
        await Moralis.Streams.addAddress({ address, id });
    }
    console.log('TokenPurchased Stream added successfully.\n');
}

async function TokenOnSaleUpdatedStream() {
    console.log('Connecting to Moralis...');
    await Moralis.start({
        apiKey: process.env.MORALIS_API_KEY,
    });
    console.log('Connection established.');

    const options = {
        chains: [
            process.env.BLOCKCHAIN_NETWORK_ID === '80001'
                ? EvmChain.MUMBAI
                : process.env.BLOCKCHAIN_NETWORK_ID === '137'
                ? EvmChain.POLYGON
                : null,
        ],
        description: 'TokenOnSaleUpdated',
        tag: 'TokenOnSaleUpdated',
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'caller',
                        type: 'address',
                    },
                    {
                        indexed: true,
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                    },
                    {
                        indexed: false,
                        internalType: 'bool',
                        name: 'onSale',
                        type: 'bool',
                    },
                ],
                name: 'TokenOnSaleUpdated',
                type: 'event',
            },
        ],
        topic0: ['TokenOnSaleUpdated(address,uint256,bool)'],
        webhookUrl: `${process.env.MORALIS_STREAMS_WEBHOOK_BASE_URL}/token-onsale-updated`,
        includeContractLogs: true,
        // includeInternalTxs: true,
        // includeNativeTxs: true,
    };

    console.log('Adding stream...');
    const stream = await Moralis.Streams.add(options);
    // { id: 'YOUR_STREAM_ID', ...stream }
    const { id } = stream.toJSON();
    // Now we attach the address to the stream
    const address = process.env.MXV_DIAMOND_ADDRESS;

    if (address) {
        await Moralis.Streams.addAddress({ address, id });
    }
    console.log('TokenOnSaleUpdated Stream added successfully.\n');
}

async function TokenPriceUpdatedStream() {
    console.log('Connecting to Moralis...');
    await Moralis.start({
        apiKey: process.env.MORALIS_API_KEY,
    });
    console.log('Connection established.');

    const options = {
        chains: [
            process.env.BLOCKCHAIN_NETWORK_ID === '80001'
                ? EvmChain.MUMBAI
                : process.env.BLOCKCHAIN_NETWORK_ID === '137'
                ? EvmChain.POLYGON
                : null,
        ],
        description: 'TokenPriceUpdated',
        tag: 'TokenPriceUpdated',
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'caller',
                        type: 'address',
                    },
                    {
                        indexed: true,
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'oldPrice',
                        type: 'uint256',
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'newPrice',
                        type: 'uint256',
                    },
                ],
                name: 'TokenPriceUpdated',
                type: 'event',
            },
        ],
        topic0: ['TokenPriceUpdated(address,uint256,uint256,uint256)'],
        webhookUrl: `${process.env.MORALIS_STREAMS_WEBHOOK_BASE_URL}/token-price-updated`,
        includeContractLogs: true,
        // includeInternalTxs: true,
        // includeNativeTxs: true,
    };

    console.log('Adding stream...');
    const stream = await Moralis.Streams.add(options);
    // { id: 'YOUR_STREAM_ID', ...stream }
    const { id } = stream.toJSON();
    // Now we attach the address to the stream
    const address = process.env.MXV_DIAMOND_ADDRESS;

    if (address) {
        await Moralis.Streams.addAddress({ address, id });
    }
    console.log('TokenPriceUpdated Stream added successfully.\n');
}

async function TokenCommentUpdatedStream() {
    console.log('Connecting to Moralis...');
    await Moralis.start({
        apiKey: process.env.MORALIS_API_KEY,
    });
    console.log('Connection established.');

    const options = {
        chains: [
            process.env.BLOCKCHAIN_NETWORK_ID === '80001'
                ? EvmChain.MUMBAI
                : process.env.BLOCKCHAIN_NETWORK_ID === '137'
                ? EvmChain.POLYGON
                : null,
        ],
        description: 'TokenCommentUpdated',
        tag: 'TokenCommentUpdated',
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: 'caller',
                        type: 'address',
                    },
                    {
                        indexed: true,
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                    },
                    {
                        indexed: false,
                        internalType: 'string',
                        name: 'previousComment',
                        type: 'string',
                    },
                    {
                        indexed: false,
                        internalType: 'string',
                        name: 'newComment',
                        type: 'string',
                    },
                ],
                name: 'TokenCommentUpdated',
                type: 'event',
            },
        ],
        topic0: ['TokenCommentUpdated(address,uint256,string,string)'],
        webhookUrl: `${process.env.MORALIS_STREAMS_WEBHOOK_BASE_URL}/token-comment-updated`,
        includeContractLogs: true,
        // includeInternalTxs: true,
        // includeNativeTxs: true,
    };

    console.log('Adding stream...');
    const stream = await Moralis.Streams.add(options);
    // { id: 'YOUR_STREAM_ID', ...stream }
    const { id } = stream.toJSON();
    // Now we attach the address to the stream
    const address = process.env.MXV_DIAMOND_ADDRESS;

    if (address) {
        await Moralis.Streams.addAddress({ address, id });
    }
    console.log('TokenCommentUpdated Stream added successfully.\n');
}
