import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { isClerkEnabled } from "@/lib/clerk-config";
import { redirect } from "next/navigation";

export default function SignUpPage() {
  if (!isClerkEnabled()) {
    redirect("/signup");
  }

  return (
    <div className="auth-layout">
      <main className="auth-main" style={{ width: "100%" }}>
        <div className="auth-form-wrap">
          <SignUp appearance={clerkAppearance} routing="path" path="/sign-up" />
        </div>
      </main>
    </div>
  );
}
