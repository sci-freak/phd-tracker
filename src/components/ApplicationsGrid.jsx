import React from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import ApplicationCard from './ApplicationCard';
import SortableItem from './SortableItem';

const ApplicationsGrid = ({
    applications,
    dragEnabled,
    onReorder,
    editingAppId,
    onDelete,
    onStatusChange,
    onEdit,
    onEditEnd
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;
        onReorder(active.id, over.id);
    };

    const renderCard = (app) => (
        <ApplicationCard
            app={app}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            startEditing={app.id === editingAppId}
            onEditEnd={onEditEnd}
        />
    );

    if (!dragEnabled) {
        return (
            <div className="grid-container">
                {applications.map((app) => (
                    <React.Fragment key={app.id}>{renderCard(app)}</React.Fragment>
                ))}
            </div>
        );
    }

    return (
        <div className="grid-container">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                    items={applications.map((app) => app.id)}
                    strategy={rectSortingStrategy}
                >
                    {applications.map((app) => (
                        <SortableItem key={app.id} id={app.id}>
                            {renderCard(app)}
                        </SortableItem>
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
};

export default ApplicationsGrid;
