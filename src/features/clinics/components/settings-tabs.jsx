import { cn } from "@/utils/cn";
const TABS = [
    { key: "profile", label: "Profile" },
    { key: "location", label: "Location" },
    { key: "branding", label: "Branding" },
    { key: "hours", label: "Operating Hours" },
    { key: "preferences", label: "Preferences" },
    { key: "notifications", label: "Notifications" },
];
export function SettingsTabs({ activeTab, onTabChange, isOwner }) {
    return (<div className="flex flex-wrap gap-1 border-b">
      {TABS.map(({ key, label }) => (<button key={key} type="button" onClick={() => onTabChange(key)} className={cn("relative px-4 py-2.5 text-sm font-medium transition-colors", activeTab === key
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground")}>
          {label}
        </button>))}
    </div>);
}
