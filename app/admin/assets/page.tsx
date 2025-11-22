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
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { Asset, AssetMetadata } from '@/lib/types'
import { ArrowLeft, Loader2, Trash2, Edit, Upload, BarChart3 } from 'lucide-react'

export default function AssetsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState('')
    const [brandFilter, setBrandFilter] = useState('')

    // Edit modal
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
    const [editFormData, setEditFormData] = useState<Partial<AssetMetadata>>({})
    const [newImageFile, setNewImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [showBulkDelete, setShowBulkDelete] = useState(false)

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

    function handleEditClick(asset: Asset) {
        setEditingAsset(asset)
        setEditFormData({
            dam_id: asset.dam_id,
            url: asset.url,
            file_name: asset.file_name,
            acquired_at: asset.acquired_at,
            usage_rights: asset.usage_rights,
            status: asset.status,
            image_purchase_date: asset.image_purchase_date?.split('T')[0],
            image_capture_date: asset.image_capture_date?.split('T')[0],
            license_type_usage: asset.license_type_usage,
            license_type_subscription: asset.license_type_subscription,
            partner: asset.partner,
            client: asset.client,
            brand: asset.brand,
            collection: asset.collection,
            region_representation: asset.region_representation,
            location: asset.location,
            campaign: asset.campaign,
        })
        setImagePreview(getPreviewUrl(asset.preview_path))
        setNewImageFile(null)
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            setNewImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    async function handleSaveEdit() {
        if (!editingAsset) return

        setIsSaving(true)
        setError(null)

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const formData = new FormData()

            // Add all metadata fields
            Object.entries(editFormData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value.toString())
                }
            })

            // Add new image if selected
            if (newImageFile) {
                formData.append('newImage', newImageFile)
            }

            const res = await fetch(`/api/admin/assets/${editingAsset.id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Failed to update asset')
            }

            setEditingAsset(null)
            setNewImageFile(null)
            setImagePreview('')
            loadAssets()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    async function handleDelete(id: string) {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) return

            const res = await fetch(`/api/admin/assets/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session.access_token}` },
            })

            if (!res.ok) throw new Error('Failed to delete')

            loadAssets()
            setDeletingId(null)
            setShowDeleteConfirm(false)
        } catch (err: any) {
            setError(err.message)
        }
    }

    async function handleBulkDelete() {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) return

            const res = await fetch('/api/admin/assets/bulk-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ assetIds: selectedIds }),
            })

            if (!res.ok) throw new Error('Failed to delete')

            setSelectedIds([])
            setShowBulkDelete(false)
            loadAssets()
        } catch (err: any) {
            setError(err.message)
        }
    }

    function toggleSelect(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    function toggleSelectAll() {
        setSelectedIds((prev) =>
            prev.length === assets.length ? [] : assets.map((a) => a.id)
        )
    }

    const getPreviewUrl = (path: string) =>
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets-preview/${path}`

    // Calculate stats
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

                <h1 className="text-3xl font-bold mb-8">Manage Assets</h1>

                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
                        {error}
                    </div>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                                Total Assets
                            </span>
                        </div>
                        <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground block mb-2">
                            Draft
                        </span>
                        <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground block mb-2">
                            Approved
                        </span>
                        <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground block mb-2">
                            Archived
                        </span>
                        <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label>Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Brand</Label>
                        <Input
                            placeholder="Filter by brand"
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                        />
                    </div>

                    <div className="flex items-end">
                        {selectedIds.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={() => setShowBulkDelete(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete {selectedIds.length} Selected
                            </Button>
                        )}
                    </div>
                </div>

                {/* Assets Grid */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : assets.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No assets found
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <Checkbox
                                checked={selectedIds.length === assets.length}
                                onCheckedChange={toggleSelectAll}
                            />
                            <span className="text-sm font-medium">Select All</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    <div className="p-4">
                                        <div className="flex items-start gap-3 mb-3">
                                            <Checkbox
                                                checked={selectedIds.includes(asset.id)}
                                                onCheckedChange={() => toggleSelect(asset.id)}
                                            />
                                            <img
                                                src={getPreviewUrl(asset.preview_path)}
                                                alt="Preview"
                                                className="flex-1 w-full h-48 object-cover rounded"
                                            />
                                        </div>
                                        <p className="text-sm line-clamp-2 mb-3">
                                            {asset.llm_description}
                                        </p>
                                        <div className="flex flex-wrap gap-2 text-xs mb-4">
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
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleEditClick(asset)}
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => {
                                                    setDeletingId(asset.id)
                                                    setShowDeleteConfirm(true)
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <Dialog
                open={!!editingAsset}
                onOpenChange={() => {
                    setEditingAsset(null)
                    setNewImageFile(null)
                    setImagePreview('')
                }}
            >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Asset</DialogTitle>
                        <DialogDescription>
                            Update metadata and optionally replace the image
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Image Section */}
                        <div className="space-y-3">
                            <Label>Asset Image</Label>
                            <div className="border rounded-lg p-4">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-64 object-cover rounded mb-3"
                                />
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                        id="image-upload"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            document.getElementById('image-upload')?.click()
                                        }
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {newImageFile ? 'Change Image' : 'Replace Image'}
                                    </Button>
                                    {newImageFile && (
                                        <span className="text-sm text-muted-foreground">
                                            {newImageFile.name}
                                        </span>
                                    )}
                                </div>
                                {newImageFile && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        New image will be analyzed by AI to generate description
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Metadata Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Usage Rights</Label>
                                <Select
                                    value={editFormData.usage_rights}
                                    onValueChange={(value: any) =>
                                        setEditFormData({ ...editFormData, usage_rights: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="internal_only">Internal Only</SelectItem>
                                        <SelectItem value="web_approved">Web Approved</SelectItem>
                                        <SelectItem value="print_approved">
                                            Print Approved
                                        </SelectItem>
                                        <SelectItem value="all_channels">All Channels</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={editFormData.status}
                                    onValueChange={(value: any) =>
                                        setEditFormData({ ...editFormData, status: value })
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

                            <div className="space-y-2">
                                <Label>License Type (Usage)</Label>
                                <Select
                                    value={editFormData.license_type_usage}
                                    onValueChange={(value) =>
                                        setEditFormData({
                                            ...editFormData,
                                            license_type_usage: value,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Creative">Creative</SelectItem>
                                        <SelectItem value="Editorial">Editorial</SelectItem>
                                        <SelectItem value="Company">Company</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>License Type (Subscription)</Label>
                                <Select
                                    value={editFormData.license_type_subscription}
                                    onValueChange={(value) =>
                                        setEditFormData({
                                            ...editFormData,
                                            license_type_subscription: value,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Standard">Standard</SelectItem>
                                        <SelectItem value="Premium">Premium</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Brand</Label>
                                <Input
                                    value={editFormData.brand || ''}
                                    onChange={(e) =>
                                        setEditFormData({ ...editFormData, brand: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Region</Label>
                                <Select
                                    value={editFormData.region_representation || ''}
                                    onValueChange={(value) =>
                                        setEditFormData({
                                            ...editFormData,
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

                            <div className="space-y-2">
                                <Label>Campaign</Label>
                                <Input
                                    value={editFormData.campaign || ''}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            campaign: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input
                                    value={editFormData.location || ''}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            location: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Partner</Label>
                                <Input
                                    value={editFormData.partner || ''}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            partner: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Client</Label>
                                <Input
                                    value={editFormData.client || ''}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            client: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingAsset(null)
                                setNewImageFile(null)
                                setImagePreview('')
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                onConfirm={() => deletingId && handleDelete(deletingId)}
                title="Delete Asset"
                description="This will permanently delete this asset. This action cannot be undone."
                confirmText="Delete"
                isDestructive
            />

            {/* Bulk Delete Confirmation */}
            <ConfirmDialog
                open={showBulkDelete}
                onOpenChange={setShowBulkDelete}
                onConfirm={handleBulkDelete}
                title="Delete Multiple Assets"
                description={`Delete ${selectedIds.length} selected assets? This action cannot be undone.`}
                confirmText="Delete All"
                isDestructive
            />
        </div>
    )
}
