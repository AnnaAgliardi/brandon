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
import {
    ArrowLeft,
    Loader2,
    Download,
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

export default function MemberAssetsPage() {
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

            const res = await fetch(`/api/assets?${params}`, {
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
    }

    function closePreview() {
        setSelectedAsset(null)
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

    const getPreviewUrl = (path: string) =>
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets-preview/${path}`

    const getFullUrl = (path: string) =>
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets-full/${path}`

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <Button variant="outline" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                <h1 className="text-3xl font-bold mb-2">Asset Manager</h1>
                <p className="text-muted-foreground mb-8">
                    Browse and download brand assets
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
                        {error}
                    </div>
                )}

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
                        No assets found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {assets.map((asset) => (
                            <div key={asset.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative">
                                <div
                                    className="cursor-pointer"
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
                            View and download this asset
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
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Metadata</h3>
                                </div>

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

                                <div>
                                    <Label>Description</Label>
                                    <p className="text-sm mt-1">{selectedAsset.llm_description}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={closePreview}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
