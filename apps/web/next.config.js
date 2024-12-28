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
    
};

module.exports = nextConfig;