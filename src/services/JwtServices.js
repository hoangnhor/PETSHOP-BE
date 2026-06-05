const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { env } = require('../config/env');
const User = require('../models/UserModel');

const hashToken = (token) =>
    crypto.createHash('sha256').update(String(token || '')).digest('hex');

const isSameHash = (leftHash, rightHash) => {
    if (!leftHash || !rightHash) return false;
    const leftBuffer = Buffer.from(String(leftHash));
    const rightBuffer = Buffer.from(String(rightHash));
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getExpiryFromJwtWithoutVerify = (token) => {
    const decoded = jwt.decode(token);
    if (!decoded?.exp) return null;
    return new Date(Number(decoded.exp) * 1000);
};

const saveRefreshTokenForUser = async (
    userId,
    refreshToken,
    { previousHash = '', previousGraceUntil = null, expectedCurrentHash } = {}
) => {
    if (!userId || !refreshToken) return;
    const filter = { _id: userId };
    if (typeof expectedCurrentHash === 'string') {
        filter.refreshTokenHash = expectedCurrentHash;
    }
    const updateResult = await User.updateOne(
        filter,
        {
            $set: {
                refreshTokenHash: hashToken(refreshToken),
                refreshTokenExpiresAt: getExpiryFromJwtWithoutVerify(refreshToken),
                previousRefreshTokenHash: previousHash || '',
                previousRefreshTokenGraceUntil: previousGraceUntil || null,
            },
        }
    );
    if (typeof expectedCurrentHash === 'string') {
        return updateResult.modifiedCount === 1;
    }
    return true;
};

const revokeRefreshTokenForUser = async (userId) => {
    if (!userId) return;
    await User.updateOne(
        { _id: userId },
        {
            $set: {
                refreshTokenHash: '',
                refreshTokenExpiresAt: null,
                previousRefreshTokenHash: '',
                previousRefreshTokenGraceUntil: null,
            },
        }
    );
};

const revokeRefreshTokenFromToken = async (token) => {
    if (!token) return;
    try {
        const decoded = jwt.verify(token, env.refreshTokenSecret);
        await revokeRefreshTokenForUser(decoded?.id);
    } catch (error) {
        // Ignore invalid/expired token on logout.
    }
};

const generalAccessToken = async (payload) => {
    const access_token = jwt.sign(
        { ...payload },
        env.accessTokenSecret,
        { expiresIn: '15m' }
    );
    return access_token;
};

const generalRefreshToken = async (payload) => {
    const tokenId = crypto.randomUUID();
    const refresh_token = jwt.sign(
        { ...payload, type: 'refresh' },
        env.refreshTokenSecret,
        { expiresIn: env.refreshTokenExpiresIn, jwtid: tokenId }
    );
    return refresh_token;
};

const refreshTokenJwtService = async (token) => {
    let decoded;
    try {
        decoded = jwt.verify(token, env.refreshTokenSecret);
    } catch (error) {
        return {
            status: 'ERR',
            code: 'UNAUTHORIZED',
            message: 'Xác thực thất bại',
        };
    }

    const user = await User.findById(decoded?.id)
        .select('email isAdmin status isDeleted refreshTokenHash refreshTokenExpiresAt previousRefreshTokenHash previousRefreshTokenGraceUntil')
        .lean();

    if (!user || user.status === 'blocked' || user.isDeleted || !user.refreshTokenHash) {
        await revokeRefreshTokenForUser(decoded.id);
        return {
            status: 'ERR',
            code: 'UNAUTHORIZED',
            message: 'Xác thực thất bại',
        };
    }
    if (user.refreshTokenExpiresAt && new Date(user.refreshTokenExpiresAt).getTime() <= Date.now()) {
        await revokeRefreshTokenForUser(decoded.id);
        return {
            status: 'ERR',
            code: 'UNAUTHORIZED',
            message: 'Xác thực thất bại',
        };
    }

    const incomingHash = hashToken(token);
    const isCurrentRefreshToken = isSameHash(incomingHash, user.refreshTokenHash);
    const isPreviousRefreshToken =
        isSameHash(incomingHash, user.previousRefreshTokenHash) &&
        user.previousRefreshTokenGraceUntil &&
        new Date(user.previousRefreshTokenGraceUntil).getTime() > Date.now();

    if (!isCurrentRefreshToken && !isPreviousRefreshToken) {
        await revokeRefreshTokenForUser(decoded.id);
        return {
            status: 'ERR',
            code: 'UNAUTHORIZED',
            message: 'Xác thực thất bại',
        };
    }

    const access_token = await generalAccessToken({
        id: decoded.id,
        email: user.email,
        isAdmin: user.isAdmin,
    });

    if (isPreviousRefreshToken) {
        return {
            status: 'OK',
            message: 'Thành công',
            access_token,
        };
    }

    const refresh_token = await generalRefreshToken({
        id: decoded.id,
        email: user.email,
        isAdmin: user.isAdmin,
    });
    const rotated = await saveRefreshTokenForUser(decoded.id, refresh_token, {
        previousHash: user.refreshTokenHash,
        previousGraceUntil: new Date(Date.now() + env.refreshTokenReuseGraceMs),
        expectedCurrentHash: user.refreshTokenHash,
    });
    if (!rotated) {
        return {
            status: 'ERR',
            code: 'UNAUTHORIZED',
            message: 'Phiên đăng nhập đã được làm mới ở nơi khác, vui lòng đăng nhập lại',
        };
    }

    return {
        status: 'OK',
        message: 'Thành công',
        access_token,
        refresh_token,
    };
};

module.exports = {
    generalAccessToken,
    generalRefreshToken,
    genneralAccessToken: generalAccessToken,
    genneralRefreshToken: generalRefreshToken,
    refreshTokenJwtService,
    saveRefreshTokenForUser,
    revokeRefreshTokenForUser,
    revokeRefreshTokenFromToken,
};
