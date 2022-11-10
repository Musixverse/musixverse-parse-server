import Moralis from 'moralis';
import { EvmChain } from '@moralisweb3/evm-utils';
import * as dotenv from 'dotenv';
dotenv.config();
import MusixverseFacet from './utils/smart-contract/contracts/Musixverse/facets/MusixverseFacet.sol/MusixverseFacet.json';

Moralis.start({
    apiKey: process.env.MORALIS_API_KEY,
});

const stream = {
    chains: [EvmChain.MUMBAI],
    description: 'ToggleOnSale',
    tag: 'ToggleOnSale',
    abi: MusixverseFacet.abi,
    includeContractLogs: true,
    topic0: ['TokenOnSaleUpdated(address,uint256,bool)'],
    webhookUrl: 'https://musixverse-dev-server.vercel.app/api/webhook/moralis/stream/toggle-on-sale',
    includeNativeTxs: true,
};

const toggleOnSaleStream = await Moralis.Streams.add(stream);
// { id: 'YOUR_STREAM_ID', ...toggleOnSaleStream }
const { id } = toggleOnSaleStream.toJSON();

// Now we attach the address to the stream
const address = process.env.MXV_DIAMOND_ADDRESS;

await Moralis.Streams.addAddress({ address, id });
