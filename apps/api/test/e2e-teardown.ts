import { unlink } from 'fs/promises';
import { join } from 'path';

export default async () => {
  console.log('\n-- E2E Global Teardown --');
  const dbPath = join(__dirname, 'test.sqlite');
  try {
    await unlink(dbPath);
    console.log('✅ Test database file deleted successfully.');
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (error.code !== 'ENOENT') {
      console.error('Error deleting test database:', error);
    }
  }
};
