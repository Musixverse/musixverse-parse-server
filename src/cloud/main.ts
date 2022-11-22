/* eslint-disable etc/no-commented-out-code */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable complexity */
declare const Parse: any;
import './generated/evmApi';
import './generated/solApi';
import { requestMessage } from '../auth/authService';
import config from '../config';
const { logger } = require('parse-server');
const sendgridMail = require('@sendgrid/mail');
const Moralis = require('moralis-v1');
sendgridMail.setApiKey(config.SENDGRID_API_KEY);

const IPFS_NODE_URL = 'https://gateway.musixverse.com/ipfs/';
const MUSIXVERSE_ROOT_URL = config.MUSIXVERSE_CLIENT_BASE_URL;

Parse.Cloud.define('requestMessage', async ({ params }: any) => {
    const { address, chain, networkType } = params;

    const message = await requestMessage({
        address,
        chain,
        networkType,
    });

    return { message };
});

Parse.Cloud.define('getPluginSpecs', () => {
    // Not implemented, only excists to remove client-side errors when using the moralis-v1 package
    return [];
});

Parse.Cloud.define('getServerTime', () => {
    // Not implemented, only excists to remove client-side errors when using the moralis-v1 package
    return null;
});

/**************************************************************************/
/**************************    User Sign Up   *****************************/
/**************************************************************************/

Parse.Cloud.define('checkUsernameAvailability', async (request: any) => {
    if (request.params.username) {
        const query = new Parse.Query('_User', { useMasterKey: true });
        query.equalTo('username', request.params.username);
        const result = await query.first({ useMasterKey: true });
        if (result) {
            return 'Username already exists!';
        }
        return false;
    }
    return null;
});

Parse.Cloud.define('checkEmailExists', async (request: any) => {
    if (request.params.email) {
        const query = new Parse.Query('_User', { useMasterKey: true });
        query.equalTo('email', request.params.email);
        query.equalTo('emailVerified', true);
        const result = await query.first({ useMasterKey: true });
        if (result) {
            return 'An account with this email already exists';
        }
        return false;
    }
    return null;
});

/**************************************************************************/
/***************************    Mx Catalog   ******************************/
/**************************************************************************/

Parse.Cloud.define('fetchTracksWhoseAllCopiesAreNotSold', async (request: any) => {
    const {
        trackOrigin,
        recordingYear,
        genre,
        language,
        parentalAdvisory,
        duration,
        tags,
        numberOfCopies,
        numberOfCollaborators,
        status,
        resaleRoyaltyPercent,
        countryOfOrigin,
        stateOfOrigin,
        cityOfOrigin,
        hasSplits,
        hasVocals,
        hasLyrics,
        sortingFilter,
    } = request.params.appliedFilter;

    const query = new Parse.Query('TrackMinted');
    const filter_conditions = [];
    if (trackOrigin) {
        filter_conditions.push({ trackOrigin: trackOrigin });
    }
    if (recordingYear) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: [{ $toInt: '$recordingYear' }, { $toInt: recordingYear }] }],
            },
        });
    }
    if (genre) {
        filter_conditions.push({ genre: genre });
    }
    if (language) {
        filter_conditions.push({ language: language });
    }
    if (duration) {
        if (duration === '<100s') {
            filter_conditions.push({
                $expr: {
                    $and: [{ $lt: [{ $toDouble: '$duration' }, { $toDouble: 100 }] }],
                },
            });
        } else if (duration === '>400s') {
            filter_conditions.push({
                $expr: {
                    $and: [{ $gt: [{ $toDouble: '$duration' }, { $toDouble: 400 }] }],
                },
            });
        } else {
            const durationRange = duration.split('-');
            filter_conditions.push({
                $expr: {
                    $and: [
                        { $gte: [{ $toDouble: '$duration' }, { $toDouble: parseInt(durationRange[0]) }] },
                        { $lte: [{ $toDouble: '$duration' }, { $toDouble: parseInt(durationRange[1]) }] },
                    ],
                },
            });
        }
    }
    if (parentalAdvisory) {
        filter_conditions.push({ parentalAdvisory: parentalAdvisory });
    }
    if (tags.length > 0) {
        const _tags = [];
        for (const tag in tags) {
            if (tags[tag].value) {
                _tags.push(tags[tag].value);
            }
        }
        filter_conditions.push({ tags: { $in: _tags } });
    }
    if (numberOfCopies) {
        const rangeValues = numberOfCopies.split('-');
        if (rangeValues.length === 1) {
            if (numberOfCopies === '>100') {
                filter_conditions.push({
                    $expr: {
                        $and: [{ $gt: [{ $toInt: '$numberOfCopies' }, { $toInt: '100' }] }],
                    },
                });
            } else {
                filter_conditions.push({ numberOfCopies: numberOfCopies });
            }
        } else {
            filter_conditions.push({
                $expr: {
                    $and: [
                        { $gte: [{ $toInt: '$numberOfCopies' }, { $toInt: rangeValues[0] }] },
                        { $lte: [{ $toInt: '$numberOfCopies' }, { $toInt: rangeValues[1] }] },
                    ],
                },
            });
        }
    }
    if (numberOfCollaborators) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: [{ $toInt: '$numberOfCollaborators' }, { $toInt: numberOfCollaborators }] }],
            },
        });
    }
    if (resaleRoyaltyPercent) {
        if (parseInt(resaleRoyaltyPercent) <= 5) {
            filter_conditions.push({
                $expr: {
                    $and: [{ $eq: [{ $toInt: '$resaleRoyaltyPercent' }, { $toInt: parseInt(resaleRoyaltyPercent) }] }],
                },
            });
        } else {
            const resaleRoyaltyPercentRange = resaleRoyaltyPercent.split('-');
            filter_conditions.push({
                $expr: {
                    $and: [
                        {
                            $gte: [
                                { $toInt: '$resaleRoyaltyPercent' },
                                { $toInt: parseInt(resaleRoyaltyPercentRange[0]) },
                            ],
                        },
                        {
                            $lte: [
                                { $toInt: '$resaleRoyaltyPercent' },
                                { $toInt: parseInt(resaleRoyaltyPercentRange[1]) },
                            ],
                        },
                    ],
                },
            });
        }
    }
    if (countryOfOrigin) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: ['$location.countryOfOrigin.name', countryOfOrigin.name] }],
            },
        });
    }
    if (stateOfOrigin) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: ['$location.stateOfOrigin.name', stateOfOrigin.name] }],
            },
        });
    }
    if (cityOfOrigin) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: ['$location.cityOfOrigin.name', cityOfOrigin.name] }],
            },
        });
    }
    if (hasSplits) {
        filter_conditions.push({ hasCollaborators: 'Yes' });
    }
    if (hasVocals) {
        filter_conditions.push({ vocals: 'Yes' });
    }
    if (hasLyrics) {
        filter_conditions.push({
            $expr: {
                $and: [{ $ne: ['$lyrics', ''] }],
            },
        });
    }
    if (status) {
        const _currentTimestamp = Math.round(new Date().getTime() / 1000);
        if (status === 'Coming Soon') {
            filter_conditions.push({
                $expr: {
                    $and: [{ $gt: [{ $toInt: '$unlockTimestamp' }, { $toInt: _currentTimestamp }] }],
                },
            });
        } else if (status === 'On Sale') {
            filter_conditions.push({
                $expr: {
                    $and: [{ $lt: [{ $toInt: '$unlockTimestamp' }, { $toInt: _currentTimestamp }] }],
                },
            });
        }
    }

    // Sort based on conditions
    let sorting_condition;
    if (sortingFilter) {
        if (sortingFilter === 'dateNewest') {
            sorting_condition = { block_timestamp: -1 };
        } else if (sortingFilter === 'dateOldest') {
            sorting_condition = { block_timestamp: 1 };
        } else if (sortingFilter === 'priceHighest') {
            sorting_condition = { price: -1 };
        } else if (sortingFilter === 'priceLowest') {
            sorting_condition = { price: 1 };
        }
    }

    const pipeline = [];
    if (filter_conditions.length > 0) {
        pipeline.unshift({
            match: {
                $and: filter_conditions,
            },
        });
    }

    pipeline.push(
        {
            lookup: {
                from: 'TokenCreated',
                localField: 'trackId',
                foreignField: 'trackId',
                as: 'similarTokens',
            },
        },
        { sort: sorting_condition },
        {
            lookup: {
                from: 'TokenPurchased',
                let: { similarTokens: '$similarTokens' },
                pipeline: [
                    { $match: { $expr: { $in: ['$tokenId', '$$similarTokens.tokenId'] } } },
                    { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' } } },
                ],
                as: 'purchasedTokens',
            },
        },
        {
            addFields: {
                similarTokens_size: { $size: '$similarTokens' },
                purchasedTokens_size: { $size: '$purchasedTokens' },
            },
        },
        { match: { $expr: { $ne: ['$similarTokens_size', '$purchasedTokens_size'] } } },
        {
            addFields: { unsoldTokens: { $setDifference: ['$similarTokens.tokenId', '$purchasedTokens.tokenId'] } },
        },
        {
            lookup: {
                from: '_User',
                localField: 'artistAddress',
                foreignField: 'ethAddress',
                as: 'artistUser',
            },
        },
        {
            lookup: {
                from: 'TokenCreated',
                let: { trackId: '$trackId', unsoldTokens: '$unsoldTokens' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$trackId', '$$trackId'] },
                                    { $eq: ['$tokenId', { $first: '$$unsoldTokens' }] },
                                ],
                            },
                        },
                    },
                ],
                as: 'currentToken',
            },
        },
        {
            lookup: {
                from: '_User',
                let: { collaborators: '$collaborators' },
                pipeline: [
                    { $match: { $expr: { $in: ['$ethAddress', '$$collaborators.address'] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            name: 1,
                            username: 1,
                            ethAddress: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'collaboratorUsers',
            },
        },
        {
            lookup: {
                from: 'TokenCreated',
                let: { trackId: '$trackId' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                { $sort: { block_timestamp: -1 } },
                                { $limit: 1 },
                                { $project: { _id: 0, price: '$newPrice' } },
                            ],
                            as: 'tokenPriceUpdated',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            tokenId: 1,
                            localTokenId: 1,
                            price: {
                                $ifNull: [
                                    {
                                        $first: '$tokenPriceUpdated.price',
                                    },
                                    '$price',
                                ],
                            },
                        },
                    },
                ],
                as: 'otherTokensOfTrack',
            },
        },
        {
            project: {
                trackId: 1,
                price: 1,
                title: 1,
                artist: 1,
                artistAddress: 1,
                isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                artwork: 1,
                audio: 1,
                numberOfCopies: 1,
                collaborators: 1,
                collaboratorUsers: 1,
                userInfo: 1,
                maxTokenId: 1,
                URIHash: 1,
                similarTokens: '$similarTokens.tokenId',
                purchasedTokens: '$purchasedTokens.tokenId',
                unsoldTokens: 1,
                localTokenId: { $first: '$currentToken.localTokenId' },
                similarTokens_size: 1,
                purchasedTokens_size: { $size: '$purchasedTokens' },
                unsoldTokens_size: { $size: '$unsoldTokens' },
                otherTokensOfTrack: 1,
            },
        },
    );

    const result = await query.aggregate(pipeline);
    return result;
});

Parse.Cloud.define('fetchTracksWhoseCopiesAreSoldOnce', async (request: any) => {
    const {
        trackOrigin,
        recordingYear,
        genre,
        language,
        parentalAdvisory,
        duration,
        tags,
        numberOfCopies,
        numberOfCollaborators,
        status,
        resaleRoyaltyPercent,
        countryOfOrigin,
        stateOfOrigin,
        cityOfOrigin,
        hasSplits,
        hasVocals,
        hasLyrics,
        sortingFilter,
    } = request.params.appliedFilter;

    const query = new Parse.Query('TrackMinted');
    const filter_conditions = [];
    if (trackOrigin) {
        filter_conditions.push({ trackOrigin: trackOrigin });
    }
    if (recordingYear) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: [{ $toInt: '$recordingYear' }, { $toInt: recordingYear }] }],
            },
        });
    }
    if (genre) {
        filter_conditions.push({ genre: genre });
    }
    if (language) {
        filter_conditions.push({ language: language });
    }
    if (duration) {
        if (duration === '<100s') {
            filter_conditions.push({
                $expr: {
                    $and: [{ $lt: [{ $toDouble: '$duration' }, { $toDouble: 100 }] }],
                },
            });
        } else if (duration === '>400s') {
            filter_conditions.push({
                $expr: {
                    $and: [{ $gt: [{ $toDouble: '$duration' }, { $toDouble: 400 }] }],
                },
            });
        } else {
            const durationRange = duration.split('-');
            filter_conditions.push({
                $expr: {
                    $and: [
                        { $gte: [{ $toDouble: '$duration' }, { $toDouble: parseInt(durationRange[0]) }] },
                        { $lte: [{ $toDouble: '$duration' }, { $toDouble: parseInt(durationRange[1]) }] },
                    ],
                },
            });
        }
    }
    if (parentalAdvisory) {
        filter_conditions.push({ parentalAdvisory: parentalAdvisory });
    }
    if (tags.length > 0) {
        const _tags = [];
        for (const tag in tags) {
            if (tags[tag].value) {
                _tags.push(tags[tag].value);
            }
        }
        filter_conditions.push({ tags: { $in: _tags } });
    }
    if (numberOfCopies) {
        const rangeValues = numberOfCopies.split('-');
        if (rangeValues.length === 1) {
            filter_conditions.push({ numberOfCopies: numberOfCopies });
        } else {
            filter_conditions.push({
                $expr: {
                    $and: [
                        { $gte: [{ $toInt: '$numberOfCopies' }, { $toInt: rangeValues[0] }] },
                        { $lte: [{ $toInt: '$numberOfCopies' }, { $toInt: rangeValues[1] }] },
                    ],
                },
            });
        }
    }
    if (numberOfCollaborators) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: [{ $toInt: '$numberOfCollaborators' }, { $toInt: numberOfCollaborators }] }],
            },
        });
    }
    if (resaleRoyaltyPercent) {
        if (parseInt(resaleRoyaltyPercent) <= 5) {
            filter_conditions.push({
                $expr: {
                    $and: [{ $eq: [{ $toInt: '$resaleRoyaltyPercent' }, { $toInt: parseInt(resaleRoyaltyPercent) }] }],
                },
            });
        } else {
            const resaleRoyaltyPercentRange = resaleRoyaltyPercent.split('-');
            filter_conditions.push({
                $expr: {
                    $and: [
                        {
                            $gte: [
                                { $toInt: '$resaleRoyaltyPercent' },
                                { $toInt: parseInt(resaleRoyaltyPercentRange[0]) },
                            ],
                        },
                        {
                            $lte: [
                                { $toInt: '$resaleRoyaltyPercent' },
                                { $toInt: parseInt(resaleRoyaltyPercentRange[1]) },
                            ],
                        },
                    ],
                },
            });
        }
    }
    if (countryOfOrigin) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: ['$location.countryOfOrigin.name', countryOfOrigin.name] }],
            },
        });
    }
    if (stateOfOrigin) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: ['$location.stateOfOrigin.name', stateOfOrigin.name] }],
            },
        });
    }
    if (cityOfOrigin) {
        filter_conditions.push({
            $expr: {
                $and: [{ $eq: ['$location.cityOfOrigin.name', cityOfOrigin.name] }],
            },
        });
    }
    if (hasSplits) {
        filter_conditions.push({ hasCollaborators: 'Yes' });
    }
    if (hasVocals) {
        filter_conditions.push({ vocals: 'Yes' });
    }
    if (hasLyrics) {
        filter_conditions.push({
            $expr: {
                $and: [{ $ne: ['$lyrics', ''] }],
            },
        });
    }

    // Sort based on conditions
    let sorting_condition;
    if (sortingFilter) {
        if (sortingFilter === 'dateNewest') {
            sorting_condition = { block_timestamp: -1 };
        } else if (sortingFilter === 'dateOldest') {
            sorting_condition = { block_timestamp: 1 };
        } else if (sortingFilter === 'priceHighest') {
            sorting_condition = { price: -1 };
        } else if (sortingFilter === 'priceLowest') {
            sorting_condition = { price: 1 };
        } else if (sortingFilter === 'dateSoldLatest') {
            sorting_condition = { purchased_block_timestamp: -1 };
        } else if (sortingFilter === 'dateSoldOldest') {
            sorting_condition = { purchased_block_timestamp: 1 };
        }
    }

    const pipeline = [];
    if (filter_conditions.length > 0) {
        pipeline.unshift({
            match: {
                $and: filter_conditions,
            },
        });
    }
    pipeline.push(
        {
            lookup: {
                from: 'TokenCreated',
                localField: 'trackId',
                foreignField: 'trackId',
                as: 'similarTokens',
            },
        },
        {
            lookup: {
                from: 'TokenPurchased',
                let: { similarTokens: '$similarTokens' },
                pipeline: [
                    { $match: { $expr: { $in: ['$tokenId', '$$similarTokens.tokenId'] } } },
                    { $sort: { price: -1 } },
                    { $sort: { block_timestamp: -1 } },
                    {
                        $group: {
                            _id: '$tokenId',
                            tokenId: { $first: '$tokenId' },
                            block_timestamp: { $first: '$block_timestamp' },
                        },
                    },
                ],
                as: 'purchasedTokens',
            },
        },
        {
            lookup: {
                from: 'TokenPriceUpdated',
                let: { purchasedTokens: '$purchasedTokens' },
                pipeline: [
                    { $match: { $expr: { $in: ['$tokenId', '$$purchasedTokens.tokenId'] } } },
                    { $sort: { block_timestamp: -1 } },
                    { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' }, price: { $first: '$newPrice' } } },
                    { $sort: { price: 1 } },
                ],
                as: 'tokensPriceUpdated',
            },
        },
    );

    pipeline.push(
        {
            addFields: { purchasedTokens_size: { $size: '$purchasedTokens' } },
        },
        { match: { $expr: { $ne: ['$purchasedTokens_size', 0] } } },
        {
            lookup: {
                from: '_User',
                localField: 'artistAddress',
                foreignField: 'ethAddress',
                as: 'artistUser',
            },
        },
        {
            addFields: {
                tokenIdHavingLowestPrice: {
                    $ifNull: [
                        {
                            $first: '$tokensPriceUpdated.tokenId',
                        },
                        {
                            $first: '$purchasedTokens.tokenId',
                        },
                    ],
                },
            },
        },
        {
            lookup: {
                from: 'TokenCreated',
                let: { trackId: '$trackId', tokenIdHavingLowestPrice: '$tokenIdHavingLowestPrice' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$trackId', '$$trackId'] },
                                    { $eq: ['$tokenId', '$$tokenIdHavingLowestPrice'] },
                                ],
                            },
                        },
                    },
                ],
                as: 'currentToken',
            },
        },
        {
            lookup: {
                from: '_User',
                let: { collaborators: '$collaborators' },
                pipeline: [
                    { $match: { $expr: { $in: ['$ethAddress', '$$collaborators.address'] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            name: 1,
                            username: 1,
                            ethAddress: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'collaboratorUsers',
            },
        },
        {
            lookup: {
                from: 'TokenCreated',
                let: { trackId: '$trackId' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                { $sort: { block_timestamp: -1 } },
                                { $limit: 1 },
                                { $project: { _id: 0, price: '$newPrice' } },
                            ],
                            as: 'tokenPriceUpdated',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            tokenId: 1,
                            localTokenId: 1,
                            price: {
                                $ifNull: [
                                    {
                                        $first: '$tokenPriceUpdated.price',
                                    },
                                    '$price',
                                ],
                            },
                        },
                    },
                ],
                as: 'otherTokensOfTrack',
            },
        },
        {
            project: {
                trackId: 1,
                maxTokenId: 1,
                localTokenId: { $first: '$currentToken.localTokenId' },
                tokenIdHavingLowestPrice: 1,
                price: {
                    $ifNull: [
                        {
                            $first: '$tokensPriceUpdated.price',
                        },
                        '$price',
                    ],
                },
                title: 1,
                artist: 1,
                artistAddress: 1,
                isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                artwork: 1,
                audio: 1,
                numberOfCopies: 1,
                collaborators: 1,
                collaboratorUsers: 1,
                similarTokens: '$similarTokens.tokenId',
                purchasedTokens: '$purchasedTokens.tokenId',
                similarTokens_size: 1,
                purchasedTokens_size: { $size: '$purchasedTokens' },
                otherTokensOfTrack: 1,
            },
        },
        { sort: sorting_condition },
    );

    if (status) {
        pipeline.push({
            lookup: {
                from: 'TokenOnSaleUpdated',
                let: { tokenIdHavingLowestPrice: '$tokenIdHavingLowestPrice' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$tokenId', '$$tokenIdHavingLowestPrice'] } } },
                    { $sort: { block_timestamp: -1 } },
                    { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' }, onSale: { $first: '$onSale' } } },
                ],
                as: 'tokensOnSaleUpdated',
            },
        });
        if (status === 'On Sale') {
            pipeline.push({
                match: {
                    $expr: {
                        $ne: [
                            {
                                $first: '$tokensOnSaleUpdated.onSale',
                            },
                            false,
                        ],
                    },
                },
            });
        }
        if (status === 'Not on Sale') {
            pipeline.push({
                match: {
                    $expr: {
                        $eq: [
                            {
                                $first: '$tokensOnSaleUpdated.onSale',
                            },
                            false,
                        ],
                    },
                },
            });
        }
    }

    const result = await query.aggregate(pipeline);
    return result;
});

