import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { arrayMove } from '@dnd-kit/sortable';
import { DataService } from '../services/DataService';

export function useApplications(currentUser) {
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            setApplications([]);
            setIsLoading(false);
            return undefined;
        }

        setIsLoading(true);
        const unsubscribe = DataService.subscribeToApplications(currentUser, (apps) => {
            setApplications(apps);
            setIsLoading(false);
        });

        return () => unsubscribe && unsubscribe();
    }, [currentUser]);

    const addApplication = useCallback(async (app) => {
        try {
            await DataService.addApplication(currentUser, {
                ...app,
                sortOrder: applications.length
            });
            toast.success('Application added');
        } catch (error) {
            console.error('Error adding document:', error);
            toast.error('Could not save application');
        }
    }, [currentUser, applications.length]);

    const deleteApplication = useCallback(async (id) => {
        try {
            const appToDelete = applications.find((app) => app.id === id);
            await DataService.deleteApplication(currentUser, id, appToDelete?.documents || []);
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error('Could not delete application');
        }
    }, [currentUser, applications]);

    const updateStatus = useCallback(async (id, newStatus) => {
        try {
            await DataService.updateStatus(currentUser, id, newStatus);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Could not update status');
        }
    }, [currentUser]);

    const editApplication = useCallback(async (updatedApp) => {
        try {
            await DataService.updateApplication(currentUser, updatedApp);
        } catch (error) {
            console.error('Error updating application:', error);
            toast.error('Could not save changes');
        }
    }, [currentUser]);

    const reorder = useCallback((activeId, overId) => {
        if (!activeId || !overId || activeId === overId) return;

        const oldIndex = applications.findIndex((item) => item.id === activeId);
        const newIndex = applications.findIndex((item) => item.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(applications, oldIndex, newIndex).map((item, index) => ({
            ...item,
            sortOrder: index
        }));

        setApplications(reordered);

        DataService.reorderApplications(currentUser, reordered).catch((error) => {
            console.error('Error saving manual order:', error);
            toast.error('Could not save the new order');
        });
    }, [applications, currentUser]);

    return {
        applications,
        setApplications,
        isLoading,
        addApplication,
        deleteApplication,
        updateStatus,
        editApplication,
        reorder
    };
}
