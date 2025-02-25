import type * as AWS from '@aws-sdk/client-s3'
import type { HandleUpload } from '@payloadcms/plugin-cloud-storage/types'
import type { CollectionConfig } from 'payload'

import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

interface Args {
  acl?: 'private' | 'public-read'
  bucket: string
  collection: CollectionConfig
  getStorageClient: () => AWS.S3
  prefix?: string
}

export const getHandleUpload = ({
  acl,
  bucket,
  getStorageClient,
  prefix = '',
}: Args): HandleUpload => {
  console.log('getHandleUpload module loaded')
  return async ({ data, file, req }) => {
    try {
      const fileKey = path.posix.join(data.prefix || prefix, file.filename)

      // Add startup logging
      req.payload.logger.info({ fileKey }, 'Starting upload')
      req.payload.logger.info({ fileSize: file.filesize }, 'File size')
      req.payload.logger.info({ tempFilePath: file.tempFilePath }, 'Using')

      req.payload.logger.info('Upload handler triggered for file:', file.filename)

      const fileStream = file.tempFilePath
        ? fs.createReadStream(file.tempFilePath)
        : Readable.from(file.buffer)

      fileStream.on('error', (err: Error) => {
        req.payload.logger.error('File stream error:', err)
        req.payload.logger.error(`File stream error for ${fileKey}:`, err)
        console.error('File stream error:', err)
        console.error(`File stream error for ${fileKey}:`, err)
      })

      const parallelUploadS3 = new Upload({
        client: getStorageClient(),
        params: {
          ACL: acl,
          Body: fileStream,
          Bucket: bucket,
          ContentType: file.mimeType,
          Key: fileKey,
        },
        partSize: 1024 * 1024 * 50,
        queueSize: 4,
      })

      // Add progress tracking
      parallelUploadS3.on('httpUploadProgress', (progress) => {
        if (progress.total) {
          const loaded = progress.loaded ?? 0
          const total = progress.total ?? 0
          const percent = ((loaded / total) * 100).toFixed(2)
          req.payload.logger.info(`Upload progress: ${percent}% (${loaded} bytes)`)
        } else {
          req.payload.logger.info(`Upload progress: ${progress.loaded ?? 0} bytes transferred`)
        }
      })

      try {
        await parallelUploadS3.done()
        req.payload.logger.info({ fileKey }, 'Upload completed successfully')
      } catch (err) {
        req.payload.logger.error(`Upload failed for ${fileKey}:`, err)
        console.error(`Upload failed for ${fileKey}:`, err)
        throw err // Re-throw to maintain existing error handling
      }

      return data
    } catch (err) {
      req.payload.logger.error('Upload error:', err)
      console.error('Upload error:', err)
      throw err
    }
  }
}
