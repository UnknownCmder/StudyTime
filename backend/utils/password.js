const crypto = require('crypto');

// scrypt가 만들어낼 해시 바이트 길이입니다.
const KEY_LENGTH = 64;

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        // 같은 비밀번호라도 매번 다른 해시가 나오도록 사용자별 salt를 생성합니다.
        const salt = crypto.randomBytes(16).toString('hex');

        crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
            if (err) {
                reject(err);
                return;
            }

            // 알고리즘, salt, 해시를 함께 저장해야 나중에 같은 방식으로 검증할 수 있습니다.
            resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

function verifyPassword(password, storedPassword) {
    return new Promise((resolve, reject) => {
        // DB에 저장된 "알고리즘:salt:해시" 형식을 분리합니다.
        const [algorithm, salt, key] = String(storedPassword || '').split(':');

        if (algorithm !== 'scrypt' || !salt || !key) {
            resolve(false);
            return;
        }

        crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
            if (err) {
                reject(err);
                return;
            }

            const storedKey = Buffer.from(key, 'hex');

            if (storedKey.length !== derivedKey.length) {
                resolve(false);
                return;
            }

            // timingSafeEqual로 비교해서 문자열 비교보다 타이밍 공격에 덜 노출되게 합니다.
            resolve(crypto.timingSafeEqual(storedKey, derivedKey));
        });
    });
}

module.exports = {
    hashPassword,
    verifyPassword,
};