/**************************************************************************/
/***************************    Track Info   ******************************/
/**************************************************************************/

Parse.Cloud.define('fetchTokenDetails', async (request: any) => {
    const query = new Parse.Query('TokenCreated');
    const pipeline = [];
    pipeline.push(
        {
            match: {
                tokenId: request.params.tokenId,
            },
        },
        {
            lookup: {
                from: 'TokenCreated',
                let: { trackId: '$trackId', tokenId: '$tokenId' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }, { $ne: ['$tokenId', '$$tokenId'] }] },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                { $sort: { block_timestamp: -1 } },
                                { $limit: 1 },
                                { $project: { _id: 0, price: '$newPrice' } },
                            ],
                            as: 'tokenPriceUpdated',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            trackId: 1,
                            tokenId: 1,
                            localTokenId: 1,
                            price: {
                                $ifNull: [
                                    {
                                        $first: '$tokenPriceUpdated.price',
                                    },
                                    '$price',
                                ],
                            },
                        },
                    },
                ],
                as: 'otherTokensOfTrack',
            },
        },
        {
            lookup: {
                from: 'TokenOnSaleUpdated',
                let: { tokenId: '$tokenId' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                    { $sort: { block_timestamp: -1 } },
                    { $limit: 1 },
                    { $project: { _id: 0, onSale: 1 } },
                ],
                as: 'onSaleArray',
            },
        },
        {
            lookup: {
                from: 'TokenCommentUpdated',
                let: { tokenId: '$tokenId' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                    { $sort: { block_timestamp: -1 } },
                    { $limit: 1 },
                    { $project: { _id: 0, newComment: 1, caller: 1 } },
                    {
                        $lookup: {
                            from: '_User',
                            let: { caller: '$caller' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$caller'] }] } } },
                                {
                                    $lookup: {
                                        from: 'UserInfo',
                                        localField: '_id',
                                        foreignField: 'userId',
                                        as: 'userInfo',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        name: 1,
                                        username: 1,
                                        ethAddress: 1,
                                        isArtistVerified: 1,
                                        avatar: { $first: '$userInfo.avatar' },
                                    },
                                },
                            ],
                            as: 'user',
                        },
                    },
                    {
                        $project: {
                            user: { $first: '$user' },
                            newComment: 1,
                        },
                    },
                ],
                as: 'tokenCommentsArray',
            },
        },
        {
            lookup: {
                from: 'TokenPriceUpdated',
                let: { tokenId: '$tokenId' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                    { $sort: { block_timestamp: -1 } },
                    { $limit: 1 },
                    { $project: { _id: 0, price: '$newPrice' } },
                ],
                as: 'tokenPriceUpdated',
            },
        },
        {
            lookup: {
                from: 'TokenPurchased',
                let: { tokenId: '$tokenId' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                    { $sort: { block_timestamp: -1 } },
                    { $limit: 1 },
                    { $project: { _id: 0, owner: '$newOwner' } },
                ],
                as: 'tokenPurchased',
            },
        },
        {
            lookup: {
                from: '_User',
                let: {
                    currentOwnerAddress: {
                        $first: '$tokenPurchased.owner',
                    },
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$ethAddress', '$$currentOwnerAddress'] },
                                    { $ne: ['$username', 'coreservices'] },
                                    { $ne: ['$username', null] },
                                ],
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            username: 1,
                            ethAddress: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'currentOwner',
            },
        },
        {
            lookup: {
                from: '_User',
                let: { creator: '$creator' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            name: 1,
                            username: 1,
                            ethAddress: 1,
                            isArtistVerified: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'artistUser',
            },
        },
        {
            lookup: {
                from: 'TrackMinted',
                let: { trackId: '$trackId' },
                pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } }],
                as: 'trackMinted',
            },
        },
        {
            lookup: {
                from: '_User',
                let: { artworkArtistAddress: { $first: '$trackMinted.artwork.artistAddress' } },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$artworkArtistAddress'] }] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            username: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'artworkArtistInfo',
            },
        },
        {
            lookup: {
                from: 'InvitedArtworkArtist',
                let: { invitedArtistId: { $first: '$trackMinted.artwork.invitedArtistId' } },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$_id', '$$invitedArtistId'] }] } } },
                    {
                        $lookup: {
                            from: '_User',
                            localField: 'invitedArtistEmail',
                            foreignField: 'email',
                            as: 'user',
                        },
                    },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: 'user._id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: { $first: '$user.name' },
                            username: { $first: '$user.username' },
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'invitedArtworkArtistInfo',
            },
        },
        {
            lookup: {
                from: '_User',
                let: { collaborators: { $first: '$trackMinted.collaborators' } },
                pipeline: [
                    { $match: { $expr: { $in: ['$ethAddress', '$$collaborators.address'] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            name: 1,
                            username: 1,
                            ethAddress: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'collaboratorUsers',
            },
        },
        {
            lookup: {
                from: 'Band',
                let: { trackMinted: '$trackMinted' },
                pipeline: [{ $match: { $expr: { $and: [{ $in: ['$_id', '$$trackMinted.bandId'] }] } } }],
                as: 'band',
            },
        },
        {
            addFields: {
                artistInfo: {
                    $cond: {
                        if: {
                            $ifNull: [
                                {
                                    $first: '$band',
                                },
                                null,
                            ],
                        },
                        then: {
                            ethAddress: {
                                $first: '$artistUser.ethAddress',
                            },
                            name: {
                                $first: '$band.name',
                            },
                            username: {
                                $first: '$band.username',
                            },
                            isArtistVerified: {
                                $first: '$band.isBandVerified',
                            },
                            avatar: { $first: '$band.avatar' },
                            isBand: true,
                        },
                        else: {
                            ethAddress: {
                                $first: '$artistUser.ethAddress',
                            },
                            name: {
                                $first: '$artistUser.name',
                            },
                            username: {
                                $first: '$artistUser.username',
                            },
                            isArtistVerified: {
                                $first: '$artistUser.isArtistVerified',
                            },
                            avatar: { $first: '$artistUser.avatar' },
                            isBand: false,
                        },
                    },
                },
            },
        },
        // Activity
        {
            lookup: {
                from: 'TokenCreated',
                let: { tokenId: '$tokenId' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                    {
                        $lookup: {
                            from: 'TokenPurchased',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { caller: '$newOwner' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$caller'] }] } } },
                                            { $project: { _id: 0, username: 1 } },
                                        ],
                                        as: 'caller',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { referrer: '$referrer' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$referrer'] }] } } },
                                            { $project: { _id: 0, username: 1 } },
                                        ],
                                        as: 'txReferrer',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        price: 1,
                                        newOwner: 1,
                                        block_timestamp: 1,
                                        transaction_hash: 1,
                                        caller: { $first: '$caller' },
                                        referrer: { $first: '$txReferrer' },
                                    },
                                },
                            ],
                            as: 'tokenPurchasedActivity',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { caller: '$caller' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$caller'] }] } } },
                                            { $project: { _id: 0, username: 1 } },
                                        ],
                                        as: 'caller',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        oldPrice: 1,
                                        newPrice: 1,
                                        block_timestamp: 1,
                                        transaction_hash: 1,
                                        caller: { $first: '$caller' },
                                    },
                                },
                            ],
                            as: 'tokenPriceUpdatedActivity',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenOnSaleUpdated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { caller: '$caller' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$caller'] }] } } },
                                            { $project: { _id: 0, username: 1 } },
                                        ],
                                        as: 'caller',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        onSale: 1,
                                        block_timestamp: 1,
                                        transaction_hash: 1,
                                        caller: { $first: '$caller' },
                                    },
                                },
                            ],
                            as: 'tokenOnSaleUpdatedActivity',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCommentUpdated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { caller: '$caller' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$caller'] }] } } },
                                            { $project: { _id: 0, username: 1 } },
                                        ],
                                        as: 'caller',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        previousComment: 1,
                                        newComment: 1,
                                        block_timestamp: 1,
                                        transaction_hash: 1,
                                        caller: { $first: '$caller' },
                                    },
                                },
                            ],
                            as: 'tokenCommentUpdatedActivity',
                        },
                    },
                    {
                        $project: {
                            tokenActivity: {
                                $concatArrays: [
                                    '$tokenOnSaleUpdatedActivity',
                                    '$tokenPriceUpdatedActivity',
                                    '$tokenPurchasedActivity',
                                    '$tokenCommentUpdatedActivity',
                                ],
                            },
                        },
                    },
                    { $unwind: '$tokenActivity' },
                    { $sort: { 'tokenActivity.block_timestamp': -1 } },
                    { $group: { _id: '$_id', Activity: { $push: '$tokenActivity' } } },
                    { $project: { _id: 0, activities: '$Activity' } },
                ],
                as: 'tokenActivity',
            },
        },
        {
            addFields: {
                activity: {
                    tokenMintedInfo: {
                        price: '$price',
                        block_timestamp: '$block_timestamp',
                        transaction_hash: '$transaction_hash',
                    },
                    tokenActivity: { $first: '$tokenActivity.activities' },
                },
            },
        },
        {
            project: {
                trackId: 1,
                metadata: { $first: '$trackMinted' },
                localTokenId: 1,
                otherTokensOfTrack: 1,
                comment: {
                    $ifNull: [
                        {
                            $first: '$tokenCommentsArray',
                        },
                        null,
                    ],
                },
                onSale: {
                    $ifNull: [
                        {
                            $first: '$onSaleArray.onSale',
                        },
                        null,
                    ],
                },
                price: {
                    $ifNull: [
                        {
                            $first: '$tokenPriceUpdated.price',
                        },
                        '$price',
                    ],
                },
                currentOwner: {
                    $ifNull: [
                        {
                            $first: '$currentOwner',
                        },
                        '$artistInfo',
                    ],
                },
                artist: '$artistInfo',
                artworkArtistInfo: {
                    $ifNull: [
                        {
                            $first: '$artworkArtistInfo',
                        },
                        {
                            $ifNull: [
                                {
                                    $first: '$invitedArtworkArtistInfo',
                                },
                                null,
                            ],
                        },
                    ],
                },
                collaboratorUsers: 1,
                activity: 1,
            },
        },
    );
    const result = await query.aggregate(pipeline);
    return result[0];
});

/**************************************************************************/
/*****************************    Profile   *******************************/
/**************************************************************************/

