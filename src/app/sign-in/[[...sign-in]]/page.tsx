import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="pt-24 pb-16 px-6 flex justify-center">
      <div>
        <p className="text-text-muted text-sm mb-8 text-center">~/sign-in</p>
        <SignIn />
      </div>
    </div>
  );
}
