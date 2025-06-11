import crypto from 'crypto'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'your-32-character-encryption-key'

console.log('Testing encryption key...')
console.log('Key length:', TOKEN_ENCRYPTION_KEY.length)
console.log('Key (first 8 chars):', TOKEN_ENCRYPTION_KEY.substring(0, 8) + '...')

// Test encryption/decryption
function encrypt(text) {
  const key = TOKEN_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'utf8'), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText) {
  const key = TOKEN_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)
  const [ivHex, encrypted] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'utf8'), iv)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

try {
  const testData = 'This is a test OAuth token'
  console.log('\nOriginal:', testData)
  
  const encrypted = encrypt(testData)
  console.log('Encrypted:', encrypted)
  
  const decrypted = decrypt(encrypted)
  console.log('Decrypted:', decrypted)
  
  if (testData === decrypted) {
    console.log('\n✅ Encryption key is working correctly!')
  } else {
    console.log('\n❌ Encryption/decryption failed!')
  }
} catch (error) {
  console.error('\n❌ Error testing encryption:', error.message)
}