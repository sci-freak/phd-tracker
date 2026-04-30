import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import ApplicationCard from './ApplicationCard';

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn()
    }
}));

const baseApp = () => ({
    id: 'app-1',
    university: 'Test University',
    program: 'PhD in Computer Science',
    department: 'CS Dept',
    country: 'United States',
    deadline: '2030-12-31T23:59',
    website: 'https://example.edu',
    qsRanking: '42',
    status: 'Not Started',
    requirements: ['GRE'],
    notes: '',
    documents: [
        {
            id: 'doc-existing',
            category: 'sop',
            name: 'statement.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            dataUrl: 'data:application/pdf;base64,AAA='
        }
    ]
});

const renderCard = (overrides = {}, props = {}) => {
    const app = { ...baseApp(), ...overrides };
    const onDelete = vi.fn();
    const onStatusChange = vi.fn();
    const onEdit = vi.fn();
    const onEditEnd = vi.fn();
    render(
        <ApplicationCard
            app={app}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onEditEnd={onEditEnd}
            {...props}
        />
    );
    return { app, onDelete, onStatusChange, onEdit, onEditEnd };
};

describe('ApplicationCard - display mode', () => {
    beforeEach(() => {
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    it('renders core application fields', () => {
        renderCard();
        expect(screen.getByRole('heading', { name: 'Test University' })).toBeInTheDocument();
        expect(screen.getByText('PhD in Computer Science')).toBeInTheDocument();
        expect(screen.getByText(/CS Dept/)).toBeInTheDocument();
        expect(screen.getByText(/United States/)).toBeInTheDocument();
        expect(screen.getByText('QS Rank: #42')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Website/ })).toHaveAttribute('href', 'https://example.edu');
    });

    it('renders status select bound to the app status', () => {
        renderCard({ status: 'Submitted' });
        const select = screen.getByRole('combobox');
        expect(select).toHaveValue('Submitted');
    });

    it('renders requirements and existing documents', () => {
        renderCard();
        expect(screen.getByText('GRE')).toBeInTheDocument();
        expect(screen.getByText(/statement\.pdf/)).toBeInTheDocument();
        expect(screen.getByText('1 document')).toBeInTheDocument();
    });

    it('calls onDelete(id) when delete button is clicked', async () => {
        const user = userEvent.setup();
        const { onDelete, app } = renderCard();
        await user.click(screen.getByTitle('Delete Application'));
        expect(onDelete).toHaveBeenCalledWith(app.id);
    });

    it('calls onStatusChange(id, newStatus) when status changes', async () => {
        const user = userEvent.setup();
        const { onStatusChange, app } = renderCard();
        await user.selectOptions(screen.getByRole('combobox'), 'Submitted');
        expect(onStatusChange).toHaveBeenCalledWith(app.id, 'Submitted');
    });
});

describe('ApplicationCard - edit mode transitions', () => {
    beforeEach(() => {
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    it('enters edit mode when Edit is clicked', async () => {
        const user = userEvent.setup();
        renderCard();
        await user.click(screen.getByTitle('Edit'));
        expect(screen.getByDisplayValue('Test University')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('auto-enters edit mode when startEditing prop is true', () => {
        renderCard({}, { startEditing: true });
        expect(screen.getByDisplayValue('Test University')).toBeInTheDocument();
    });

    it('Cancel leaves edit mode without calling onEdit', async () => {
        const user = userEvent.setup();
        const { onEdit, onEditEnd } = renderCard();
        await user.click(screen.getByTitle('Edit'));
        const uniInput = screen.getByDisplayValue('Test University');
        await user.clear(uniInput);
        await user.type(uniInput, 'Changed University');
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onEdit).not.toHaveBeenCalled();
        expect(onEditEnd).toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: 'Test University' })).toBeInTheDocument();
    });

    it('Save calls onEdit with updated app and previousDocuments snapshot', async () => {
        const user = userEvent.setup();
        const { onEdit, app } = renderCard();
        await user.click(screen.getByTitle('Edit'));
        const uniInput = screen.getByDisplayValue('Test University');
        await user.clear(uniInput);
        await user.type(uniInput, 'Edited University');
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(onEdit).toHaveBeenCalledTimes(1);
        const payload = onEdit.mock.calls[0][0];
        expect(payload.university).toBe('Edited University');
        expect(payload.previousDocuments).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'doc-existing' })
        ]));
        expect(payload.id).toBe(app.id);
    });
});

