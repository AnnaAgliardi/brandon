'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClientOrNull } from '@/lib/supabase-browser'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import {
    ArrowLeft,
    Loader2,
    X,
    Upload,
    Download,
    Trash2,
    Edit3,
    Save,
    Search,
    Filter,
    Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    const supabase = getSupabaseClientOrNull()

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
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [bulkAction, setBulkAction] = useState<string>('')
    const [bulkValue, setBulkValue] = useState<string>('')
    const [isBulkUpdating, setIsBulkUpdating] = useState(false)

    useEffect(() => {
        if (!supabase) {
            router.push('/login')
            return
        }
        loadAssets()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase, statusFilter, brandFilter])

    async function loadAssets() {
        if (!supabase) return
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
        if (!selectedAsset || !supabase) return

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
        if (!deletingId || !supabase) return

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

    // Bulk Selection Handlers
    function toggleSelectAsset(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    function toggleSelectAll() {
        if (selectedIds.length === assets.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(assets.map((a) => a.id))
        }
    }

    async function handleBulkUpdate() {
        if (!bulkAction || !bulkValue || selectedIds.length === 0 || !supabase) return

        setIsBulkUpdating(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            // Build update payload
            const updates: any = {}
            updates[bulkAction] = bulkValue

            // Update each selected asset
            const promises = selectedIds.map(async (id) => {
                const formData = new FormData()
                Object.entries(updates).forEach(([key, value]) => {
                    formData.append(key, value as string)
                })

                return fetch(`/api/admin/assets/${id}`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${session.access_token}` },
                    body: formData,
                })
            })

            await Promise.all(promises)

            await loadAssets()
            setSelectedIds([])
            setBulkAction('')
            setBulkValue('')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsBulkUpdating(false)
        }
    }

    async function handleBulkDelete() {
        if (selectedIds.length === 0 || !supabase) return

        setIsBulkDeleting(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) throw new Error('Not authenticated')

            // Delete each selected asset
            const promises = selectedIds.map(async (id) => {
                return fetch(`/api/admin/assets/${id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${session.access_token}` },
                })
            })

            await Promise.all(promises)

            await loadAssets()
            setSelectedIds([])
            setBulkAction('')
            setShowBulkDeleteConfirm(false)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsBulkDeleting(false)
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

    if (!supabase) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8F9FC] pb-20 p-8">
            <div className="container mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-6">
                    <div>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/admin')}
                            className="rounded-full bg-white border-muted-foreground/20 hover:bg-white hover:text-primary text-muted-foreground text-xs h-8 px-4"
                        >
                            <ArrowLeft className="h-3 w-3 mr-2" />
                            Back to Dashboard
                        </Button>
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">Asset Manager</h1>
                            <p className="text-muted-foreground mt-2">Manage and organize your brand assets</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2">
                        <X className="h-4 w-4" /> {error}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-0 shadow-sm rounded-2xl bg-white">
                        <CardContent className="p-6">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Total Assets</p>
                            <p className="text-3xl font-bold text-[#0F172A]">{stats.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm rounded-2xl bg-white">
                        <CardContent className="p-6">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Draft</p>
                            <p className="text-3xl font-bold text-yellow-600">{stats.draft}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm rounded-2xl bg-white">
                        <CardContent className="p-6">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Approved</p>
                            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm rounded-2xl bg-white">
                        <CardContent className="p-6">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Archived</p>
                            <p className="text-3xl font-bold text-slate-500">{stats.archived}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Controls Bar */}
                <div className="mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
                    <div className="flex gap-4 items-center w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter by brand..."
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="pl-9 bg-slate-50 border-0 rounded-xl"
                            />
                        </div>
                        <Select
                            value={statusFilter || 'all'}
                            onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}
                        >
                            <SelectTrigger className="w-[180px] bg-slate-50 border-0 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="All Statuses" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Bulk Actions */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                            <span className="text-sm font-medium text-slate-600 px-3 py-1 bg-slate-100 rounded-full">
                                {selectedIds.length} selected
                            </span>
                            <div className="h-6 w-px bg-slate-200" />
                            <Select value={bulkAction} onValueChange={setBulkAction}>
                                <SelectTrigger className="w-40 border-0 bg-slate-50 rounded-xl">
                                    <SelectValue placeholder="Action..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="status">Set Status</SelectItem>
                                    <SelectItem value="delete" className="text-destructive">Delete</SelectItem>
                                </SelectContent>
                            </Select>

                            {bulkAction === 'status' && (
                                <Select value={bulkValue} onValueChange={setBulkValue}>
                                    <SelectTrigger className="w-40 border-0 bg-slate-50 rounded-xl">
                                        <SelectValue placeholder="To Status..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            {bulkAction === 'delete' ? (
                                <Button
                                    onClick={() => setShowBulkDeleteConfirm(true)}
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-xl"
                                >
                                    Delete
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleBulkUpdate}
                                    disabled={!bulkAction || !bulkValue || isBulkUpdating}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                                >
                                    {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds([])}
                                className="text-muted-foreground hover:text-foreground rounded-xl"
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                </div>

                {/* Assets Grid */}
                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : assets.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No assets found</h3>
                        <p className="text-muted-foreground mb-6">Upload some assets to get started</p>
                        <Button onClick={() => router.push('/admin/ingest')} className="rounded-xl">
                            Go to Ingestion
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex items-center gap-2 px-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedIds.length === assets.length && assets.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                    id="select-all"
                                />
                                <Label htmlFor="select-all" className="text-sm font-medium text-muted-foreground cursor-pointer">
                                    Select All
                                </Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className={cn(
                                        "group relative bg-white rounded-2xl overflow-hidden border border-transparent shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer",
                                        selectedIds.includes(asset.id) ? "ring-2 ring-blue-500 border-transparent shadow-md" : "hover:border-slate-200"
                                    )}
                                    onClick={() => handleAssetClick(asset)}
                                >
                                    <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 data-[state=checked]:opacity-100" data-state={selectedIds.includes(asset.id) ? 'checked' : 'unchecked'}>
                                        <div onClick={(e) => e.stopPropagation()} className="bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                                            <Checkbox
                                                checked={selectedIds.includes(asset.id)}
                                                onCheckedChange={() => toggleSelectAsset(asset.id)}
                                            />
                                        </div>
                                    </div>

                                    <div className="aspect-[4/3] relative bg-slate-100 overflow-hidden">
                                        <img
                                            src={getPreviewUrl(asset.preview_path)}
                                            alt="Asset preview"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <span className={cn(
                                                "px-2 py-1 rounded-md text-xs font-semibold shadow-sm backdrop-blur-md",
                                                asset.status === 'approved' ? "bg-green-500/90 text-white" :
                                                    asset.status === 'draft' ? "bg-yellow-500/90 text-white" :
                                                        "bg-slate-500/90 text-white"
                                            )}>
                                                {asset.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <p className="text-sm text-slate-700 line-clamp-2 mb-3 leading-relaxed">
                                            {asset.llm_description || "No description available"}
                                        </p>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {asset.brand && (
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">
                                                    {asset.brand}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Preview Modal */}
            <Dialog open={!!selectedAsset} onOpenChange={closePreview}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-[2rem]">
                    <div className="grid md:grid-cols-2 h-full min-h-[600px]">
                        {/* Left: Image */}
                        <div className="bg-slate-100 flex items-center justify-center p-8 relative group">
                            {selectedAsset && (
                                <img
                                    src={getFullUrl(selectedAsset.storage_path)}
                                    alt="Full preview"
                                    className="max-w-full max-h-[500px] object-contain shadow-lg rounded-lg"
                                />
                            )}
                            <Button
                                className="absolute top-4 right-4 bg-white/80 hover:bg-white text-slate-800 rounded-full"
                                size="icon"
                                onClick={() => handleDownload('original')}
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Right: Details */}
                        <div className="p-8 flex flex-col h-full overflow-y-auto bg-white">
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-2xl font-bold text-[#0F172A]">Asset Details</DialogTitle>
                                <DialogDescription>
                                    View and edit asset metadata
                                </DialogDescription>
                            </DialogHeader>

                            {selectedAsset && (
                                <div className="space-y-6 flex-1">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Metadata</h3>
                                            {!isEditing ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsEditing(true)}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    <Edit3 className="h-4 w-4 mr-2" />
                                                    Edit
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsEditing(false)}
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>

                                        {isEditing ? (
                                            <div className="grid gap-4">
                                                <div>
                                                    <Label>Brand</Label>
                                                    <Input
                                                        value={editForm.brand || ''}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, brand: e.target.value })
                                                        }
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Status</Label>
                                                        <Select
                                                            value={editForm.status}
                                                            onValueChange={(value) =>
                                                                setEditForm({ ...editForm, status: value })
                                                            }
                                                        >
                                                            <SelectTrigger className="mt-1">
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
                                                            <SelectTrigger className="mt-1">
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
                                                <div>
                                                    <Label>Campaign</Label>
                                                    <Input
                                                        value={editForm.campaign || ''}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, campaign: e.target.value })
                                                        }
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Description</Label>
                                                    <Input
                                                        value={editForm.llm_description || ''}
                                                        onChange={(e) =>
                                                            setEditForm({ ...editForm, llm_description: e.target.value })
                                                        }
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-6 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground mb-1">Brand</p>
                                                    <p className="font-medium text-slate-900">{selectedAsset.brand || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground mb-1">Status</p>
                                                    <span className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                                        selectedAsset.status === 'approved' ? "bg-green-100 text-green-800" :
                                                            selectedAsset.status === 'draft' ? "bg-yellow-100 text-yellow-800" :
                                                                "bg-gray-100 text-gray-800"
                                                    )}>
                                                        {selectedAsset.status}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground mb-1">Region</p>
                                                    <p className="font-medium text-slate-900">
                                                        {selectedAsset.region_representation || '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground mb-1">Campaign</p>
                                                    <p className="font-medium text-slate-900">
                                                        {selectedAsset.campaign || '-'}
                                                    </p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-muted-foreground mb-1">Description</p>
                                                    <p className="text-slate-900 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                        {selectedAsset.llm_description}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-6 mt-auto border-t flex justify-between items-center">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setDeletingId(selectedAsset?.id || null)
                                                setShowDeleteConfirm(true)
                                            }}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </Button>

                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={closePreview}>
                                                Close
                                            </Button>
                                            {isEditing && (
                                                <Button
                                                    onClick={handleSaveChanges}
                                                    disabled={isSaving}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    {isSaving ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Saving
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="h-4 w-4 mr-2" />
                                                            Save
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                onConfirm={handleDelete}
                title="Delete Asset"
                description="Are you sure you want to delete this asset? This will permanently remove it from the database, storage, and search index."
                confirmText="Delete"
                isDestructive
            />

            {/* Bulk Delete Confirmation */}
            <ConfirmDialog
                open={showBulkDeleteConfirm}
                onOpenChange={setShowBulkDeleteConfirm}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedIds.length} Assets`}
                description={`Are you sure you want to delete ${selectedIds.length} assets? This action cannot be undone.`}
                confirmText={isBulkDeleting ? 'Deleting...' : 'Delete All'}
                isDestructive
            />
        </div>
    )
}
