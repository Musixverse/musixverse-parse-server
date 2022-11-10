import Moralis from 'moralis';

export interface RequestMessage {
    address: string;
    chain: string;
    networkType: string;
}

const DOMAIN = 'Musixverse';
// eslint-disable-next-line etc/no-commented-out-code
// const STATEMENT = 'Please sign this message to authenticate.';
const STATEMENT = '';
const URI = 'https://www.musixverse.com';
const EXPIRATION_TIME = new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString();
const TIMEOUT = 15;

export async function requestMessage({
    address,
    chain,
    networkType,
}: {
    address: string;
    chain: string;
    networkType: 'evm';
}) {
    const result = await Moralis.Auth.requestMessage({
        address,
        chain,
        networkType,
        domain: DOMAIN,
        statement: STATEMENT,
        uri: URI,
        expirationTime: EXPIRATION_TIME,
        timeout: TIMEOUT,
    });

    const { message } = result.toJSON();

    return message;
}