Parse.Cloud.define('fetchProfileDetails', async (request: any) => {
    const query = new Parse.Query('_User', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                username: request.params.username,
            },
        },
        {
            lookup: {
                from: 'UserInfo',
                localField: '_id',
                foreignField: 'userId',
                as: 'userInfo',
            },
        },
        {
            lookup: {
                from: 'ArtistVerification',
                localField: '_id',
                foreignField: 'userId',
                as: 'artistVerification',
            },
        },
        {
            lookup: {
                from: 'TrackMinted',
                let: { ethAddress: '$ethAddress' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ['$$ethAddress', '$collaborators.address'] },
                        },
                    },
                    {
                        $count: 'numberOfTracks',
                    },
                    {
                        $project: {
                            numberOfTracks: 1,
                        },
                    },
                ],
                as: 'tracksMinted',
            },
        },
        {
            lookup: {
                from: 'Favourites',
                let: { ethAddress: '$ethAddress' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$ethAddress', '$$ethAddress'] },
                        },
                    },
                    {
                        $count: 'numberOfFavouriteTokens',
                    },
                    {
                        $project: {
                            numberOfFavouriteTokens: 1,
                        },
                    },
                ],
                as: 'numberOfFavourites',
            },
        },
        {
            lookup: {
                from: 'Favourites',
                let: { ethAddress: '$ethAddress' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$ethAddress', '$$ethAddress'] },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'TrackMinted',
                                        let: { trackId: '$trackId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                            {
                                                $lookup: {
                                                    from: '_User',
                                                    let: { collaborators: '$collaborators' },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: {
                                                                    $in: ['$ethAddress', '$$collaborators.address'],
                                                                },
                                                            },
                                                        },
                                                        {
                                                            $lookup: {
                                                                from: 'UserInfo',
                                                                localField: '_id',
                                                                foreignField: 'userId',
                                                                as: 'userInfo',
                                                            },
                                                        },
                                                        {
                                                            $project: {
                                                                _id: 0,
                                                                name: 1,
                                                                username: 1,
                                                                ethAddress: 1,
                                                                avatar: { $first: '$userInfo.avatar' },
                                                            },
                                                        },
                                                    ],
                                                    as: 'collaboratorUsers',
                                                },
                                            },
                                            {
                                                $lookup: {
                                                    from: 'TokenCreated',
                                                    let: { trackId: '$trackId' },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] },
                                                            },
                                                        },
                                                        {
                                                            $lookup: {
                                                                from: 'TokenPriceUpdated',
                                                                let: { tokenId: '$tokenId' },
                                                                pipeline: [
                                                                    {
                                                                        $match: {
                                                                            $expr: {
                                                                                $and: [
                                                                                    { $eq: ['$tokenId', '$$tokenId'] },
                                                                                ],
                                                                            },
                                                                        },
                                                                    },
                                                                    { $sort: { block_timestamp: -1 } },
                                                                    { $limit: 1 },
                                                                    { $project: { _id: 0, price: '$newPrice' } },
                                                                ],
                                                                as: 'tokenPriceUpdated',
                                                            },
                                                        },
                                                        {
                                                            $project: {
                                                                _id: 0,
                                                                tokenId: 1,
                                                                localTokenId: 1,
                                                                price: {
                                                                    $ifNull: [
                                                                        {
                                                                            $first: '$tokenPriceUpdated.price',
                                                                        },
                                                                        '$price',
                                                                    ],
                                                                },
                                                            },
                                                        },
                                                    ],
                                                    as: 'otherTokensOfTrack',
                                                },
                                            },
                                            {
                                                $project: {
                                                    _id: 0,
                                                    trackId: 1,
                                                    artwork: 1,
                                                    artist: 1,
                                                    artistAddress: 1,
                                                    audio: 1,
                                                    collaborators: 1,
                                                    numberOfCopies: 1,
                                                    genre: 1,
                                                    title: 1,
                                                    collaboratorUsers: 1,
                                                    otherTokensOfTrack: 1,
                                                },
                                            },
                                        ],
                                        as: 'favouriteToken',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { creator: '$creator' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                                            {
                                                $project: {
                                                    _id: 0,
                                                    username: 1,
                                                    ethAddress: 1,
                                                    isArtistVerified: 1,
                                                },
                                            },
                                        ],
                                        as: 'artistUser',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: 'TokenPriceUpdated',
                                        let: { tokenId: '$tokenId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                            { $sort: { block_timestamp: -1 } },
                                            { $limit: 1 },
                                            { $project: { _id: 0, price: '$newPrice' } },
                                        ],
                                        as: 'tokenPriceUpdated',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        localTokenId: '$localTokenId',
                                        price: {
                                            $ifNull: [
                                                {
                                                    $first: '$tokenPriceUpdated.price',
                                                },
                                                '$price',
                                            ],
                                        },
                                        isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                                        favouriteToken: { $first: '$favouriteToken' },
                                    },
                                },
                                {
                                    $replaceRoot: {
                                        newRoot: {
                                            $mergeObjects: ['$$ROOT', '$favouriteToken'],
                                        },
                                    },
                                },
                                {
                                    $unset: 'favouriteToken',
                                },
                            ],
                            as: 'favouriteTokens',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            tokenId: 1,
                            favouriteTokens: { $first: '$favouriteTokens' },
                        },
                    },
                    {
                        $replaceRoot: {
                            newRoot: {
                                $mergeObjects: ['$$ROOT', '$favouriteTokens'],
                            },
                        },
                    },
                    {
                        $unset: 'favouriteTokens',
                    },
                ],
                as: 'favourites',
            },
        },
        {
            lookup: {
                from: 'Followers',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$follower_userId', '$$userId'] },
                        },
                    },
                    {
                        $count: 'numberOfFollowing',
                    },
                    {
                        $project: {
                            numberOfFollowing: 1,
                        },
                    },
                ],
                as: 'following',
            },
        },
        {
            lookup: {
                from: 'Followers',
                let: { userId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$following_userId', '$$userId'] },
                        },
                    },
                    {
                        $count: 'numberOfFollowers',
                    },
                    {
                        $project: {
                            numberOfFollowers: 1,
                        },
                    },
                ],
                as: 'followers',
            },
        },
        // fetchTracksByUser "Collection"
        {
            lookup: {
                from: 'TokenPurchased',
                let: { ethAddress: '$ethAddress' },
                pipeline: [
                    { $sort: { block_timestamp: -1 } },
                    {
                        $group: {
                            _id: '$tokenId',
                            tokenId: { $first: '$tokenId' },
                            newOwner: { $first: '$newOwner' },
                            price: { $first: '$price' },
                            block_timestamp: { $first: '$block_timestamp' },
                        },
                    },
                    { $match: { $expr: { $and: [{ $eq: ['$newOwner', '$$ethAddress'] }] } } },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'TrackMinted',
                                        let: { trackId: '$trackId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                            {
                                                $lookup: {
                                                    from: '_User',
                                                    let: { collaborators: '$collaborators' },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: {
                                                                    $in: ['$ethAddress', '$$collaborators.address'],
                                                                },
                                                            },
                                                        },
                                                        {
                                                            $lookup: {
                                                                from: 'UserInfo',
                                                                localField: '_id',
                                                                foreignField: 'userId',
                                                                as: 'userInfo',
                                                            },
                                                        },
                                                        {
                                                            $project: {
                                                                _id: 0,
                                                                name: 1,
                                                                username: 1,
                                                                ethAddress: 1,
                                                                avatar: { $first: '$userInfo.avatar' },
                                                            },
                                                        },
                                                    ],
                                                    as: 'collaboratorUsers',
                                                },
                                            },
                                            {
                                                $project: {
                                                    _id: 0,
                                                    trackId: 1,
                                                    artwork: 1,
                                                    artist: 1,
                                                    artistAddress: 1,
                                                    audio: 1,
                                                    collaborators: 1,
                                                    numberOfCopies: 1,
                                                    genre: 1,
                                                    title: 1,
                                                    collaboratorUsers: 1,
                                                },
                                            },
                                        ],
                                        as: 'collectedToken',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { creator: '$creator' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                                            {
                                                $project: {
                                                    _id: 0,
                                                    username: 1,
                                                    ethAddress: 1,
                                                    isArtistVerified: 1,
                                                },
                                            },
                                        ],
                                        as: 'artistUser',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: 'TokenPriceUpdated',
                                        let: { tokenId: '$tokenId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                            { $sort: { block_timestamp: -1 } },
                                            { $limit: 1 },
                                            { $project: { _id: 0, price: '$newPrice' } },
                                        ],
                                        as: 'tokenPriceUpdated',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        localTokenId: '$localTokenId',
                                        price: {
                                            $ifNull: [
                                                {
                                                    $first: '$tokenPriceUpdated.price',
                                                },
                                                '$price',
                                            ],
                                        },
                                        isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                                        collectedToken: { $first: '$collectedToken' },
                                    },
                                },
                                {
                                    $replaceRoot: {
                                        newRoot: {
                                            $mergeObjects: ['$$ROOT', '$collectedToken'],
                                        },
                                    },
                                },
                                {
                                    $unset: 'collectedToken',
                                },
                            ],
                            as: 'collectedTokens',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            tokenId: 1,
                            collectedTokens: { $first: '$collectedTokens' },
                        },
                    },
                    {
                        $replaceRoot: {
                            newRoot: {
                                $mergeObjects: ['$$ROOT', '$collectedTokens'],
                            },
                        },
                    },
                    {
                        $unset: 'collectedTokens',
                    },
                ],
                as: 'collection',
            },
        },
        // fetchTracksByUser "New Releases"
        {
            lookup: {
                from: 'TrackMinted',
                let: { ethAddress: '$ethAddress' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ['$$ethAddress', '$collaborators.address'] },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            localField: 'trackId',
                            foreignField: 'trackId',
                            as: 'similarTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPurchased',
                            let: { similarTokens: '$similarTokens' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$tokenId', '$$similarTokens.tokenId'] } } },
                                { $sort: { price: -1 } },
                                { $sort: { block_timestamp: -1 } },
                                { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' } } },
                            ],
                            as: 'purchasedTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { purchasedTokens: '$purchasedTokens' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$tokenId', '$$purchasedTokens.tokenId'] } } },
                                { $sort: { block_timestamp: -1 } },
                                {
                                    $group: {
                                        _id: '$tokenId',
                                        tokenId: { $first: '$tokenId' },
                                        price: { $first: '$newPrice' },
                                    },
                                },
                                { $sort: { price: 1 } },
                            ],
                            as: 'tokensPriceUpdated',
                        },
                    },
                    {
                        $addFields: {
                            similarTokens_size: { $size: '$similarTokens' },
                            purchasedTokens_size: { $size: '$purchasedTokens' },
                            unsoldTokens: { $setDifference: ['$similarTokens.tokenId', '$purchasedTokens.tokenId'] },
                            tokensPriceNotUpdated: {
                                $setDifference: ['$similarTokens.tokenId', '$tokensPriceUpdated.tokenId'],
                            },
                        },
                    },
                    {
                        $addFields: {
                            unsoldTokens_size: { $size: '$unsoldTokens' },
                        },
                    },
                    { $match: { $expr: { $ne: ['$similarTokens_size', '$purchasedTokens_size'] } } },
                    {
                        $addFields: {
                            tokenIdHavingLowestPrice: {
                                $ifNull: [
                                    {
                                        $first: '$unsoldTokens',
                                    },
                                    {
                                        $ifNull: [
                                            {
                                                $first: '$tokensPriceNotUpdated',
                                            },
                                            {
                                                $first: '$tokensPriceUpdated.tokenId',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { tokenIdHavingLowestPrice: '$tokenIdHavingLowestPrice' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenIdHavingLowestPrice'] }] } } },
                            ],
                            as: 'tokenHavingLowestPrice',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { creator: '$creator' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                                {
                                    $project: {
                                        _id: 0,
                                        username: 1,
                                        ethAddress: 1,
                                        isArtistVerified: 1,
                                    },
                                },
                            ],
                            as: 'artistUser',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { collaborators: '$collaborators' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$ethAddress', '$$collaborators.address'] } } },
                                {
                                    $lookup: {
                                        from: 'UserInfo',
                                        localField: '_id',
                                        foreignField: 'userId',
                                        as: 'userInfo',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        name: 1,
                                        username: 1,
                                        ethAddress: 1,
                                        avatar: { $first: '$userInfo.avatar' },
                                    },
                                },
                            ],
                            as: 'collaboratorUsers',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { trackId: '$trackId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'TokenPriceUpdated',
                                        let: { tokenId: '$tokenId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                            { $sort: { block_timestamp: -1 } },
                                            { $limit: 1 },
                                            { $project: { _id: 0, price: '$newPrice' } },
                                        ],
                                        as: 'tokenPriceUpdated',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        tokenId: 1,
                                        localTokenId: 1,
                                        price: {
                                            $ifNull: [
                                                {
                                                    $first: '$tokenPriceUpdated.price',
                                                },
                                                '$price',
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: 'otherTokensOfTrack',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            block_timestamp: 1,
                            trackId: 1,
                            tokenId: '$tokenIdHavingLowestPrice',
                            localTokenId: { $first: '$tokenHavingLowestPrice.localTokenId' },
                            title: 1,
                            artist: 1,
                            artistAddress: 1,
                            isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                            artwork: 1,
                            audio: 1,
                            genre: 1,
                            numberOfCopies: 1,
                            collaborators: 1,
                            collaboratorUsers: 1,
                            otherTokensOfTrack: 1,
                            price: {
                                $ifNull: [
                                    {
                                        $cond: [{ $gt: ['$unsoldTokens_size', 0] }, '$price', null],
                                    },
                                    {
                                        $ifNull: [
                                            {
                                                $cond: [
                                                    { $ne: [{ $size: '$tokensPriceNotUpdated' }, 0] },
                                                    '$price',
                                                    null,
                                                ],
                                            },
                                            {
                                                $first: '$tokensPriceUpdated.price',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    { $sort: { block_timestamp: -1 } },
                ],
                as: 'newReleases',
            },
        },
        // fetchTracksByUser "Sold Out"
        {
            lookup: {
                from: 'TrackMinted',
                let: { ethAddress: '$ethAddress' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ['$$ethAddress', '$collaborators.address'] },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            localField: 'trackId',
                            foreignField: 'trackId',
                            as: 'similarTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPurchased',
                            let: { similarTokens: '$similarTokens' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$tokenId', '$$similarTokens.tokenId'] } } },
                                { $sort: { price: -1 } },
                                { $sort: { block_timestamp: -1 } },
                                { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' } } },
                            ],
                            as: 'purchasedTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { purchasedTokens: '$purchasedTokens' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$tokenId', '$$purchasedTokens.tokenId'] } } },
                                { $sort: { block_timestamp: -1 } },
                                {
                                    $group: {
                                        _id: '$tokenId',
                                        tokenId: { $first: '$tokenId' },
                                        price: { $first: '$newPrice' },
                                    },
                                },
                                { $sort: { price: 1 } },
                            ],
                            as: 'tokensPriceUpdated',
                        },
                    },
                    {
                        $addFields: {
                            similarTokens_size: { $size: '$similarTokens' },
                            purchasedTokens_size: { $size: '$purchasedTokens' },
                            unsoldTokens: { $setDifference: ['$similarTokens.tokenId', '$purchasedTokens.tokenId'] },
                            tokensPriceNotUpdated: {
                                $setDifference: ['$similarTokens.tokenId', '$tokensPriceUpdated.tokenId'],
                            },
                        },
                    },
                    {
                        $addFields: {
                            unsoldTokens_size: { $size: '$unsoldTokens' },
                        },
                    },
                    { $match: { $expr: { $eq: ['$similarTokens_size', '$purchasedTokens_size'] } } },
                    {
                        $addFields: {
                            tokenIdHavingLowestPrice: {
                                $ifNull: [
                                    {
                                        $first: '$unsoldTokens',
                                    },
                                    {
                                        $ifNull: [
                                            {
                                                $first: '$tokensPriceNotUpdated',
                                            },
                                            {
                                                $first: '$tokensPriceUpdated.tokenId',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { tokenIdHavingLowestPrice: '$tokenIdHavingLowestPrice' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenIdHavingLowestPrice'] }] } } },
                            ],
                            as: 'tokenHavingLowestPrice',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { creator: '$creator' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                                {
                                    $project: {
                                        _id: 0,
                                        username: 1,
                                        ethAddress: 1,
                                        isArtistVerified: 1,
                                    },
                                },
                            ],
                            as: 'artistUser',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { collaborators: '$collaborators' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$ethAddress', '$$collaborators.address'] } } },
                                {
                                    $lookup: {
                                        from: 'UserInfo',
                                        localField: '_id',
                                        foreignField: 'userId',
                                        as: 'userInfo',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        name: 1,
                                        username: 1,
                                        ethAddress: 1,
                                        avatar: { $first: '$userInfo.avatar' },
                                    },
                                },
                            ],
                            as: 'collaboratorUsers',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { trackId: '$trackId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'TokenPriceUpdated',
                                        let: { tokenId: '$tokenId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                            { $sort: { block_timestamp: -1 } },
                                            { $limit: 1 },
                                            { $project: { _id: 0, price: '$newPrice' } },
                                        ],
                                        as: 'tokenPriceUpdated',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        tokenId: 1,
                                        localTokenId: 1,
                                        price: {
                                            $ifNull: [
                                                {
                                                    $first: '$tokenPriceUpdated.price',
                                                },
                                                '$price',
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: 'otherTokensOfTrack',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            block_timestamp: 1,
                            trackId: 1,
                            tokenId: '$tokenIdHavingLowestPrice',
                            localTokenId: { $first: '$tokenHavingLowestPrice.localTokenId' },
                            title: 1,
                            artist: 1,
                            artistAddress: 1,
                            isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                            artwork: 1,
                            audio: 1,
                            genre: 1,
                            numberOfCopies: 1,
                            collaborators: 1,
                            collaboratorUsers: 1,
                            otherTokensOfTrack: 1,
                            price: {
                                $ifNull: [
                                    {
                                        $cond: [{ $gt: ['$unsoldTokens_size', 0] }, '$price', null],
                                    },
                                    {
                                        $ifNull: [
                                            {
                                                $cond: [
                                                    { $ne: [{ $size: '$tokensPriceNotUpdated' }, 0] },
                                                    '$price',
                                                    null,
                                                ],
                                            },
                                            {
                                                $first: '$tokensPriceUpdated.price',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    { $sort: { block_timestamp: -1 } },
                ],
                as: 'soldOut',
            },
        },
        {
            project: {
                _id: 0,
                ethAddress: 1,
                name: 1,
                username: 1,
                isArtist: 1,
                isArtistVerified: 1,
                createdAt: 1,
                avatar: { $first: '$userInfo.avatar' },
                coverImage: { $first: '$userInfo.coverImage' },
                spotify: { $first: '$userInfo.spotify' },
                instagram: { $first: '$userInfo.instagram' },
                facebook: { $first: '$userInfo.facebook' },
                twitter: { $first: '$userInfo.twitter' },
                bio: { $first: '$userInfo.bio' },
                country: { $first: '$userInfo.country' },
                verificationRequested: { $first: '$artistVerification.verificationRequested' },
                numberOfTracksByArtist: { $first: '$tracksMinted.numberOfTracks' },
                numberOfFavouriteTokens: { $first: '$numberOfFavourites.numberOfFavouriteTokens' },
                numberOfFollowing: { $first: '$following.numberOfFollowing' },
                numberOfFollowers: { $first: '$followers.numberOfFollowers' },
                favourites: '$favourites',
                collection: '$collection',
                newReleases: '$newReleases',
                soldOut: '$soldOut',
            },
        },
    ];
    const result = await query.aggregate(pipeline);
    return result[0];
});

async function fetchTracksByUser(request: any) {
    const { username, currentlyActive, sortingFilter } = request.params;

    if (currentlyActive === 'Collection') {
        const query = new Parse.Query('_User', { useMasterKey: true });
        const pipeline = [
            {
                match: {
                    username: username,
                },
            },
            {
                lookup: {
                    from: 'TokenPurchased',
                    let: { ethAddress: '$ethAddress' },
                    pipeline: [
                        { $sort: { block_timestamp: -1 } },
                        {
                            $group: {
                                _id: '$tokenId',
                                tokenId: { $first: '$tokenId' },
                                newOwner: { $first: '$newOwner' },
                                price: { $first: '$price' },
                                block_timestamp: { $first: '$block_timestamp' },
                            },
                        },
                        { $match: { $expr: { $and: [{ $eq: ['$newOwner', '$$ethAddress'] }] } } },
                        {
                            $lookup: {
                                from: 'TokenCreated',
                                let: { tokenId: '$tokenId' },
                                pipeline: [
                                    { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                    {
                                        $lookup: {
                                            from: 'TrackMinted',
                                            let: { trackId: '$trackId' },
                                            pipeline: [
                                                { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                                {
                                                    $lookup: {
                                                        from: '_User',
                                                        let: { collaborators: '$collaborators' },
                                                        pipeline: [
                                                            {
                                                                $match: {
                                                                    $expr: {
                                                                        $in: ['$ethAddress', '$$collaborators.address'],
                                                                    },
                                                                },
                                                            },
                                                            {
                                                                $lookup: {
                                                                    from: 'UserInfo',
                                                                    localField: '_id',
                                                                    foreignField: 'userId',
                                                                    as: 'userInfo',
                                                                },
                                                            },
                                                            {
                                                                $project: {
                                                                    _id: 0,
                                                                    name: 1,
                                                                    username: 1,
                                                                    ethAddress: 1,
                                                                    avatar: { $first: '$userInfo.avatar' },
                                                                },
                                                            },
                                                        ],
                                                        as: 'collaboratorUsers',
                                                    },
                                                },
                                                {
                                                    $project: {
                                                        _id: 0,
                                                        trackId: 1,
                                                        artwork: 1,
                                                        artist: 1,
                                                        artistAddress: 1,
                                                        audio: 1,
                                                        collaborators: 1,
                                                        numberOfCopies: 1,
                                                        genre: 1,
                                                        title: 1,
                                                        collaboratorUsers: 1,
                                                    },
                                                },
                                            ],
                                            as: 'collectedToken',
                                        },
                                    },
                                    {
                                        $lookup: {
                                            from: '_User',
                                            let: { creator: '$creator' },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] },
                                                    },
                                                },
                                                {
                                                    $project: {
                                                        _id: 0,
                                                        username: 1,
                                                        ethAddress: 1,
                                                        isArtistVerified: 1,
                                                    },
                                                },
                                            ],
                                            as: 'artistUser',
                                        },
                                    },
                                    {
                                        $lookup: {
                                            from: 'TokenPriceUpdated',
                                            let: { tokenId: '$tokenId' },
                                            pipeline: [
                                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                                { $sort: { block_timestamp: -1 } },
                                                { $limit: 1 },
                                                { $project: { _id: 0, price: '$newPrice' } },
                                            ],
                                            as: 'tokenPriceUpdated',
                                        },
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            localTokenId: '$localTokenId',
                                            price: {
                                                $ifNull: [
                                                    {
                                                        $first: '$tokenPriceUpdated.price',
                                                    },
                                                    '$price',
                                                ],
                                            },
                                            isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                                            collectedToken: { $first: '$collectedToken' },
                                        },
                                    },
                                    {
                                        $replaceRoot: {
                                            newRoot: {
                                                $mergeObjects: ['$$ROOT', '$collectedToken'],
                                            },
                                        },
                                    },
                                    {
                                        $unset: 'collectedToken',
                                    },
                                ],
                                as: 'collectedTokens',
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                tokenId: 1,
                                collectedTokens: { $first: '$collectedTokens' },
                            },
                        },
                        {
                            $replaceRoot: {
                                newRoot: {
                                    $mergeObjects: ['$$ROOT', '$collectedTokens'],
                                },
                            },
                        },
                        {
                            $unset: 'collectedTokens',
                        },
                    ],
                    as: 'collection',
                },
            },
            {
                project: {
                    _id: 0,
                    collection: 1,
                },
            },
            { unwind: '$collection' },
            { replaceRoot: { newRoot: '$collection' } },
        ];
        const result = await query.aggregate(pipeline);
        return result;
    }

    const _query = new Parse.Query('_User', { useMasterKey: true });
    const _pipeline = [
        {
            match: {
                username: username,
            },
        },
        {
            project: {
                _id: 1,
                ethAddress: 1,
                name: 1,
                username: 1,
            },
        },
    ];
    const _result = await _query.aggregate(_pipeline);
    const { ethAddress } = _result[0];

    const query = new Parse.Query('TrackMinted');
    // Sort based on conditions
    let sorting_condition;
    if (sortingFilter) {
        if (sortingFilter === 'Newest First') {
            sorting_condition = { block_timestamp: -1 };
        } else if (sortingFilter === 'Oldest First') {
            sorting_condition = { block_timestamp: 1 };
        } else if (sortingFilter === 'Price- High to Low') {
            sorting_condition = { price: -1 };
        } else if (sortingFilter === 'Price- Low to High') {
            sorting_condition = { price: 1 };
        }
    }

    const pipeline = [];
    if (currentlyActive === 'Creations') {
        pipeline.push({
            match: {
                artistAddress: ethAddress,
            },
        });
    } else {
        pipeline.push({
            match: {
                $expr: { $in: [ethAddress, '$collaborators.address'] },
            },
        });
    }
    pipeline.push(
        {
            lookup: {
                from: 'TokenCreated',
                localField: 'trackId',
                foreignField: 'trackId',
                as: 'similarTokens',
            },
        },
        {
            lookup: {
                from: 'TokenPurchased',
                let: { similarTokens: '$similarTokens' },
                pipeline: [
                    { $match: { $expr: { $in: ['$tokenId', '$$similarTokens.tokenId'] } } },
                    { $sort: { price: -1 } },
                    { $sort: { block_timestamp: -1 } },
                    { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' } } },
                ],
                as: 'purchasedTokens',
            },
        },
        {
            lookup: {
                from: 'TokenPriceUpdated',
                let: { purchasedTokens: '$purchasedTokens' },
                pipeline: [
                    { $match: { $expr: { $in: ['$tokenId', '$$purchasedTokens.tokenId'] } } },
                    { $sort: { block_timestamp: -1 } },
                    { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' }, price: { $first: '$newPrice' } } },
                    { $sort: { price: 1 } },
                ],
                as: 'tokensPriceUpdated',
            },
        },
        {
            addFields: {
                similarTokens_size: { $size: '$similarTokens' },
                purchasedTokens_size: { $size: '$purchasedTokens' },
                unsoldTokens: { $setDifference: ['$similarTokens.tokenId', '$purchasedTokens.tokenId'] },
                tokensPriceNotUpdated: { $setDifference: ['$similarTokens.tokenId', '$tokensPriceUpdated.tokenId'] },
            },
        },
        {
            addFields: {
                unsoldTokens_size: { $size: '$unsoldTokens' },
            },
        },
    );

    if (currentlyActive === 'New Releases') {
        pipeline.push({ match: { $expr: { $ne: ['$similarTokens_size', '$purchasedTokens_size'] } } });
    }

    if (currentlyActive === 'Sold Out') {
        pipeline.push({ match: { $expr: { $eq: ['$similarTokens_size', '$purchasedTokens_size'] } } });
    }

    pipeline.push(
        {
            addFields: {
                tokenIdHavingLowestPrice: {
                    $ifNull: [
                        {
                            $first: '$unsoldTokens',
                        },
                        {
                            $ifNull: [
                                {
                                    $first: '$tokensPriceNotUpdated',
                                },
                                {
                                    $first: '$tokensPriceUpdated.tokenId',
                                },
                            ],
                        },
                    ],
                },
            },
        },
        {
            lookup: {
                from: 'TokenCreated',
                let: { tokenIdHavingLowestPrice: '$tokenIdHavingLowestPrice' },
                pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenIdHavingLowestPrice'] }] } } }],
                as: 'tokenHavingLowestPrice',
            },
        },
        {
            lookup: {
                from: '_User',
                let: { creator: '$creator' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                    {
                        $project: {
                            _id: 0,
                            username: 1,
                            ethAddress: 1,
                            isArtistVerified: 1,
                        },
                    },
                ],
                as: 'artistUser',
            },
        },
        {
            lookup: {
                from: '_User',
                let: { collaborators: '$collaborators' },
                pipeline: [
                    { $match: { $expr: { $in: ['$ethAddress', '$$collaborators.address'] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            name: 1,
                            username: 1,
                            ethAddress: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'collaboratorUsers',
            },
        },
        {
            lookup: {
                from: 'TokenCreated',
                let: { trackId: '$trackId' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                { $sort: { block_timestamp: -1 } },
                                { $limit: 1 },
                                { $project: { _id: 0, price: '$newPrice' } },
                            ],
                            as: 'tokenPriceUpdated',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            tokenId: 1,
                            localTokenId: 1,
                            price: {
                                $ifNull: [
                                    {
                                        $first: '$tokenPriceUpdated.price',
                                    },
                                    '$price',
                                ],
                            },
                        },
                    },
                ],
                as: 'otherTokensOfTrack',
            },
        },
        {
            project: {
                _id: 0,
                block_timestamp: 1,
                trackId: 1,
                tokenId: '$tokenIdHavingLowestPrice',
                localTokenId: { $first: '$tokenHavingLowestPrice.localTokenId' },
                title: 1,
                artist: 1,
                artistAddress: 1,
                isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                artwork: 1,
                audio: 1,
                genre: 1,
                numberOfCopies: 1,
                collaborators: 1,
                collaboratorUsers: 1,
                otherTokensOfTrack: 1,
                price: {
                    $ifNull: [
                        {
                            $cond: [{ $gt: ['$unsoldTokens_size', 0] }, '$price', null],
                        },
                        {
                            $ifNull: [
                                {
                                    $cond: [{ $ne: [{ $size: '$tokensPriceNotUpdated' }, 0] }, '$price', null],
                                },
                                {
                                    $first: '$tokensPriceUpdated.price',
                                },
                            ],
                        },
                    ],
                },
            },
        },
        { sort: sorting_condition },
    );

    const result = await query.aggregate(pipeline);
    return result;
}

Parse.Cloud.define('fetchTracksByUser', async (request: any) => {
    const result = await fetchTracksByUser(request);
    return result;
});

Parse.Cloud.define('fetchFollowers', async (request: any) => {
    const { username } = request.params;

    const userQuery = new Parse.Query('_User', { useMasterKey: true });
    userQuery.equalTo('username', username);
    const profileUser = await userQuery.first({ useMasterKey: true });

    const query = new Parse.Query('Followers', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                following_userId: profileUser.id,
            },
        },
        {
            lookup: {
                from: '_User',
                localField: 'follower_userId',
                foreignField: '_id',
                as: 'followers',
            },
        },
        {
            lookup: {
                from: 'UserInfo',
                localField: 'followers._id',
                foreignField: 'userId',
                as: 'userInfo',
            },
        },
        {
            project: {
                name: { $first: '$followers.name' },
                username: { $first: '$followers.username' },
                avatar: { $first: '$userInfo.avatar' },
            },
        },
    ];

    const result = await query.aggregate(pipeline);
    return result;
});

Parse.Cloud.define('fetchFollowing', async (request: any) => {
    const { username } = request.params;

    const userQuery = new Parse.Query('_User', { useMasterKey: true });
    userQuery.equalTo('username', username);
    const profileUser = await userQuery.first({ useMasterKey: true });

    const query = new Parse.Query('Followers', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                follower_userId: profileUser.id,
            },
        },
        {
            lookup: {
                from: '_User',
                localField: 'following_userId',
                foreignField: '_id',
                as: 'following',
            },
        },
        {
            lookup: {
                from: 'UserInfo',
                localField: 'following._id',
                foreignField: 'userId',
                as: 'userInfo',
            },
        },
        {
            project: {
                name: { $first: '$following.name' },
                username: { $first: '$following.username' },
                avatar: { $first: '$userInfo.avatar' },
            },
        },
    ];

    const result = await query.aggregate(pipeline);
    return result;
});

/**************************************************************************/
/****************************    Settings   *******************************/
/**************************************************************************/

Parse.Cloud.define('fetchUserInfo', async (request: any) => {
    const query = new Parse.Query('_User', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                _id: request.params.userId,
            },
        },
        {
            lookup: {
                from: 'UserInfo',
                localField: '_id',
                foreignField: 'userId',
                as: 'userInfo',
            },
        },
        {
            project: {
                _id: 1,
                ethAddress: 1,
                name: 1,
                username: 1,
                avatar: { $first: '$userInfo.avatar' },
                coverImage: { $first: '$userInfo.coverImage' },
                bio: { $first: '$userInfo.bio' },
                spotify: { $first: '$userInfo.spotify' },
                instagram: { $first: '$userInfo.instagram' },
                twitter: { $first: '$userInfo.twitter' },
                facebook: { $first: '$userInfo.facebook' },
                country: { $first: '$userInfo.country' },
                state: { $first: '$userInfo.state' },
                city: { $first: '$userInfo.city' },
            },
        },
    ];

    const result = await query.aggregate(pipeline);
    return result[0];
});

Parse.Cloud.define('fetchUserPreferences', async (request: any) => {
    const query = new Parse.Query('UserPreferences', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                userId: request.params.userId,
            },
        },
    ];

    const result = await query.aggregate(pipeline);
    return result[0];
});

Parse.Cloud.define('updateUserInfo', async (request: any) => {
    const query = new Parse.Query('UserInfo');
    query.equalTo('userId', request.user.id);
    const queryResult = await query.first();

    if (queryResult) {
        queryResult.set('avatar', request.params.avatar);
        queryResult.set('coverImage', request.params.coverImage);
        queryResult.set('bio', request.params.bio);
        queryResult.set('spotify', request.params.spotify);
        queryResult.set('instagram', request.params.instagram);
        queryResult.set('twitter', request.params.twitter);
        queryResult.set('facebook', request.params.facebook);
        queryResult.set('country', request.params.country);
        queryResult.set('state', request.params.state);
        queryResult.set('city', request.params.city);

        return queryResult.save();
    }
    return null;
});

Parse.Cloud.define('updateUserPreferences', async (request: any) => {
    const query = new Parse.Query('UserPreferences');
    query.equalTo('user', request.user);
    const queryResult = await query.first();

    if (queryResult) {
        queryResult.set('newsletter', request.params.newsletter);
        queryResult.set('tradeNotifications', request.params.tradeNotifications);

        return queryResult.save();
    }
    return null;
});

/**************************************************************************/
/*****************************    Report   ********************************/
/**************************************************************************/

Parse.Cloud.define('reportProfile', async (request: any) => {
    try {
        if (request.user) {
            const userQuery = new Parse.Query('_User', { useMasterKey: true });
            userQuery.equalTo('username', request.params.username);
            const reportedUser = await userQuery.first({ useMasterKey: true });

            const ProfileReports = Parse.Object.extend('ProfileReports');
            const profileReport = new ProfileReports();

            profileReport.set('reporter_userId', request.user.id);
            profileReport.set('reporter_ethAddress', request.user.attributes.ethAddress);
            profileReport.set('reportedProfile_userId', reportedUser.id);
            profileReport.set('reportedProfile_ethAddress', reportedUser.attributes.ethAddress);
            profileReport.set('reason', request.params.reason);

            const result = profileReport.save().then(
                (_profileReport: any) => {
                    // Execute any logic that should take place after the profileReport is saved
                    return _profileReport.id;
                },
                (error: any) => {
                    // Execute any logic that should take place if the save fails.
                    // error is a Moralis.Error with an error code and message.
                    return error;
                },
            );
            return result;
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('reportNft', async (request: any) => {
    try {
        if (request.user) {
            const NFTReports = Parse.Object.extend('NFTReports');
            const nftReport = new NFTReports();

            nftReport.set('reporter_userId', request.user.id);
            nftReport.set('reporter_ethAddress', request.user.attributes.ethAddress);
            nftReport.set('tokenId', request.params.tokenId);
            nftReport.set('reason', request.params.reason);

            const result = nftReport.save().then(
                (_nftReport: any) => {
                    // Execute any logic that should take place after the nftReport is saved
                    return _nftReport.id;
                },
                (error: any) => {
                    // Execute any logic that should take place if the save fails.
                    // error is a Moralis.Error with an error code and message.
                    return error;
                },
            );
            return result;
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('reportBand', async (request: any) => {
    try {
        if (request.user) {
            const bandQuery = new Parse.Query('Band', { useMasterKey: true });
            bandQuery.equalTo('username', request.params.username);
            const reportedBand = await bandQuery.first({ useMasterKey: true });

            const BandReports = Parse.Object.extend('BandReports');
            const bandReport = new BandReports();

            bandReport.set('reporter_userId', request.user.id);
            bandReport.set('reporter_ethAddress', request.user.attributes.ethAddress);
            bandReport.set('reportedBand_Id', reportedBand.id);
            bandReport.set('reason', request.params.reason);

            const result = bandReport.save().then(
                (_bandReport: any) => {
                    // Execute any logic that should take place after the bandReport is saved
                    return _bandReport.id;
                },
                (error: any) => {
                    // Execute any logic that should take place if the save fails.
                    // error is a Moralis.Error with an error code and message.
                    return error;
                },
            );
            return result;
        }
        return null;
    } catch (error) {
        return error;
    }
});

/**************************************************************************/
/****************************    Favourite   ******************************/
/**************************************************************************/

Parse.Cloud.define('markTokenAsFavourite', async (request: any) => {
    try {
        if (request.user) {
            const query = new Parse.Query('Favourites');
            query.equalTo('tokenId', request.params.tokenId);
            query.equalTo('userId', request.user.id);
            const alreadyFavourite = await query.first({ useMasterKey: true });

            if (alreadyFavourite) {
                alreadyFavourite.destroy({ useMasterKey: true }).then(
                    () => {
                        logger.info('The favourite was deleted successfully.');
                    },
                    (error: any) => {
                        logger.info(error);
                    },
                );
            } else {
                const Favourites = Parse.Object.extend('Favourites');
                const favourite = new Favourites();

                favourite.set('user', request.user);
                favourite.set('userId', request.user.id);
                favourite.set('ethAddress', request.user.attributes.ethAddress);
                favourite.set('tokenId', request.params.tokenId);

                const result = favourite.save().then(
                    (_favourite: any) => {
                        // Execute any logic that should take place after the favourite is saved
                        return _favourite.id;
                    },
                    (error: any) => {
                        // Execute any logic that should take place if the save fails.
                        // error is a Moralis.Error with an error code and message.
                        return error;
                    },
                );
                return result;
            }
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('fetchIsTokenFavourite', async (request: any) => {
    try {
        if (request.user) {
            const query = new Parse.Query('Favourites');
            query.equalTo('tokenId', request.params.tokenId);
            query.equalTo('userId', request.user.id);
            const favourite = await query.first({ useMasterKey: true });

            if (favourite) {
                return true;
            }
            return false;
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('removeTokenFromFavourites', async (request: any) => {
    try {
        if (request.user) {
            const query = new Parse.Query('Favourites');
            query.equalTo('tokenId', request.params.tokenId);
            query.equalTo('userId', request.user.id);
            const alreadyFavourite = await query.first({ useMasterKey: true });

            if (alreadyFavourite) {
                alreadyFavourite.destroy({ useMasterKey: true }).then(
                    () => {
                        logger.info('The favourite was deleted successfully.');
                    },
                    (error: any) => {
                        logger.info(error);
                    },
                );
            }
        }
        return null;
    } catch (error) {
        return error;
    }
});

/**************************************************************************/
/*****************************    Follow   ********************************/
/**************************************************************************/

Parse.Cloud.define('followUser', async (request: any) => {
    try {
        if (request.user) {
            const userQuery = new Parse.Query('_User', { useMasterKey: true });
            userQuery.equalTo('username', request.params.username);
            const followingUser = await userQuery.first({ useMasterKey: true });

            const query = new Parse.Query('Followers');
            query.equalTo('follower_userId', request.user.id);
            query.equalTo('following_userId', followingUser.id);
            const alreadyFollowed = await query.first({ useMasterKey: true });

            if (alreadyFollowed) {
                alreadyFollowed.destroy({ useMasterKey: true }).then(
                    () => {
                        logger.info('The followerRecord was deleted successfully.');
                    },
                    (error: any) => {
                        logger.info(error);
                    },
                );
            } else {
                const Followers = Parse.Object.extend('Followers');
                const followerRecord = new Followers();

                followerRecord.set('follower_userId', request.user.id);
                followerRecord.set('follower_ethAddress', request.user.attributes.ethAddress);
                followerRecord.set('following_userId', followingUser.id);
                followerRecord.set('following_ethAddress', followingUser.attributes.ethAddress);

                const result = followerRecord.save().then(
                    (_followerRecord: any) => {
                        // Execute any logic that should take place after the followerRecord is saved
                        return _followerRecord.id;
                    },
                    (error: any) => {
                        // Execute any logic that should take place if the save fails.
                        // error is a Parse.Error with an error code and message.
                        return error;
                    },
                );
                return result;
            }
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('fetchIsFollowingUser', async (request: any) => {
    try {
        if (request.user) {
            const userQuery = new Parse.Query('_User', { useMasterKey: true });
            userQuery.equalTo('username', request.params.username);
            const followingUser = await userQuery.first({ useMasterKey: true });

            const query = new Parse.Query('Followers');
            query.equalTo('follower_userId', request.user.id);
            query.equalTo('following_userId', followingUser.id);
            const followerRecord = await query.first({ useMasterKey: true });

            if (followerRecord) {
                return true;
            }
            return false;
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('removeFollower', async (request: any) => {
    try {
        if (request.user) {
            const userQuery = new Parse.Query('_User', { useMasterKey: true });
            userQuery.equalTo('username', request.params.username);
            const follower = await userQuery.first({ useMasterKey: true });

            const query = new Parse.Query('Followers');
            query.equalTo('follower_userId', follower.id);
            query.equalTo('following_userId', request.user.id);
            const followerRecord = await query.first({ useMasterKey: true });

            if (followerRecord) {
                followerRecord.destroy({ useMasterKey: true }).then(
                    () => {
                        logger.info('The followerRecord was deleted successfully.');
                    },
                    (error: any) => {
                        logger.info(error);
                    },
                );
            }
        }
        return null;
    } catch (error) {
        return error;
    }
});

/**************************************************************************/
/**********************    Artist Verification   **************************/
/**************************************************************************/

Parse.Cloud.define('setArtistRealName', async (request: any) => {
    if (request.params.userId) {
        const query = new Parse.Query('ArtistVerification');
        query.equalTo('userId', request.params.userId);
        const artist = await query.first({ useMasterKey: true });

        if (!artist) {
            const ArtistVerification = Parse.Object.extend('ArtistVerification');
            const artistVerification = new ArtistVerification();

            artistVerification.set('userId', request.params.userId);
            artistVerification.set('artistRealName', request.params.artistRealName);

            await artistVerification.save();
        } else {
            artist.set('artistRealName', request.params.artistRealName);
            await artist.save();
        }
    }
});

Parse.Cloud.define('getArtistRealName', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('ArtistVerification', { useMasterKey: true });
        const pipeline = [
            {
                match: {
                    userId: request.user.id,
                },
            },
            {
                project: {
                    _id: 1,
                    artistRealName: 1,
                },
            },
        ];

        const result = await query.aggregate(pipeline);
        return result[0].artistRealName;
    }
    return null;
});

Parse.Cloud.define('setPersonaInquiryIdData', async (request: any) => {
    if (request.params.userId) {
        const query = new Parse.Query('ArtistVerification');
        query.equalTo('userId', request.params.userId);
        const artist = await query.first({ useMasterKey: true });

        if (!artist) {
            const ArtistVerification = Parse.Object.extend('ArtistVerification');
            const artistVerification = new ArtistVerification();

            artistVerification.set('userId', request.params.userId);
            artistVerification.set('personaInquiryId', request.params.inquiryId);

            await artistVerification.save();
        } else {
            artist.set('personaInquiryId', request.params.inquiryId);
            await artist.save();
        }
    }
});

Parse.Cloud.define('getPersonaInquiryId', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('ArtistVerification', { useMasterKey: true });
        const pipeline = [
            {
                match: {
                    userId: request.user.id,
                },
            },
            {
                project: {
                    _id: 1,
                    personaInquiryId: 1,
                    createdAt: 1,
                    isPersonaVerified: 1,
                },
            },
        ];

        const result = await query.aggregate(pipeline);
        return result[0];
    }
    return null;
});

Parse.Cloud.define('setPersonaGovernmentIdVerified', async (request: any) => {
    if (request.params.userId && request.params.inquiryStatus === 'passed') {
        const query = new Parse.Query('ArtistVerification');
        query.equalTo('userId', request.params.userId);
        const artistVerificationInfo = await query.first({ useMasterKey: true });

        artistVerificationInfo.set('governmentIdVerificationEventId', request.params.eventId);
        artistVerificationInfo.set('governmentIdVerificationId', request.params.verificationId);
        artistVerificationInfo.set('isPersonaVerified', true);

        await artistVerificationInfo.save();
        return artistVerificationInfo;
    }
    return null;
});

Parse.Cloud.define('setArtistSongLink', async (request: any) => {
    if (request.params.userId) {
        const query = new Parse.Query('ArtistVerification');
        query.equalTo('userId', request.params.userId);
        query.equalTo('isPersonaVerified', true);
        const artistVerificationInfo = await query.first({ useMasterKey: true });

        artistVerificationInfo.set('songLink', request.params.songLink);

        await artistVerificationInfo.save();
        return artistVerificationInfo;
    }
    return null;
});

Parse.Cloud.define('getArtistSongLink', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('ArtistVerification', { useMasterKey: true });
        const pipeline = [
            {
                match: {
                    userId: request.user.id,
                },
            },
            {
                project: {
                    _id: 1,
                    songLink: 1,
                },
            },
        ];

        const result = await query.aggregate(pipeline);
        return result[0].songLink;
    }
    return null;
});

Parse.Cloud.define('getVerificationInfo', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('ArtistVerification', { useMasterKey: true });
        const pipeline = [
            {
                match: {
                    userId: request.user.id,
                },
            },
            {
                project: {
                    _id: 1,
                    artistRealName: 1,
                    instagramHandle: 1,
                    songLink: 1,
                    verificationRequested: 1,
                },
            },
        ];

        const result = await query.aggregate(pipeline);
        return result[0];
    }
    return null;
});

Parse.Cloud.define('setInstagramUsername', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('ArtistVerification');
        query.equalTo('userId', request.user.id);
        query.equalTo('isPersonaVerified', true);
        const artistVerificationInfo = await query.first({ useMasterKey: true });

        artistVerificationInfo.set('instagramHandle', request.params.instagramHandle);

        await artistVerificationInfo.save();
        return artistVerificationInfo;
    }
    return null;
});

Parse.Cloud.define('getInstagramUsername', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('ArtistVerification', { useMasterKey: true });
        const pipeline = [
            {
                match: {
                    userId: request.user.id,
                },
            },
            {
                project: {
                    _id: 1,
                    instagramHandle: 1,
                },
            },
        ];

        const result = await query.aggregate(pipeline);
        return result[0].instagramHandle;
    }
    return null;
});

Parse.Cloud.define('requestForVerification', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('ArtistVerification');
        query.equalTo('userId', request.user.id);
        query.equalTo('isPersonaVerified', true);
        const artistVerificationInfo = await query.first({ useMasterKey: true });

        artistVerificationInfo.set('verificationRequested', true);

        await artistVerificationInfo.save();
        return artistVerificationInfo;
    }
    return null;
});

/**************************************************************************/
/***************************    NFT Creation   ****************************/
/**************************************************************************/

Parse.Cloud.define('fetchUserInfoForNftCreation', async (request: any) => {
    const query = new Parse.Query('_User', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                ethAddress: request.params.userAddress,
            },
        },
        {
            lookup: {
                from: 'UserInfo',
                localField: '_id',
                foreignField: 'userId',
                as: 'userInfo',
            },
        },
        {
            lookup: {
                from: 'NFTDrafts',
                let: { userId: '$_id' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$userId', '$$userId'] }] } } },
                    { $sort: { createdAt: -1 } },
                ],
                as: 'nftDrafts',
            },
        },
        {
            lookup: {
                from: 'Band',
                let: { ethAddress: '$ethAddress' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $in: ['$$ethAddress', '$bandMembers.address'] },
                                    { $eq: ['$isBandVerified', true] },
                                ],
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { bandMembers: '$bandMembers' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $in: ['$_id', '$$bandMembers.userId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'UserInfo',
                                        localField: '_id',
                                        foreignField: 'userId',
                                        as: 'userInfo',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        name: 1,
                                        username: 1,
                                        ethAddress: 1,
                                        avatar: { $first: '$userInfo.avatar' },
                                    },
                                },
                            ],
                            as: 'updatedBandMembersList',
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            username: 1,
                            avatar: 1,
                            bandMembers: 1,
                            updatedBandMembersList: 1,
                        },
                    },
                ],
                as: 'verifiedBandsOfArtist',
            },
        },
        {
            project: {
                _id: 1,
                ethAddress: 1,
                name: 1,
                username: 1,
                avatar: { $first: '$userInfo.avatar' },
                coverImage: { $first: '$userInfo.coverImage' },
                bio: { $first: '$userInfo.bio' },
                spotify: { $first: '$userInfo.spotify' },
                instagram: { $first: '$userInfo.instagram' },
                twitter: { $first: '$userInfo.twitter' },
                facebook: { $first: '$userInfo.facebook' },
                country: { $first: '$userInfo.country' },
                state: { $first: '$userInfo.state' },
                city: { $first: '$userInfo.city' },
                verifiedBandsOfArtist: 1,
                nftDrafts: 1,
            },
        },
    ];

    const result = await query.aggregate(pipeline);
    return result[0];
});

Parse.Cloud.define('saveNftDraft', async (request: any) => {
    const { metadata } = request.params;

    try {
        if (request.user) {
            if (request.params.draftId) {
                const query = new Parse.Query('NFTDrafts');
                query.equalTo('objectId', request.params.draftId);
                query.equalTo('user', request.user);
                const draft = await query.first({ useMasterKey: true });

                draft.set('title', metadata.title);
                draft.set('description', metadata.description);
                draft.set('audio', metadata.audio);
                draft.set('duration', metadata.duration);
                draft.set('mimeType', metadata.mimeType);
                draft.set('lyrics', metadata.lyrics);
                draft.set('creditCoverArtArtist', metadata.creditCoverArtArtist);
                draft.set('coverArtArtist', metadata.coverArtArtist);
                draft.set('artwork', metadata.artwork);
                draft.set('trackOrigin', metadata.trackOrigin);
                draft.set('genre', metadata.genre);
                draft.set('recordingYear', metadata.recordingYear);
                draft.set('parentalAdvisory', metadata.parentalAdvisory);
                draft.set('vocals', metadata.vocals);
                draft.set('language', metadata.language);
                draft.set('countryOfOrigin', metadata.countryOfOrigin);
                draft.set('stateOfOrigin', metadata.stateOfOrigin);
                draft.set('location', metadata.location);
                draft.set('isrc', metadata.isrc);
                draft.set('tags', metadata.tags);
                draft.set('links', metadata.links);
                draft.set('unlockableContent', metadata.unlockableContent);
                draft.set('numberOfCopies', metadata.numberOfCopies);
                draft.set('nftPrice', metadata.nftPrice);
                draft.set('collaboratorList', metadata.collaboratorList);
                draft.set('chosenProfileOrBand', metadata.chosenProfileOrBand);
                draft.set('resaleRoyaltyPercent', metadata.resaleRoyaltyPercent);
                draft.set('releaseNow', metadata.releaseNow);
                draft.set('unlockTimestamp', metadata.unlockTimestamp);

                draft.save();
            } else {
                const NFTDrafts = Parse.Object.extend('NFTDrafts');
                const draft = new NFTDrafts();

                draft.set('user', request.user);
                draft.set('userId', request.user.id);
                draft.set('title', metadata.title);
                draft.set('description', metadata.description);
                draft.set('audio', metadata.audio);
                draft.set('duration', metadata.duration);
                draft.set('mimeType', metadata.mimeType);
                draft.set('lyrics', metadata.lyrics);
                draft.set('creditCoverArtArtist', metadata.creditCoverArtArtist);
                draft.set('coverArtArtist', metadata.coverArtArtist);
                draft.set('artwork', metadata.artwork);
                draft.set('trackOrigin', metadata.trackOrigin);
                draft.set('genre', metadata.genre);
                draft.set('recordingYear', metadata.recordingYear);
                draft.set('parentalAdvisory', metadata.parentalAdvisory);
                draft.set('vocals', metadata.vocals);
                draft.set('language', metadata.language);
                draft.set('countryOfOrigin', metadata.countryOfOrigin);
                draft.set('stateOfOrigin', metadata.stateOfOrigin);
                draft.set('location', metadata.location);
                draft.set('isrc', metadata.isrc);
                draft.set('tags', metadata.tags);
                draft.set('links', metadata.links);
                draft.set('unlockableContent', metadata.unlockableContent);
                draft.set('numberOfCopies', metadata.numberOfCopies);
                draft.set('nftPrice', metadata.nftPrice);
                draft.set('collaboratorList', metadata.collaboratorList);
                draft.set('chosenProfileOrBand', metadata.chosenProfileOrBand);
                draft.set('resaleRoyaltyPercent', metadata.resaleRoyaltyPercent);
                draft.set('releaseNow', metadata.releaseNow);
                draft.set('unlockTimestamp', metadata.unlockTimestamp);

                const result = draft.save().then(
                    (_draft: any) => {
                        // Execute any logic that should take place after the draft is saved
                        return _draft;
                    },
                    (error: any) => {
                        // Execute any logic that should take place if the save fails.
                        // error is a Parse.Error with an error code and message.
                        return error;
                    },
                );
                return result;
            }
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('deleteNftDraft', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('NFTDrafts');
        query.equalTo('objectId', request.params.objectId);
        query.equalTo('user', request.user);
        const draft = await query.first({ useMasterKey: true });
        if (draft) {
            draft.destroy({ useMasterKey: true }).then(
                () => {
                    logger.info('The draft was deleted successfully.');
                },
                (error: any) => {
                    logger.info(error);
                },
            );
        }
    }
});

Parse.Cloud.define('getDraftNftData', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('NFTDrafts');
        query.equalTo('objectId', request.params.objectId);
        query.equalTo('user', request.user);
        const draft = await query.first({ useMasterKey: true });
        return draft;
    }
    return null;
});

Parse.Cloud.define('getUpdatedCollaboratorList', async (request: any) => {
    if (request.user) {
        const query = new Parse.Query('NFTDrafts');
        const pipeline = [
            {
                match: {
                    $expr: {
                        $and: [{ $eq: ['$_id', request.params.objectId] }, { $eq: ['$userId', request.user.id] }],
                    },
                },
            },
            {
                lookup: {
                    from: '_User',
                    let: { collaboratorList: '$collaboratorList' },
                    pipeline: [
                        { $match: { $expr: { $and: [{ $in: ['$_id', '$$collaboratorList.id'] }] } } },
                        {
                            $lookup: {
                                from: 'UserInfo',
                                localField: '_id',
                                foreignField: 'userId',
                                as: 'userInfo',
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                username: 1,
                                ethAddress: 1,
                                isArtistVerified: 1,
                                avatar: { $first: '$userInfo.avatar' },
                            },
                        },
                    ],
                    as: 'updatedCollaboratorList',
                },
            },
            {
                addFields: { updatedCollaboratorList: '$updatedCollaboratorList' },
            },
            { project: { updatedCollaboratorList: 1 } },
        ];

        const result = await query.aggregate(pipeline);
        return result[0].updatedCollaboratorList;
    }
    return null;
});

const sendEmail = async (req: any) => {
    const msg = {
        from: 'Musixverse <no-reply@musixverse.com>',
        to: req.to,
        templateId: req.templateId,
        dynamicTemplateData: req.dynamicTemplateData,
    };
    await sendgridMail.send(msg);
};

const sendMassEmail = async (req: any) => {
    const msg = {
        from: 'Musixverse <no-reply@musixverse.com>',
        to: req.to,
        templateId: req.templateId,
        dynamicTemplateData: req.dynamicTemplateData,
    };
    await sendgridMail.sendMultiple(msg);
};

Parse.Cloud.afterSave('TokenPurchased', async (request: any) => {
    if (!request.object.get('confirmed')) {
        let email_addresses = [];
        if (MUSIXVERSE_ROOT_URL === 'https://musixverse.com') {
            email_addresses = [
                'pushpit@musixverse.com',
                'yuvraj@musixverse.com',
                'shivam@musixverse.com',
                'sparsh@musixverse.com',
                'ayush@musixverse.com',
                'akshit@musixverse.com',
                'ashutosh.bhardwaj6@gmail.com',
                'melvin15may@gmail.com',
                'dhruv.sondhi@gmail.com',
            ];
        } else {
            email_addresses = ['pushpit.19584@sscbs.du.ac.in', 'pushpit@immunebytes.com', 'thenomadiccoder@gmail.com'];
        }
        await sendMassEmail({
            to: email_addresses,
            templateId: 'd-128d5df8c7404b3397beea80e065150c',
            dynamicTemplateData: {
                tokenId: request.object.get('tokenId'),
                price: `${Moralis.Units.FromWei(request.object.get('price'))} MATIC`,
                nftLink: `${MUSIXVERSE_ROOT_URL}/track/polygon/${request.object.get('tokenId')}`,
            },
        });
    }
});

Parse.Cloud.define('sendInviteEmail', async (request: any) => {
    if (request.user) {
        await sendEmail({
            to: request.params.email,
            templateId: 'd-ec15f453693d446789d62df7ff9d04be',
            dynamicTemplateData: {
                name: request.user.attributes.name,
                profileLink: `${MUSIXVERSE_ROOT_URL}/profile/${request.user.attributes.username}`,
                platformLink: MUSIXVERSE_ROOT_URL,
            },
        });

        const InvitedUsers = Parse.Object.extend('InvitedUsers');
        const invitedUser = new InvitedUsers();

        invitedUser.set('user', request.user);
        invitedUser.set('userId', request.user.id);
        invitedUser.set('invitedUserEmail', request.params.email);
        invitedUser.set('joined', false);

        await invitedUser.save();
    }

    logger.info('-------- 🚨 Invite Email Sent! 🚨--------');
});

Parse.Cloud.define('addCollaborator', async (request: any) => {
    const query = new Parse.Query('NFTDrafts');
    const pipeline = [
        {
            match: {
                $expr: {
                    $and: [
                        { $eq: ['$_id', request.params.draftId] },
                        { $in: [request.user.attributes.ethAddress, '$collaboratorList.address'] },
                    ],
                },
            },
        },
    ];
    const result = await query.aggregate(pipeline);

    if (result[0]) {
        const _query = new Parse.Query('NFTDrafts');
        _query.equalTo('objectId', request.params.draftId);
        const _result = await _query.first({ useMasterKey: true });

        _result.attributes.collaboratorList.push(request.params.collaborator);
        await _result.save();

        const invitedUserQuery = new Parse.Query('_User', { useMasterKey: true });
        invitedUserQuery.equalTo('objectId', request.params.collaborator.id);
        const invitedUser = await invitedUserQuery.first({ useMasterKey: true });

        await sendNftCollaboratorInvitationEmail(
            request.params.draftId,
            invitedUser.attributes.email,
            _result.attributes.title,
            request.user.attributes.name,
            request.params.collaborator.name,
            request.params.collaborator.id,
        );
    }
});

Parse.Cloud.define('sendNftCollaboratorInvitationEmailToArtist', async (request: any) => {
    const query = new Parse.Query('NFTDrafts');
    const pipeline = [
        {
            match: {
                $expr: {
                    $and: [
                        { $eq: ['$_id', request.params.draftId] },
                        { $in: [request.user.attributes.ethAddress, '$collaboratorList.address'] },
                    ],
                },
            },
        },
    ];
    const result = await query.aggregate(pipeline);

    if (result[0]) {
        const _query = new Parse.Query('NFTDrafts');
        _query.equalTo('objectId', request.params.draftId);
        const _result = await _query.first({ useMasterKey: true });

        const invitedUserQuery = new Parse.Query('_User', { useMasterKey: true });
        invitedUserQuery.equalTo('objectId', request.params.collaborator.id);
        const invitedUser = await invitedUserQuery.first({ useMasterKey: true });

        await sendNftCollaboratorInvitationEmail(
            request.params.draftId,
            invitedUser.attributes.email,
            _result.attributes.title,
            request.user.attributes.name,
            request.params.collaborator.name,
            request.params.collaborator.id,
        );
    }
});

const sendNftCollaboratorInvitationEmail = async (
    draftId: any,
    collaboratorEmail: any,
    trackName: any,
    inviterName: any,
    collaboratorToInviteName: any,
    collaboratorToInviteId: any,
) => {
    await sendEmail({
        to: collaboratorEmail,
        templateId: 'd-46b0b98c7be547469bbe8d0ec3640470',
        dynamicTemplateData: {
            trackName: trackName,
            inviterName: inviterName,
            name: collaboratorToInviteName,
            confirmNftCollaborationLink: `${MUSIXVERSE_ROOT_URL}/create-nft/confirm?draftId=${draftId}&collaboratorId=${collaboratorToInviteId}`,
        },
    });
};

Parse.Cloud.define('setArtistAcceptedNftCollaborationInvite', async (request: any) => {
    const query = new Parse.Query('NFTDrafts');
    query.equalTo('objectId', request.params.draftId);
    const result = await query.first({ useMasterKey: true });

    if (result) {
        try {
            const index = result.attributes.collaboratorList.findIndex((collaborator: any) => {
                return collaborator.id === request.params.collaboratorId;
            });

            result.attributes.collaboratorList[index].hasAcceptedCollaboratorInvite = true;
            await result.save();

            return JSON.stringify(result);
        } catch (err) {
            return null;
        }
    }
    return null;
});

Parse.Cloud.afterSave('TrackMinted', async (request: any) => {
    if (!request.object.get('artistAddress')) {
        await Parse.Cloud.httpRequest({
            url: IPFS_NODE_URL + request.object.get('URIHash'),
        }).then(
            async (httpResponse: any) => {
                const metadata = httpResponse.data;

                const objectId = request.object.id;
                const TrackMinted = Parse.Object.extend('TrackMinted');
                const query = new Parse.Query(TrackMinted);
                query.equalTo('objectId', objectId);
                const trackMinted = await query.first();

                // success
                trackMinted.set('version', metadata.version);
                trackMinted.set('title', metadata.title);
                trackMinted.set('artist', metadata.artist);
                trackMinted.set('artistAddress', metadata.artistAddress);
                trackMinted.set('bandId', metadata.bandId);
                trackMinted.set('description', metadata.description);
                trackMinted.set('audio', metadata.audio);
                trackMinted.set('duration', metadata.duration);
                trackMinted.set('mimeType', metadata.mimeType);
                trackMinted.set('artwork', metadata.artwork);
                trackMinted.set('lyrics', metadata.lyrics);
                trackMinted.set('genre', metadata.genre);
                trackMinted.set('language', metadata.language);
                trackMinted.set('location', metadata.location);
                trackMinted.set('isrc', metadata.isrc);
                trackMinted.set('tags', metadata.tags);
                trackMinted.set('links', metadata.links);
                trackMinted.set('collaborators', metadata.collaborators);
                trackMinted.set('numberOfCollaborators', metadata.numberOfCollaborators);
                trackMinted.set('license', metadata.license);
                trackMinted.set('unlockTimestamp', metadata.unlockTimestamp);
                trackMinted.set('chainDetails', metadata.chainDetails);
                trackMinted.set('unlockableContent', metadata.unlockableContent);
                trackMinted.set('numberOfCopies', metadata.attributes[0].value);
                trackMinted.set('resaleRoyaltyPercent', metadata.attributes[1].value);
                trackMinted.set('trackOrigin', metadata.attributes[2].value);
                trackMinted.set('recordingYear', metadata.attributes[4].value);
                trackMinted.set('parentalAdvisory', metadata.attributes[5].value);
                trackMinted.set('vocals', metadata.attributes[6].value);
                trackMinted.set('hasCollaborators', metadata.attributes[7].value);

                await trackMinted.save();

                // Revalidate pages on musixverse-client
                const artistQuery = new Parse.Query('_User', { useMasterKey: true });
                artistQuery.equalTo('ethAddress', metadata.artistAddress);
                const artist = await artistQuery.first({ useMasterKey: true });
                await fetch(
                    `${MUSIXVERSE_ROOT_URL}/api/revalidate-mxcatalog?path=/mxcatalog/new-releases&secret=${config.NEXT_PUBLIC_REVALIDATE_SECRET}`,
                );
                await fetch(
                    `${MUSIXVERSE_ROOT_URL}/api/revalidate-profile?path=/profile/${artist.attributes.username}&secret=${config.NEXT_PUBLIC_REVALIDATE_SECRET}`,
                );

                // Delete draft from the database after NFT is created
                const draftQuery = new Parse.Query('NFTDrafts');
                draftQuery.equalTo('userId', artist.id);
                draftQuery.equalTo('title', metadata.title);
                draftQuery.equalTo('language', metadata.language);
                draftQuery.equalTo('description', metadata.description);
                const draft = await draftQuery.first({ useMasterKey: true });
                if (draft) {
                    draft.destroy({ useMasterKey: true }).then(
                        () => {
                            logger.info('The draft was deleted successfully.');
                        },
                        (error: any) => {
                            logger.info(error);
                        },
                    );
                }

                // Send email to all users telling that a new track is released
                const massEmailQuery = new Parse.Query('_User', { useMasterKey: true });
                const pipeline = [
                    {
                        $match: {
                            $expr: {
                                $and: [{ $ne: ['$email', ''] }],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            emails: { $addToSet: '$email' },
                        },
                    },
                    { $project: { _id: 0, emails: 1 } },
                ];
                const result = await massEmailQuery.aggregate(pipeline);

                await sendMassEmail({
                    to: result[0].emails,
                    templateId: 'd-4be726c57abe4be4b6de3c5bdb483aae',
                    dynamicTemplateData: {
                        name: `${metadata.title} by ${metadata.artist}`,
                        artistName: metadata.artist,
                        title: metadata.title,
                        numberOfCopies: metadata.attributes[0].value,
                        nftLink: `${MUSIXVERSE_ROOT_URL}/track/polygon/${request.object.get('maxTokenId')}`,
                    },
                });
            },
            (httpResponse: any) => {
                // if error
                logger.error(`Request failed with response code ${httpResponse.status}`);
            },
        );
    }
});

Parse.Cloud.afterSave('_User', async (request: any) => {
    if (request.object.get('email')) {
        const query = new Parse.Query('InvitedUsers', { useMasterKey: true });
        const pipeline = [
            {
                match: {
                    invitedUserEmail: request.object.get('email'),
                    joined: false,
                },
            },
            {
                lookup: {
                    from: '_User',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userInfo',
                },
            },
            {
                project: {
                    _id: 1,
                    invitedUserEmail: 1,
                    joined: 1,
                    inviterEmail: '$userInfo.email',
                },
            },
        ];
        const results = await query.aggregate(pipeline);

        for (let i = 0; i < results.length; i++) {
            const invitedUserQuery = new Parse.Query('InvitedUsers');
            invitedUserQuery.equalTo('objectId', results[i].objectId);
            // eslint-disable-next-line no-await-in-loop
            const invitedUserObject = await invitedUserQuery.first({ useMasterKey: true });

            // eslint-disable-next-line no-await-in-loop
            await sendEmail({
                to: results[i].inviterEmail[0],
                templateId: 'd-820212f833f34b32a40c52fdb68d7c30',
                dynamicTemplateData: {
                    name: request.object.get('name'),
                    username: request.object.get('username'),
                    profileLink: `${MUSIXVERSE_ROOT_URL}/profile/${request.object.get('username')}`,
                    createNftLink: `${MUSIXVERSE_ROOT_URL}/create-nft`,
                },
            });

            invitedUserObject.set('joined', true);
            // eslint-disable-next-line no-await-in-loop
            await invitedUserObject.save();
        }
    }
});

Parse.Cloud.afterSave('InvitedArtworkArtist', async (request: any) => {
    const query = new Parse.Query('_User', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                _id: request.object.get('userId'),
            },
        },
    ];
    const result = await query.aggregate(pipeline);

    await sendEmail({
        to: request.object.get('invitedArtistEmail'),
        templateId: 'd-28fc27657b2b442fbf7ab20a467f8368',
        dynamicTemplateData: {
            inviterName: result[0].name,
            inviterProfileLink: `${MUSIXVERSE_ROOT_URL}/profile/${result[0].username}`,
            name: request.object.get('invitedArtistName'),
            platformLink: MUSIXVERSE_ROOT_URL,
        },
    });

    logger.info('-------- 🚨 Invite Email Sent! 🚨--------');

    const InvitedUsers = Parse.Object.extend('InvitedUsers');
    const invitedUser = new InvitedUsers();
    invitedUser.set('user', request.object.get('user'));
    invitedUser.set('userId', request.object.get('userId'));
    invitedUser.set('invitedUserEmail', request.object.get('invitedArtistEmail'));
    invitedUser.set('joined', false);

    await invitedUser.save();
});

/**************************************************************************/
/*******************************    Band   ********************************/
/**************************************************************************/

Parse.Cloud.define('fetchUserInfoForAddingToBand', async (request: any) => {
    const query = new Parse.Query('_User', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                _id: request.params.userId,
            },
        },
        {
            lookup: {
                from: 'UserInfo',
                localField: '_id',
                foreignField: 'userId',
                as: 'userInfo',
            },
        },
        {
            project: {
                _id: 1,
                ethAddress: 1,
                name: 1,
                username: 1,
                avatar: { $first: '$userInfo.avatar' },
            },
        },
    ];

    const result = await query.aggregate(pipeline);
    return result[0];
});

Parse.Cloud.define('fetchMatchingVerifiedArtists', async (request: any) => {
    const query = new Parse.Query('_User', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                username: { $regex: `^${request.params.username}` },
            },
        },
        {
            match: {
                $expr: {
                    $and: [
                        { $ne: ['$name', null] },
                        { $eq: ['$isArtist', true] },
                        { $eq: ['$isArtistVerified', true] },
                    ],
                },
            },
        },
        {
            lookup: {
                from: 'UserInfo',
                localField: '_id',
                foreignField: 'userId',
                as: 'userInfo',
            },
        },
        { limit: 5 },
        {
            project: {
                _id: 1,
                ethAddress: 1,
                accounts: 1,
                name: 1,
                username: 1,
                'userInfo.avatar': 1,
            },
        },
    ];

    return query.aggregate(pipeline);
});

Parse.Cloud.define('createBand', async (request: any) => {
    const { bandName, bandUsername, bandDescription, avatar, bandMembers } = request.params;

    try {
        if (request.user) {
            const Band = Parse.Object.extend('Band');
            const band = new Band();

            band.set('creator', request.user);
            band.set('creatorId', request.user.id);
            band.set('creatorAddress', request.user.attributes.ethAddress);
            band.set('name', bandName);
            band.set('username', bandUsername);
            band.set('bio', bandDescription);
            band.set('avatar', avatar);
            band.set('bandMembers', bandMembers);
            band.set('coverImage', 'https://ipfs.moralis.io:2053/ipfs/QmSQ2s8TEKBAdZy3Pm6oy7CPDLZ7dEUQZJ89azN4a2AVUE');
            band.set('instagram', null);
            band.set('facebook', null);
            band.set('twitter', null);
            band.set('spotify', null);
            band.set('country', null);
            band.set('isBandVerified', false);

            band.save().then(
                async (_band: any) => {
                    await sendBandInvitationEmailsAndVerify(band, request.user.attributes.name);
                    return _band.id;
                },
                (error: any) => {
                    // Execute any logic that should take place if the save fails.
                    // error is a Parse.Error with an error code and message.
                    return error;
                },
            );
        }
        return null;
    } catch (error) {
        return error;
    }
});

const sendBandInvitationEmailsAndVerify = async (band: any, inviterName: any) => {
    const query = new Parse.Query('Band', { useMasterKey: true });
    const pipeline = [
        { match: { _id: band.id } },
        {
            lookup: {
                from: '_User',
                let: { bandMembers: '$bandMembers', creatorId: '$creatorId' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [{ $in: ['$_id', '$$bandMembers.userId'] }, { $ne: ['$_id', '$$creatorId'] }],
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            email: 1,
                        },
                    },
                ],
                as: 'bandMembersInfo',
            },
        },
    ];
    const result = await query.aggregate(pipeline);

    const membersToInvite = [];
    // eslint-disable-next-line guard-for-in
    for (const idx in result[0].bandMembersInfo) {
        for (const i in result[0].bandMembers) {
            if (
                result[0].bandMembersInfo[idx]._id === result[0].bandMembers[i].userId &&
                result[0].bandMembers[i].hasAcceptedBandInvite === false
            ) {
                result[0].bandMembersInfo[idx].role = result[0].bandMembers[i].role;
                membersToInvite.push(result[0].bandMembersInfo[idx]);
            }
        }
    }

    // eslint-disable-next-line guard-for-in
    for (const idx in membersToInvite) {
        const _memberToInvite = membersToInvite[idx];
        // eslint-disable-next-line no-await-in-loop
        await sendBandInvitationEmail(
            band.id,
            _memberToInvite.email,
            result[0].name,
            result[0].username,
            inviterName,
            _memberToInvite.name,
            _memberToInvite.role,
            _memberToInvite._id,
        );
    }

    // Verify Band
    if (
        result[0].isBandVerified === false &&
        result[0].bandMembers.every(
            (member: { hasAcceptedBandInvite: boolean }) => member.hasAcceptedBandInvite === true,
        )
    ) {
        await verifyBand(result[0].objectId);
    }
};

const sendBandInvitationEmail = async (
    bandId: any,
    memberEmail: any,
    bandName: any,
    bandUsername: any,
    inviterName: any,
    memberToInviteName: any,
    memberToInviteRole: any,
    memberToInviteId: any,
) => {
    await sendEmail({
        to: memberEmail,
        templateId: 'd-72afbbc0131d4f7dbba019937dc3cc30',
        dynamicTemplateData: {
            bandName: bandName,
            bandUsername: bandUsername,
            inviterName: inviterName,
            name: memberToInviteName,
            role: memberToInviteRole,
            joinBandLink: `${MUSIXVERSE_ROOT_URL}/create-band/confirm?bandId=${bandId}&memberId=${memberToInviteId}`,
        },
    });
};

Parse.Cloud.define('setArtistAcceptedBandInvite', async (request: any) => {
    const query = new Parse.Query('Band');
    query.equalTo('objectId', request.params.bandId);
    const result = await query.first({ useMasterKey: true });

    if (result) {
        const index = result.attributes.bandMembers.findIndex((object: any) => {
            return object.userId === request.params.memberId;
        });

        if (result.attributes.bandMembers[index].hasAcceptedBandInvite === false) {
            result.attributes.bandMembers[index].hasAcceptedBandInvite = true;
            await result.save();

            if (
                result.attributes.isBandVerified === false &&
                result.attributes.bandMembers.every((member: any) => member.hasAcceptedBandInvite === true)
            ) {
                await verifyBand(result.id);
            }

            return JSON.stringify(result);
        }
        return JSON.stringify({ username: result.attributes.username });
    }
    return null;
});

const verifyBand = async (bandId: any) => {
    const query = new Parse.Query('Band');
    query.equalTo('objectId', bandId);
    const _band = await query.first({ useMasterKey: true });

    _band.set('isBandVerified', true);

    await _band.save().then(
        async (currentBand: any) => {
            await sendBandVerifiedEmail(currentBand.id);
            return currentBand.id;
        },
        (error: any) => {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            return error;
        },
    );
};

const unverifyBand = async (bandId: any) => {
    const query = new Parse.Query('Band');
    query.equalTo('objectId', bandId);
    const _band = await query.first({ useMasterKey: true });

    _band.set('isBandVerified', false);

    await _band.save().then(
        async (currentBand: any) => {
            return currentBand.id;
        },
        (error: any) => {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            return error;
        },
    );
};

const sendBandVerifiedEmail = async (bandId: any) => {
    const query = new Parse.Query('Band', { useMasterKey: true });
    const pipeline = [
        { match: { _id: bandId } },
        {
            lookup: {
                from: '_User',
                let: { bandMembers: '$bandMembers' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $in: ['$_id', '$$bandMembers.userId'] }] } } },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            email: 1,
                        },
                    },
                ],
                as: 'bandMembersInfo',
            },
        },
    ];
    const result = await query.aggregate(pipeline);

    // eslint-disable-next-line guard-for-in
    for (const idx in result[0].bandMembersInfo) {
        const _bandMember = result[0].bandMembersInfo[idx];

        // eslint-disable-next-line no-await-in-loop
        await sendEmail({
            to: _bandMember.email,
            templateId: 'd-bd6ea908943845248724fe97261b0f37',
            dynamicTemplateData: {
                bandName: result[0].name,
                bandUsername: result[0].username,
                name: _bandMember.name,
                bandProfileLink: `${MUSIXVERSE_ROOT_URL}/profile/band/${result[0].username}`,
            },
        });
    }
};

