'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Download } from 'lucide-react'
import { BrandonAsset } from '@/lib/types'

interface AssetPreviewDialogProps {
    asset: BrandonAsset | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AssetPreviewDialog({
    asset,
    open,
    onOpenChange,
}: AssetPreviewDialogProps) {
    if (!asset) return null

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const fullUrl = asset.storage_path && supabaseUrl
        ? `${supabaseUrl}/storage/v1/object/public/assets-full/${asset.storage_path}`
        : ''

    const handleDownload = () => {
        if (!fullUrl) return
        const link = document.createElement('a')
        link.href = fullUrl
        link.download = asset.storage_path?.split('/').pop() || 'asset.jpg'
        link.click()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Asset Details</DialogTitle>
                    <DialogDescription>
                        View and download this asset
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Image Preview */}
                    <div className="border rounded-lg p-4 flex justify-center bg-secondary/10">
                        {fullUrl ? (
                            <img
                                src={fullUrl}
                                alt={asset.label || 'Asset preview'}
                                className="max-h-[60vh] object-contain rounded"
                            />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-muted-foreground">
                                No preview available
                            </div>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Metadata</h3>
                            <Button onClick={handleDownload} size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download Original
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Brand</p>
                                <p className="font-medium">{asset.brand || '-'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Status</p>
                                <p className="font-medium capitalize">{asset.status || '-'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Region</p>
                                <p className="font-medium">{asset.region_representation || '-'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Campaign</p>
                                <p className="font-medium">{asset.campaign || '-'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Location</p>
                                <p className="font-medium">{asset.location || '-'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">License</p>
                                <p className="font-medium">{asset.license_type_usage || '-'}</p>
                            </div>
                        </div>

                        <div>
                            <Label>Description</Label>
                            <p className="text-sm mt-1 text-muted-foreground">
                                {asset.llm_description || asset.reason || 'No description available.'}
                            </p>
                        </div>

                        {asset.dam_id && (
                            <div>
                                <Label>DAM ID</Label>
                                <p className="text-xs font-mono mt-1 text-muted-foreground">{asset.dam_id}</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
