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
import { ArrowLeft, Loader2 } from 'lucide-react'

interface Asset {
    id: string
    preview_path: string
    llm_description: string
    brand: string | null
    status: string
    region_representation: string | null
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

    const getPreviewUrl = (path: string) =>
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets-preview/${path}`

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
                    Overview of all uploaded assets
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
                        <Select value={statusFilter || undefined} onValueChange={setStatusFilter}>
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
                                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
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
        </div>
    )
}
