import { env, pipeline } from '@huggingface/transformers';

env.cacheDir = process.env.MODEL_CACHE_DIR || '.cache/models';
const model = process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small';

console.log(`Preparing ${model} in ${env.cacheDir}`);
pipeline('feature-extraction', model)
  .then(() => console.log('Embedding model is ready.'))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
