"use client";

import { UserButton } from "@clerk/nextjs";

interface AccountHeaderProps {
  name: string;
  email: string;
  imageUrl: string;
}

export function AccountHeader({ name, email }: AccountHeaderProps) {
  return (
    <section className="border border-border p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-pixel text-sm mb-2">{name}</h1>
          <p className="text-text-muted text-xs">{email}</p>
        </div>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-10 h-10 border border-[#1e1e1e] rounded-none",
            },
          }}
        />
      </div>
    </section>
  );
}
