import { useCallback } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { DataService } from '../services/DataService';
import { getBackupDateStamp } from '@phd-tracker/shared/dates';
import { mapImportedCsvRow, parseImportedJson } from '@phd-tracker/shared/imports';

export function useImportExport({ currentUser, applications, confirm }) {
    const exportData = useCallback(() => {
        const dataStr = JSON.stringify(applications, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `phd-applications-${getBackupDateStamp()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [applications]);

    const processImports = useCallback(async (apps) => {
        if (!apps || apps.length === 0) return;
        const destination = currentUser?.isGuest ? 'local guest storage' : 'your cloud account';
        const ok = await confirm({
            title: `Import ${apps.length} applications?`,
            message: `They will be added to ${destination}. Existing entries are not overwritten.`,
            confirmLabel: 'Import',
            cancelLabel: 'Cancel'
        });
        if (!ok) return;

        try {
            await DataService.importApplications(currentUser, apps);
            toast.success(`Imported ${apps.length} applications`);
        } catch (error) {
            console.error('Import failed', error);
            toast.error('Import failed', { description: 'See console for details.' });
        }
    }, [currentUser, confirm]);

    const importData = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (loadEvent) => {
            const content = loadEvent.target.result;

            if (file.name.endsWith('.json')) {
                try {
                    const parsed = parseImportedJson(content);
                    if (parsed.length > 0) processImports(parsed);
                } catch {
                    toast.error('Invalid JSON file');
                }
                return;
            }

            if (file.name.endsWith('.csv')) {
                Papa.parse(content, {
                    header: true,
                    complete: (results) => {
                        const mapped = results.data.map(mapImportedCsvRow).filter(Boolean);
                        processImports(mapped);
                    }
                });
            }
        };
        reader.readAsText(file);

        // Reset the input so importing the same filename twice in a row works.
        event.target.value = '';
    }, [processImports]);

    return { exportData, importData };
}
