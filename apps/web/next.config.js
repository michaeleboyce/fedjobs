const nextConfig = {
    env: {
        KINDE_SITE_URL: process.env.KINDE_SITE_URL ?? `https://fedjobs.vercel.app`,
        KINDE_POST_LOGOUT_REDIRECT_URL:
            process.env.KINDE_POST_LOGOUT_REDIRECT_URL ?? `https://fedjobs.vercel.app`,
        KINDE_POST_LOGIN_REDIRECT_URL:
            process.env.KINDE_POST_LOGIN_REDIRECT_URL ??
            `https://fedjobs.vercel.app/dashboard`
    },
    experimental: {
        serverMinification: false,
        serverActions: {
            bodySizeLimit: '15mb'
        }
    },
    // Add watchOptions to reduce the number of watched files
    webpack: (config, { isServer }) => {
        // Optimize file watching
        config.watchOptions = {
            poll: 1000,
            aggregateTimeout: 300,
            ignored: [
                '**/node_modules',
                '**/.git',
                '**/package-lock.json',
                '**/pnpm-lock.yaml',
                '**/yarn.lock',
                '**/.next'
            ]
        };
        return config;
    },
};

module.exports = nextConfig;