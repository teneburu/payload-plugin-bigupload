import * as AWS from '@aws-sdk/client-s3'
import { Config } from 'payload'
import {
  Adapter,
  CollectionOptions,
  GeneratedAdapter,
} from '@payloadcms/plugin-cloud-storage/types'
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type { BigUploadPlugin, S3StorageOptions } from './types.js'

import { getGenerateURL } from './adapter/generateURL.js'
import { getHandleDelete } from './adapter/handleDelete.js'
import { getHandleUpload } from './adapter/handleUpload.js'
import { getHandler } from './adapter/staticHandler.js'

export const BigUpload: BigUploadPlugin =
  (bigUploadOptions: S3StorageOptions) =>
  (incomingConfig: Config): Config => {
    if (bigUploadOptions.enabled === false) {
      return incomingConfig
    }

    console.log('BigUpload module loaded')

    const adapter = s3StorageInternal(bigUploadOptions)

    // Add adapter to each collection option object
    const collectionsWithAdapter = Object.entries(bigUploadOptions.collections).reduce(
      (acc, [slug, collOptions]) => ({
        ...acc,
        [slug]: {
          ...(collOptions === true ? {} : collOptions),
          adapter,
        },
      }),
      {} as Record<string, CollectionOptions>,
    )

    // Set disableLocalStorage: true for collections specified in the plugin options
    const config = {
      ...incomingConfig,
      collections: (incomingConfig.collections || []).map((collection) => {
        if (!collectionsWithAdapter[collection.slug]) {
          return collection
        }

        return {
          ...collection,
          upload: {
            ...(typeof collection.upload === 'object' ? collection.upload : {}),
            disableLocalStorage: true,
          },
        }
      }),
    }

    return cloudStoragePlugin({
      collections: collectionsWithAdapter,
    })(config)
  }

function s3StorageInternal({ acl = 'private', bucket, config = {} }: S3StorageOptions): Adapter {
  return ({ collection, prefix = '' }): GeneratedAdapter => {
    let storageClient: AWS.S3 | null = null
    const getStorageClient: () => AWS.S3 = () => {
      if (storageClient) {
        return storageClient
      }
      storageClient = new AWS.S3(config)
      return storageClient
    }

    console.log('s3StorageInternal module loaded')
    return {
      name: 's3',
      generateURL: getGenerateURL({ bucket, config }),
      handleDelete: getHandleDelete({ bucket, getStorageClient }),
      handleUpload: getHandleUpload({
        acl,
        bucket,
        collection,
        getStorageClient,
        prefix,
      }),
      staticHandler: getHandler({ bucket, collection, getStorageClient }),
    }
  }
}
