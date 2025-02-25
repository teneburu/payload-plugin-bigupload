import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { BigUpload } from 'payload-plugin-bigupload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { devUser } from './helpers/credentials.js'
import { testEmailAdapter } from './helpers/testEmailAdapter.js'
import { seed } from './seed.js'
import { Media } from './app/(payload)/collections/Media.js'
import { Posts } from './app/(payload)/collections/Posts.js'
import { DestinationStream } from 'pino'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

const destination: DestinationStream = {
  write: (message) => {
    console.log(message)
  },
}

export default buildConfig({
  admin: {
    autoLogin: devUser,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  logger: {
    destination: destination,
    options: {
      level: 'info',
    },
  },
  upload: {
    debug: true,
    uploadTimeout: 0,
    useTempFiles: true,
    limits: {
      fileSize: 1024 * 1024 * 1024 * 100, // 100GB
    },
  },
  collections: [Media, Posts],
  db: postgresAdapter({
    idType: 'uuid',
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  editor: lexicalEditor(),
  email: testEmailAdapter,
  onInit: async (payload) => {
    await seed(payload)
  },
  plugins: [
    BigUpload({
      enabled: true,
      collections: {
        media: true,
      },
      config: {
        endpoint: process.env.R2_ENDPOINT || '',
        region: process.env.R2_REGION || '',
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
      },
      bucket: process.env.R2_BUCKET_NAME || '',
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