Parse.Cloud.define('fetchUpdatedBandMembers', async (request: any) => {
    const query = new Parse.Query('_User', { useMasterKey: true });

    const bandMembers = [];
    // eslint-disable-next-line guard-for-in
    for (const idx in request.params.bandMembers) {
        const _bandMember = request.params.bandMembers[idx];

        const pipeline = [
            {
                match: {
                    _id: _bandMember.userId,
                },
            },
            {
                lookup: {
                    from: 'UserInfo',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'userInfo',
                },
            },
            {
                project: {
                    _id: 1,
                    ethAddress: 1,
                    name: 1,
                    username: 1,
                    avatar: { $first: '$userInfo.avatar' },
                },
            },
        ];
        // eslint-disable-next-line no-await-in-loop
        const result = await query.aggregate(pipeline);

        _bandMember.name = result[0].name;
        _bandMember.username = result[0].username;
        _bandMember.avatar = result[0].avatar;

        bandMembers.push(_bandMember);
    }

    if (bandMembers.length > 0) {
        return bandMembers;
    }
    return null;
});

Parse.Cloud.define('checkBandUsernameAvailability', async (request: any) => {
    if (request.params.username) {
        const query = new Parse.Query('Band', { useMasterKey: true });
        query.equalTo('username', request.params.username);
        const result = await query.first({ useMasterKey: true });
        if (result) {
            return 'Username already exists!';
        }
        return false;
    }
    return null;
});

