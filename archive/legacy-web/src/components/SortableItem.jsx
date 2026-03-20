import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        height: '100%',
    };

    // Clone the child to pass the dragHandleProps
    const childWithProps = React.cloneElement(children, {
        dragHandleProps: { ...attributes, ...listeners }
    });

    return (
        <div ref={setNodeRef} style={style}>
            {childWithProps}
        </div>
    );
};

export default SortableItem;
