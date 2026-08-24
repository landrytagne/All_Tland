"use client";

import * as React from "react";
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Mail,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/toast";

interface ShareDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  url?: string;
}

const sharePlatforms = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    color: "bg-[#25D366] hover:bg-[#20BD5A] text-white",
    lightColor: "bg-[#25D366]/10 text-[#25D366]",
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: () => (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: () => (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: Send,
    color: "bg-[#0088cc] hover:bg-[#0077b3] text-white",
    lightColor: "bg-[#0088cc]/10 text-[#0088cc]",
    getUrl: (url: string, text: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "email",
    name: "Email",
    icon: Mail,
    color: "bg-muted hover:bg-muted/80 text-foreground",
    lightColor: "bg-muted text-foreground",
    getUrl: (url: string, text: string) =>
      `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
];

export function ShareDialog({ trigger, title, description, url }: ShareDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareText = title;

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareText, text: description || shareText, url: shareUrl });
        setOpen(false);
      } catch {
        // user cancelled
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast({ title: "Lien copié !", description: "Le lien a été copié dans le presse-papiers", type: "SUCCESS" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ title: "Erreur", description: "Impossible de copier le lien", type: "ADMIN_ALERT" });
    }
  };

  const handlePlatformShare = (platform: typeof sharePlatforms[0]) => {
    const shareUrlFinal = platform.getUrl(shareUrl, shareText);
    window.open(shareUrlFinal, "_blank", "noopener,noreferrer,width=600,height=400");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.preventDefault()}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10">
              <Share2 className="h-4 w-4 text-forest" />
            </div>
            Partager
          </DialogTitle>
          <DialogDescription className="line-clamp-1">
            {shareText}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Native share (mobile) */}
          {typeof navigator !== "undefined" && !!navigator.share && (
            <button
              onClick={handleNativeShare}
              className="flex items-center gap-3 w-full rounded-xl border p-3 hover:bg-muted/50 transition-all text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/10">
                <Share2 className="h-5 w-5 text-forest" />
              </div>
              <div>
                <p className="text-sm font-medium">Partager via l&apos;appareil</p>
                <p className="text-xs text-muted-foreground">Utiliser le partage natif de votre téléphone</p>
              </div>
            </button>
          )}

          {/* Platform buttons */}
          <div className="grid grid-cols-2 gap-2">
            {sharePlatforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handlePlatformShare(platform)}
                className="flex items-center gap-2.5 rounded-xl border p-3 hover:bg-muted/50 transition-all group"
              >
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  platform.lightColor
                )}>
                  <platform.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{platform.name}</p>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground/30 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className={cn(
              "flex items-center gap-3 w-full rounded-xl border p-3 transition-all text-left",
              copied
                ? "bg-forest/5 border-forest/20"
                : "hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
              copied ? "bg-forest/10" : "bg-muted"
            )}>
              {copied ? (
                <Check className="h-5 w-5 text-forest" />
              ) : (
                <Copy className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {copied ? "Lien copié !" : "Copier le lien"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{shareUrl}</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