Parse.Cloud.define('fetchVerifiedBandsOfArtist', async (request: any) => {
    const query = new Parse.Query('Band');

    const pipeline = [
        {
            match: {
                $expr: {
                    $and: [
                        { $in: [request.user.attributes.ethAddress, '$bandMembers.address'] },
                        { $eq: ['$isBandVerified', true] },
                    ],
                },
            },
        },
        {
            lookup: {
                from: '_User',
                let: { bandMembers: '$bandMembers' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $in: ['$_id', '$$bandMembers.userId'] }] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            username: 1,
                            ethAddress: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'updatedBandMembersList',
            },
        },
        {
            project: {
                _id: 1,
                name: 1,
                username: 1,
                avatar: 1,
                bandMembers: 1,
                updatedBandMembersList: 1,
            },
        },
    ];
    const result = await query.aggregate(pipeline);
    return result;
});

Parse.Cloud.define('fetchBandsOfArtist', async (request: any) => {
    const query = new Parse.Query('Band');

    const pipeline = [
        {
            match: {
                $expr: { $and: [{ $in: [request.params.ethAddress, '$bandMembers.address'] }] },
            },
        },
        {
            addFields: { allBandMembers: '$bandMembers' },
        },
        {
            unwind: '$allBandMembers',
        },
        {
            match: { 'allBandMembers.hasAcceptedBandInvite': true, 'allBandMembers.userId': request.params.userId },
        },
        {
            group: {
                objectId: '$_id',
                name: { $first: '$name' },
                avatar: { $first: '$avatar' },
                username: { $first: '$username' },
                bandMembers: { $first: '$bandMembers' },
                isBandVerified: { $first: '$isBandVerified' },
                creatorId: { $first: '$creatorId' },
                creatorAddress: { $first: '$creatorAddress' },
                bio: { $first: '$bio' },
                coverImage: { $first: '$coverImage' },
                instagram: { $first: '$instagram' },
                facebook: { $first: '$facebook' },
                twitter: { $first: '$twitter' },
                spotify: { $first: '$spotify' },
                country: { $first: '$country' },
            },
        },
        {
            lookup: {
                from: '_User',
                let: { bandMembers: '$bandMembers' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $in: ['$_id', '$$bandMembers.userId'] }] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            username: 1,
                            ethAddress: 1,
                            isArtistVerified: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'updatedBandMembersList',
            },
        },
    ];
    const result = await query.aggregate(pipeline);
    return result;
});

