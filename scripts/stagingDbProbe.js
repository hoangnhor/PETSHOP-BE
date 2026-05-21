/* eslint-disable no-console */
const mongoose = require('mongoose');

const run = async () => {
    const uri = process.env.STAGING_MONGODB_URL;
    if (!uri) {
        throw new Error('Thiếu STAGING_MONGODB_URL');
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const db = mongoose.connection.db;

    await db.admin().ping();

    const probeCollection = db.collection('_ops_probe');
    const now = new Date();
    const doc = {
        source: 'be-ci-staging-probe',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    };

    const insertResult = await probeCollection.insertOne(doc);
    await probeCollection.deleteOne({ _id: insertResult.insertedId });

    console.log('Staging DB probe: PASS');
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('Staging DB probe: FAIL');
    console.error(error?.message || error);
    try {
        await mongoose.disconnect();
    } catch (disconnectError) {
        // ignore
    }
    process.exit(1);
});
