'use client'

import { useState, useRef, useCallback } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Link as LinkIcon,
  Check,
} from 'lucide-react'
import type { AssetMetadata } from '@/lib/types'
import { cn } from '@/lib/utils'

interface FileItem {
  id: string
  file?: File
  url?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
  error?: string
  metadata: Partial<AssetMetadata>
}

const MAX_FILES = 20

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

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.slice(0, MAX_FILES - files.length)
    if (validFiles.length === 0) return

    const newItems: FileItem[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'pending',
      metadata: {},
    }))

    setFiles((prev) => [...prev, ...newItems])
  }, [files.length])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }, [addFiles])

  const handleUrlImport = async () => {
    if (!urlInput) return
    const newItems: FileItem[] = [
      {
        id: Math.random().toString(36).substring(7),
        url: urlInput,
        status: 'pending',
        metadata: {},
      },
    ]
    setFiles((prev) => [...prev, ...newItems])
    setUrlInput('')
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleIngest() {
    setIsUploading(true)
    for (const file of files) {
      if (file.status === 'pending' || file.status === 'error') {
        await uploadSingle(file)
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
      // Build payload
      const ingestPayload: any = {
        storage_path: generatedData.storage_path,
        preview_path: generatedData.preview_path,
        preview_url: generatedData.preview_url,
        mime_type: generatedData.mime_type,
        llm_description: generatedData.llm_description,
        llm_metadata: generatedData.llm_metadata,
        tags: generatedData.tags,
        // Required fields with defaults
        usage_rights: metadata.usage_rights || 'internal_only',
        status: metadata.status || 'draft',
        image_purchase_date: metadata.image_purchase_date || new Date().toISOString().split('T')[0],
        image_capture_date: metadata.image_capture_date || new Date().toISOString().split('T')[0],
        license_type_usage: metadata.license_type_usage || 'Creative',
        license_type_subscription: metadata.license_type_subscription || 'Standard',
      }

      // Add optional fields only if they have values
      if (metadata.brand) ingestPayload.brand = metadata.brand
      if (metadata.region_representation) ingestPayload.region_representation = metadata.region_representation
      if (metadata.campaign) ingestPayload.campaign = metadata.campaign
      if (metadata.location) ingestPayload.location = metadata.location
      if (metadata.partner) ingestPayload.partner = metadata.partner
      if (metadata.client) ingestPayload.client = metadata.client
      if (metadata.collection) ingestPayload.collection = metadata.collection
      if (metadata.dam_id) ingestPayload.dam_id = metadata.dam_id
      if (metadata.file_name) ingestPayload.file_name = metadata.file_name
      if (metadata.url) ingestPayload.url = metadata.url
      if (metadata.acquired_at) ingestPayload.acquired_at = metadata.acquired_at

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

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20 p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/admin')}
            className="mb-4 rounded-full bg-white border-muted-foreground/20 hover:bg-white hover:text-primary text-muted-foreground text-xs h-8 px-4"
          >
            <ArrowLeft className="h-3 w-3 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">Bulk Asset Ingestion</h1>
          <p className="text-muted-foreground mt-2">Upload up to 20 files with shared metadata</p>
        </div>

        {/* Upload Area */}
        <Card className="mb-8 border-0 shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="px-8 pt-8">
            <CardTitle>Upload Assets</CardTitle>
            <CardDescription>
              Drag and drop files here to start (Max 20 files, 50MB each)
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer mb-6",
                isDragging
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Drag & drop files here</h3>
              <p className="text-sm text-slate-500 mb-6">
                or click to browse
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files?.length) {
                    addFiles(Array.from(e.target.files))
                  }
                }}
              />
              <Button onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }} variant="default" className="bg-[#2563EB] hover:bg-[#1d4ed8] rounded-xl h-10 px-6 font-medium shadow-sm">
                Select Files
              </Button>
            </div>

            <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Or import from URL:</span>
              <Input
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="bg-white border-slate-200 h-10 rounded-lg"
              />
              <Button onClick={handleUrlImport} disabled={!urlInput} variant="outline" className="h-10 rounded-lg border-slate-200">
                <LinkIcon className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Card className="mb-8 border-0 shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="px-8 pt-8">
              <CardTitle>Files ({files.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 group"
                  >
                    <div className="h-12 w-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {file.file ? (
                        <img
                          src={URL.createObjectURL(file.file)}
                          className="w-full h-full object-cover"
                          onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                        />
                      ) : (
                        <img
                          src={file.url}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm text-slate-900">
                        {file.file?.name || file.url}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {file.status === 'uploading' && (
                          <span className="text-xs text-blue-600 flex items-center">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Uploading...
                          </span>
                        )}
                        {file.status === 'error' && (
                          <span className="text-xs text-destructive">{file.error}</span>
                        )}
                        {file.status === 'success' && (
                          <span className="text-xs text-green-600 flex items-center">
                            <Check className="h-3 w-3 mr-1" /> Done
                          </span>
                        )}
                        {file.status === 'pending' && (
                          <span className="text-xs text-muted-foreground">Ready</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                      className="text-slate-400 hover:text-destructive hover:bg-red-50 rounded-lg h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleIngest}
                  disabled={isUploading || files.length === 0}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl shadow-sm px-8 h-10"
                >
                  {isUploading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isUploading ? 'Ingesting...' : 'Start Ingestion'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="px-8 pt-8">
            <CardTitle>Shared Metadata</CardTitle>
            <CardDescription>
              These values will be applied to all uploaded assets
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">File Name</Label>
                <Input
                  value={sharedMetadata.file_name || ''}
                  onChange={(e) =>
                    setSharedMetadata({ ...sharedMetadata, file_name: e.target.value })
                  }
                  placeholder="Optional override"
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</Label>
                <Select
                  value={sharedMetadata.status}
                  onValueChange={(val: "draft" | "approved" | "archived") =>
                    setSharedMetadata({ ...sharedMetadata, status: val })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors">
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
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Region</Label>
                <Select
                  value={sharedMetadata.region_representation || ''}
                  onValueChange={(val) =>
                    setSharedMetadata({ ...sharedMetadata, region_representation: val })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMER">AMER</SelectItem>
                    <SelectItem value="EMEA">EMEA</SelectItem>
                    <SelectItem value="APAC">APAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
