import { check, Update } from '@tauri-apps/plugin-updater';

/**
 * Service to handle application updates.
 */
export const UpdaterService = {
  /**
   * Checks for available updates.
   * @returns The update object if an update is available, otherwise null.
   */
  async checkForUpdate(): Promise<Update | null> {
    try {
      const update = await check();
      return update;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return null;
    }
  },

  /**
   * Downloads and installs the provided update.
   * @param update The update object to install.
   */
  async installUpdate(update: Update): Promise<void> {
    try {
      await update.downloadAndInstall();
    } catch (error) {
      console.error('Failed to download and install update:', error);
      throw error;
    }
  },
};
