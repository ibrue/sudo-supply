import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrderHistory } from "./OrderHistory";
import { AccountHeader } from "./AccountHeader";

export const metadata = {
  title: "account — sudo.supply",
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
      <p className="text-text-muted text-sm mb-8 animate-fade-in">~/account</p>

      <div className="space-y-10 animate-fade-in-delay">
        <AccountHeader
          name={user.firstName ?? user.username ?? "user"}
          email={user.emailAddresses[0]?.emailAddress ?? ""}
          imageUrl={user.imageUrl}
        />
        <OrderHistory userId={user.id} />
      </div>
    </div>
  );
}
