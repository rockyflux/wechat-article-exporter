import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { ensureMysqlSchema } from '~/server/utils/mysql/schema';

export default defineNitroPlugin(() => {
  if (!isMysqlEnabled()) {
    return;
  }

  void (async () => {
    try {
      await ensureMysqlSchema();
      console.log('[mysql] schema ready');
    } catch (error) {
      console.error('[mysql] failed to initialize schema:', error);
    }
  })();
});
