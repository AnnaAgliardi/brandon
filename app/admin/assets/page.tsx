'use client'

import { useState, useEffect } from 'react'
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
    ArrowLeft,
    Loader2,
    X,
    Upload,
    Download,
    Trash2,
    Edit3,
    Save,
} from 'lucide-react'

interface Asset {
    id: string
    storage_path: string
    preview_path: string
    llm_description: string
    brand: string | null
    status: string
    region_representation: string | null
    usage_rights: string
    license_type_usage: string
    license_type_subscription: string
    campaign: string | null
    location: string | null
    partner: string | null
    client: string | null
}

export default function AssetsManagerPage() {
    const router = useRouter()
    const supabase = createClient()

    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState('')
    const [brandFilter, setBrandFilter] = useState('')

    // Preview Modal
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<Partial<Asset>>({})
    const [newImageFile, setNewImageFile] = useState<File | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Delete
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        loadAssets()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, brandFilter])

    async function loadAssets() {
        try {
            setLoading(true)
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!session) {
                router.push('/login')
                return
            }

            const params = new URLSearchParams({ limit: '100' })
            if (statusFilter) params.append('status', statusFilter)
            if (brandFilter) params.append('brand', brandFilter)

            const res = await fetch(`/api/admin/assets?${params}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            })

            if (!res.ok) throw new Error('Failed to load assets')

            const data = await res.json()
            setAssets(data.assets || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function handleAssetClick(asset: Asset) {
        setSelectedAsset(asset)
        setEditForm(asset)
        setIsEditing(false)
        setNewImageFile(null)
    }

    function closePreview() {
        setSelectedAsset(null)
        setIsEditing(false)
        setNewImageFile(null)
    }

    async function handleSaveChanges() {
        if (!selectedAsset) return

        setIsSaving(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) return

            const formData = new FormData()

            // Add metadata
            Object.entries(editForm).forEach(([key, value]) => {
                if (value !== undefined && value !== null && key !== 'id') {
                    formData.append(key, value.toString())
                }
            })

            // Add new image if selected
            if (newImageFile) {
                formData.append('newImage', newImageFile)
            }

            const res = await fetch(`/api/admin/assets/${selectedAsset.id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
            })

            if (!res.ok) throw new Error('Failed to update')

            await loadAssets()
            closePreview()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDownload(format: 'original' | 'preview') {
        if (!selectedAsset) return

        const path =
            format === 'original'
                ? selectedAsset.storage_path
                : selectedAsset.preview_path
        const bucket = format === 'original' ? 'assets-full' : 'assets-preview'

        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`

        // Download
        const link = document.createElement('a')
        link.href = url
        link.download = path.split('/').pop() || 'asset.jpg'
        link.click()
    }

    async function handleDelete() {
        if (!deletingId) return

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) return

            const res = await fetch(`/api/admin/assets/${deletingId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session.access_token}` },
            })

            if (!res.ok) throw new Error('Failed to delete')

            await loadAssets()
            closePreview()
            setShowDeleteConfirm(false)
            setDeletingId(null)
        } catch (err: any) {
            setError(err.message)
        }
    }

    const getPreviewUrl = (path: string) =>
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets-preview/${path}`

    const getFullUrl = (path: string) =>
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets-full/${path}`

    const stats = {
        total: assets.length,
        draft: assets.filter((a) => a.status === 'draft').length,
        approved: assets.filter((a) => a.status === 'approved').length,
        archived: assets.filter((a) => a.status === 'archived').length,
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <Button variant="outline" onClick={() => router.push('/admin')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                <h1 className="text-3xl font-bold mb-2">Asset Manager</h1>
                <p className="text-muted-foreground mb-8">
                    Click any asset to view details
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
                        {error}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Assets</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Draft</p>
                        <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Approved</p>
                        <p className="text-2xl font-bold text-green-600">
                            {stats.approved}
                        </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Archived</p>
                        <p className="text-2xl font-bold text-gray-600">
                            {stats.archived}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Status Filter</Label>
                        <Select
                            value={statusFilter || undefined}
                            onValueChange={setStatusFilter}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Brand Filter</Label>
                        <Input
                            placeholder="Filter by brand name"
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                        />
                    </div>
                </div>

                {/* Assets Grid */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : assets.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No assets found. Upload assets from the Ingest page.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {assets.map((asset) => (
                            <div
                                key={asset.id}
                                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => handleAssetClick(asset)}
                            >
                                <img
                                    src={getPreviewUrl(asset.preview_path)}
                                    alt="Asset preview"
                                    className="w-full h-48 object-cover"
                                />
                                <div className="p-4">
                                    <p className="text-sm line-clamp-3 mb-3">
                                        {asset.llm_description}
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {asset.brand && (
                                            <span className="bg-secondary px-2 py-1 rounded">
                                                {asset.brand}
                                            </span>
                                        )}
                                        <span
                                            className={`px-2 py-1 rounded ${asset.status === 'approved'
                                                ? 'bg-green-100 text-green-800'
                                                : asset.status === 'draft'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {asset.status}
                                        </span>
                                        {asset.region_representation && (
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                {asset.region_representation}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            <Dialog open={!!selectedAsset} onOpenChange={closePreview}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Asset Details</DialogTitle>
                        <DialogDescription>
                            View, edit, download, or delete this asset
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAsset && (
                        <div className="space-y-6">
                            {/* Image Preview */}
                            <div className="border rounded-lg p-4">
                                <img
                                    src={getFullUrl(selectedAsset.storage_path)}
                                    alt="Full preview"
                                    className="w-full max-h-96 object-contain rounded"
                                />

                                {/* Image Actions */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload('original')}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download Original
                                    </Button>

                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setNewImageFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="replace-image"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            document.getElementById('replace-image')?.click()
                                        }
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {newImageFile ? 'Change Image' : 'Replace Image'}
                                    </Button>
                                    {newImageFile && (
                                        <span className="text-sm text-muted-foreground self-center">
                                            {newImageFile.name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Metadata</h3>
                                    {!isEditing ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            <Edit3 className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditing(false)}
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Cancel
                                        </Button>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Brand</Label>
                                            <Input
                                                value={editForm.brand || ''}
                                                onChange={(e) =>
                                                    setEditForm({ ...editForm, brand: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label>Status</Label>
                                            <Select
                                                value={editForm.status}
                                                onValueChange={(value) =>
                                                    setEditForm({ ...editForm, status: value })
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
                                                value={editForm.region_representation || undefined}
                                                onValueChange={(value) =>
                                                    setEditForm({
                                                        ...editForm,
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
                                                value={editForm.campaign || ''}
                                                onChange={(e) =>
                                                    setEditForm({ ...editForm, campaign: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label>Location</Label>
                                            <Input
                                                value={editForm.location || ''}
                                                onChange={(e) =>
                                                    setEditForm({ ...editForm, location: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Brand</p>
                                            <p className="font-medium">{selectedAsset.brand || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Status</p>
                                            <p className="font-medium capitalize">
                                                {selectedAsset.status}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Region</p>
                                            <p className="font-medium">
                                                {selectedAsset.region_representation || '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Campaign</p>
                                            <p className="font-medium">
                                                {selectedAsset.campaign || '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Location</p>
                                            <p className="font-medium">
                                                {selectedAsset.location || '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">License (Usage)</p>
                                            <p className="font-medium">
                                                {selectedAsset.license_type_usage}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <Label>Description</Label>
                                    <p className="text-sm mt-1">{selectedAsset.llm_description}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex justify-between items-center">
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setDeletingId(selectedAsset?.id || null)
                                setShowDeleteConfirm(true)
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Asset
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={closePreview}>
                                Close
                            </Button>
                            {isEditing && (
                                <Button onClick={handleSaveChanges} disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                onConfirm={handleDelete}
                title="Delete Asset"
                description="Are you sure you want to delete this asset? This will permanently remove it from the database, storage, and search index. This action cannot be undone."
                confirmText="Delete"
                isDestructive
            />
        </div>
    )
}
