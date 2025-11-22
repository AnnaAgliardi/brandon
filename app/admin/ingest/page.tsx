'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Upload as UploadIcon,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react'
import type { AssetMetadata } from '@/lib/types'

interface FileItem {
  id: string
  file?: File
  url?: string
  preview: string
  name: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  metadata: Partial<AssetMetadata>
}

const MAX_FILES = 20
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export default function BulkIngestPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<FileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Shared metadata
  const [sharedMetadata, setSharedMetadata] = useState<Partial<AssetMetadata>>({
    usage_rights: 'internal_only',
    status: 'draft',
    license_type_usage: 'Creative',
    license_type_subscription: 'Standard',
  })

  function generateId() {
    return Math.random().toString(36).substr(2, 9)
  }

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 50MB.'
    }
    return null
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || [])
    addFiles(selectedFiles)
  }

  function addFiles(selectedFiles: File[]) {
    if (files.length + selectedFiles.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    const newFiles: FileItem[] = []

    selectedFiles.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        alert(`${file.name}: ${error}`)
        return
      }

      const preview = URL.createObjectURL(file)
      newFiles.push({
        id: generateId(),
        file,
        preview,
        name: file.name,
        status: 'pending',
        progress: 0,
        metadata: {},
      })
    })

    setFiles((prev) => [...prev, ...newFiles])
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }

  async function handleAddUrl() {
    if (!urlInput.trim()) return

    if (files.length >= MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed`)
      return
    }

    const newFile: FileItem = {
      id: generateId(),
      url: urlInput,
      preview: urlInput,
      name: urlInput.split('/').pop() || 'URL Import',
      status: 'pending',
      progress: 0,
      metadata: {},
    }

    setFiles((prev) => [...prev, newFile])
    setUrlInput('')
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.preview && file.file) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  function applySharedMetadata() {
    setFiles((prev) =>
      prev.map((f) => ({
        ...f,
        metadata: { ...sharedMetadata },
      }))
    )
  }

  async function uploadAll() {
    if (files.length === 0) {
      alert('No files to upload')
      return
    }

    setIsUploading(true)

    for (const fileItem of files) {
      if (fileItem.status === 'success') continue

      try {
        await uploadSingle(fileItem)
      } catch (error) {
        console.error('Upload error:', error)
      }
    }

    setIsUploading(false)
  }

  async function uploadSingle(fileItem: FileItem) {
    // Update status
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0 } : f
      )
    )

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Step 1: Generate description and upload file
      const formData = new FormData()

      if (fileItem.file) {
        formData.append('image', fileItem.file)
      } else if (fileItem.url) {
        // For URLs, we need to fetch and convert to blob
        const response = await fetch(fileItem.url)
        const blob = await response.blob()
        formData.append('image', blob, 'url-import.jpg')
      } else {
        throw new Error('No file or URL provided')
      }

      // Add metadata
      const metadata = { ...sharedMetadata, ...fileItem.metadata }
      formData.append('metadata', JSON.stringify(metadata))

      const generateRes = await fetch('/api/admin/generate-description', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!generateRes.ok) {
        const errorData = await generateRes.json()
        throw new Error(errorData.error || 'Failed to process image')
      }

      const generatedData = await generateRes.json()

      // Step 2: Ingest the asset with all data
      const ingestPayload = {
        storage_path: generatedData.storage_path,
        preview_path: generatedData.preview_path,
        preview_url: generatedData.preview_url,
        mime_type: generatedData.mime_type,
        llm_description: generatedData.llm_description,
        llm_metadata: generatedData.llm_metadata,
        tags: generatedData.tags,
        // Add metadata with proper defaults
        usage_rights: metadata.usage_rights || 'internal_only',
        status: metadata.status || 'draft',
        image_purchase_date: metadata.image_purchase_date || new Date().toISOString().split('T')[0],
        image_capture_date: metadata.image_capture_date || new Date().toISOString().split('T')[0],
        license_type_usage: metadata.license_type_usage || 'Creative',
        license_type_subscription: metadata.license_type_subscription || 'Standard',
        brand: metadata.brand || null,
        region_representation: metadata.region_representation || null,
        campaign: metadata.campaign || null,
        location: metadata.location || null,
        partner: metadata.partner || null,
        client: metadata.client || null,
      }

      const ingestRes = await fetch('/api/admin/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(ingestPayload),
      })

      if (!ingestRes.ok) {
        const errorData = await ingestRes.json()
        throw new Error(errorData.error || 'Failed to save asset')
      }

      // Success
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      )
    } catch (error: any) {
      // Error
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id
            ? { ...f, status: 'error', error: error.message }
            : f
        )
      )
    }
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const successCount = files.filter((f) => f.status === 'success').length
  const errorCount = files.filter((f) => f.status === 'error').length

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-2">Bulk Asset Ingestion</h1>
        <p className="text-muted-foreground mb-8">
          Upload up to {MAX_FILES} files with shared metadata
        </p>

        {/* Drag & Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 mb-8 text-center transition-colors ${isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            Drag & drop files here
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse (max {MAX_FILES} files, 50MB each)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Select Files
          </Button>
        </div>

        {/* URL Import */}
        <div className="mb-8 flex gap-2">
          <div className="flex-1">
            <Label>Or import from URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              />
              <Button onClick={handleAddUrl} variant="outline">
                <LinkIcon className="h-4 w-4 mr-2" />
                Add URL
              </Button>
            </div>
          </div>
        </div>

        {/* Shared Metadata */}
        {files.length > 0 && (
          <div className="mb-8 p-6 border rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Shared Metadata</h3>
              <Button onClick={applySharedMetadata} size="sm">
                Apply to All Files
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Brand</Label>
                <Input
                  value={sharedMetadata.brand || ''}
                  onChange={(e) =>
                    setSharedMetadata({ ...sharedMetadata, brand: e.target.value })
                  }
                  placeholder="Enter brand name"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={sharedMetadata.status || 'draft'}
                  onValueChange={(value: any) =>
                    setSharedMetadata({ ...sharedMetadata, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Region</Label>
                <Select
                  value={sharedMetadata.region_representation || undefined}
                  onValueChange={(value) =>
                    setSharedMetadata({
                      ...sharedMetadata,
                      region_representation: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMER">AMER</SelectItem>
                    <SelectItem value="EMEA">EMEA</SelectItem>
                    <SelectItem value="APAC">APAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Campaign</Label>
                <Input
                  value={sharedMetadata.campaign || ''}
                  onChange={(e) =>
                    setSharedMetadata({
                      ...sharedMetadata,
                      campaign: e.target.value,
                    })
                  }
                  placeholder="Campaign name"
                />
              </div>
            </div>
          </div>
        )}

        {/* File Grid */}
        {files.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Files ({files.length}/{MAX_FILES})
              </h3>
              {!isUploading && pendingCount > 0 && (
                <Button onClick={uploadAll}>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload All ({pendingCount})
                </Button>
              )}
            </div>

            {/* Stats */}
            {(successCount > 0 || errorCount > 0) && (
              <div className="flex gap-4 mb-4 text-sm">
                {successCount > 0 && (
                  <span className="text-green-600">
                    ✓ {successCount} successful
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-destructive">✗ {errorCount} failed</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className="border rounded-lg overflow-hidden relative"
                >
                  {/* Remove button */}
                  {fileItem.status === 'pending' && (
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      className="absolute top-2 right-2 z-10 bg-background/80 rounded-full p-1 hover:bg-background"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* Preview */}
                  <div className="aspect-square relative bg-muted">
                    <img
                      src={fileItem.preview}
                      alt={fileItem.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-xs font-medium truncate mb-2">
                      {fileItem.name}
                    </p>

                    {/* Status */}
                    {fileItem.status === 'pending' && (
                      <div className="text-xs text-muted-foreground">
                        Ready to upload
                      </div>
                    )}

                    {fileItem.status === 'uploading' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </div>
                        <Progress value={50} className="h-1" />
                      </div>
                    )}

                    {fileItem.status === 'success' && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Uploaded
                      </div>
                    )}

                    {fileItem.status === 'error' && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </div>
                        {fileItem.error && (
                          <p className="text-xs text-destructive">
                            {fileItem.error}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => uploadSingle(fileItem)}
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>No files selected. Drag files or click above to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
