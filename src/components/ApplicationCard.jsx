import React from 'react';
import ApplicationCardEditor from './ApplicationCardEditor';
import ApplicationCardView from './ApplicationCardView';
import { normalizeDocuments } from '@phd-tracker/shared/applications';

const ApplicationCard = ({ app, onDelete, onStatusChange, onEdit, startEditing, onEditEnd, dragHandleProps }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editedApp, setEditedApp] = React.useState(app);
    const documentsEditorRef = React.useRef(null);

    React.useEffect(() => {
        if (startEditing) {
            setIsEditing(true);
            const element = document.getElementById(`app-card-${app.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [startEditing, app.id]);

    const handleSave = () => {
        const pendingDocument = documentsEditorRef.current?.flushPending() || null;
        onEdit({
            ...editedApp,
            documents: pendingDocument
                ? [...normalizeDocuments(editedApp.documents), pendingDocument]
                : normalizeDocuments(editedApp.documents),
            previousDocuments: normalizeDocuments(app.documents, app.file, app.files)
        });
        setIsEditing(false);
        if (onEditEnd) onEditEnd();
    };

    const handleCancel = () => {
        setEditedApp(app);
        setIsEditing(false);
        if (onEditEnd) onEditEnd();
    };

    const handleEnterEdit = () => {
        setEditedApp({
            ...app,
            documents: normalizeDocuments(app.documents, app.file, app.files)
        });
        setIsEditing(true);
    };

    if (isEditing) {
        return (
            <ApplicationCardEditor
                ref={documentsEditorRef}
                value={editedApp}
                onChange={setEditedApp}
                onCancel={handleCancel}
                onSave={handleSave}
            />
        );
    }

    return (
        <ApplicationCardView
            app={app}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onEnterEdit={handleEnterEdit}
            dragHandleProps={dragHandleProps}
        />
    );
};

export default ApplicationCard;
