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
import { Asset, AssetMetadata } from '@/lib/types'
import { ArrowLeft, Loader2, Trash2, Edit } from 'lucide-react'

export default function AssetsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [brandFilter, setBrandFilter] = useState<string>('')
  const [regionFilter, setRegionFilter] = useState<string>('')

  // Edit modal
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editMetadata, setEditMetadata] = useState<AssetMetadata | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, brandFilter, regionFilter])

  async function loadAssets() {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (statusFilter) params.append('status', statusFilter)
      if (brandFilter) params.append('brand', brandFilter)
      if (regionFilter) params.append('region', regionFilter)

      const response = await fetch(`/api/admin/assets?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load assets')
      }

      const data = await response.json()
      setAssets(data.assets)
      setTotalPages(data.pagination.totalPages)
    } catch (error: any) {
      console.error('Error loading assets:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectAsset(assetId: string) {
    const newSelected = new Set(selectedAssets)
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId)
    } else {
      newSelected.add(assetId)
    }
    setSelectedAssets(newSelected)
  }

  function handleSelectAll() {
    if (selectedAssets.size === assets.length) {
      setSelectedAssets(new Set())
    } else {
      setSelectedAssets(new Set(assets.map((a) => a.id)))
    }
  }

  function handleEdit(asset: Asset) {
    setEditingAsset(asset)
    setEditMetadata({
      dam_id: asset.dam_id,
      url: asset.url,
      file_name: asset.file_name,
      acquired_at: asset.acquired_at,
      usage_rights: asset.usage_rights,
      status: asset.status,
      image_purchase_date: asset.image_purchase_date.split('T')[0],
      image_capture_date: asset.image_capture_date.split('T')[0],
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
  }

  async function handleSaveEdit() {
    if (!editingAsset || !editMetadata) return

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

      const response = await fetch(`/api/admin/assets/${editingAsset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(editMetadata),
      })

      if (!response.ok) {
        throw new Error('Failed to update asset')
      }

      setEditingAsset(null)
      setEditMetadata(null)
      loadAssets()
    } catch (error: any) {
      console.error('Error saving asset:', error)
      setError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  function handleDeleteClick(assetId: string) {
    setDeletingAssetId(assetId)
    setShowDeleteConfirm(true)
  }

  async function confirmDelete() {
    if (!deletingAssetId) return

    setIsDeleting(true)
    setShowDeleteConfirm(false)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/admin/assets/${deletingAssetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete asset')
      }

      setDeletingAssetId(null)
      loadAssets()
    } catch (error: any) {
      console.error('Error deleting asset:', error)
      setError(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  async function confirmBulkDelete() {
    setIsDeleting(true)
    setShowBulkDeleteConfirm(false)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/assets/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ assetIds: Array.from(selectedAssets) }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete assets')
      }

      setSelectedAssets(new Set())
      loadAssets()
    } catch (error: any) {
      console.error('Error bulk deleting assets:', error)
      setError(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const getPreviewUrl = (previewPath: string) => {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets-preview/${previewPath}`
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-8">Asset Management</h1>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
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

          <div>
            <Label>Region</Label>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="AMER">AMER</SelectItem>
                <SelectItem value="EMEA">EMEA</SelectItem>
                <SelectItem value="APAC">APAC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            {selectedAssets.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedAssets.size})
              </Button>
            )}
          </div>
        </div>

        {/* Assets Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No assets found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <Checkbox
                          checked={selectedAssets.size === assets.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Preview</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Brand</th>
                      <th className="px-4 py-3 text-left">Region</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">License</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="border-t hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedAssets.has(asset.id)}
                            onCheckedChange={() => handleSelectAsset(asset.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <img
                            src={getPreviewUrl(asset.preview_path)}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded"
                          />
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm truncate">
                            {asset.llm_description}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {asset.brand || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {asset.region_representation || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${asset.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : asset.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                          >
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {asset.license_type_usage}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(asset)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(asset.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingAsset} onOpenChange={() => setEditingAsset(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update asset metadata. Changes will sync to Pinecone.
            </DialogDescription>
          </DialogHeader>

          {editMetadata && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usage Rights</Label>
                  <Select
                    value={editMetadata.usage_rights}
                    onValueChange={(value: any) =>
                      setEditMetadata({ ...editMetadata, usage_rights: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal_only">
                        Internal Only
                      </SelectItem>
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
                    value={editMetadata.status}
                    onValueChange={(value: any) =>
                      setEditMetadata({ ...editMetadata, status: value })
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
                    value={editMetadata.license_type_usage}
                    onValueChange={(value) =>
                      setEditMetadata({
                        ...editMetadata,
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
                    value={editMetadata.license_type_subscription}
                    onValueChange={(value) =>
                      setEditMetadata({
                        ...editMetadata,
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
                    value={editMetadata.brand || ''}
                    onChange={(e) =>
                      setEditMetadata({ ...editMetadata, brand: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select
                    value={editMetadata.region_representation || ''}
                    onValueChange={(value) =>
                      setEditMetadata({
                        ...editMetadata,
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
                    value={editMetadata.campaign || ''}
                    onChange={(e) =>
                      setEditMetadata({
                        ...editMetadata,
                        campaign: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={editMetadata.location || ''}
                    onChange={(e) =>
                      setEditMetadata({
                        ...editMetadata,
                        location: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAsset(null)}>
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
        onConfirm={confirmDelete}
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This will remove it from the database, storage, and search index. This action cannot be undone."
        confirmText="Delete"
        isDestructive
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Assets"
        description={`Are you sure you want to delete ${selectedAssets.size} asset(s)? This will remove them from the database, storage, and search index. This action cannot be undone.`}
        confirmText="Delete All"
        isDestructive
      />
    </div>
  )
}
