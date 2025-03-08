'use server'
import { cookies } from 'next/headers';

class GoogleAuthHandler {
    private static AUTH_TOKEN_COOKIE = 'google_auth_token';

    // Initiate Google OAuth Popup
    static async initiateAuth(redirectPath = '/') {
        try {
            // Fetch auth URL from server
            const response = await fetch('/api/google-service/auth?redirect=' + encodeURIComponent(redirectPath));
            const { authUrl } = await response.json();

            // Open popup window
            const popupWidth = 500;
            const popupHeight = 600;
            const left = (window.screen.width - popupWidth) / 2;
            const top = (window.screen.height - popupHeight) / 2;

            const popup = window.open(
                authUrl,
                'Google OAuth',
                `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`
            );

            // Add message listener for popup response
            window.addEventListener('message', this.handleAuthMessage, false);
        } catch (error) {
            console.error('Authentication initialization failed:', error);
        }
    }

    // Handle Authentication Message from Popup
    private static handleAuthMessage = async (event: MessageEvent) => {
        const cookieStore = await cookies();
        // Validate message origin if needed
        // if (event.origin !== 'expected-origin') return;

        if (event.data.type === 'AUTH_COMPLETE') {
            const { token, redirectUrl } = event.data;

            // Store token in secure cookie
            cookieStore.set(this.AUTH_TOKEN_COOKIE, token, {
                secure: true,
                sameSite: 'strict'
            });

            // Redirect or update app state
            window.location.href = redirectUrl;
        }

        if (event.data.type === 'AUTH_ERROR') {
            console.error('Authentication failed:', event.data.error);
            // Handle error (show notification, etc.)
        }

        // Remove event listener
        window.removeEventListener('message', this.handleAuthMessage);
    }

    // Retrieve stored token
    static async getToken() {
        const cookieStore = await cookies();
        return cookieStore.get(this.AUTH_TOKEN_COOKIE);
    }

    // Clear token on logout
    static async logout() {
        const cookieStore = await cookies();
        cookieStore.delete(this.AUTH_TOKEN_COOKIE);
        // Additional logout logic
    }
}

export default GoogleAuthHandler;