Parse.Cloud.define('updateBandInfo', async (request: any) => {
    const query = new Parse.Query('Band');

    const pipeline = [
        {
            match: {
                $expr: {
                    $and: [
                        { $eq: ['$_id', request.params.bandId] },
                        { $in: [request.user.attributes.ethAddress, '$bandMembers.address'] },
                    ],
                },
            },
        },
    ];

    const result = await query.aggregate(pipeline);

    if (result[0]) {
        const _query = new Parse.Query('Band');
        _query.equalTo('objectId', request.params.bandId);
        const _result = await _query.first({ useMasterKey: true });

        _result.set('name', request.params.name);
        _result.set('username', request.params.username);
        _result.set('avatar', request.params.avatar);
        _result.set('coverImage', request.params.coverImage);
        _result.set('bio', request.params.bio);
        _result.set('spotify', request.params.spotify);
        _result.set('instagram', request.params.instagram);
        _result.set('twitter', request.params.twitter);
        _result.set('facebook', request.params.facebook);
        _result.set('instagram', request.params.instagram);

        await _result.save();
    }
});

Parse.Cloud.define('fetchBandFollowing', async (request: any) => {
    const query = new Parse.Query('Band', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                username: request.params.username,
            },
        },
        {
            lookup: {
                from: 'Followers',
                let: { bandMembers: '$bandMembers' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $in: ['$follower_userId', '$$bandMembers.userId'] }] } } },
                    {
                        $lookup: {
                            from: '_User',
                            let: { following_userId: '$following_userId', follower_userId: '$follower_userId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$_id', '$$following_userId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'UserInfo',
                                        let: { userId: '$_id' },
                                        pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$userId'] }] } } }],
                                        as: 'userInfo',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { follower_userId: '$$follower_userId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$_id', '$$follower_userId'] }] } } },
                                        ],
                                        as: 'followerUser',
                                    },
                                },
                                {
                                    $addFields: { followerName: { $first: '$followerUser.name' } },
                                },
                                {
                                    $project: {
                                        name: 1,
                                        username: 1,
                                        avatar: { $first: '$userInfo.avatar' },
                                        followerName: 1,
                                    },
                                },
                            ],
                            as: 'followingUser',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            followingUser: 1,
                        },
                    },
                    {
                        $replaceRoot: {
                            newRoot: {
                                $mergeObjects: ['$$ROOT', { $first: '$followingUser' }],
                            },
                        },
                    },
                    {
                        $unset: 'followingUser',
                    },
                ],
                as: 'following',
            },
        },
        {
            project: {
                _id: 0,
                following: 1,
            },
        },
        {
            unwind: '$following',
        },
        { replaceRoot: { newRoot: '$following' } },
    ];

    const result = await query.aggregate(pipeline);
    return result;
});

Parse.Cloud.define('fetchBandFollowers', async (request: any) => {
    const query = new Parse.Query('Band', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                username: request.params.username,
            },
        },
        {
            lookup: {
                from: 'BandFollowers',
                let: { bandId: '$_id' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$bandId', '$$bandId'] }] } } },
                    {
                        $lookup: {
                            from: '_User',
                            localField: 'follower_userId',
                            foreignField: '_id',
                            as: 'followerUsers',
                        },
                    },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: 'followerUsers._id',
                            foreignField: 'userId',
                            as: 'followerUserInfo',
                        },
                    },
                    {
                        $project: {
                            name: { $first: '$followerUsers.name' },
                            username: { $first: '$followerUsers.username' },
                            avatar: { $first: '$followerUserInfo.avatar' },
                        },
                    },
                ],
                as: 'followers',
            },
        },
        {
            project: {
                _id: 0,
                followers: 1,
            },
        },
        {
            unwind: '$followers',
        },
        { replaceRoot: { newRoot: '$followers' } },
    ];
    const result = await query.aggregate(pipeline);
    return result;
});

Parse.Cloud.define('updateBandMemberRole', async (request: any) => {
    const query = new Parse.Query('Band');

    const pipeline = [
        {
            match: {
                $expr: {
                    $and: [
                        { $eq: ['$_id', request.params.bandId] },
                        { $in: [request.user.attributes.ethAddress, '$bandMembers.address'] },
                    ],
                },
            },
        },
    ];

    const result = await query.aggregate(pipeline);

    if (result[0]) {
        const _query = new Parse.Query('Band');
        _query.equalTo('objectId', request.params.bandId);
        const _result = await _query.first({ useMasterKey: true });

        const index = _result.attributes.bandMembers.findIndex((object: any) => {
            return object.userId === request.params.bandMember._id;
        });

        _result.attributes.bandMembers[index].role = request.params.bandMember.role;
        await _result.save();
    }
});

Parse.Cloud.define('removeBandMember', async (request: any) => {
    const query = new Parse.Query('Band');
    const pipeline = [
        {
            match: {
                $expr: {
                    $and: [
                        { $eq: ['$_id', request.params.bandId] },
                        { $in: [request.user.attributes.ethAddress, '$bandMembers.address'] },
                    ],
                },
            },
        },
    ];
    const result = await query.aggregate(pipeline);

    if (result[0]) {
        const _query = new Parse.Query('Band');
        _query.equalTo('objectId', request.params.bandId);
        const _result = await _query.first({ useMasterKey: true });

        const index = _result.attributes.bandMembers.findIndex((object: any) => {
            return object.userId === request.params.bandMember._id;
        });

        _result.attributes.bandMembers.splice(index, 1);
        if (
            _result.attributes.isBandVerified === false &&
            _result.attributes.bandMembers.every((member: any) => member.hasAcceptedBandInvite === true)
        ) {
            await verifyBand(_result.id);
        }

        await _result.save();
    }
});

Parse.Cloud.define('addBandMember', async (request: any) => {
    const query = new Parse.Query('Band');
    const pipeline = [
        {
            match: {
                $expr: {
                    $and: [
                        { $eq: ['$_id', request.params.bandId] },
                        { $in: [request.user.attributes.ethAddress, '$bandMembers.address'] },
                    ],
                },
            },
        },
    ];
    const result = await query.aggregate(pipeline);

    if (result[0]) {
        const _query = new Parse.Query('Band');
        _query.equalTo('objectId', request.params.bandId);
        const _result = await _query.first({ useMasterKey: true });

        _result.attributes.bandMembers.push(request.params.bandMember);
        await _result.save();
        await unverifyBand(_result.id);

        const invitedUserQuery = new Parse.Query('_User', { useMasterKey: true });
        invitedUserQuery.equalTo('objectId', request.params.bandMember.userId);
        const invitedUser = await invitedUserQuery.first({ useMasterKey: true });

        await sendBandInvitationEmail(
            request.params.bandId,
            invitedUser.attributes.email,
            _result.attributes.name,
            _result.attributes.username,
            request.user.attributes.name,
            request.params.bandMember.name,
            request.params.bandMember.role,
            request.params.bandMember.userId,
        );
    }
});

Parse.Cloud.define('sendBandInvitationEmailToArtist', async (request: any) => {
    const query = new Parse.Query('Band');
    const pipeline = [
        {
            match: {
                $expr: {
                    $and: [
                        { $eq: ['$_id', request.params.bandId] },
                        { $in: [request.user.attributes.ethAddress, '$bandMembers.address'] },
                    ],
                },
            },
        },
    ];
    const result = await query.aggregate(pipeline);

    if (result[0]) {
        const _query = new Parse.Query('Band');
        _query.equalTo('objectId', request.params.bandId);
        const _result = await _query.first({ useMasterKey: true });

        const invitedUserQuery = new Parse.Query('_User', { useMasterKey: true });
        invitedUserQuery.equalTo('objectId', request.params.bandMember._id);
        const invitedUser = await invitedUserQuery.first({ useMasterKey: true });

        await sendBandInvitationEmail(
            request.params.bandId,
            invitedUser.attributes.email,
            _result.attributes.name,
            _result.attributes.username,
            request.user.attributes.name,
            request.params.bandMember.name,
            request.params.bandMember.role,
            request.params.bandMember._id,
        );
    }
});

