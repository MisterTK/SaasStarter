import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { google } from 'googleapis';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, supabase } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Only allow admin users or in development
	const isDev = process.env.NODE_ENV === 'development';
	const isAdmin = user.email === process.env.PRIVATE_ADMIN_EMAIL;
	
	if (!isDev && !isAdmin) {
		throw error(403, 'Forbidden');
	}

	return {
		user: user.email
	};
};

export const actions: Actions = {
	testApi: async ({ locals, request }) => {
		const { user, supabase } = await locals.safeGetSession();
		if (!user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const accountId = formData.get('accountId') as string;
		const locationId = formData.get('locationId') as string;
		
		if (!accountId || !locationId) {
			return {
				success: false,
				error: 'Account ID and Location ID are required'
			};
		}

		try {
			// Get Google tokens
			const { data: tokenData, error: tokenError } = await supabase
				.from('google_tokens')
				.select('*')
				.eq('user_id', user.id)
				.single();

			if (tokenError || !tokenData) {
				return {
					success: false,
					error: 'No Google tokens found. Please connect your Google account first.'
				};
			}

			// Create OAuth2 client
			const oauth2Client = new google.auth.OAuth2(
				process.env.PUBLIC_GOOGLE_CLIENT_ID,
				process.env.GOOGLE_CLIENT_SECRET,
				`${url.origin}/auth/callback`
			);

			// Set credentials
			oauth2Client.setCredentials({
				access_token: tokenData.access_token,
				refresh_token: tokenData.refresh_token,
				expiry_date: tokenData.expiry_date
			});

			// Test different approaches
			const results = [];

			// Test 1: Direct URL construction
			try {
				const directUrl = `https://mybusinessaccountmanagement.googleapis.com/v1/accounts/${accountId}/invitations`;
				results.push({
					test: 'Direct URL Construction',
					url: directUrl,
					success: true
				});
			} catch (err) {
				results.push({
					test: 'Direct URL Construction',
					error: err.message,
					success: false
				});
			}

			// Test 2: Using googleapis library
			try {
				const mybusinessaccountmanagement = google.mybusinessaccountmanagement({
					version: 'v1',
					auth: oauth2Client
				});

				const response = await mybusinessaccountmanagement.accounts.invitations.list({
					parent: `accounts/${accountId}`
				});

				results.push({
					test: 'Google APIs Library',
					response: response.data,
					status: response.status,
					success: true
				});
			} catch (err) {
				results.push({
					test: 'Google APIs Library',
					error: err.message,
					stack: err.stack,
					response: err.response?.data,
					status: err.response?.status,
					success: false
				});
			}

			// Test 3: Direct fetch with OAuth token
			try {
				const directFetchUrl = `https://mybusinessaccountmanagement.googleapis.com/v1/accounts/${accountId}/invitations`;
				const fetchResponse = await fetch(directFetchUrl, {
					headers: {
						'Authorization': `Bearer ${tokenData.access_token}`,
						'Content-Type': 'application/json'
					}
				});

				const fetchData = await fetchResponse.json();
				
				results.push({
					test: 'Direct Fetch',
					url: directFetchUrl,
					status: fetchResponse.status,
					statusText: fetchResponse.statusText,
					data: fetchData,
					success: fetchResponse.ok
				});
			} catch (err) {
				results.push({
					test: 'Direct Fetch',
					error: err.message,
					stack: err.stack,
					success: false
				});
			}

			// Test 4: Check environment variables
			results.push({
				test: 'Environment Check',
				nodeVersion: process.version,
				platform: process.platform,
				hasGoogleClientId: !!process.env.PUBLIC_GOOGLE_CLIENT_ID,
				hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
				vercelEnv: process.env.VERCEL_ENV,
				nodeEnv: process.env.NODE_ENV,
				success: true
			});

			return {
				success: true,
				results,
				accountId,
				locationId
			};

		} catch (error) {
			console.error('Test API error:', error);
			return {
				success: false,
				error: error.message,
				stack: error.stack
			};
		}
	}
};