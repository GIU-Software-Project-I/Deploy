import apiService from './api';

/**
 * Backup Service for managing system backups
 */
export const backupService = {
    /**
     * List all available backups
     * GET /api/backups/list
     */
    listBackups: async () => {
        return apiService.get('/api/backups/list');
    },

    /**
     * Create a new manual backup
     * POST /api/backups/create
     */
    createBackup: async (data?: { name?: string; oplog?: boolean; dumpDbUsersAndRoles?: boolean }) => {
        return apiService.post('/api/backups/create', data || {});
    },

    /**
     * Delete a backup file
     * DELETE /api/backups/:filename
     */
    deleteBackup: async (filename: string) => {
        return apiService.delete(`/api/backups/${filename}`);
    },
};
