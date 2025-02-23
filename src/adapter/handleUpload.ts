import type * as AWS from '@aws-sdk/client-s3'
import type { HandleUpload } from '@payloadcms/plugin-cloud-storage/types'
import type { CollectionConfig } from 'payload'


interface Args {
  acl: 'private' | 'public-read'
  bucket: string
  collection: CollectionConfig
  getStorageClient: () => AWS.S3
  prefix: string
}

export function getHandleUpload({acl, bucket, collection, getStorageClient, prefix}: Args): HandleUpload {

}
