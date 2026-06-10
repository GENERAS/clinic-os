import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { MessageCircle } from "lucide-react"

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="WhatsApp" description="Patient communication and reminders" />
      <EmptyState
        icon={<MessageCircle className="size-8" />}
        title="WhatsApp Module Coming Soon"
        description="Send appointment reminders, receive patient messages, and manage communication history."
      />
    </div>
  )
}
