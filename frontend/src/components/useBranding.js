import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

const DEFAULT_COLOR = '#2563eb';

function applyPrimaryColor(color) {
    document.documentElement.style.setProperty('--color-primary', color || DEFAULT_COLOR);
}

// G9: per-client branding (logo + primary color).
//
// Before login, there's no active company yet, so the login screen uses
// the instance-wide branding from the public /api/branding endpoint
// (the lowest-id company -- in practice the client's primary/holding
// company, consistent with "one application instance per client", G1).
//
// After login, the active company's own branding (if set) takes over --
// this lets a subsidiary with its own logo/color override the instance
// default once selected.
export function useBranding() {
    const { api, session } = useAuth();
    const [instanceBranding, setInstanceBranding] = useState(null);
    const [brandingLoaded, setBrandingLoaded] = useState(false);

    useEffect(() => {
        let active = true;
        api.get('/branding')
            .then((data) => {
                if (active) {
                    setInstanceBranding(data);
                    setBrandingLoaded(true);
                }
            })
            .catch(() => {
                if (active) setBrandingLoaded(true); // failed → show fallback immediately
            });
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeCompany = session?.companies?.find((c) => c.id === session.activeCompanyId);
    const branding = activeCompany?.branding_logo_url || activeCompany?.branding_primary_color ? activeCompany : instanceBranding;

    useEffect(() => {
        applyPrimaryColor(branding?.branding_primary_color);
    }, [branding?.branding_primary_color]);

    return {
        logoUrl: branding?.branding_logo_url || null,
        name: branding?.name || activeCompany?.name || null,
        primaryColor: branding?.branding_primary_color || DEFAULT_COLOR,
        // True once the /api/branding call has settled — use this to suppress
        // the fallback logo until we know whether a client logo exists.
        loaded: brandingLoaded || !!activeCompany,
    };
}
