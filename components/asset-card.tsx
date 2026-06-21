import { useState } from 'react'
import { BrandonAsset } from '@/lib/types'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, Download } from 'lucide-react'

interface AssetCardProps {
  asset: BrandonAsset
  onPreview?: (asset: BrandonAsset) => void
}

export function AssetCard({ asset, onPreview }: AssetCardProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const previewUrl = asset.preview_path && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/assets-preview/${asset.preview_path}`
    : '/placeholder.png'

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!asset.storage_path || !supabaseUrl || isDownloading) return

    try {
      setIsDownloading(true)
      const fullUrl = `${supabaseUrl}/storage/v1/object/public/assets-full/${asset.storage_path}`

      const response = await fetch(fullUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = asset.storage_path.split('/').pop() || 'asset.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading asset:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card
      className="w-64 flex-shrink-0 cursor-pointer border-blue-100 bg-white/80 backdrop-blur transition-all duration-300 hover:border-blue-200"
      onClick={() => onPreview?.(asset)}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          <img
            src={previewUrl}
            alt={asset.label}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={(e) => {
              ; (e.target as HTMLImageElement).src = '/placeholder.png'
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-1" title={asset.label}>{asset.label}</h3>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2" title={asset.reason}>{asset.reason}</p>
        <p className="text-xs text-muted-foreground">
          {asset.dam_id ? `DAM ID: ${asset.dam_id.slice(0, 8)}...` : `ID: ${asset.id.slice(0, 8)}...`}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <span className="animate-spin mr-2">⏳</span>
          ) : (
            <Download className="h-3 w-3 mr-2" />
          )}
          {isDownloading ? 'Downloading...' : 'Download'}
        </Button>
        {asset.url && (
          <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
            <a href={asset.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-2" />
              Open
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
