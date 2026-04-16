const readBlobAsDataUrl = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
};

const getDocumentDataUrl = async (document) => {
    if (!document) {
        throw new Error('Document is missing.');
    }

    if (document.dataUrl) {
        return document.dataUrl;
    }

    if (document.downloadUrl) {
        const response = await fetch(document.downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch document (${response.status}).`);
        }

        return readBlobAsDataUrl(await response.blob());
    }

    throw new Error('Document source is unavailable.');
};

export const openDocumentWithSystemViewer = async (document) => {
    if (!document) {
        return;
    }

    if (window.electronAPI?.openDocument) {
        const dataUrl = await getDocumentDataUrl(document);
        await window.electronAPI.openDocument({
            name: document.name || 'document',
            dataUrl
        });
        return;
    }

    const targetUrl = document.downloadUrl || document.dataUrl;
    if (!targetUrl) {
        throw new Error('Document source is unavailable.');
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
};
