import * as argon2 from 'argon2';

const password = process.argv[2];
if (!password || password.length < 12) {
  throw new Error('Usage: npm run admin:hash-password -- "a password with 12+ characters"');
}

argon2.hash(password, { type: argon2.argon2id }).then((hash) => console.log(hash));
