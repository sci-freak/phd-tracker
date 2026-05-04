import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataService } from '../services/DataService';

export function useGuestMerge({ currentUser, confirm }) {
    const [conflictModalOpen, setConflictModalOpen] = useState(false);
    const [guestDataToMerge, setGuestDataToMerge] = useState([]);

    useEffect(() => {
        if (!currentUser || currentUser.isGuest) return;
        const guestData = DataService.fetchGuestData();
        if (guestData.length > 0) {
            setGuestDataToMerge(guestData);
            setConflictModalOpen(true);
        }
    }, [currentUser]);

    const resolve = useCallback(async (resolvedApps) => {
        try {
            if (resolvedApps.length > 0) {
                await DataService.batchAdd(currentUser, resolvedApps);
            }
            DataService.clearGuestData();
            setConflictModalOpen(false);
            setGuestDataToMerge([]);
            toast.success('Sync complete', { description: 'Guest data merged into your account.' });
        } catch (error) {
            console.error('Merge failed', error);
            toast.error('Sync failed', { description: 'Could not merge guest data. Please try again.' });
        }
    }, [currentUser]);

    const discard = useCallback(async () => {
        const ok = await confirm({
            title: 'Keep guest data separate?',
            message: 'Your local guest data will stay on this device. Sign out and continue as Guest to access it again.',
            confirmLabel: 'Keep separate',
            cancelLabel: 'Cancel'
        });
        if (ok) {
            setConflictModalOpen(false);
            setGuestDataToMerge([]);
        }
    }, [confirm]);

    return {
        conflictModalOpen,
        guestDataToMerge,
        resolve,
        discard
    };
}
