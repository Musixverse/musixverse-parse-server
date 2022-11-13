/* eslint-disable guard-for-in */
/* eslint-disable etc/no-commented-out-code */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Web3 from 'web3';
import { ethers } from 'ethers';
const web3 = new Web3();
declare const Parse: any;

// Not working if transaction confirmed is false
export function verifySignature(req: any, secret: string) {
    const ProvidedSignature = req.headers['x-signature'];
    if (!ProvidedSignature) {
        throw new Error('Signature not provided');
    }
    const GeneratedSignature = web3.utils.sha3(JSON.stringify(req.body) + secret);
    if (GeneratedSignature !== ProvidedSignature) {
        throw new Error('Invalid Signature');
    }
}

export async function parseUpdate(tableName: string, logs: any) {
    // Check if object exists in db
    for (const object of logs) {
        const query = new Parse.Query(tableName);
        query.equalTo('transaction_hash', object.transaction_hash);
        query.equalTo('log_index', object.log_index);
        // eslint-disable-next-line no-await-in-loop
        const result = await query.first({ useMasterKey: true });
        if (result) {
            // Loop through object's keys
            for (const key in object) {
                result.set(key, object[key]);
            }
            result?.save(null, { useMasterKey: true });
        } else {
            // Create new object
            const newObject = new Parse.Object(tableName);
            for (const key in object) {
                newObject.set(key, object[key]);
            }
            newObject.save(null, { useMasterKey: true });
        }
    }
    return true;
}

export function parseEventData(req: any) {
    try {
        const updates = [];
        for (const log of req.body.logs) {
            const { abi } = req.body;
            if (abi) {
                const { dataToUpdate } = realtimeUpsertParams(abi, log, req.body.confirmed, req.body.block);
                updates.push(dataToUpdate);
            }
        }
        return { eventName: req.body.tag, data: updates };
    } catch (e: any) {
        console.log(e);
    }
    return { data: null, eventName: null };
}

export function realtimeUpsertParams(abi: any, eventLog: any, confirmed: any, block: any) {
    const block_number = Number(block.number);
    const block_hash = block.hash;
    const block_timestamp = new Date(block.timestamp * 1000);
    const address = eventLog.address.toLowerCase();
    const transaction_hash = eventLog.transactionHash.toLowerCase();
    const log_index = Number(eventLog.logIndex);
    const topics = [
        eventLog.topic0,
        eventLog.topic1,
        eventLog.topic2,
        eventLog.topic3,
        eventLog.topic4,
        eventLog.topic5,
    ];
    const { data } = eventLog;

    const filter = {
        transaction_hash,
        log_index,
    };

    const rest = {
        address,
        block_number,
        block_hash,
        block_timestamp,
        confirmed,
    };

    if (abi) {
        const dataToUpdate = {
            ...filter,
            ...decodeWithEthers(
                abi,
                data,
                topics.filter((t) => t),
            ),
            ...rest,
        };
        return { filter, dataToUpdate };
    }

    const dataToUpdate = {
        ...filter,
        ...rest,
        data,
        topic0: topics[0],
        topic1: topics[1],
        topic2: topics[2],
        topic3: topics[3],
    };

    return { dataToUpdate };
}

export function decodeWithEthers(abi: any, data: any, topics: any) {
    try {
        const iface = new ethers.utils.Interface(abi);
        const { args } = iface.parseLog({ data, topics });
        const event = iface.getEvent(topics[0]);
        const decoded: { [index: string]: string } = {};
        event.inputs.forEach((input, index) => {
            if (input.type === 'uint256') {
                // eslint-disable-next-line etc/no-commented-out-code
                /*decoded[`${input.name}_decimal`] = {
                    __type: "NumberDecimal",
                    value: parseInt(ethers.BigNumber.from(args[index]._hex).toString())
                };*/
                decoded[input.name] = ethers.BigNumber.from(args[index]._hex).toString();
                return;
            }
            if (input.type === 'bytes') {
                decoded[input.name] = args[index].hash;
                return;
            }
            if (input.type === 'address') {
                decoded[input.name] = args[index].toLowerCase();
                return;
            }
            decoded[input.name] = args[index];
        });
        return decoded;
    } catch (error) {
        console.error(error);
        return {};
    }
}

module.exports = {
    verifySignature,
    parseUpdate,
    parseEventData,
    realtimeUpsertParams,
};
