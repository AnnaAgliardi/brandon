'use client'

import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ArrowLeft, Upload, User, Users, Image } from "lucide-react"
import { cn } from "@/lib/utils"
export default function AdminDashboard() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-12">
          <div>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="rounded-full bg-white border-muted-foreground/20 hover:bg-white hover:text-primary text-muted-foreground text-xs h-8 px-4"
            >
              <ArrowLeft className="h-3 w-3 mr-2" />
              Back to Chat
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-lg">Manage your brand assets, users, and system settings.</p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <DashboardCard
            icon={<Upload className="h-6 w-6" />}
            title="Asset Ingestion"
            description="Upload and manage brand assets for Brandon"
            details="Upload images, generate AI descriptions, and make them searchable in Brandon's chat interface."
            actionLabel="Ingest Assets"
            onClick={() => router.push('/admin/ingest')}
            primary
          />

          <DashboardCard
            icon={<Image className="h-6 w-6" />}
            title="Asset Manager"
            description="View overview of all uploaded assets"
            details="Browse your asset library with stats and filters."
            actionLabel="View Assets"
            onClick={() => router.push('/admin/assets')}
            primary
          />

          <DashboardCard
            icon={<Users className="h-6 w-6" />}
            title="Manage Users"
            description="Administer user accounts and roles"
            details="View all users, edit roles (admin/user), or remove members."
            actionLabel="Manage Users"
            onClick={() => router.push('/admin/users')}
            primary
          />

          <DashboardCard
            icon={<User className="h-6 w-6" />}
            title="Account Setting"
            description="Manage your profile and settings"
            details="Update your email, password, or delete your account."
            actionLabel="Manage Account"
            onClick={() => router.push('/admin/account')}
            primary
          />
        </div>
      </div>
    </div>
  )
}

function DashboardCard({
  icon,
  title,
  description,
  details,
  actionLabel,
  onClick,
  primary
}: any) {
  return (
    <Card className="border-0 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all duration-200 group bg-white">
      <CardHeader className="pb-4 pt-8 px-8">
        <div className="mb-6 w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
        <CardTitle className="text-xl font-bold text-[#0F172A]">{title}</CardTitle>
        <CardDescription className="text-base font-medium text-slate-600 mt-1">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <p className="text-sm text-slate-500 mb-8 leading-relaxed min-h-[40px]">
          {details}
        </p>
        <Button
          onClick={onClick}
          className={cn(
            "rounded-xl h-12 px-6 font-medium transition-all",
            primary
              ? "bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm hover:shadow-md w-auto"
              : "bg-white border hover:bg-slate-50 text-slate-900 w-auto border-slate-200"
          )}
          variant={primary ? 'default' : 'outline'}
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}


