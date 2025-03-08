import { print } from '@/utils/color-print';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

// Promisify zlib methods
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

export class CryptoService {
    private static secretKey: Buffer;

    static {
        const key = process.env.SECRET_KEY_ENCRYPTION as string;
        if (!key || key.length !== 64) {
            throw new Error("Invalid or missing SECRET_KEY_ENCRYPTION. Ensure it's a 32-byte hex string.");
        }
        this.secretKey = Buffer.from(key, 'hex');
    }

    /**
     * Encrypts and compresses the given data using AES-256-GCM with zlib compression.
     * @param data - The data to encrypt.
     * @returns A promise that resolves to an object containing the encrypted data, IV, and authentication tag.
     * @throws Will throw an error if encryption or compression fails.
     */
    public static async encryptData(data: string): Promise<{ encrypted: string; iv: string; authTag: string }> {
        try {
            // Compress the data first
            const compressed = await deflate(data);

            // Generate a 12-byte IV for AES-256-GCM
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', this.secretKey, iv);

            // Encrypt the compressed data
            let encrypted = cipher.update(compressed);
            encrypted = Buffer.concat([encrypted, cipher.final()]);

            // Get the auth tag
            const authTag = cipher.getAuthTag();

            // Return everything in Base64 for compact representation
            return {
                encrypted: encrypted.toString('base64url'), // Using base64url for even more compact output
                iv: iv.toString('base64url'),
                authTag: authTag.toString('base64url')
            };
        } catch (error) {
            print(`Error: Encrypting data - ${(error as Error).message}`, 'red', undefined, 'error');
            throw error;
        }
    }

    /**
     * Decrypts and decompresses the given data using AES-256-GCM and zlib.
     * @param encryptedData - The encrypted data to decrypt (Base64URL encoded).
     * @param iv - The Base64URL-encoded initialization vector used during encryption.
     * @param authTag - The Base64URL-encoded authentication tag generated during encryption.
     * @returns A promise that resolves to the decrypted data.
     * @throws Will throw an error if decryption or decompression fails.
     */
    public static async decryptData(encryptedData: string, iv: string, authTag: string): Promise<string> {
        try {
            const decipher = crypto.createDecipheriv(
                'aes-256-gcm',
                this.secretKey,
                Buffer.from(iv, 'base64url')
            );

            decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

            // Decrypt the data
            const encryptedBuffer = Buffer.from(encryptedData, 'base64url');
            let decrypted = decipher.update(encryptedBuffer);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            // Decompress the decrypted data
            const decompressed = await inflate(decrypted);
            return decompressed.toString('utf8');
        } catch (error) {
            print(`Error: Decrypting data - ${(error as Error).message}`, 'red', undefined, 'error');
            throw error;
        }
    }
}