import assert from 'node:assert/strict'
import { conversationMaterialsForMessage } from './agentConversationMaterials'

const messages: any[] = [
  {
    id: 'user-1',
    role: 'user',
    attachments: [
      {
        id: 'att-local-1',
        source: 'user_upload',
        name: 'dog.png',
        content_type: 'image/png',
        size: 1024,
        created_at: '2026-06-13T10:00:00Z',
        updated_at: '2026-06-13T10:00:00Z',
      },
    ],
  },
  {
    id: 'assistant-1',
    role: 'assistant',
    generation_tasks: [
      {
        id: 'task-image-1',
        modality: 'image',
        result: {
          generation_options: {
            reference_images: [
              {
                url: 'https://cdn.example.com/portrait-a.jpg',
                role: 'reference_image',
                name: '官方人物 A',
                source: 'ark_virtual_portrait',
                asset_id: 'asset-a',
              },
              {
                url: 'asset://asset-b',
                cover_url: 'https://cdn.example.com/portrait-b.jpg',
                role: 'reference_image',
                name: '官方人物 B',
                source: 'ark_virtual_portrait',
              },
              {
                url: 'https://cdn.example.com/scene.jpg',
                role: 'reference_image',
                name: '场景参考',
              },
              {
                url: 'data:image/png;base64,dup',
                role: 'reference_image',
                source_attachment_id: 'att-local-1',
                name: '重复上传附件',
              },
            ],
          },
        },
      },
    ],
  },
]

const materials = conversationMaterialsForMessage(messages, 0)

assert.equal(materials.length, 4)
assert.deepEqual(materials.map(item => item.label), ['素材1', '素材2', '素材3', '素材4'])
assert.deepEqual(materials.map(item => item.kind), ['image', 'image', 'image', 'image'])
assert.equal(materials[0].previewUrl, 'https://cdn.example.com/portrait-a.jpg')
assert.equal(materials[1].previewUrl, 'https://cdn.example.com/portrait-b.jpg')
assert.equal(materials[2].previewUrl, 'https://cdn.example.com/scene.jpg')
assert.equal(materials[3].attachment?.id, 'att-local-1')


const assetOnlyMessages: any[] = [
  {
    id: 'user-asset-only',
    role: 'user',
    attachments: [],
  },
  {
    id: 'assistant-asset-only',
    role: 'assistant',
    generation_tasks: [
      {
        id: 'task-image-asset-only',
        modality: 'image',
        result: {
          generation_options: {
            reference_images: [
              {
                url: 'asset://asset-20260224200009-dhbfn',
                role: 'reference_image',
                name: '阿根廷 18岁 男 企业家/CEO',
                source: 'ark_virtual_portrait',
                asset_id: 'asset-20260224200009-dhbfn',
              },
            ],
          },
        },
      },
    ],
  },
]

const assetOnlyMaterials = conversationMaterialsForMessage(assetOnlyMessages, 0)
assert.equal(assetOnlyMaterials.length, 1)
assert.equal(assetOnlyMaterials[0].previewUrl, 'https://dev-xiaoone-cos-1432380304.cos.ap-guangzhou.myqcloud.com/ark-virtual-portraits/asset-20260224200009-dhbfn.jpg')

const optimisticPortraitMessages: any[] = [
  {
    id: 'user-optimistic-portraits',
    role: 'user',
    attachments: [
      {
        id: 'local:portrait:1:0',
        source: 'user_upload',
        name: '素材1',
        content_type: 'image/jpeg',
        size: 0,
        is_text: false,
        local_preview_url: 'https://cdn.example.com/portrait-a.jpg',
        source_reference_asset_id: 'asset-a',
        created_at: '2026-06-13T10:00:00Z',
        updated_at: '2026-06-13T10:00:00Z',
      },
      {
        id: 'local:portrait:1:1',
        source: 'user_upload',
        name: '素材2',
        content_type: 'image/jpeg',
        size: 0,
        is_text: false,
        local_preview_url: 'https://cdn.example.com/portrait-b.jpg',
        source_reference_asset_id: 'asset-b',
        created_at: '2026-06-13T10:00:00Z',
        updated_at: '2026-06-13T10:00:00Z',
      },
    ],
  },
  {
    id: 'assistant-optimistic-portraits',
    role: 'assistant',
    generation_tasks: [
      {
        id: 'task-image-optimistic',
        modality: 'image',
        result: {
          generation_options: {
            reference_images: [
              {
                url: 'https://cdn.example.com/portrait-a.jpg',
                role: 'reference_image',
                name: '官方人物 A',
                source: 'ark_virtual_portrait',
                asset_id: 'asset-a',
              },
              {
                url: 'https://cdn.example.com/portrait-b.jpg',
                role: 'reference_image',
                name: '官方人物 B',
                source: 'ark_virtual_portrait',
                asset_id: 'asset-b',
              },
            ],
          },
        },
      },
    ],
  },
]

const optimisticPortraitMaterials = conversationMaterialsForMessage(optimisticPortraitMessages, 0)
assert.equal(optimisticPortraitMaterials.length, 2)
assert.deepEqual(optimisticPortraitMaterials.map(item => item.previewUrl), [
  'https://cdn.example.com/portrait-a.jpg',
  'https://cdn.example.com/portrait-b.jpg',
])
assert.deepEqual(optimisticPortraitMaterials.map(item => item.attachment?.id || null), [null, null])

console.log('agentConversationMaterials restoration test passed')