describe('ApplicationCard - requirements editor', () => {
    beforeEach(() => {
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    const enterEdit = async (user) => {
        await user.click(screen.getByTitle('Edit'));
    };

    const getRequirementSelect = () => {
        const label = screen.getByText('Requirements');
        const section = label.parentElement;
        return within(section).getByRole('combobox');
    };

    // Chips render as <span>; options render as <option>. Filter to avoid false positives.
    const getChips = (label) => screen.queryAllByText(label).filter((el) => el.tagName === 'SPAN');

    it('adds a new requirement and clears the select', async () => {
        const user = userEvent.setup();
        renderCard({ requirements: [] });
        await enterEdit(user);
        expect(getChips('TOEFL')).toHaveLength(0);
        await user.selectOptions(getRequirementSelect(), 'TOEFL');
        await user.click(screen.getByRole('button', { name: '+ Add' }));
        expect(getChips('TOEFL')).toHaveLength(1);
        expect(getRequirementSelect()).toHaveValue('');
    });

    it('does not add a duplicate requirement', async () => {
        const user = userEvent.setup();
        renderCard({ requirements: ['TOEFL'] });
        await enterEdit(user);
        expect(getChips('TOEFL')).toHaveLength(1);
        await user.selectOptions(getRequirementSelect(), 'TOEFL');
        await user.click(screen.getByRole('button', { name: '+ Add' }));
        expect(getChips('TOEFL')).toHaveLength(1);
    });

    it('removes a requirement when its X is clicked', async () => {
        const user = userEvent.setup();
        renderCard({ requirements: ['TOEFL', 'GRE'] });
        await enterEdit(user);
        const toeflChip = getChips('TOEFL')[0];
        await user.click(within(toeflChip).getByRole('button', { name: 'X' }));
        expect(getChips('TOEFL')).toHaveLength(0);
        expect(getChips('GRE')).toHaveLength(1);
    });
});

describe('ApplicationCard - documents editor', () => {
    beforeEach(() => {
        vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    const getHiddenFileInput = () => {
        const inputs = document.querySelectorAll('input[type="file"]');
        expect(inputs.length).toBeGreaterThan(0);
        return inputs[0];
    };

    it('adds a valid document to the editor state and persists it on Save', async () => {
        const user = userEvent.setup();
        const { onEdit } = renderCard({ documents: [] });
        await user.click(screen.getByTitle('Edit'));
        const file = new File(['hello'], 'sop.pdf', { type: 'application/pdf' });
        await user.upload(getHiddenFileInput(), file);
        await user.click(screen.getByRole('button', { name: '+ Add Document' }));
        expect(screen.getByText('sop.pdf')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(onEdit).toHaveBeenCalledTimes(1);
        const payload = onEdit.mock.calls[0][0];
        expect(payload.documents).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'sop.pdf', category: 'supporting' })
        ]));
    });

    it('rejects files larger than 2MB and toasts the user', async () => {
        const user = userEvent.setup();
        toast.error.mockClear();
        renderCard({ documents: [] });
        await user.click(screen.getByTitle('Edit'));
        const bigFile = new File([new Uint8Array(3 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });
        await user.upload(getHiddenFileInput(), bigFile);
        expect(toast.error).toHaveBeenCalledWith(
            expect.stringMatching(/too large/i),
            expect.anything()
        );
        // Clicking +Add Document with no file selected toasts, not appends
        await user.click(screen.getByRole('button', { name: '+ Add Document' }));
        expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/choose a file/i));
    });

    it('removes a pending document from the editor state', async () => {
        const user = userEvent.setup();
        renderCard({ documents: [] });
        await user.click(screen.getByTitle('Edit'));
        const file = new File(['hi'], 'cv.pdf', { type: 'application/pdf' });
        await user.upload(getHiddenFileInput(), file);
        await user.click(screen.getByRole('button', { name: '+ Add Document' }));
        expect(screen.getByText('cv.pdf')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Remove' }));
        expect(screen.queryByText('cv.pdf')).not.toBeInTheDocument();
    });
});