Parse.Cloud.define('fetchIsFollowingBand', async (request: any) => {
    try {
        if (request.user) {
            const bandQuery = new Parse.Query('Band', { useMasterKey: true });
            bandQuery.equalTo('username', request.params.username);
            const band = await bandQuery.first({ useMasterKey: true });

            const query = new Parse.Query('BandFollowers');
            query.equalTo('follower_userId', request.user.id);
            query.equalTo('bandId', band.id);
            const followerRecord = await query.first({ useMasterKey: true });

            if (followerRecord) {
                return true;
            }
            return false;
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('followBand', async (request: any) => {
    try {
        if (request.user) {
            const bandQuery = new Parse.Query('Band', { useMasterKey: true });
            bandQuery.equalTo('username', request.params.username);
            const band = await bandQuery.first({ useMasterKey: true });

            const query = new Parse.Query('BandFollowers');
            query.equalTo('follower_userId', request.user.id);
            query.equalTo('bandId', band.id);
            const followerRecord = await query.first({ useMasterKey: true });

            if (followerRecord) {
                followerRecord.destroy({ useMasterKey: true }).then(
                    () => {
                        logger.info('The followerRecord was deleted successfully.');
                    },
                    (error: any) => {
                        logger.info(error);
                    },
                );
            } else {
                const BandFollowers = Parse.Object.extend('BandFollowers');
                const newFollowerRecord = new BandFollowers();

                newFollowerRecord.set('follower_userId', request.user.id);
                newFollowerRecord.set('follower_ethAddress', request.user.attributes.ethAddress);
                newFollowerRecord.set('bandId', band.id);

                const result = newFollowerRecord.save().then(
                    (_followerRecord: any) => {
                        // Execute any logic that should take place after the newFollowerRecord is saved
                        return _followerRecord.id;
                    },
                    (error: any) => {
                        // Execute any logic that should take place if the save fails.
                        // error is a Parse.Error with an error code and message.
                        return error;
                    },
                );
                return result;
            }
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('fetchBandProfileDetails', async (request: any) => {
    const query = new Parse.Query('Band', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                username: request.params.username,
            },
        },
        {
            lookup: {
                from: '_User',
                let: { bandMembers: '$bandMembers' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $in: ['$_id', '$$bandMembers.userId'] }] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            username: 1,
                            ethAddress: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'updatedBandMembersList',
            },
        },
        {
            lookup: {
                from: 'TrackMinted',
                let: { bandId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $and: [{ $ne: ['$bandId', null] }, { $eq: ['$bandId', '$$bandId'] }] },
                        },
                    },
                    {
                        $count: 'numberOfTracks',
                    },
                    {
                        $project: {
                            numberOfTracks: 1,
                        },
                    },
                ],
                as: 'tracksMinted',
            },
        },
        {
            lookup: {
                from: 'Favourites',
                let: { bandMembers: '$bandMembers' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $in: ['$userId', '$$bandMembers.userId'] }] } } },
                    {
                        $count: 'numberOfFavouriteTokens',
                    },
                    {
                        $project: {
                            numberOfFavouriteTokens: 1,
                        },
                    },
                ],
                as: 'numberOfFavourites',
            },
        },
        {
            lookup: {
                from: 'Favourites',
                let: { bandMembers: '$bandMembers' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $in: ['$userId', '$$bandMembers.userId'] }] } } },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'TrackMinted',
                                        let: { trackId: '$trackId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                            {
                                                $lookup: {
                                                    from: '_User',
                                                    let: { collaborators: '$collaborators' },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: {
                                                                    $in: ['$ethAddress', '$$collaborators.address'],
                                                                },
                                                            },
                                                        },
                                                        {
                                                            $lookup: {
                                                                from: 'UserInfo',
                                                                localField: '_id',
                                                                foreignField: 'userId',
                                                                as: 'userInfo',
                                                            },
                                                        },
                                                        {
                                                            $project: {
                                                                _id: 0,
                                                                name: 1,
                                                                username: 1,
                                                                ethAddress: 1,
                                                                avatar: { $first: '$userInfo.avatar' },
                                                            },
                                                        },
                                                    ],
                                                    as: 'collaboratorUsers',
                                                },
                                            },
                                            {
                                                $lookup: {
                                                    from: 'TokenCreated',
                                                    let: { trackId: '$trackId' },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] },
                                                            },
                                                        },
                                                        {
                                                            $lookup: {
                                                                from: 'TokenPriceUpdated',
                                                                let: { tokenId: '$tokenId' },
                                                                pipeline: [
                                                                    {
                                                                        $match: {
                                                                            $expr: {
                                                                                $and: [
                                                                                    { $eq: ['$tokenId', '$$tokenId'] },
                                                                                ],
                                                                            },
                                                                        },
                                                                    },
                                                                    { $sort: { block_timestamp: -1 } },
                                                                    { $limit: 1 },
                                                                    { $project: { _id: 0, price: '$newPrice' } },
                                                                ],
                                                                as: 'tokenPriceUpdated',
                                                            },
                                                        },
                                                        {
                                                            $project: {
                                                                _id: 0,
                                                                tokenId: 1,
                                                                localTokenId: 1,
                                                                price: {
                                                                    $ifNull: [
                                                                        {
                                                                            $first: '$tokenPriceUpdated.price',
                                                                        },
                                                                        '$price',
                                                                    ],
                                                                },
                                                            },
                                                        },
                                                    ],
                                                    as: 'otherTokensOfTrack',
                                                },
                                            },
                                            {
                                                $project: {
                                                    _id: 0,
                                                    artwork: 1,
                                                    artist: 1,
                                                    artistAddress: 1,
                                                    audio: 1,
                                                    collaborators: 1,
                                                    numberOfCopies: 1,
                                                    genre: 1,
                                                    title: 1,
                                                    collaboratorUsers: 1,
                                                    otherTokensOfTrack: 1,
                                                },
                                            },
                                        ],
                                        as: 'favouriteToken',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { creator: '$creator' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                                            {
                                                $project: {
                                                    _id: 0,
                                                    name: 1,
                                                    username: 1,
                                                    ethAddress: 1,
                                                    isArtistVerified: 1,
                                                },
                                            },
                                        ],
                                        as: 'artistUser',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: 'TokenPriceUpdated',
                                        let: { tokenId: '$tokenId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                            { $sort: { block_timestamp: -1 } },
                                            { $limit: 1 },
                                            { $project: { _id: 0, price: '$newPrice' } },
                                        ],
                                        as: 'tokenPriceUpdated',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        localTokenId: '$localTokenId',
                                        price: {
                                            $ifNull: [
                                                {
                                                    $first: '$tokenPriceUpdated.price',
                                                },
                                                '$price',
                                            ],
                                        },
                                        isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                                        favouriteToken: { $first: '$favouriteToken' },
                                    },
                                },
                                {
                                    $replaceRoot: {
                                        newRoot: {
                                            $mergeObjects: ['$$ROOT', '$favouriteToken'],
                                        },
                                    },
                                },
                                {
                                    $unset: 'favouriteToken',
                                },
                            ],
                            as: 'favouriteTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { userId: '$userId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$_id', '$$userId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'UserInfo',
                                        localField: '_id',
                                        foreignField: 'userId',
                                        as: 'userInfo',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        name: 1,
                                        username: 1,
                                        ethAddress: 1,
                                        isArtistVerified: 1,
                                        avatar: { $first: '$userInfo.avatar' },
                                    },
                                },
                            ],
                            as: 'bandMember',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            tokenId: 1,
                            bandMember: { $first: '$bandMember' },
                            favouriteTokens: { $first: '$favouriteTokens' },
                        },
                    },
                    {
                        $replaceRoot: {
                            newRoot: {
                                $mergeObjects: ['$$ROOT', '$favouriteTokens'],
                            },
                        },
                    },
                    {
                        $unset: 'favouriteTokens',
                    },
                ],
                as: 'favourites',
            },
        },
        {
            lookup: {
                from: 'Followers',
                let: { bandMembers: '$bandMembers' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $in: ['$follower_userId', '$$bandMembers.userId'] }] } } },
                    {
                        $count: 'numberOfFollowing',
                    },
                    {
                        $project: {
                            numberOfFollowing: 1,
                        },
                    },
                ],
                as: 'following',
            },
        },
        {
            lookup: {
                from: 'BandFollowers',
                let: { bandId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ['$bandId', '$$bandId'] },
                        },
                    },
                    {
                        $count: 'numberOfFollowers',
                    },
                    {
                        $project: {
                            numberOfFollowers: 1,
                        },
                    },
                ],
                as: 'followers',
            },
        },
        // fetchTracksByUser "Collection"
        {
            lookup: {
                from: 'TokenPurchased',
                let: { bandMembers: '$bandMembers' },
                pipeline: [
                    { $sort: { block_timestamp: -1 } },
                    {
                        $group: {
                            _id: '$tokenId',
                            tokenId: { $first: '$tokenId' },
                            newOwner: { $first: '$newOwner' },
                            price: { $first: '$price' },
                            block_timestamp: { $first: '$block_timestamp' },
                        },
                    },
                    { $match: { $expr: { $in: ['$newOwner', '$$bandMembers.address'] } } },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'TrackMinted',
                                        let: { trackId: '$trackId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                            {
                                                $lookup: {
                                                    from: '_User',
                                                    let: { collaborators: '$collaborators' },
                                                    pipeline: [
                                                        {
                                                            $match: {
                                                                $expr: {
                                                                    $in: ['$ethAddress', '$$collaborators.address'],
                                                                },
                                                            },
                                                        },
                                                        {
                                                            $lookup: {
                                                                from: 'UserInfo',
                                                                localField: '_id',
                                                                foreignField: 'userId',
                                                                as: 'userInfo',
                                                            },
                                                        },
                                                        {
                                                            $project: {
                                                                _id: 0,
                                                                name: 1,
                                                                username: 1,
                                                                ethAddress: 1,
                                                                avatar: { $first: '$userInfo.avatar' },
                                                            },
                                                        },
                                                    ],
                                                    as: 'collaboratorUsers',
                                                },
                                            },
                                            {
                                                $project: {
                                                    _id: 0,
                                                    trackId: 1,
                                                    artwork: 1,
                                                    artist: 1,
                                                    artistAddress: 1,
                                                    audio: 1,
                                                    collaborators: 1,
                                                    numberOfCopies: 1,
                                                    genre: 1,
                                                    title: 1,
                                                    collaboratorUsers: 1,
                                                },
                                            },
                                        ],
                                        as: 'collectedToken',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: '_User',
                                        let: { creator: '$creator' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                                            {
                                                $project: {
                                                    _id: 0,
                                                    username: 1,
                                                    ethAddress: 1,
                                                    isArtistVerified: 1,
                                                },
                                            },
                                        ],
                                        as: 'artistUser',
                                    },
                                },
                                {
                                    $lookup: {
                                        from: 'TokenPriceUpdated',
                                        let: { tokenId: '$tokenId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                            { $sort: { block_timestamp: -1 } },
                                            { $limit: 1 },
                                            { $project: { _id: 0, price: '$newPrice' } },
                                        ],
                                        as: 'tokenPriceUpdated',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        localTokenId: '$localTokenId',
                                        price: {
                                            $ifNull: [
                                                {
                                                    $first: '$tokenPriceUpdated.price',
                                                },
                                                '$price',
                                            ],
                                        },
                                        isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                                        collectedToken: { $first: '$collectedToken' },
                                    },
                                },
                                {
                                    $replaceRoot: {
                                        newRoot: {
                                            $mergeObjects: ['$$ROOT', '$collectedToken'],
                                        },
                                    },
                                },
                                {
                                    $unset: 'collectedToken',
                                },
                            ],
                            as: 'collectedTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { newOwner: '$newOwner' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$newOwner'] }] } } },
                                {
                                    $lookup: {
                                        from: 'UserInfo',
                                        localField: '_id',
                                        foreignField: 'userId',
                                        as: 'userInfo',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        name: 1,
                                        username: 1,
                                        ethAddress: 1,
                                        isArtistVerified: 1,
                                        avatar: { $first: '$userInfo.avatar' },
                                    },
                                },
                            ],
                            as: 'bandMember',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            tokenId: 1,
                            bandMember: { $first: '$bandMember' },
                            collectedTokens: { $first: '$collectedTokens' },
                        },
                    },
                    {
                        $replaceRoot: {
                            newRoot: {
                                $mergeObjects: ['$$ROOT', '$collectedTokens'],
                            },
                        },
                    },
                    {
                        $unset: 'collectedTokens',
                    },
                ],
                as: 'collection',
            },
        },
        // fetchTracksByUser "New Releases"
        {
            lookup: {
                from: 'TrackMinted',
                let: { bandId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $and: [{ $ne: ['$bandId', null] }, { $eq: ['$bandId', '$$bandId'] }] },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            localField: 'trackId',
                            foreignField: 'trackId',
                            as: 'similarTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPurchased',
                            let: { similarTokens: '$similarTokens' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$tokenId', '$$similarTokens.tokenId'] } } },
                                { $sort: { price: -1 } },
                                { $sort: { block_timestamp: -1 } },
                                { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' } } },
                            ],
                            as: 'purchasedTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { purchasedTokens: '$purchasedTokens' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$tokenId', '$$purchasedTokens.tokenId'] } } },
                                { $sort: { block_timestamp: -1 } },
                                {
                                    $group: {
                                        _id: '$tokenId',
                                        tokenId: { $first: '$tokenId' },
                                        price: { $first: '$newPrice' },
                                    },
                                },
                                { $sort: { price: 1 } },
                            ],
                            as: 'tokensPriceUpdated',
                        },
                    },
                    {
                        $addFields: {
                            similarTokens_size: { $size: '$similarTokens' },
                            purchasedTokens_size: { $size: '$purchasedTokens' },
                            unsoldTokens: { $setDifference: ['$similarTokens.tokenId', '$purchasedTokens.tokenId'] },
                            tokensPriceNotUpdated: {
                                $setDifference: ['$similarTokens.tokenId', '$tokensPriceUpdated.tokenId'],
                            },
                        },
                    },
                    {
                        $addFields: {
                            unsoldTokens_size: { $size: '$unsoldTokens' },
                        },
                    },
                    { $match: { $expr: { $ne: ['$similarTokens_size', '$purchasedTokens_size'] } } },
                    {
                        $addFields: {
                            tokenIdHavingLowestPrice: {
                                $ifNull: [
                                    {
                                        $first: '$unsoldTokens',
                                    },
                                    {
                                        $ifNull: [
                                            {
                                                $first: '$tokensPriceNotUpdated',
                                            },
                                            {
                                                $first: '$tokensPriceUpdated.tokenId',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { tokenIdHavingLowestPrice: '$tokenIdHavingLowestPrice' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenIdHavingLowestPrice'] }] } } },
                            ],
                            as: 'tokenHavingLowestPrice',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { creator: '$creator' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                                {
                                    $project: {
                                        _id: 0,
                                        username: 1,
                                        ethAddress: 1,
                                        isArtistVerified: 1,
                                    },
                                },
                            ],
                            as: 'artistUser',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { collaborators: '$collaborators' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$ethAddress', '$$collaborators.address'] } } },
                                {
                                    $lookup: {
                                        from: 'UserInfo',
                                        localField: '_id',
                                        foreignField: 'userId',
                                        as: 'userInfo',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        name: 1,
                                        username: 1,
                                        ethAddress: 1,
                                        avatar: { $first: '$userInfo.avatar' },
                                    },
                                },
                            ],
                            as: 'collaboratorUsers',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { trackId: '$trackId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'TokenPriceUpdated',
                                        let: { tokenId: '$tokenId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                            { $sort: { block_timestamp: -1 } },
                                            { $limit: 1 },
                                            { $project: { _id: 0, price: '$newPrice' } },
                                        ],
                                        as: 'tokenPriceUpdated',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        tokenId: 1,
                                        localTokenId: 1,
                                        price: {
                                            $ifNull: [
                                                {
                                                    $first: '$tokenPriceUpdated.price',
                                                },
                                                '$price',
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: 'otherTokensOfTrack',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            block_timestamp: 1,
                            trackId: 1,
                            tokenId: '$tokenIdHavingLowestPrice',
                            localTokenId: { $first: '$tokenHavingLowestPrice.localTokenId' },
                            title: 1,
                            artist: 1,
                            artistAddress: 1,
                            isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                            artwork: 1,
                            audio: 1,
                            genre: 1,
                            numberOfCopies: 1,
                            collaborators: 1,
                            collaboratorUsers: 1,
                            otherTokensOfTrack: 1,
                            price: {
                                $ifNull: [
                                    {
                                        $cond: [{ $gt: ['$unsoldTokens_size', 0] }, '$price', null],
                                    },
                                    {
                                        $ifNull: [
                                            {
                                                $cond: [
                                                    { $ne: [{ $size: '$tokensPriceNotUpdated' }, 0] },
                                                    '$price',
                                                    null,
                                                ],
                                            },
                                            {
                                                $first: '$tokensPriceUpdated.price',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    { $sort: { block_timestamp: -1 } },
                ],
                as: 'newReleases',
            },
        },
        // fetchTracksByUser "Sold Out"
        {
            lookup: {
                from: 'TrackMinted',
                let: { bandId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $and: [{ $ne: ['$bandId', null] }, { $eq: ['$bandId', '$$bandId'] }] },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            localField: 'trackId',
                            foreignField: 'trackId',
                            as: 'similarTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPurchased',
                            let: { similarTokens: '$similarTokens' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$tokenId', '$$similarTokens.tokenId'] } } },
                                { $sort: { price: -1 } },
                                { $sort: { block_timestamp: -1 } },
                                { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' } } },
                            ],
                            as: 'purchasedTokens',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { purchasedTokens: '$purchasedTokens' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$tokenId', '$$purchasedTokens.tokenId'] } } },
                                { $sort: { block_timestamp: -1 } },
                                {
                                    $group: {
                                        _id: '$tokenId',
                                        tokenId: { $first: '$tokenId' },
                                        price: { $first: '$newPrice' },
                                    },
                                },
                                { $sort: { price: 1 } },
                            ],
                            as: 'tokensPriceUpdated',
                        },
                    },
                    {
                        $addFields: {
                            similarTokens_size: { $size: '$similarTokens' },
                            purchasedTokens_size: { $size: '$purchasedTokens' },
                            unsoldTokens: { $setDifference: ['$similarTokens.tokenId', '$purchasedTokens.tokenId'] },
                            tokensPriceNotUpdated: {
                                $setDifference: ['$similarTokens.tokenId', '$tokensPriceUpdated.tokenId'],
                            },
                        },
                    },
                    {
                        $addFields: {
                            unsoldTokens_size: { $size: '$unsoldTokens' },
                        },
                    },
                    { $match: { $expr: { $eq: ['$similarTokens_size', '$purchasedTokens_size'] } } },
                    {
                        $addFields: {
                            tokenIdHavingLowestPrice: {
                                $ifNull: [
                                    {
                                        $first: '$unsoldTokens',
                                    },
                                    {
                                        $ifNull: [
                                            {
                                                $first: '$tokensPriceNotUpdated',
                                            },
                                            {
                                                $first: '$tokensPriceUpdated.tokenId',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { tokenIdHavingLowestPrice: '$tokenIdHavingLowestPrice' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenIdHavingLowestPrice'] }] } } },
                            ],
                            as: 'tokenHavingLowestPrice',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { creator: '$creator' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                                {
                                    $project: {
                                        _id: 0,
                                        username: 1,
                                        ethAddress: 1,
                                        isArtistVerified: 1,
                                    },
                                },
                            ],
                            as: 'artistUser',
                        },
                    },
                    {
                        $lookup: {
                            from: '_User',
                            let: { collaborators: '$collaborators' },
                            pipeline: [
                                { $match: { $expr: { $in: ['$ethAddress', '$$collaborators.address'] } } },
                                {
                                    $lookup: {
                                        from: 'UserInfo',
                                        localField: '_id',
                                        foreignField: 'userId',
                                        as: 'userInfo',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        name: 1,
                                        username: 1,
                                        ethAddress: 1,
                                        avatar: { $first: '$userInfo.avatar' },
                                    },
                                },
                            ],
                            as: 'collaboratorUsers',
                        },
                    },
                    {
                        $lookup: {
                            from: 'TokenCreated',
                            let: { trackId: '$trackId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                {
                                    $lookup: {
                                        from: 'TokenPriceUpdated',
                                        let: { tokenId: '$tokenId' },
                                        pipeline: [
                                            { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                            { $sort: { block_timestamp: -1 } },
                                            { $limit: 1 },
                                            { $project: { _id: 0, price: '$newPrice' } },
                                        ],
                                        as: 'tokenPriceUpdated',
                                    },
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        tokenId: 1,
                                        localTokenId: 1,
                                        price: {
                                            $ifNull: [
                                                {
                                                    $first: '$tokenPriceUpdated.price',
                                                },
                                                '$price',
                                            ],
                                        },
                                    },
                                },
                            ],
                            as: 'otherTokensOfTrack',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            block_timestamp: 1,
                            trackId: 1,
                            tokenId: '$tokenIdHavingLowestPrice',
                            localTokenId: { $first: '$tokenHavingLowestPrice.localTokenId' },
                            title: 1,
                            artist: 1,
                            artistAddress: 1,
                            isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                            artwork: 1,
                            audio: 1,
                            genre: 1,
                            numberOfCopies: 1,
                            collaborators: 1,
                            collaboratorUsers: 1,
                            otherTokensOfTrack: 1,
                            price: {
                                $ifNull: [
                                    {
                                        $cond: [{ $gt: ['$unsoldTokens_size', 0] }, '$price', null],
                                    },
                                    {
                                        $ifNull: [
                                            {
                                                $cond: [
                                                    { $ne: [{ $size: '$tokensPriceNotUpdated' }, 0] },
                                                    '$price',
                                                    null,
                                                ],
                                            },
                                            {
                                                $first: '$tokensPriceUpdated.price',
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                    { $sort: { block_timestamp: -1 } },
                ],
                as: 'soldOut',
            },
        },
        {
            addFields: { isBand: true },
        },
        {
            project: {
                _id: 0,
                name: 1,
                username: 1,
                bio: 1,
                isBand: '$isBand',
                isBandVerified: 1,
                bandMembers: 1,
                updatedBandMembersList: 1,
                createdAt: 1,
                avatar: 1,
                coverImage: 1,
                instagram: 1,
                facebook: 1,
                twitter: 1,
                spotify: 1,
                country: 1,
                numberOfTracksByArtist: { $first: '$tracksMinted.numberOfTracks' },
                numberOfFavouriteTokens: { $first: '$numberOfFavourites.numberOfFavouriteTokens' },
                numberOfFollowing: { $first: '$following.numberOfFollowing' },
                numberOfFollowers: { $first: '$followers.numberOfFollowers' },
                favourites: '$favourites',
                collection: '$collection',
                newReleases: '$newReleases',
                soldOut: '$soldOut',
            },
        },
    ];
    const result = await query.aggregate(pipeline);
    return result[0];
});

async function fetchTracksByBand(request: any) {
    const { username, currentlyActive, sortingFilter } = request.params;

    if (currentlyActive === 'Collection') {
        const query = new Parse.Query('Band', { useMasterKey: true });
        const pipeline = [
            {
                match: {
                    username: username,
                },
            },
            {
                lookup: {
                    from: 'TokenPurchased',
                    let: { bandMembers: '$bandMembers' },
                    pipeline: [
                        { $sort: { block_timestamp: -1 } },
                        {
                            $group: {
                                _id: '$tokenId',
                                tokenId: { $first: '$tokenId' },
                                newOwner: { $first: '$newOwner' },
                                price: { $first: '$price' },
                                block_timestamp: { $first: '$block_timestamp' },
                            },
                        },
                        { $match: { $expr: { $in: ['$newOwner', '$$bandMembers.address'] } } },
                        {
                            $lookup: {
                                from: 'TokenCreated',
                                let: { tokenId: '$tokenId' },
                                pipeline: [
                                    { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                    {
                                        $lookup: {
                                            from: 'TrackMinted',
                                            let: { trackId: '$trackId' },
                                            pipeline: [
                                                { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                                                {
                                                    $lookup: {
                                                        from: '_User',
                                                        let: { collaborators: '$collaborators' },
                                                        pipeline: [
                                                            {
                                                                $match: {
                                                                    $expr: {
                                                                        $in: ['$ethAddress', '$$collaborators.address'],
                                                                    },
                                                                },
                                                            },
                                                            {
                                                                $lookup: {
                                                                    from: 'UserInfo',
                                                                    localField: '_id',
                                                                    foreignField: 'userId',
                                                                    as: 'userInfo',
                                                                },
                                                            },
                                                            {
                                                                $project: {
                                                                    _id: 0,
                                                                    name: 1,
                                                                    username: 1,
                                                                    ethAddress: 1,
                                                                    avatar: { $first: '$userInfo.avatar' },
                                                                },
                                                            },
                                                        ],
                                                        as: 'collaboratorUsers',
                                                    },
                                                },
                                                {
                                                    $project: {
                                                        _id: 0,
                                                        trackId: 1,
                                                        artwork: 1,
                                                        artist: 1,
                                                        artistAddress: 1,
                                                        audio: 1,
                                                        collaborators: 1,
                                                        numberOfCopies: 1,
                                                        genre: 1,
                                                        title: 1,
                                                        collaboratorUsers: 1,
                                                    },
                                                },
                                            ],
                                            as: 'collectedToken',
                                        },
                                    },
                                    {
                                        $lookup: {
                                            from: '_User',
                                            let: { creator: '$creator' },
                                            pipeline: [
                                                {
                                                    $match: {
                                                        $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] },
                                                    },
                                                },
                                                {
                                                    $project: {
                                                        _id: 0,
                                                        username: 1,
                                                        ethAddress: 1,
                                                        isArtistVerified: 1,
                                                    },
                                                },
                                            ],
                                            as: 'artistUser',
                                        },
                                    },
                                    {
                                        $lookup: {
                                            from: 'TokenPriceUpdated',
                                            let: { tokenId: '$tokenId' },
                                            pipeline: [
                                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                                { $sort: { block_timestamp: -1 } },
                                                { $limit: 1 },
                                                { $project: { _id: 0, price: '$newPrice' } },
                                            ],
                                            as: 'tokenPriceUpdated',
                                        },
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            localTokenId: '$localTokenId',
                                            price: {
                                                $ifNull: [
                                                    {
                                                        $first: '$tokenPriceUpdated.price',
                                                    },
                                                    '$price',
                                                ],
                                            },
                                            isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                                            collectedToken: { $first: '$collectedToken' },
                                        },
                                    },
                                    {
                                        $replaceRoot: {
                                            newRoot: {
                                                $mergeObjects: ['$$ROOT', '$collectedToken'],
                                            },
                                        },
                                    },
                                    {
                                        $unset: 'collectedToken',
                                    },
                                ],
                                as: 'collectedTokens',
                            },
                        },
                        {
                            $lookup: {
                                from: '_User',
                                let: { newOwner: '$newOwner' },
                                pipeline: [
                                    { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$newOwner'] }] } } },
                                    {
                                        $lookup: {
                                            from: 'UserInfo',
                                            localField: '_id',
                                            foreignField: 'userId',
                                            as: 'userInfo',
                                        },
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            name: 1,
                                            username: 1,
                                            ethAddress: 1,
                                            isArtistVerified: 1,
                                            avatar: { $first: '$userInfo.avatar' },
                                        },
                                    },
                                ],
                                as: 'bandMember',
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                tokenId: 1,
                                bandMember: { $first: '$bandMember' },
                                collectedTokens: { $first: '$collectedTokens' },
                            },
                        },
                        {
                            $replaceRoot: {
                                newRoot: {
                                    $mergeObjects: ['$$ROOT', '$collectedTokens'],
                                },
                            },
                        },
                        {
                            $unset: 'collectedTokens',
                        },
                    ],
                    as: 'collection',
                },
            },
            {
                project: {
                    _id: 0,
                    collection: 1,
                },
            },
            { unwind: '$collection' },
            { replaceRoot: { newRoot: '$collection' } },
        ];
        const result = await query.aggregate(pipeline);
        return result;
    }

    const _query = new Parse.Query('Band', { useMasterKey: true });
    const _pipeline = [
        {
            match: {
                username: username,
            },
        },
        {
            project: {
                _id: 1,
                name: 1,
                username: 1,
            },
        },
    ];
    const _result = await _query.aggregate(_pipeline);
    const bandId = _result[0].objectId;

    const query = new Parse.Query('TrackMinted');
    // Sort based on conditions
    let sorting_condition;
    if (sortingFilter) {
        if (sortingFilter === 'Newest First') {
            sorting_condition = { block_timestamp: -1 };
        } else if (sortingFilter === 'Oldest First') {
            sorting_condition = { block_timestamp: 1 };
        } else if (sortingFilter === 'Price- High to Low') {
            sorting_condition = { price: -1 };
        } else if (sortingFilter === 'Price- Low to High') {
            sorting_condition = { price: 1 };
        }
    }

    const pipeline = [];
    if (currentlyActive === 'Creations') {
        pipeline.push({
            match: {
                bandId: bandId,
            },
        });
    } else {
        pipeline.push({
            match: {
                $expr: { $eq: ['$bandId', bandId] },
            },
        });
    }
    pipeline.push(
        {
            lookup: {
                from: 'TokenCreated',
                localField: 'trackId',
                foreignField: 'trackId',
                as: 'similarTokens',
            },
        },
        {
            lookup: {
                from: 'TokenPurchased',
                let: { similarTokens: '$similarTokens' },
                pipeline: [
                    { $match: { $expr: { $in: ['$tokenId', '$$similarTokens.tokenId'] } } },
                    { $sort: { price: -1 } },
                    { $sort: { block_timestamp: -1 } },
                    { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' } } },
                ],
                as: 'purchasedTokens',
            },
        },
        {
            lookup: {
                from: 'TokenPriceUpdated',
                let: { purchasedTokens: '$purchasedTokens' },
                pipeline: [
                    { $match: { $expr: { $in: ['$tokenId', '$$purchasedTokens.tokenId'] } } },
                    { $sort: { block_timestamp: -1 } },
                    { $group: { _id: '$tokenId', tokenId: { $first: '$tokenId' }, price: { $first: '$newPrice' } } },
                    { $sort: { price: 1 } },
                ],
                as: 'tokensPriceUpdated',
            },
        },
        {
            addFields: {
                similarTokens_size: { $size: '$similarTokens' },
                purchasedTokens_size: { $size: '$purchasedTokens' },
                unsoldTokens: { $setDifference: ['$similarTokens.tokenId', '$purchasedTokens.tokenId'] },
                tokensPriceNotUpdated: { $setDifference: ['$similarTokens.tokenId', '$tokensPriceUpdated.tokenId'] },
            },
        },
        {
            addFields: {
                unsoldTokens_size: { $size: '$unsoldTokens' },
            },
        },
    );

    if (currentlyActive === 'New Releases') {
        pipeline.push({ match: { $expr: { $ne: ['$similarTokens_size', '$purchasedTokens_size'] } } });
    }

    if (currentlyActive === 'Sold Out') {
        pipeline.push({ match: { $expr: { $eq: ['$similarTokens_size', '$purchasedTokens_size'] } } });
    }

    pipeline.push(
        {
            addFields: {
                tokenIdHavingLowestPrice: {
                    $ifNull: [
                        {
                            $first: '$unsoldTokens',
                        },
                        {
                            $ifNull: [
                                {
                                    $first: '$tokensPriceNotUpdated',
                                },
                                {
                                    $first: '$tokensPriceUpdated.tokenId',
                                },
                            ],
                        },
                    ],
                },
            },
        },
        {
            lookup: {
                from: 'TokenCreated',
                let: { tokenIdHavingLowestPrice: '$tokenIdHavingLowestPrice' },
                pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenIdHavingLowestPrice'] }] } } }],
                as: 'tokenHavingLowestPrice',
            },
        },
        {
            lookup: {
                from: '_User',
                let: { creator: '$creator' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$ethAddress', '$$creator'] }] } } },
                    {
                        $project: {
                            _id: 0,
                            username: 1,
                            ethAddress: 1,
                            isArtistVerified: 1,
                        },
                    },
                ],
                as: 'artistUser',
            },
        },
        {
            lookup: {
                from: '_User',
                let: { collaborators: '$collaborators' },
                pipeline: [
                    { $match: { $expr: { $in: ['$ethAddress', '$$collaborators.address'] } } },
                    {
                        $lookup: {
                            from: 'UserInfo',
                            localField: '_id',
                            foreignField: 'userId',
                            as: 'userInfo',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            name: 1,
                            username: 1,
                            ethAddress: 1,
                            avatar: { $first: '$userInfo.avatar' },
                        },
                    },
                ],
                as: 'collaboratorUsers',
            },
        },
        {
            lookup: {
                from: 'TokenCreated',
                let: { trackId: '$trackId' },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ['$trackId', '$$trackId'] }] } } },
                    {
                        $lookup: {
                            from: 'TokenPriceUpdated',
                            let: { tokenId: '$tokenId' },
                            pipeline: [
                                { $match: { $expr: { $and: [{ $eq: ['$tokenId', '$$tokenId'] }] } } },
                                { $sort: { block_timestamp: -1 } },
                                { $limit: 1 },
                                { $project: { _id: 0, price: '$newPrice' } },
                            ],
                            as: 'tokenPriceUpdated',
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            tokenId: 1,
                            localTokenId: 1,
                            price: {
                                $ifNull: [
                                    {
                                        $first: '$tokenPriceUpdated.price',
                                    },
                                    '$price',
                                ],
                            },
                        },
                    },
                ],
                as: 'otherTokensOfTrack',
            },
        },
        {
            project: {
                _id: 0,
                block_timestamp: 1,
                trackId: 1,
                tokenId: '$tokenIdHavingLowestPrice',
                localTokenId: { $first: '$tokenHavingLowestPrice.localTokenId' },
                title: 1,
                artist: 1,
                artistAddress: 1,
                isArtistVerified: { $first: '$artistUser.isArtistVerified' },
                artwork: 1,
                audio: 1,
                genre: 1,
                numberOfCopies: 1,
                collaborators: 1,
                collaboratorUsers: 1,
                otherTokensOfTrack: 1,
                price: {
                    $ifNull: [
                        {
                            $cond: [{ $gt: ['$unsoldTokens_size', 0] }, '$price', null],
                        },
                        {
                            $ifNull: [
                                {
                                    $cond: [{ $ne: [{ $size: '$tokensPriceNotUpdated' }, 0] }, '$price', null],
                                },
                                {
                                    $first: '$tokensPriceUpdated.price',
                                },
                            ],
                        },
                    ],
                },
            },
        },
        { sort: sorting_condition },
    );

    const result = await query.aggregate(pipeline);
    return result;
}

Parse.Cloud.define('fetchTracksByBand', async (request: any) => {
    const result = await fetchTracksByBand(request);
    return result;
});

/**************************************************************************/
/****************************    Global   *********************************/
/**************************************************************************/

Parse.Cloud.define('fetchTracksForAudioPlayer', async () => {
    const query = new Parse.Query('TrackMinted', { useMasterKey: true });
    const pipeline = [
        {
            project: {
                _id: 0,
                trackId: 1,
                audio: 1,
                title: 1,
                artist: 1,
                artwork: 1,
                tokenId: '$maxTokenId',
            },
        },
        { limit: 20 },
    ];
    const result = await query.aggregate(pipeline);
    return result;
});

Parse.Cloud.define('fetchUserAvatarFromAddress', async (request: any) => {
    if (request.params.address) {
        const query = new Parse.Query('_User', { useMasterKey: true });
        const pipeline = [
            {
                match: {
                    ethAddress: request.params.address,
                },
            },
            {
                lookup: {
                    from: 'UserInfo',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'userInfo',
                },
            },
            {
                project: {
                    'userInfo.avatar': 1,
                },
            },
        ];
        const result = await query.aggregate(pipeline);
        return result[0].userInfo[0].avatar;
    }
    return null;
});

Parse.Cloud.define('fetchAllTokens', async () => {
    const query = new Parse.Query('TokenCreated', { useMasterKey: true });
    const pipeline = [
        {
            project: {
                _id: 1,
                tokenId: 1,
                price: 1,
                block_timestamp: 1,
                transaction_hash: 1,
            },
        },
    ];
    const result = await query.aggregate(pipeline);
    return result;
});

/**************************************************************************/
/****************************    Search   *********************************/
/**************************************************************************/

Parse.Cloud.define('fetchMatchingUsers', async (request: any) => {
    const query = new Parse.Query('_User', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                username: { $regex: `^${request.params.username}` },
                name: { $ne: null },
            },
        },
        {
            lookup: {
                from: 'UserInfo',
                localField: '_id',
                foreignField: 'userId',
                as: 'userInfo',
            },
        },
        { limit: 5 },
        {
            project: {
                _id: 1,
                ethAddress: 1,
                accounts: 1,
                name: 1,
                username: 1,
                'userInfo.avatar': 1,
            },
        },
    ];

    return query.aggregate(pipeline);
});

Parse.Cloud.define('fetchAddressFromUsername', async (request: any) => {
    const query = new Parse.Query('_User', { useMasterKey: true });
    const pipeline = [
        {
            match: {
                username: request.params.username,
            },
        },
        {
            project: {
                _id: 1,
                ethAddress: 1,
                name: 1,
                username: 1,
            },
        },
    ];
    const result = await query.aggregate(pipeline);
    return result[0].ethAddress;
});

/**********************************************************************
***********************************************************************

█████    █████  ████   ████  ████    ████
██████  ██████   ████ ████   ████    ████
████ ████ ████     █████      ████  ████
████  ██  ████   ████ ████      ██████
████      ████  ████   ████      ████

              
  ████████    ████████     █████    █████  ████  █████   ████
████    ████  ████   ███   ██████  ██████  ████  ██████  ████
████████████  ████   ████  ████ ████ ████  ████  ████ ██ ████
████    ████  ████   ███   ████  ██  ████  ████  ████  ██████
████    ████  ████████     ████      ████  ████  ████    ████

**********************************************************************
**********************************************************************
*/

Parse.Cloud.define('adminGetArtistVerificationTableDetails', async () => {
    // Verification Requests
    const verificationRequestedQuery = new Parse.Query('ArtistVerification', { useMasterKey: true });
    const verificationRequestedPipeline = [
        {
            match: {
                verificationRequested: true,
            },
        },
        {
            lookup: {
                from: '_User',
                let: { userId: '$userId' },
                pipeline: [
                    {
                        $match: {
                            $expr: { $and: [{ $eq: ['$_id', '$$userId'] }, { $ne: ['$isArtistVerified', true] }] },
                        },
                    },
                ],
                as: 'artistInfo',
            },
        },
        {
            match: {
                $expr: {
                    $and: [
                        { $eq: [{ $first: '$artistInfo.isArtist' }, true] },
                        { $ne: [{ $first: '$artistInfo.isArtistVerified' }, true] },
                    ],
                },
            },
        },
        {
            lookup: {
                from: 'UserInfo',
                let: { userId: '$userId' },
                pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$userId'] }] } } }],
                as: 'artistUserInfo',
            },
        },
        {
            project: {
                updatedAt: 1,
                userId: 1,
                isPersonaVerified: 1,
                verificationRequested: 1,
                artistRealName: 1,
                name: { $first: '$artistInfo.name' },
                username: { $first: '$artistInfo.username' },
                ethAddress: { $first: '$artistInfo.ethAddress' },
                email: { $first: '$artistInfo.email' },
                songLink: 1,
                instagramHandle: 1,
                avatar: { $first: '$artistUserInfo.avatar' },
            },
        },
    ];
    const verificationRequestedResult = await verificationRequestedQuery.aggregate(verificationRequestedPipeline);

    // Verification in progress
    const verificationInProgressQuery = new Parse.Query('ArtistVerification', { useMasterKey: true });
    const verificationInProgressPipeline = [
        { match: { $expr: { $ne: ['$verificationRequested', true] } } },
        {
            lookup: {
                from: '_User',
                let: { userId: '$userId' },
                pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$_id', '$$userId'] }] } } }],
                as: 'artistInfo',
            },
        },
        {
            match: {
                $expr: {
                    $and: [
                        { $eq: [{ $first: '$artistInfo.isArtist' }, true] },
                        { $ne: [{ $first: '$artistInfo.isArtistVerified' }, true] },
                    ],
                },
            },
        },
        {
            project: {
                updatedAt: 1,
                isPersonaVerified: 1,
                verificationRequested: 1,
                artistRealName: 1,
                name: { $first: '$artistInfo.name' },
                username: { $first: '$artistInfo.username' },
                ethAddress: { $first: '$artistInfo.ethAddress' },
                songLink: 1,
                instagramHandle: 1,
            },
        },
    ];
    const verificationInProgressResult = await verificationInProgressQuery.aggregate(verificationInProgressPipeline);

    // Artists not began verification
    const artistsNotBeganVerificationQuery = new Parse.Query('_User', { useMasterKey: true });
    const artistsNotBeganVerificationPipeline = [
        { match: { $expr: { $and: [{ $eq: ['$isArtist', true] }, { $ne: ['$isArtistVerified', true] }] } } },
        {
            lookup: {
                from: 'ArtistVerification',
                let: { userId: '$_id' },
                pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$userId'] }] } } }],
                as: 'artistVerificationInfo',
            },
        },
        { match: { $expr: { $and: [{ $ne: [{ $first: '$artistVerificationInfo.userId' }, '$_id'] }] } } },
        {
            project: {
                username: 1,
                name: 1,
                email: 1,
                ethAddress: 1,
            },
        },
    ];
    const artistsNotBeganVerificationResult = await artistsNotBeganVerificationQuery.aggregate(
        artistsNotBeganVerificationPipeline,
    );

    // Verified Artists
    const verifiedArtistsQuery = new Parse.Query('_User', { useMasterKey: true });
    const verifiedArtistsPipeline = [
        { match: { $expr: { $and: [{ $eq: ['$isArtist', true] }, { $eq: ['$isArtistVerified', true] }] } } },
        {
            lookup: {
                from: 'ArtistVerification',
                let: { userId: '$_id' },
                pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$userId', '$$userId'] }] } } }],
                as: 'artistVerificationInfo',
            },
        },
        {
            project: {
                username: 1,
                name: 1,
                email: 1,
                ethAddress: 1,
                artistRealName: { $first: '$artistVerificationInfo.artistRealName' },
                songLink: { $first: '$artistVerificationInfo.songLink' },
                instagramHandle: { $first: '$artistVerificationInfo.instagramHandle' },
            },
        },
    ];
    const verifiedArtistsResult = await verifiedArtistsQuery.aggregate(verifiedArtistsPipeline);

    const result = {
        verificationRequests: verificationRequestedResult,
        verificationInProgress: verificationInProgressResult,
        artistsNotBeganVerification: artistsNotBeganVerificationResult,
        verifiedArtists: verifiedArtistsResult,
    };

    return result;
});

Parse.Cloud.define('adminSetArtistVerified', async (request: any) => {
    try {
        const query = new Parse.Query('ArtistVerification');
        query.equalTo('userId', request.params.userId);
        query.equalTo('isPersonaVerified', true);
        query.equalTo('verificationRequested', true);
        const artistVerificationInfo = await query.first({ useMasterKey: true });

        if (artistVerificationInfo) {
            const _query = new Parse.Query('_User', { useMasterKey: true });
            _query.equalTo('objectId', request.params.userId);

            const artist = await _query.first({ useMasterKey: true });
            artist.set('isArtistVerified', true);

            await artist.save(null, { useMasterKey: true });

            await sendEmail({
                to: request.params.email,
                templateId: 'd-1058dab3c15949ce9e4b61683c86ade1',
                dynamicTemplateData: {
                    name: request.params.name,
                    marketplaceLink: `${MUSIXVERSE_ROOT_URL}/mxcatalog/new-releases`,
                },
            });
            return artist;
        }
        return null;
    } catch (error) {
        return error;
    }
});

Parse.Cloud.define('adminGetUsers', async () => {
    const allUsersQuery = new Parse.Query('_User', { useMasterKey: true });
    const allUsersPipeline = [{ match: { ethAddress: { $exists: true } } }];
    const allUsersResult = await allUsersQuery.aggregate(allUsersPipeline);

    const artistsQuery = new Parse.Query('_User', { useMasterKey: true });
    const artistsPipeline = [
        { match: { ethAddress: { $exists: true } } },
        { match: { $expr: { $and: [{ $eq: ['$isArtist', true] }] } } },
    ];
    const artistsResult = await artistsQuery.aggregate(artistsPipeline);

    const collectorsQuery = new Parse.Query('_User', { useMasterKey: true });
    const collectorsPipeline = [
        { match: { ethAddress: { $exists: true } } },
        { match: { $expr: { $and: [{ $ne: ['$isArtist', true] }] } } },
    ];
    const collectorsResult = await collectorsQuery.aggregate(collectorsPipeline);

    const result = {
        allUsers: allUsersResult,
        artists: artistsResult,
        collectors: collectorsResult,
    };
    return result;
});
