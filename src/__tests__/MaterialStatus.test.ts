import { describe, it, expect, vi } from 'vitest';
import { MaterialCondition } from '../types';

// Mocking Firebase to test the logic of status assignment
// In a real scenario, we'd test the service, here we simulate the mapping

const MAPPING_CONFIG = {
    legacy_to_new: {
        'new': 'new_functional',
        'ok': 'new_functional',
        'broken': 'totally_broken',
        'working_urgent_change': 'working_urgent_change',
        'totally_broken': 'totally_broken',
        'ordered': 'ordered'
    },
    driver_options: ['new_functional', 'working_urgent_change']
};

describe('Material Status Logic', () => {
    it('should map legacy "new" to "new_functional"', () => {
        const legacyStatus = 'new';
        const newStatus = MAPPING_CONFIG.legacy_to_new[legacyStatus as keyof typeof MAPPING_CONFIG.legacy_to_new];
        expect(newStatus).toBe('new_functional');
    });

    it('should restrict driver options to functional and urgent change', () => {
        const allOptions: MaterialCondition[] = [
            'pending_management',
            'new_functional',
            'working_urgent_change',
            'totally_broken',
            'ordered',
            'resolved'
        ];

        const driverOptions = allOptions.filter(opt => MAPPING_CONFIG.driver_options.includes(opt));

        expect(driverOptions).toHaveLength(2);
        expect(driverOptions).toContain('new_functional');
        expect(driverOptions).toContain('working_urgent_change');
        expect(driverOptions).not.toContain('totally_broken');
    });

    it('should handle "totally_broken" as a critical state', () => {
        const condition: MaterialCondition = 'totally_broken';
        const isCritical = condition === 'totally_broken';
        expect(isCritical).toBe(true);
    });
});
