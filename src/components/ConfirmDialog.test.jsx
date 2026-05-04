import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

const renderDialog = (overrides = {}) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
        <ConfirmDialog
            isOpen
            title="Delete referee?"
            message="This cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={onConfirm}
            onCancel={onCancel}
            {...overrides}
        />
    );
    return { onConfirm, onCancel };
};

describe('ConfirmDialog', () => {
    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <ConfirmDialog isOpen={false} onConfirm={() => {}} onCancel={() => {}} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders title and message when open', () => {
        renderDialog();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Delete referee?')).toBeInTheDocument();
        expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    });

    it('exposes proper ARIA attributes for the dialog role', () => {
        renderDialog();
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
        expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-message');
    });

    it('calls onConfirm when the confirm button is clicked', async () => {
        const user = userEvent.setup();
        const { onConfirm } = renderDialog();
        await user.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when the cancel button is clicked', async () => {
        const user = userEvent.setup();
        const { onCancel } = renderDialog();
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Escape is pressed', async () => {
        const user = userEvent.setup();
        const { onCancel } = renderDialog();
        await user.keyboard('{Escape}');
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when the backdrop is clicked', async () => {
        const user = userEvent.setup();
        const { onCancel } = renderDialog();
        await user.click(screen.getByRole('presentation'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onCancel when the dialog content is clicked', async () => {
        const user = userEvent.setup();
        const { onCancel } = renderDialog();
        await user.click(screen.getByRole('dialog'));
        expect(onCancel).not.toHaveBeenCalled();
    });
});
