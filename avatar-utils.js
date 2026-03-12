(function () {
    'use strict';

    // Expose deterministic avatar colors so a user without an avatarUrl
    // keeps the same placeholder color across the whole frontend.
    const hashString = (input) => {
        const value = String(input ?? '').trim().toLowerCase() || 'anonymous';
        let hash = 0;
        for (let i = 0; i < value.length; i += 1) {
            hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
        }
        return hash;
    };

    const palette = (seed) => {
        const hue = Math.abs(hashString(seed)) % 360;
        return {
            bg: `hsl(${hue} 70% 40%)`,
            fg: '#ffffff'
        };
    };

    const initial = (name) => {
        const value = String(name ?? '').trim();
        return (value.charAt(0) || 'U').toUpperCase();
    };

    window.SVPAvatar = {
        palette,
        initial
    };
})();
