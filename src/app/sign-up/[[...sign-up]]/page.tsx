import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="pt-24 pb-16 px-6 flex justify-center">
      <div>
        <p className="text-text-muted text-sm mb-8 text-center">~/sign-up</p>
        <SignUp />
      </div>
    </div>
  );
}
