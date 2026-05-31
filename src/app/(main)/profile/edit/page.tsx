"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/supabase-provider";
import { getUserBanner, setUserBanner, DEFAULT_BANNERS } from "@/lib/store/local-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [banner, setBanner] = useState(DEFAULT_BANNERS[0]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (user) {
      setBanner(getUserBanner(user.id));
      setName(user.name);
    }
  }, [user]);

  const handleSave = () => {
    if (!user) return;
    setUserBanner(user.id, banner);
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-base font-mono">Edit Profile</h1>
        </div>
        <button
          onClick={handleSave}
          className="font-mono text-[10px] uppercase tracking-wider text-accent hover:underline"
        >
          save
        </button>
      </div>

      {/* Banner preview */}
      <div
        className="relative w-full h-36 bg-cover bg-center"
        style={{ backgroundImage: `url(${banner})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
        <div className="absolute bottom-3 left-5">
          <Avatar className="h-12 w-12 border-2 border-white/80 shadow-md">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback className="text-base bg-white text-foreground">{user?.name?.[0]}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Name */}
        <div>
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
            Display name
          </p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 text-sm border-border bg-card"
          />
        </div>

        {/* Banner selection */}
        <div>
          <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
            Cover image
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEFAULT_BANNERS.map((b) => (
              <button
                key={b}
                onClick={() => setBanner(b)}
                className={cn(
                  "relative h-16 rounded-sm bg-cover bg-center transition-all overflow-hidden",
                  banner === b && "ring-2 ring-accent ring-offset-2 ring-offset-background"
                )}
                style={{ backgroundImage: `url(${b})` }}
              >
                {banner === b && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
