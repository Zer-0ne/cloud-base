import { print } from '@/utils/color-print';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export class TokenManager<T extends JwtPayload = JwtPayload> {
    private static secretKey: string = process.env.SECRET_KEY_FOR_JWT_TOKEN as string;

    /**
     * Generic method to create JWT token
     * @param payload - Payload to include in the token
     * @param options - JWT sign options (optional)
     * @returns Generated token or undefined
     */
    static async createToken<U extends JwtPayload>(
        payload: U,
        options?: SignOptions
    ): Promise<string | undefined> {
        try {
            return jwt.sign(payload, this.secretKey, options);
        } catch (error) {
            this.handleError('create', error);
            return undefined;
        }
    }

    /**
     * Generic method to verify JWT token
     * @param token - Token to verify
     * @returns Decoded payload or throws error
     */
    static verifyToken<U extends JwtPayload>(token: string): U {
        try {
            return jwt.verify(token, this.secretKey) as U;
        } catch (error) {
            this.handleError('verify', error);
            throw error;
        }
    }

    /**
     * Generic method to refresh JWT token
     * @param token - Token to refresh
     * @param newOptions - New JWT options (optional)
     * @returns New token or undefined
     */
    static async refreshToken<U extends JwtPayload>(
        token: string,
        newOptions?: SignOptions
    ): Promise<string | undefined> {
        try {
            const decoded = this.verifyToken<U>(token);
            return this.createToken(decoded, newOptions);
        } catch (error) {
            this.handleError('refresh', error);
            return undefined;
        }
    }

    /**
     * Generic method to decode JWT token without verification
     * @param token - Token to decode
     * @returns Decoded payload or null
     */
    static decodeToken<U extends JwtPayload>(token: string): U | null {
        try {
            return jwt.decode(token) as U;
        } catch (error) {
            this.handleError('decode', error);
            return null;
        }
    }

    /**
     * Unified error handler
     * @param operation - Operation type
     * @param error - Error object
     */
    private static handleError(operation: string, error: unknown): void {
        const message = (error as Error)?.message || 'Unknown error occurred';
        print(`Error ${operation} token: ${message}`, 'red', undefined, 'error');

        // Add additional error handling logic here
        if (this.isTokenExpiredError(message)) {
            print('Token has expired', 'yellow');
        }
    }

    /**
     * Check if error is token expiration error
     * @param message - Error message
     * @returns Boolean indicating if token is expired
     */
    private static isTokenExpiredError(message: string): boolean {
        return message.includes('expired');
    }
}