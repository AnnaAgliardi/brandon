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
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { Asset } from '@/lib/types'
import { ArrowLeft, Loader2, Trash2, Search } from 'lucide-react'

export default function AssetsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [statusFilter, setStatusFilter] = useState('')
    const [brandFilter, setBrandFilter] = useState('')

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [showBulkDelete, setShowBulkDelete] = useState(false)

    useEffect(() => {
        loadAssets()
    }, [statusFilter, brandFilter])

    async function loadAssets() {
        try {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/login')
                return
            }

            const params = new URLSearchParams({ limit: '50' })
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

    async function handleDelete(id: string) {
        try {
            const { data: { session } } = await supabase.auth.getSession()
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
            const { data: { session } } = await supabase.auth.getSession()
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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {assets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            checked={selectedIds.includes(asset.id)}
                                            onCheckedChange={() => toggleSelect(asset.id)}
                                        />
                                        <div className="flex-1">
                                            <img
                                                src={getPreviewUrl(asset.preview_path)}
                                                alt="Preview"
                                                className="w-full h-40 object-cover rounded mb-3"
                                            />
                                            <p className="text-sm line-clamp-2 mb-2">
                                                {asset.llm_description}
                                            </p>
                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
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
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => {
                                                    setDeletingId(asset.id)
                                                    setShowDeleteConfirm(true)
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
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
